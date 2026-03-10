import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import {
  getClientCredentialsToken,
  spotifyFetch,
  extractArtistId,
} from "@/lib/spotify/client";
import { fetchBulkStreamCounts } from "@/lib/rapidapi/streams";
import { verifyAuth } from "@/lib/auth/verify";
import crypto from "crypto";

const CACHE_DAYS = 7;
const MAX_RAPIDAPI_TRACKS = 30;

export async function POST(request: Request) {
  try {
    const { spotifyUrl } = await request.json();

    if (!spotifyUrl || typeof spotifyUrl !== "string") {
      return NextResponse.json(
        { error: "Please provide a Spotify URL" },
        { status: 400 }
      );
    }

    const artistId = extractArtistId(spotifyUrl);
    if (!artistId) {
      return NextResponse.json(
        { error: "Invalid Spotify artist URL. Please paste a link like spotify.com/artist/..." },
        { status: 400 }
      );
    }

    // Check if user is authenticated (don't throw — anonymous users are allowed)
    let isAuthenticated = false;
    try {
      await verifyAuth();
      isAuthenticated = true;
    } catch {
      // Not logged in — apply rate limits below
    }

    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    const ipHash = crypto.createHash("sha256").update(ip).digest("hex").slice(0, 16);

    const supabase = await createServiceClient();

    // Rate limiting and duplicate checks only apply to anonymous users
    if (!isAuthenticated) {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { count } = await supabase
        .from("sniffer_results")
        .select("*", { count: "exact", head: true })
        .eq("ip_hash", ipHash)
        .gte("created_at", oneDayAgo);

      if (count && count >= 1) {
        return NextResponse.json(
          { error: "You've used your free search for today. Sign up to unlock unlimited searches." },
          { status: 429 }
        );
      }

      const { count: dupCount } = await supabase
        .from("sniffer_results")
        .select("*", { count: "exact", head: true })
        .eq("artist_id", artistId)
        .eq("ip_hash", ipHash);

      if (dupCount && dupCount > 0) {
        return NextResponse.json(
          { error: "You've already sniffed this artist's royalties. Sign up to unlock unlimited searches." },
          { status: 409 }
        );
      }
    }

    // ---- Cache check: return cached results if sniffed within last 7 days ----
    const cacheDate = new Date(Date.now() - CACHE_DAYS * 24 * 60 * 60 * 1000).toISOString();
    const { data: cached } = await supabase
      .from("sniffer_results")
      .select("results")
      .eq("artist_id", artistId)
      .gte("created_at", cacheDate)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (cached?.results) {
      // Still record the sniff for rate-limiting purposes (anonymous users)
      if (!isAuthenticated) {
        await supabase.from("sniffer_results").insert({
          spotify_url: spotifyUrl,
          artist_name: cached.results.artist?.name || "Unknown",
          artist_id: artistId,
          results: cached.results,
          ip_hash: ipHash,
        });
      }
      return NextResponse.json(cached.results);
    }

    // ---- Fresh fetch: Spotify + RapidAPI ----

    const { access_token } = await getClientCredentialsToken();

    // Fetch artist info
    const artist = await spotifyFetch(`/artists/${artistId}`, access_token);

    // Paginate all albums/singles (up to 50)
    const albumItems: { id: string }[] = [];
    const seenAlbumIds = new Set<string>();
    for (let offset = 0; offset < 50; offset += 10) {
      const albumsResp = await spotifyFetch(
        `/artists/${artistId}/albums?include_groups=single,album&limit=10&offset=${offset}`,
        access_token
      );
      const items = albumsResp.items || [];
      if (items.length === 0) break;
      for (const a of items) {
        if (!seenAlbumIds.has(a.id)) {
          seenAlbumIds.add(a.id);
          albumItems.push(a);
        }
      }
      if (items.length < 10) break;
    }

    // Fetch each album in parallel for track lists
    const albumResults = await Promise.allSettled(
      albumItems.map((a) => spotifyFetch(`/albums/${a.id}`, access_token))
    );

    // Sort albums oldest-first so each track gets its earliest release date
    const sortedAlbums = albumResults
      .filter((r): r is PromiseFulfilledResult<Record<string, unknown>> => r.status === "fulfilled")
      .map((r) => r.value)
      .sort((a, b) => String(a.release_date || "9999").localeCompare(String(b.release_date || "9999")));

    // Collect all unique tracks
    interface CollectedTrack {
      id: string;
      name: string;
      albumName: string;
      albumArtUrl: string | null;
      releaseDate: string;
    }
    const allTracks: CollectedTrack[] = [];
    const seenIds = new Set<string>();
    const seenNames = new Set<string>();
    for (const album of sortedAlbums) {
      const images = album.images as Array<{ url: string }> | undefined;
      const art = images?.[0]?.url || null;
      const releaseDate = String(album.release_date || "9999-12-31");
      const tracks = (album.tracks as { items?: Array<{ id: string; name: string }> })?.items || [];
      for (const t of tracks) {
        const normName = t.name.toLowerCase().replace(/[^a-z0-9]/g, "");
        // Dedup by track ID or exact normalized name only
        const isDupe = seenIds.has(t.id) || seenNames.has(normName);
        if (!isDupe) {
          seenIds.add(t.id);
          seenNames.add(normName);
          allTracks.push({
            id: t.id,
            name: t.name,
            albumName: String(album.name || ""),
            albumArtUrl: art,
            releaseDate,
          });
        }
      }
    }

    if (allTracks.length === 0) {
      return NextResponse.json(
        { error: "No tracks found for this artist." },
        { status: 404 }
      );
    }

    // Sort all tracks oldest-first (older = more accumulated streams), take top N
    const candidates = allTracks
      .sort((a, b) => a.releaseDate.localeCompare(b.releaseDate))
      .slice(0, MAX_RAPIDAPI_TRACKS);

    console.log(`Sniffer: ${allTracks.length} unique tracks. Sending ${candidates.length} to RapidAPI.`);
    console.log("Candidates:", candidates.map((t, i) => `${i + 1}. ${t.name} ${t.releaseDate}`).join(" | "));

    // Fetch DSP rates
    const { data: rates } = await supabase
      .from("dsp_rates")
      .select("*")
      .is("country", null);

    if (!rates || rates.length === 0) {
      return NextResponse.json(
        { error: "Rate data unavailable. Please try again later." },
        { status: 503 }
      );
    }

    const rateMap: Record<string, number> = {};
    for (const r of rates) {
      rateMap[r.platform] = Number(r.rate_per_stream);
    }

    // Fetch stream counts for top 12 candidates only
    const trackIds = candidates.map((t) => t.id);
    const streamCounts = await fetchBulkStreamCounts(trackIds);
    const hasRealData = streamCounts.size > 0;

    // Sort by actual stream count, take top 10
    const sorted = candidates
      .map((t) => ({ ...t, streams: streamCounts.get(t.id) || 0 }))
      .sort((a, b) => b.streams - a.streams)
      .slice(0, 10);

    const spotifyRate = rateMap["spotify"] || 0.003;

    const trackResults = sorted.map((track) => ({
      title: track.name,
      isrc: null as string | null,
      album: track.albumName,
      album_art_url: track.albumArtUrl,
      popularity: 0,
      total_streams: track.streams,
      total_estimated_earnings: Math.round(track.streams * spotifyRate * 100) / 100,
      data_source: (track.streams > 0 ? "rapidapi" : "heuristic") as "rapidapi" | "heuristic",
    }));

    const totalAllTimeEstimate =
      Math.round(
        trackResults.reduce((sum, t) => sum + t.total_estimated_earnings, 0) * 100
      ) / 100;

    const totalAllTimeStreams = trackResults.reduce(
      (sum, t) => sum + t.total_streams,
      0
    );

    const result = {
      artist: {
        name: artist.name,
        image_url: artist.images?.[0]?.url || null,
        genres: artist.genres || [],
        popularity: artist.popularity,
        spotify_id: artist.id,
      },
      tracks: trackResults,
      total_streams: totalAllTimeStreams,
      total_estimated_earnings: totalAllTimeEstimate,
      data_source: hasRealData ? ("rapidapi" as const) : ("heuristic" as const),
      disclaimer: "Earnings estimated using verified published per-stream rates.",
    };

    // Store result
    await supabase.from("sniffer_results").insert({
      spotify_url: spotifyUrl,
      artist_name: artist.name,
      artist_id: artistId,
      results: result,
      ip_hash: ipHash,
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("Sniffer error:", err);
    return NextResponse.json(
      { error: "Failed to fetch data. Please check the URL and try again." },
      { status: 500 }
    );
  }
}
