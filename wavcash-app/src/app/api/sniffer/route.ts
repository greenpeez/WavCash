import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import {
  getClientCredentialsToken,
  spotifyFetch,
  extractArtistId,
  type SpotifyTrack,
} from "@/lib/spotify/client";
import crypto from "crypto";

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

    // Rate limiting: 2 queries per IP per hour
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    const ipHash = crypto.createHash("sha256").update(ip).digest("hex").slice(0, 16);

    const supabase = await createServiceClient();

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from("sniffer_results")
      .select("*", { count: "exact", head: true })
      .eq("ip_hash", ipHash)
      .gte("created_at", oneHourAgo);

    if (count && count >= 2) {
      return NextResponse.json(
        { error: "Rate limit reached. You can run 2 searches per hour. Try again later." },
        { status: 429 }
      );
    }

    // Get Spotify client credentials token
    const { access_token } = await getClientCredentialsToken();

    // Fetch artist info
    const artist = await spotifyFetch(`/artists/${artistId}`, access_token);

    // Fetch artist's top tracks (market-independent)
    const topTracks = await spotifyFetch(
      `/artists/${artistId}/top-tracks?market=US`,
      access_token
    );

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

    // Calculate estimates per track using popularity as a stream proxy
    // Spotify popularity 0-100 roughly maps to stream ranges
    const tracks: SpotifyTrack[] = topTracks.tracks || [];
    const trackResults = tracks.slice(0, 10).map((track) => {
      // Popularity-to-monthly-streams heuristic
      // Pop 0-20: ~100-1K, 20-40: ~1K-10K, 40-60: ~10K-100K, 60-80: ~100K-1M, 80-100: ~1M+
      const pop = track.popularity || 0;
      const estimatedMonthlyStreams = Math.round(
        pop <= 20
          ? pop * 50
          : pop <= 40
          ? 1000 + (pop - 20) * 450
          : pop <= 60
          ? 10000 + (pop - 40) * 4500
          : pop <= 80
          ? 100000 + (pop - 60) * 45000
          : 1000000 + (pop - 80) * 250000
      );

      const dspBreakdown = Object.entries(rateMap).map(([platform, rate]) => {
        // Approximate DSP share: Spotify ~60%, Apple ~15%, YouTube ~12%, Amazon ~8%, Tidal ~5%
        const shareMap: Record<string, number> = {
          spotify: 0.6,
          apple_music: 0.15,
          youtube_music: 0.12,
          amazon_music: 0.08,
          tidal: 0.05,
        };
        const share = shareMap[platform] || 0.1;
        const streams = Math.round(estimatedMonthlyStreams * share);
        return {
          platform,
          estimated_streams: streams,
          rate,
          estimated_earnings: Math.round(streams * rate * 100) / 100,
        };
      });

      const totalEstimated = dspBreakdown.reduce(
        (sum, d) => sum + d.estimated_earnings,
        0
      );

      return {
        title: track.name,
        isrc: track.external_ids?.isrc || null,
        album: track.album.name,
        album_art_url: track.album.images?.[0]?.url || null,
        popularity: pop,
        estimated_monthly_streams: estimatedMonthlyStreams,
        dsp_breakdown: dspBreakdown,
        total_monthly_estimated: Math.round(totalEstimated * 100) / 100,
      };
    });

    const totalAnnualEstimate = Math.round(
      trackResults.reduce((sum, t) => sum + t.total_monthly_estimated, 0) * 12 * 100
    ) / 100;

    const result = {
      artist: {
        name: artist.name,
        image_url: artist.images?.[0]?.url || null,
        genres: artist.genres || [],
        popularity: artist.popularity,
        spotify_id: artist.id,
      },
      tracks: trackResults,
      total_annual_estimate: totalAnnualEstimate,
      total_monthly_estimate: Math.round(totalAnnualEstimate / 12 * 100) / 100,
      disclaimer:
        "Estimates based on verified published per-stream rates and track performance indicators. Create an account to upload your statements and see your real gap.",
    };

    // Store result
    await supabase.from("sniffer_results").insert({
      spotify_url: spotifyUrl,
      artist_name: artist.name,
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
