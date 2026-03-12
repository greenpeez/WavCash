import { NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth/verify";
import { createServiceClient } from "@/lib/supabase/server";
import { reconcileEarnings } from "@/lib/earnings/reconcile";

const PLATFORM_LABELS: Record<string, string> = {
  spotify: "Spotify",
  apple_music: "Apple Music",
  youtube_music: "YouTube Music",
  amazon_music: "Amazon Music",
  tidal: "Tidal",
  deezer: "Deezer",
  tiktok: "TikTok",
  audiomack: "Audiomack",
  anghami: "Anghami",
  pandora: "Pandora",
  iheart: "iHeart",
  soundcloud: "SoundCloud",
  meta: "Meta",
  vevo: "Vevo",
};

const PLATFORM_COLORS: Record<string, string> = {
  spotify: "#1DB954",
  apple_music: "#FC3C44",
  youtube_music: "#FF0000",
  amazon_music: "#00A8E1",
  tidal: "#000000",
  deezer: "#A238FF",
  tiktok: "#010101",
  audiomack: "#FFA200",
  anghami: "#D81B60",
  pandora: "#224099",
  iheart: "#C6002B",
  soundcloud: "#FF5500",
  meta: "#0668E1",
  vevo: "#ED1B24",
};

export async function GET() {
  try {
    const { userId } = await verifyAuth();
    const supabase = await createServiceClient();

    // Batch 1: profile + artists
    const [profileRes, artistsRes] = await Promise.all([
      supabase.from("users").select("spotify_connected").eq("id", userId).single(),
      supabase.from("artists").select("id").eq("user_id", userId),
    ]);

    const spotifyConnected = profileRes.data?.spotify_connected || false;

    if (!artistsRes.data || artistsRes.data.length === 0) {
      return NextResponse.json({
        spotifyConnected,
        summary: {
          totalEarnings: 0,
          masterEarnings: 0,
          publishingEarnings: 0,
          splitEarnings: 0,
          last12Months: 0,
          topTrack: null,
          topPlatform: null,
          monthlyData: [],
          platformData: [],
          trackCount: 0,
          hasData: false,
          dataSource: "oracle" as const,
        },
      });
    }

    // Try reconciled earnings first (actuals + splits)
    const reconciled = await reconcileEarnings(supabase, userId);

    if (reconciled) {
      // User has actuals or split data — return reconciled view
      const topPlatform = reconciled.platformData[0]
        ? {
            name: reconciled.platformData[0].platform,
            percentage:
              reconciled.totalEarnings > 0
                ? Math.round(
                    (reconciled.platformData[0].earnings / reconciled.totalEarnings) * 100
                  )
                : 0,
          }
        : null;

      return NextResponse.json({
        spotifyConnected,
        summary: {
          totalEarnings: reconciled.totalEarnings,
          masterEarnings: reconciled.masterEarnings,
          publishingEarnings: reconciled.publishingEarnings,
          splitEarnings: reconciled.splitEarnings,
          last12Months: reconciled.last12Months,
          topTrack: reconciled.topTrack,
          topPlatform,
          monthlyData: reconciled.monthlyData,
          platformData: reconciled.platformData,
          trackCount: reconciled.trackCount,
          hasData: true,
          dataSource: reconciled.dataSource,
        },
      });
    }

    // Fallback: oracle-only estimates (existing behavior)
    const artistIds = artistsRes.data.map((a) => a.id);

    const [countRes, tracksRes] = await Promise.all([
      supabase.from("tracks").select("*", { count: "exact", head: true }).in("artist_id", artistIds),
      supabase.from("tracks").select("id, title").in("artist_id", artistIds),
    ]);

    const trackIds = tracksRes.data?.map((t) => t.id) || [];

    const { data: snapshots } = await supabase
      .from("oracle_snapshots")
      .select("track_id, platform, estimated_royalty, snapshot_date")
      .in("track_id", trackIds)
      .order("snapshot_date", { ascending: false });

    if (!snapshots || snapshots.length === 0) {
      return NextResponse.json({
        spotifyConnected,
        summary: {
          totalEarnings: 0,
          masterEarnings: 0,
          publishingEarnings: 0,
          splitEarnings: 0,
          last12Months: 0,
          topTrack: null,
          topPlatform: null,
          monthlyData: [],
          platformData: [],
          trackCount: countRes.count || 0,
          hasData: false,
          dataSource: "oracle" as const,
        },
      });
    }

    // Calculate oracle totals
    const totalEstimated = snapshots.reduce(
      (sum, s) => sum + (Number(s.estimated_royalty) || 0),
      0
    );

    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setFullYear(twelveMonthsAgo.getFullYear() - 1);
    const recent = snapshots.filter(
      (s) => new Date(s.snapshot_date) >= twelveMonthsAgo
    );
    const last12Months = recent.reduce(
      (sum, s) => sum + (Number(s.estimated_royalty) || 0),
      0
    );

    // Top track
    const trackEarnings: Record<string, number> = {};
    for (const s of snapshots) {
      trackEarnings[s.track_id] =
        (trackEarnings[s.track_id] || 0) + (Number(s.estimated_royalty) || 0);
    }
    const topTrackEntry = Object.entries(trackEarnings).sort(
      (a, b) => b[1] - a[1]
    )[0];

    let topTrack = null;
    if (topTrackEntry) {
      const trackRow = tracksRes.data?.find((t) => t.id === topTrackEntry[0]);
      if (trackRow) {
        topTrack = { title: trackRow.title, earnings: topTrackEntry[1] };
      }
    }

    // Top platform
    const platformEarnings: Record<string, number> = {};
    for (const s of recent) {
      platformEarnings[s.platform] =
        (platformEarnings[s.platform] || 0) + (Number(s.estimated_royalty) || 0);
    }
    const sortedPlatforms = Object.entries(platformEarnings).sort(
      (a, b) => b[1] - a[1]
    );
    const topPlatform = sortedPlatforms[0]
      ? {
          name: PLATFORM_LABELS[sortedPlatforms[0][0]] || sortedPlatforms[0][0],
          percentage: Math.round((sortedPlatforms[0][1] / last12Months) * 100),
        }
      : null;

    // Monthly data for chart (oracle has single earnings value per month)
    const monthlyMap: Record<string, number> = {};
    for (const s of recent) {
      const month = s.snapshot_date.slice(0, 7);
      monthlyMap[month] =
        (monthlyMap[month] || 0) + (Number(s.estimated_royalty) || 0);
    }
    const monthlyData = Object.entries(monthlyMap)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, earnings]) => ({
        month: new Date(month + "-01").toLocaleDateString("en", {
          month: "short",
          year: "2-digit",
        }),
        earnings: Math.round(earnings * 100) / 100,
        master: Math.round(earnings * 100) / 100,
        publishing: 0,
      }));

    // Platform data for donut
    const platformData = sortedPlatforms.map(([platform, earnings]) => ({
      platform: PLATFORM_LABELS[platform] || platform,
      earnings: Math.round(earnings * 100) / 100,
      color: PLATFORM_COLORS[platform] || "#888",
    }));

    return NextResponse.json({
      spotifyConnected,
      summary: {
        totalEarnings: totalEstimated,
        masterEarnings: totalEstimated,
        publishingEarnings: 0,
        splitEarnings: 0,
        last12Months,
        topTrack,
        topPlatform,
        monthlyData,
        platformData,
        trackCount: countRes.count || 0,
        hasData: true,
        dataSource: "oracle" as const,
      },
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
