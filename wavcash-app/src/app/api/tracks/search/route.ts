import { NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth/verify";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  try {
    const { userId } = await verifyAuth();
    const supabase = await createServiceClient();

    const { data: artists } = await supabase
      .from("artists")
      .select("id")
      .eq("user_id", userId);

    if (!artists || artists.length === 0) {
      return NextResponse.json([]);
    }

    const artistIds = artists.map((a: { id: string }) => a.id);
    const { data: tracks } = await supabase
      .from("tracks")
      .select("id, title, isrc, album")
      .in("artist_id", artistIds)
      .order("title");

    if (!tracks || tracks.length === 0) {
      return NextResponse.json([]);
    }

    // Check which tracks already have an active (non-voided) split
    const trackIds = tracks.map((t: { id: string }) => t.id);
    const { data: activeSplits } = await supabase
      .from("splits")
      .select("track_id")
      .in("track_id", trackIds)
      .in("status", ["draft", "awaiting_signatures", "active"]);

    const activeSplitTrackIds = new Set(
      (activeSplits || []).map((s: { track_id: string }) => s.track_id)
    );

    const enriched = tracks.map((t: { id: string; title: string; isrc: string; album: string | null }) => ({
      ...t,
      hasActiveSplit: activeSplitTrackIds.has(t.id),
    }));

    return NextResponse.json(enriched);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
