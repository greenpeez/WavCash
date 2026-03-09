/**
 * RapidAPI Spotify Stream Count client
 *
 * Fetches all-time cumulative stream counts for Spotify tracks via
 * the MusicAnalyticsApi on RapidAPI.
 *
 * Endpoint: GET /v1/spotify/tracks/{trackId}/streams
 * Returns:  Array<{ date: string; streams: number }>
 *           (sorted chronologically, last entry = current total)
 */

const RAPIDAPI_HOST = "spotify-stream-count.p.rapidapi.com";
const RAPIDAPI_BASE = `https://${RAPIDAPI_HOST}`;
const TIMEOUT_MS = 8000;

interface StreamResult {
  count: number | null;
  rateLimited: boolean;
}

/**
 * Fetch the all-time stream count for a single Spotify track.
 * Returns the count and whether the request was rate-limited.
 */
export async function fetchTrackStreamCount(
  trackId: string
): Promise<StreamResult> {
  const key = process.env.RAPIDAPI_KEY;
  if (!key) {
    console.warn("RapidAPI: no key configured");
    return { count: null, rateLimited: false };
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const res = await fetch(
      `${RAPIDAPI_BASE}/v1/spotify/tracks/${trackId}/streams`,
      {
        method: "GET",
        headers: {
          "x-rapidapi-host": RAPIDAPI_HOST,
          "x-rapidapi-key": key,
        },
        signal: controller.signal,
      }
    );

    clearTimeout(timer);

    if (!res.ok) {
      console.warn(
        `RapidAPI stream fetch failed for ${trackId}: ${res.status}`
      );
      return { count: null, rateLimited: res.status === 429 };
    }

    const data: unknown = await res.json();

    // Response is an array of { date, streams } sorted chronologically
    if (!Array.isArray(data) || data.length === 0) {
      return { count: null, rateLimited: false };
    }

    const last = data[data.length - 1];

    // Defensive: check multiple possible field names
    const count =
      last?.streams ?? last?.playCount ?? last?.totalStreams ?? null;

    return { count: typeof count === "number" ? count : null, rateLimited: false };
  } catch (err) {
    console.warn(`RapidAPI stream fetch error for ${trackId}:`, err);
    return { count: null, rateLimited: false };
  }
}

/**
 * Fetch stream counts for multiple tracks sequentially.
 * Returns a Map<trackId, count>. Missing / failed tracks are omitted.
 */
export async function fetchBulkStreamCounts(
  trackIds: string[]
): Promise<Map<string, number>> {
  const results = new Map<string, number>();

  if (!process.env.RAPIDAPI_KEY || trackIds.length === 0) return results;

  // Sequential: 1 request per 1.2s to stay under per-second rate limits
  const DELAY_MS = 1200;
  let rateLimitStreak = 0;

  for (let i = 0; i < trackIds.length; i++) {
    if (i > 0) await new Promise((r) => setTimeout(r, DELAY_MS));

    const { count, rateLimited } = await fetchTrackStreamCount(trackIds[i]);

    if (count !== null) {
      results.set(trackIds[i], count);
      rateLimitStreak = 0;
    } else if (rateLimited) {
      rateLimitStreak++;
      // Extra backoff on rate limit
      await new Promise((r) => setTimeout(r, 2000));
      // Stop only after 3 consecutive 429s (key is exhausted)
      if (rateLimitStreak >= 3) {
        console.warn("RapidAPI: 3 consecutive 429s, stopping");
        break;
      }
    }
    // Non-429 failures (404, no data): skip track, don't affect streak
  }

  console.log(`RapidAPI: ${results.size}/${trackIds.length} tracks fetched successfully`);
  return results;
}
