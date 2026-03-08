import { NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth/verify";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  if (process.env.NEXT_PUBLIC_DEV_BYPASS !== "true") {
    return NextResponse.json({ error: "Dev bypass disabled" }, { status: 403 });
  }

  try {
    const { userId } = await verifyAuth();
    const body = await request.json();
    const supabase = await createServiceClient();

    // Skip users table update — the real DB schema doesn't have spotify columns
    // on the users table. The splits flow only needs an artist + tracks to exist.

    // Find or create mock artist
    let artist: { id: string } | null = null;

    // Look up existing artist by user_id (don't filter by spotify_artist_id in case
    // the user already has an artist from Spotify connect)
    const { data: existingArtist } = await supabase
      .from("artists")
      .select("id")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle();

    if (existingArtist) {
      artist = existingArtist;
    } else {
      // Insert new artist — minimal required fields only
      const { data: inserted, error: insertErr } = await supabase
        .from("artists")
        .insert({
          user_id: userId,
          name: body.artist_name || "Dev Artist",
        })
        .select("id")
        .single();

      if (insertErr) {
        console.error("Dev bypass — artist insert failed:", insertErr);
        return NextResponse.json(
          { error: "Failed to create artist", detail: insertErr.message },
          { status: 500 }
        );
      }
      artist = inserted;
    }

    let tracks: { id: string; title: string; isrc: string; album: string | null }[] = [];

    if (artist && body.mock_tracks) {
      for (const t of body.mock_tracks as { title: string; isrc: string; album: string }[]) {
        // Check if track already exists (artist_id + isrc has a unique constraint)
        const { data: existingTrack } = await supabase
          .from("tracks")
          .select("id, title, isrc, album")
          .eq("artist_id", artist.id)
          .eq("isrc", t.isrc)
          .maybeSingle();

        if (existingTrack) {
          tracks.push(existingTrack);
        } else {
          // Insert with minimal required fields: artist_id, isrc, title
          const { data: newTrack, error: trackErr } = await supabase
            .from("tracks")
            .insert({
              artist_id: artist.id,
              isrc: t.isrc,
              title: t.title,
              album: t.album || null,
            })
            .select("id, title, isrc, album")
            .single();

          if (trackErr) {
            console.error(`Dev bypass — track insert failed for ${t.isrc}:`, trackErr);
            return NextResponse.json(
              { error: `Failed to create track "${t.title}"`, detail: trackErr.message },
              { status: 500 }
            );
          }
          if (newTrack) tracks.push(newTrack);
        }
      }
    }

    return NextResponse.json({ artist, tracks });
  } catch (err) {
    console.error("Dev bypass — unexpected error:", err);
    return NextResponse.json(
      { error: "Unauthorized or unexpected error", detail: String(err) },
      { status: 401 }
    );
  }
}
