import { SupabaseClient } from "@supabase/supabase-js";
import { resolveRate } from "./rates";

/**
 * Rate Calibration Engine
 *
 * After a user uploads Actuals, this module:
 * 1. Derives observed per-stream rates from earnings/streams
 * 2. Compares each against the current fair market rate
 * 3. Classifies: qualified (≥50% of fair) or flagged_underpayment (<50%)
 * 4. Recalculates the community calibrated rate from qualified data points
 *
 * BIAS PROTECTION: Data points where the observed rate is <50% of the fair rate
 * are excluded from calibration. This prevents the oracle from normalizing
 * systematic underpayment — which is the exact problem WavCash exists to detect.
 */

const UNDERPAYMENT_THRESHOLD = 0.5; // 50% — below this, flag as underpayment
const MIN_STREAMS_FOR_OBSERVATION = 100; // Ignore tiny stream counts (noisy)
const MIN_SAMPLES_FOR_CALIBRATION = 10; // Don't override seed rate without enough data

export interface CalibrationResult {
  observations_created: number;
  qualified: number;
  flagged_underpayment: number;
  excluded_low_streams: number;
  rates_updated: number;
}

/**
 * Process a completed statement for rate calibration.
 * Called after the match API has matched statement lines to tracks.
 */
export async function calibrateFromStatement(
  supabase: SupabaseClient,
  statementId: string,
  userId: string
): Promise<CalibrationResult> {
  const result: CalibrationResult = {
    observations_created: 0,
    qualified: 0,
    flagged_underpayment: 0,
    excluded_low_streams: 0,
    rates_updated: 0,
  };

  // Get matched statement lines with streams and earnings
  const { data: lines } = await supabase
    .from("statement_lines")
    .select("id, platform, country, streams, earnings, period")
    .eq("statement_id", statementId)
    .not("matched_track_id", "is", null)
    .gt("streams", 0)
    .gt("earnings", 0);

  if (!lines || lines.length === 0) return result;

  // Track which platform/country/period combos need recalculation
  const recalcKeys = new Set<string>();

  for (const line of lines) {
    const streams = Number(line.streams);
    const earnings = Number(line.earnings);
    const platform = (line.platform || "spotify").toLowerCase().replace(/\s+/g, "_");
    const country = line.country || null;
    const period = line.period || new Date().toISOString().slice(0, 7); // YYYY-MM

    // Skip low-stream observations (too noisy)
    if (streams < MIN_STREAMS_FOR_OBSERVATION) {
      result.excluded_low_streams++;

      await supabase.from("rate_observations").insert({
        statement_line_id: line.id,
        user_id: userId,
        platform,
        country,
        period,
        streams,
        earnings,
        observed_rate: earnings / streams,
        calibration_status: "excluded_low_streams",
      });

      result.observations_created++;
      continue;
    }

    const observedRate = earnings / streams;

    // Get the current fair market rate for comparison
    const resolved = await resolveRate(supabase, platform, country, period);
    const fairRate = resolved.rate;

    // Classify: is this a legitimate rate or potential underpayment?
    let status: string;
    if (observedRate >= fairRate * UNDERPAYMENT_THRESHOLD) {
      status = "qualified";
      result.qualified++;
    } else {
      status = "flagged_underpayment";
      result.flagged_underpayment++;
    }

    // Store the observation
    await supabase.from("rate_observations").insert({
      statement_line_id: line.id,
      user_id: userId,
      platform,
      country,
      period,
      streams,
      earnings,
      observed_rate: observedRate,
      calibration_status: status,
      reference_fair_rate: fairRate,
    });

    result.observations_created++;

    // Track this combo for recalculation
    recalcKeys.add(`${platform}|${country || ""}|${period}`);
  }

  // Recalculate calibrated rates for affected combos
  for (const key of recalcKeys) {
    const [platform, country, period] = key.split("|");
    const updated = await recalculateCalibratedRate(
      supabase,
      platform,
      country || null,
      period
    );
    if (updated) result.rates_updated++;
  }

  return result;
}

/**
 * Recalculate the calibrated fair market rate for a platform/country/period
 * using the trimmed median of qualified observations.
 */
async function recalculateCalibratedRate(
  supabase: SupabaseClient,
  platform: string,
  country: string | null,
  period: string
): Promise<boolean> {
  // Get all qualified observations for this combo
  let query = supabase
    .from("rate_observations")
    .select("observed_rate")
    .eq("platform", platform)
    .eq("period", period)
    .eq("calibration_status", "qualified")
    .order("observed_rate", { ascending: true });

  if (country) {
    query = query.eq("country", country);
  } else {
    query = query.is("country", null);
  }

  const { data: observations } = await query;

  if (!observations || observations.length === 0) return false;

  // Get ALL observations (including flagged) for the observed_rate aggregate
  let allQuery = supabase
    .from("rate_observations")
    .select("observed_rate, calibration_status")
    .eq("platform", platform)
    .eq("period", period)
    .in("calibration_status", ["qualified", "flagged_underpayment"]);

  if (country) {
    allQuery = allQuery.eq("country", country);
  } else {
    allQuery = allQuery.is("country", null);
  }

  const { data: allObservations } = await allQuery;

  const rates = observations.map((o) => Number(o.observed_rate));
  const totalCount = allObservations?.length || rates.length;
  const flaggedCount =
    allObservations?.filter((o) => o.calibration_status === "flagged_underpayment").length || 0;

  // Calculate trimmed median (drop top/bottom 10%)
  const fairRate = trimmedMedian(rates, 0.1);

  // Calculate raw observed rate (mean of all, for reference)
  const allRates = (allObservations || []).map((o) => Number(o.observed_rate));
  const observedRate =
    allRates.length > 0
      ? allRates.reduce((a, b) => a + b, 0) / allRates.length
      : fairRate;

  // Determine confidence
  let confidence: string;
  if (rates.length >= 50) confidence = "high";
  else if (rates.length >= MIN_SAMPLES_FOR_CALIBRATION) confidence = "medium";
  else confidence = "low";

  // Upsert the calibrated rate
  const { error } = await supabase.from("calibrated_rates").upsert(
    {
      platform,
      country,
      period,
      fair_rate: Math.round(fairRate * 1000000) / 1000000, // 6 decimal precision
      observed_rate: Math.round(observedRate * 1000000) / 1000000,
      sample_size: rates.length,
      confidence,
      flagged_count: flaggedCount,
    },
    {
      onConflict: "platform,country,period",
    }
  );

  return !error;
}

/**
 * Calculate trimmed median: sort, drop top/bottom `trim` fraction, take median.
 */
function trimmedMedian(values: number[], trim: number): number {
  if (values.length === 0) return 0;
  if (values.length <= 2) return values.reduce((a, b) => a + b, 0) / values.length;

  const sorted = [...values].sort((a, b) => a - b);
  const trimCount = Math.floor(sorted.length * trim);
  const trimmed = sorted.slice(trimCount, sorted.length - trimCount);

  if (trimmed.length === 0) return sorted[Math.floor(sorted.length / 2)];

  // Median of trimmed array
  const mid = Math.floor(trimmed.length / 2);
  if (trimmed.length % 2 === 0) {
    return (trimmed[mid - 1] + trimmed[mid]) / 2;
  }
  return trimmed[mid];
}
