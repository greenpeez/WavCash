import { NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth/verify";
import { createServiceClient } from "@/lib/supabase/server";

const PLATFORM_LABELS: Record<string, string> = {
  spotify: "Spotify",
  apple_music: "Apple Music",
  youtube_music: "YouTube Music",
  amazon_music: "Amazon Music",
  tidal: "Tidal",
};

export async function GET() {
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

    const { data: trackRows } = await supabase
      .from("tracks")
      .select("id, title, isrc, album, album_art_url, popularity")
      .in("artist_id", artists.map((a) => a.id))
      .order("created_at", { ascending: false });

    if (!trackRows) return NextResponse.json([]);

    const trackIds = trackRows.map((t) => t.id);
    const { data: snapshots } = await supabase
      .from("oracle_snapshots")
      .select("track_id, platform, stream_count, estimated_royalty")
      .in("track_id", trackIds);

    const trackMap: Record<string, {
      totalStreams: number;
      totalEstimated: number;
      platformEarnings: Record<string, number>;
    }> = {};

    for (const s of snapshots || []) {
      if (!trackMap[s.track_id]) {
        trackMap[s.track_id] = { totalStreams: 0, totalEstimated: 0, platformEarnings: {} };
      }
      trackMap[s.track_id].totalStreams += Number(s.stream_count) || 0;
      trackMap[s.track_id].totalEstimated += Number(s.estimated_royalty) || 0;
      trackMap[s.track_id].platformEarnings[s.platform] =
        (trackMap[s.track_id].platformEarnings[s.platform] || 0) +
        (Number(s.estimated_royalty) || 0);
    }

    const result = trackRows.map((t) => {
      const data = trackMap[t.id];
      let topPlatform = "—";
      if (data?.platformEarnings) {
        const sorted = Object.entries(data.platformEarnings).sort(
          (a, b) => b[1] - a[1]
        );
        if (sorted[0]) {
          topPlatform = PLATFORM_LABELS[sorted[0][0]] || sorted[0][0];
        }
      }
      return {
        ...t,
        totalStreams: data?.totalStreams || 0,
        totalEstimated: data?.totalEstimated || 0,
        topPlatform,
      };
    });

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
