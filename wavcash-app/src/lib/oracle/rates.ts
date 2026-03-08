import { SupabaseClient } from "@supabase/supabase-js";

/**
 * Oracle Rate Resolver
 *
 * Resolves the best available per-stream rate for a given platform/country/period.
 * Uses a fallback chain:
 *   1. Community calibrated rate (trimmed median from qualified user Actuals)
 *   2. Seed rate with country specificity (dsp_rates table)
 *   3. Global seed rate (dsp_rates with country=null)
 *
 * CRITICAL: The calibrated rate is a FAIR MARKET rate, not an observed rate.
 * Data points where actual rate < 50% of fair rate are excluded from calibration
 * to prevent the oracle from normalizing underpayment.
 */

export interface ResolvedRate {
  rate: number;
  source: "calibrated" | "seed_country" | "seed_global" | "default";
  confidence: "low" | "medium" | "high";
  platform: string;
  country: string | null;
}

const DEFAULT_RATES: Record<string, number> = {
  spotify: 0.004,
  apple_music: 0.01,
  youtube_music: 0.002,
  amazon_music: 0.005,
  tidal: 0.013,
  deezer: 0.004,
};

/**
 * Resolve the best per-stream rate for a platform/country/period.
 */
export async function resolveRate(
  supabase: SupabaseClient,
  platform: string,
  country: string | null,
  period?: string
): Promise<ResolvedRate> {
  const normalizedPlatform = platform.toLowerCase().replace(/\s+/g, "_");

  // 1. Try calibrated community rate (highest priority)
  if (period) {
    const { data: calibrated } = await supabase
      .from("calibrated_rates")
      .select("fair_rate, confidence, sample_size")
      .eq("platform", normalizedPlatform)
      .eq("country", country)
      .eq("period", period)
      .single();

    // Only use if sample size >= 10 (medium+ confidence)
    if (calibrated && calibrated.sample_size >= 10) {
      return {
        rate: Number(calibrated.fair_rate),
        source: "calibrated",
        confidence: calibrated.confidence as "low" | "medium" | "high",
        platform: normalizedPlatform,
        country,
      };
    }
  }

  // 2. Try seed rate with country specificity
  if (country) {
    const { data: countryRate } = await supabase
      .from("dsp_rates")
      .select("rate_per_stream")
      .eq("platform", normalizedPlatform)
      .eq("country", country)
      .order("effective_date", { ascending: false })
      .limit(1)
      .single();

    if (countryRate) {
      return {
        rate: Number(countryRate.rate_per_stream),
        source: "seed_country",
        confidence: "medium",
        platform: normalizedPlatform,
        country,
      };
    }
  }

  // 3. Try global seed rate
  const { data: globalRate } = await supabase
    .from("dsp_rates")
    .select("rate_per_stream")
    .eq("platform", normalizedPlatform)
    .is("country", null)
    .order("effective_date", { ascending: false })
    .limit(1)
    .single();

  if (globalRate) {
    return {
      rate: Number(globalRate.rate_per_stream),
      source: "seed_global",
      confidence: "low",
      platform: normalizedPlatform,
      country: null,
    };
  }

  // 4. Hardcoded default (last resort)
  return {
    rate: DEFAULT_RATES[normalizedPlatform] || 0.003,
    source: "default",
    confidence: "low",
    platform: normalizedPlatform,
    country: null,
  };
}

/**
 * Resolve rates for multiple platforms at once (batch).
 */
export async function resolveRates(
  supabase: SupabaseClient,
  requests: { platform: string; country: string | null; period?: string }[]
): Promise<ResolvedRate[]> {
  return Promise.all(
    requests.map((r) => resolveRate(supabase, r.platform, r.country, r.period))
  );
}
