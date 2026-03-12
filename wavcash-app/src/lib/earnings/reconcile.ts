import { SupabaseClient } from "@supabase/supabase-js";

export type DataSource = "actuals" | "oracle" | "mixed";

export interface EarningsData {
  totalEarnings: number;
  masterEarnings: number;
  publishingEarnings: number;
  splitEarnings: number;
  last12Months: number;
  monthlyData: Array<{ month: string; master: number; publishing: number }>;
  platformData: Array<{ platform: string; earnings: number; color: string }>;
  topTrack: { title: string; earnings: number } | null;
  trackCount: number;
  dataSource: DataSource;
}

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

/**
 * Reconcile earnings for a user across all sources:
 * - On-chain split distributions (distribution_payouts) — master earnings via splits
 * - Distributor CSV actuals (statement_lines where income_type IS NULL) — master earnings without splits
 * - Publisher CSV actuals (statement_lines where income_type IS NOT NULL) — publishing earnings (always additive)
 * - Oracle estimates (oracle_snapshots) — fallback when no actuals or splits exist
 *
 * Reconciliation per ISRC:
 *   Track HAS active split where user is contributor → master = sum of distribution_payouts for user's wallet
 *   Track has NO split → master = sum of distributor statement_lines
 *   Publishing earnings → always additive (never overlap with split distributions)
 *   No actuals and no splits → fall back to oracle estimates
 */
export async function reconcileEarnings(
  supabase: SupabaseClient,
  userId: string
): Promise<EarningsData | null> {
  // 1. Get user's artists and tracks
  const { data: artists } = await supabase
    .from("artists")
    .select("id")
    .eq("user_id", userId);

  if (!artists || artists.length === 0) return null;

  const artistIds = artists.map((a) => a.id);
  const { data: tracks } = await supabase
    .from("tracks")
    .select("id, isrc, title")
    .in("artist_id", artistIds);

  if (!tracks || tracks.length === 0) return null;

  const trackIds = tracks.map((t) => t.id);
  const isrcToTrack: Record<string, { id: string; title: string }> = {};
  for (const t of tracks) {
    if (t.isrc) isrcToTrack[t.isrc.toUpperCase()] = { id: t.id, title: t.title };
  }

  // 2. Get user's active split contributions
  const { data: contributions } = await supabase
    .from("split_contributors")
    .select("split_id, user_id, wallet_address, percentage, splits!inner(id, status, track_id)")
    .eq("user_id", userId);

  // Map track_id → split_id for tracks with active splits where user is contributor
  const trackToSplit: Record<string, string> = {};
  const splitContributorWallets: Record<string, string> = {}; // split_id → wallet
  const splitByMonth: Record<string, number> = {};

  if (contributions) {
    for (const c of contributions) {
      const split = (c as Record<string, unknown>).splits as { id: string; status: string; track_id: string } | null;
      if (split && split.status === "active") {
        trackToSplit[split.track_id] = split.id;
        if (c.wallet_address) {
          splitContributorWallets[split.id] = c.wallet_address.toLowerCase();
        }
      }
    }
  }

  // 3. Get user's wallet address for payout matching
  const { data: userProfile } = await supabase
    .from("users")
    .select("wallet_address")
    .eq("id", userId)
    .single();

  const userWallet = userProfile?.wallet_address?.toLowerCase() || null;

  // 4. Get distribution_payouts for user's wallet (for split earnings)
  // Also track which splits have had at least one distribution
  let splitEarningsTotal = 0;
  const splitEarningsByTrack: Record<string, number> = {};
  const splitsWithDistributions = new Set<string>();

  if (userWallet) {
    const { data: payouts } = await supabase
      .from("distribution_payouts")
      .select("distribution_id, wallet_address, token_type, amount_decimal, distributions!inner(split_id, created_at, splits!inner(track_id))")
      .eq("wallet_address", userWallet);

    if (payouts) {
      for (const p of payouts) {
        const dist = (p as Record<string, unknown>).distributions as {
          split_id: string;
          created_at: string;
          splits: { track_id: string };
        } | null;
        if (dist && dist.splits) {
          splitsWithDistributions.add(dist.split_id);
          const amount = parseFloat(p.amount_decimal) || 0;
          // For native AVAX, convert to USD estimate (rough approximation)
          // For USDC/EURC, amount_decimal is already in USD-equivalent
          const usdAmount = p.token_type === "native" ? 0 : amount; // Skip AVAX for now (need price feed)
          splitEarningsTotal += usdAmount;
          const trackId = dist.splits.track_id;
          splitEarningsByTrack[trackId] = (splitEarningsByTrack[trackId] || 0) + usdAmount;

          // Track split earnings by month for monthly/last12 calculations
          const month = dist.created_at?.slice(0, 7) || "unknown";
          splitByMonth[month] = (splitByMonth[month] || 0) + usdAmount;
        }
      }
    }
  }

  // 5. Get user's statement_lines from uploaded CSVs
  const { data: statements } = await supabase
    .from("royalty_statements")
    .select("id")
    .eq("user_id", userId);

  let masterActualsTotal = 0;
  let publishingTotal = 0;
  const masterActualsByTrack: Record<string, number> = {};
  const publishingByPlatform: Record<string, number> = {};
  const publishingByMonth: Record<string, number> = {};
  const masterByPlatform: Record<string, number> = {};
  const masterByMonth: Record<string, number> = {};
  let hasActuals = false;

  if (statements && statements.length > 0) {
    const stmtIds = statements.map((s) => s.id);
    const { data: lines } = await supabase
      .from("statement_lines")
      .select("isrc, platform, earnings, period, income_type, matched_track_id")
      .in("statement_id", stmtIds);

    if (lines && lines.length > 0) {
      hasActuals = true;

      for (const line of lines) {
        const earnings = parseFloat(line.earnings) || 0;
        const isrc = line.isrc?.toUpperCase();
        const platform = line.platform || "unknown";
        const month = line.period?.slice(0, 7) || "unknown";

        if (line.income_type) {
          // Publisher line — always additive
          publishingTotal += earnings;
          publishingByPlatform[platform] = (publishingByPlatform[platform] || 0) + earnings;
          publishingByMonth[month] = (publishingByMonth[month] || 0) + earnings;
        } else {
          // Distributor line
          const trackId = line.matched_track_id || (isrc ? isrcToTrack[isrc]?.id : null);

          // Skip if this track has an active split WITH actual distributions
          // (split payouts replace distributor actuals). If the split exists but has
          // no distributions yet, keep the CSV data as a fallback.
          if (trackId && trackToSplit[trackId] && splitsWithDistributions.has(trackToSplit[trackId])) continue;

          masterActualsTotal += earnings;
          if (trackId) {
            masterActualsByTrack[trackId] = (masterActualsByTrack[trackId] || 0) + earnings;
          }
          masterByPlatform[platform] = (masterByPlatform[platform] || 0) + earnings;
          masterByMonth[month] = (masterByMonth[month] || 0) + earnings;
        }
      }
    }
  }

  // 6. Determine data source and calculate totals
  const hasSplitEarnings = splitEarningsTotal > 0;
  const hasPublishing = publishingTotal > 0;

  let dataSource: DataSource;
  if (hasActuals || hasSplitEarnings) {
    dataSource = "actuals";
  } else {
    dataSource = "oracle";
  }

  // If oracle-only, return null (caller falls back to oracle logic)
  if (dataSource === "oracle") return null;

  const masterEarnings = masterActualsTotal + splitEarningsTotal;
  const totalEarnings = masterEarnings + publishingTotal;

  // 7. Build monthly data (merge master + publishing + split by month)
  const allMonths = new Set([
    ...Object.keys(masterByMonth),
    ...Object.keys(publishingByMonth),
    ...Object.keys(splitByMonth),
  ]);
  const monthlyData = Array.from(allMonths)
    .filter((m) => m !== "unknown")
    .sort()
    .map((month) => ({
      month: new Date(month + "-01").toLocaleDateString("en", {
        month: "short",
        year: "2-digit",
      }),
      master: Math.round(((masterByMonth[month] || 0) + (splitByMonth[month] || 0)) * 100) / 100,
      publishing: Math.round((publishingByMonth[month] || 0) * 100) / 100,
    }));

  // 8. Build platform data (merge master + publishing platforms)
  const allPlatforms: Record<string, number> = {};
  for (const [p, e] of Object.entries(masterByPlatform)) {
    allPlatforms[p] = (allPlatforms[p] || 0) + e;
  }
  for (const [p, e] of Object.entries(publishingByPlatform)) {
    allPlatforms[p] = (allPlatforms[p] || 0) + e;
  }

  const platformData = Object.entries(allPlatforms)
    .sort((a, b) => b[1] - a[1])
    .map(([platform, earnings]) => ({
      platform: PLATFORM_LABELS[platform] || platform,
      earnings: Math.round(earnings * 100) / 100,
      color: PLATFORM_COLORS[platform] || "#888",
    }));

  // 9. Find top track
  const allTrackEarnings: Record<string, number> = {};
  for (const [tid, e] of Object.entries(masterActualsByTrack)) {
    allTrackEarnings[tid] = (allTrackEarnings[tid] || 0) + e;
  }
  for (const [tid, e] of Object.entries(splitEarningsByTrack)) {
    allTrackEarnings[tid] = (allTrackEarnings[tid] || 0) + e;
  }

  const topTrackEntry = Object.entries(allTrackEarnings).sort((a, b) => b[1] - a[1])[0];
  let topTrack = null;
  if (topTrackEntry) {
    const track = tracks.find((t) => t.id === topTrackEntry[0]);
    if (track) {
      topTrack = { title: track.title, earnings: topTrackEntry[1] };
    }
  }

  // 10. Last 12 months
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setFullYear(twelveMonthsAgo.getFullYear() - 1);
  const twelveMonthStr = twelveMonthsAgo.toISOString().slice(0, 7);

  let last12Months = 0;
  for (const [month, amount] of Object.entries(masterByMonth)) {
    if (month >= twelveMonthStr) last12Months += amount;
  }
  for (const [month, amount] of Object.entries(publishingByMonth)) {
    if (month >= twelveMonthStr) last12Months += amount;
  }
  for (const [month, amount] of Object.entries(splitByMonth)) {
    if (month >= twelveMonthStr) last12Months += amount;
  }

  return {
    totalEarnings: Math.round(totalEarnings * 100) / 100,
    masterEarnings: Math.round(masterEarnings * 100) / 100,
    publishingEarnings: Math.round(publishingTotal * 100) / 100,
    splitEarnings: Math.round(splitEarningsTotal * 100) / 100,
    last12Months: Math.round(last12Months * 100) / 100,
    monthlyData,
    platformData,
    topTrack,
    trackCount: tracks.length,
    dataSource: hasPublishing ? "mixed" : "actuals",
  };
}
