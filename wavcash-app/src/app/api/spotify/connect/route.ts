import { NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth/verify";
import { createServiceClient } from "@/lib/supabase/server";
import {
  exchangeCodeForTokens,
  spotifyFetch,
  type SpotifyArtist,
} from "@/lib/spotify/client";

export async function POST(request: Request) {
  try {
    const { userId } = await verifyAuth();
    const { code } = await request.json();

    if (!code || typeof code !== "string") {
      return NextResponse.json(
        { error: "Missing authorization code" },
        { status: 400 }
      );
    }

    const { origin } = new URL(request.url);
    const redirectUri =
      process.env.NEXT_PUBLIC_SPOTIFY_REDIRECT_URI ||
      `${origin}/api/spotify/callback`;

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code, redirectUri);

    // Get the user's Spotify profile
    const me = await spotifyFetch("/me", tokens.access_token);

    const supabase = await createServiceClient();

    // Store tokens + profile data on user record (upsert so it works even if row was just created)
    await supabase
      .from("users")
      .upsert(
        {
          id: userId,
          spotify_connected: true,
          spotify_artist_id: me.id,
          spotify_access_token: tokens.access_token,
          spotify_refresh_token: tokens.refresh_token,
          spotify_token_expires_at: new Date(
            Date.now() + tokens.expires_in * 1000
          ).toISOString(),
          avatar_url: me.images?.[0]?.url || null,
        },
        { onConflict: "id" }
      );

    // Try to find the artist profile
    let artistData: SpotifyArtist | null = null;

    try {
      artistData = await spotifyFetch(
        `/artists/${me.id}`,
        tokens.access_token
      );
    } catch {
      // User's Spotify account might not be an artist account — search by name
      try {
        const searchRes = await spotifyFetch(
          `/search?q=${encodeURIComponent(me.display_name)}&type=artist&limit=1`,
          tokens.access_token
        );
        if (searchRes.artists?.items?.length > 0) {
          artistData = searchRes.artists.items[0];
        }
      } catch {
        // Search failed — continue without artist data
      }
    }

    let artistResult = null;
    let trackCount = 0;

    if (artistData) {
      // Create artist record
      const { data: artist } = await supabase
        .from("artists")
        .upsert(
          {
            user_id: userId,
            spotify_artist_id: artistData.id,
            name: artistData.name,
            image_url: artistData.images?.[0]?.url || null,
            genres: artistData.genres || [],
            popularity: artistData.popularity,
          },
          { onConflict: "user_id,spotify_artist_id" }
        )
        .select()
        .single();

      // Save artist genres to the user's genre_tags + use artist image as avatar fallback
      if (artistData.genres?.length) {
        await supabase
          .from("users")
          .update({
            genre_tags: artistData.genres,
            ...(artistData.images?.[0]?.url
              ? { avatar_url: artistData.images[0].url }
              : {}),
          })
          .eq("id", userId);
      }

      if (artist) {
        // Fetch artist's albums to get all tracks with ISRCs
        trackCount = await importArtistCatalog(
          artistData.id,
          artist.id,
          tokens.access_token,
          supabase
        );
        artistResult = {
          id: artist.id,
          name: artistData.name,
          image_url: artistData.images?.[0]?.url || null,
          spotify_artist_id: artistData.id,
        };
      }
    }

    return NextResponse.json({
      success: true,
      artist: artistResult,
      trackCount,
    });
  } catch (err) {
    console.error("Spotify connect error:", err);

    if (err instanceof Error && err.message === "Not authenticated") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Failed to connect Spotify",
      },
      { status: 500 }
    );
  }
}

async function importArtistCatalog(
  spotifyArtistId: string,
  artistDbId: string,
  accessToken: string,
  supabase: Awaited<ReturnType<typeof createServiceClient>>
): Promise<number> {
  let totalTracks = 0;

  try {
    // Fetch all albums
    let albums: Array<{
      id: string;
      name: string;
      release_date: string;
      images: Array<{ url: string }>;
    }> = [];
    let url = `/artists/${spotifyArtistId}/albums?include_groups=album,single&limit=50`;

    while (url) {
      const res = await spotifyFetch(url, accessToken);
      albums = [...albums, ...res.items];
      url = res.next
        ? res.next.replace("https://api.spotify.com/v1", "")
        : "";
    }

    // For each album, get tracks with ISRCs
    for (const album of albums) {
      try {
        const albumDetail = await spotifyFetch(
          `/albums/${album.id}`,
          accessToken
        );
        const trackItems = albumDetail.tracks?.items || [];

        // Get full track details (includes ISRCs) in batches of 50
        const trackIds = trackItems.map((t: { id: string }) => t.id);
        for (let i = 0; i < trackIds.length; i += 50) {
          const batch = trackIds.slice(i, i + 50);
          const tracksRes = await spotifyFetch(
            `/tracks?ids=${batch.join(",")}`,
            accessToken
          );

          const trackRows = tracksRes.tracks
            .filter(
              (t: { external_ids?: { isrc?: string } }) =>
                t?.external_ids?.isrc
            )
            .map(
              (t: {
                external_ids: { isrc: string };
                name: string;
                id: string;
                duration_ms: number;
                popularity: number;
              }) => ({
                artist_id: artistDbId,
                isrc: t.external_ids.isrc,
                title: t.name,
                album: album.name,
                spotify_track_id: t.id,
                release_date: album.release_date || null,
                duration_ms: t.duration_ms,
                popularity: t.popularity,
                album_art_url: album.images?.[0]?.url || null,
              })
            );

          if (trackRows.length > 0) {
            await supabase
              .from("tracks")
              .upsert(trackRows, { onConflict: "artist_id,isrc" });
            totalTracks += trackRows.length;
          }
        }
      } catch (err) {
        console.error(`Failed to import album ${album.id}:`, err);
        // Continue with next album
      }
    }
  } catch (err) {
    console.error("Catalog import error:", err);
  }

  return totalTracks;
}
