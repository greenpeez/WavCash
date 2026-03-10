# Royalty Sniffer
> Public tool that estimates unclaimed royalties for any Spotify artist: no login required.

## Overview

The Royalty Sniffer is WavCash's top-of-funnel acquisition tool. Any visitor can paste a Spotify artist URL and instantly see estimated royalty earnings broken down by DSP platform. It serves two purposes:

1. **Lead generation**: demonstrates WavCash's value proposition before signup
2. **Data seeding**: stores results in `sniffer_results` for pre-populating dashboard data after signup

The Sniffer is publicly accessible at `/sniffer` and requires no authentication.

---

## User Flow

1. User arrives at `/sniffer` (linked from landing page hero CTA)
2. Pastes a Spotify artist URL into the input field (e.g., `https://open.spotify.com/artist/3qm6nPuzMixnwycBHt663w`)
3. Clicks "Sniff" button
4. Loading spinner appears while API processes
5. Results render: download banner + artist card with data source badge + stat cards + per-track breakdown + per-DSP platform breakdown + signup hook + CTA
6. User can download a branded PDF report
7. Same link cannot be checked again (one-time check per artist per device/IP)
8. CTA prompts user to create a free account to scan their full catalog

---

## File Map

| File | Purpose |
|------|---------|
| `src/app/(public)/sniffer/page.tsx` | Frontend page component |
| `src/app/api/sniffer/route.ts` | Backend API endpoint |
| `src/lib/spotify/client.ts` | Spotify API client (shared with onboarding) |
| `src/lib/rapidapi/streams.ts` | RapidAPI stream count client |
| `src/lib/supabase/server.ts` | Service role client for rate-limit tracking |
| `supabase/seed.sql` | DSP rates seed data |

---

## Pages & Components

### `/sniffer` - Sniffer Page

**Component:** `SnifferPage` (client component: `"use client"`)

**Background:** Mercury WebGL canvas (water ripple surface) rendered behind the UI.

**State:**
```typescript
const [url, setUrl] = useState("")           // Spotify URL input
const [loading, setLoading] = useState(false) // Loading state
const [error, setError] = useState("")        // Error message
const [result, setResult] = useState(null)    // API response data
```

**Header Navigation:**
- WavCash logo (links to `/`)
- Nav links: Royalty Sniffer (active), Splits (`/splits`), Reclaim, Pricing (`/pricing`)
- Right side: Theme toggle + CTA button ("Get Started" or "My Dashboard", conditional on Privy auth state)

**Footer:**
- Legal: Terms (`/terms`), Privacy Policy (`/privacy`)
- Docs: FAQs (`/docs`), White paper (`/docs`)
- Social: X (`x.com/wavcash`), Email (`hello@wav.cash`)

**UI Sections (conditional rendering based on `result`):**

1. **Input Form** (always visible)
   - Glass-styled input for Spotify URL (`.glass-input` with `backdrop-filter: blur(12px)`)
   - "Sniff" button with Search icon (`.btn-primary`)
   - Loading state: button disabled, spinner

2. **Error State** (`error !== null`)
   - AlertCircle icon + red text message
   - One-time check errors: "You've already sniffed this artist's royalties. Sign up to unlock unlimited searches."

3. **Results** (`result !== null`)
   - **Download Banner**: Accent-tinted background with warning text + "Download PDF" button
   - **Artist Card** (`.glass-card`): name, green "Real stream data" badge (when `data_source === "rapidapi"`), genres, total estimated earnings
   - **Stat Cards**: Total Streams + Top Tracks Analyzed
   - **Track Breakdown Table** (`.glass-table`): Title, ISRC, Total Streams, Total Earnings
   - **Platform Breakdown Table**: Platform, Rate/Stream, Total Streams, Total Earnings
   - **Signup Hook**: "This covers your top X tracks. Sign up to scan your full catalog."
   - **Disclaimer**: text varies by data source
   - **CTA**: "Claim your earnings" card with signup/dashboard link

**PDF Download:**
- Uses `html2pdf.js` (dynamic import) matching the splits page pattern
- Branded layout: WavCash logo, artist name, date, data source indicator
- Two stat boxes (Total Streams, Total Estimated Earnings)
- Track Breakdown table (Title, ISRC, Total Streams, Total Earnings)
- Platform Breakdown table (Platform, Rate/Stream, Total Streams, Total Earnings)
- Signup hook + disclaimer + wavcash.com footer

**One-Time Check (Client-Side):**
- `extractArtistIdClient(url)`: regex to extract Spotify artist ID
- `getSniffedUrls()` / `addSniffedUrl(id)`: localStorage key `"wavcash-sniffed-urls"` (JSON array of artist IDs)
- In `doSearch()`, before fetch: if not logged in, check localStorage. Block if artist ID already stored.
- After successful result: persist artist ID to localStorage.

**Dev Bypass:** When `NEXT_PUBLIC_DEV_BYPASS=true`, shows a dev shortcut for testing without hitting Spotify API.

**Styling:**
- Frosted glass cards with `backdrop-filter: blur(20px)`
- CSS custom properties: `--accent`, `--bg-surface`, `--text-secondary`, `--text-tertiary`
- Font families: General Sans (headings), JetBrains Mono (ISRC codes, numbers), Plus Jakarta Sans (body)
- Full dark/light mode support via CSS variables
- Mercury canvas reveal pattern (sets `body.style.opacity = "1"` after first frame)

---

## API Endpoints

### `POST /api/sniffer`

**Auth:** None (public endpoint)

**Request:**
```typescript
{
  spotifyUrl: string  // Spotify artist URL or URI
}
```

**Processing Steps:**

1. **URL Validation**: extracts artist ID via regex (web URL or Spotify URI). Returns 400 if no match.

2. **Rate Limiting**: 2 queries per IP per hour via SHA256 hash of IP, stored in `sniffer_results.ip_hash`.

3. **One-Time Check (Server-Side)**: queries `sniffer_results` for matching `artist_id` + `ip_hash`. Returns 409 if duplicate found.

4. **Cache Check**: returns cached results if the same artist was sniffed within the last 7 days (by any user). Still records the sniff for rate-limiting purposes.

5. **Spotify Data Fetch** (Client Credentials flow):
   - Get access token via `getClientCredentialsToken()`
   - Fetch artist: `GET /artists/{artistId}`
   - Paginate all albums/singles: `GET /artists/{artistId}/albums?include_groups=single,album&limit=10&offset=N` (up to 50 releases)
   - Fetch each album in parallel: `GET /albums/{albumId}` to get track lists
   - Note: `/top-tracks` returns 403 for dev-mode Spotify apps, so we discover tracks via album enumeration instead

6. **Track Collection & Dedup**:
   - Albums sorted oldest-first so each track gets its earliest release date
   - Dedup by track ID and exact normalized name (lowercase, alphanumeric only)
   - All unique tracks sorted oldest-first (older tracks have more accumulated streams)
   - Cap at 30 candidates for RapidAPI

7. **RapidAPI Stream Counts** (sequential, graceful fallback):
   - Call `fetchBulkStreamCounts(trackIds)` from `src/lib/rapidapi/streams.ts`
   - Sequential requests with 1.2s delay between each to stay under per-second rate limits
   - 2s extra backoff on 429 responses; stops after 3 consecutive 429s (key exhausted)
   - Non-429 failures (404, no data) skip the track without affecting the rate limit streak
   - Returns `Map<trackId, count>` of successful fetches

8. **Earnings Calculation**:
   - Fetches Spotify rate from `dsp_rates` table (global rates where `country IS NULL`)
   - Sorts tracks by actual stream count descending, takes top 10
   - Calculates per-track earnings: `streams * spotifyRate`

7. **Result Storage**: inserts into `sniffer_results`:
   ```typescript
   { spotify_url, artist_name, artist_id, results: fullResponseJSON, ip_hash }
   ```

**Success Response (200):**
```typescript
{
  artist: {
    name: string;
    image_url: string | null;
    genres: string[];
    popularity: number;
    spotify_id: string;
  };
  tracks: Array<{
    title: string;
    isrc: string | null;
    album: string;
    album_art_url: string | null;
    popularity: number;
    total_streams: number;
    dsp_breakdown: Array<{
      platform: string;
      streams: number;
      rate: number;
      earnings: number;
    }>;
    total_estimated_earnings: number;
    data_source: "rapidapi" | "heuristic";
  }>;
  total_streams: number;
  total_estimated_earnings: number;
  data_source: "rapidapi" | "heuristic";
  disclaimer: string;
}
```

**Error Responses:**
| Status | Body | Condition |
|--------|------|-----------|
| 400 | `{ error: "Please provide a Spotify URL" }` | Missing URL |
| 400 | `{ error: "Invalid Spotify artist URL..." }` | Bad format |
| 409 | `{ error: "You've already sniffed this artist's royalties..." }` | Duplicate artist + IP |
| 429 | `{ error: "Rate limit reached..." }` | 2+ queries/hour |
| 503 | `{ error: "Rate data unavailable..." }` | No DSP rates seeded |
| 500 | `{ error: "Failed to fetch data..." }` | Spotify API or other error |

---

## Database Schema

### `sniffer_results`
```sql
CREATE TABLE public.sniffer_results (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  spotify_url text NOT NULL,
  artist_name text,
  artist_id   text,                 -- Spotify artist ID for duplicate checks
  results     jsonb NOT NULL,       -- Full API response object
  ip_hash     text,                 -- SHA256 first 16 chars for rate limiting
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX idx_sniffer_results_ip ON public.sniffer_results(ip_hash, created_at);
CREATE INDEX idx_sniffer_results_artist_ip ON public.sniffer_results(artist_id, ip_hash);
```

### `dsp_rates` (read by Sniffer)
```sql
CREATE TABLE public.dsp_rates (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform        text NOT NULL,
  country         text,                    -- null = global rate
  rate_per_stream numeric(10,6) NOT NULL,
  effective_date  date NOT NULL,
  source          text DEFAULT 'manual',
  created_at      timestamptz DEFAULT now()
);
```

**Sniffer queries global rates only** (WHERE `country IS NULL`).

---

## External Integrations

### Spotify Web API (Client Credentials Flow)

**Token Exchange:**
```
POST https://accounts.spotify.com/api/token
Authorization: Basic {base64(SPOTIFY_CLIENT_ID:SPOTIFY_CLIENT_SECRET)}
Content-Type: application/x-www-form-urlencoded
Body: grant_type=client_credentials
```

**Endpoints Called:**
- `GET /v1/artists/{id}`: Artist metadata (name, images, genres, popularity)
- `GET /v1/artists/{id}/albums?include_groups=single,album&limit=10&offset=N`: Paginate all releases (up to 50)
- `GET /v1/albums/{id}`: Individual album with track listing

**Dev-mode Restrictions (Nov 2024):**
Spotify dev-mode apps cannot access `/top-tracks`, batch `/tracks`, or batch `/albums` endpoints (all return 403). Track discovery uses album-by-album enumeration instead.

### RapidAPI: Spotify Stream Count

**Provider:** MusicAnalyticsApi on RapidAPI
**Host:** `spotify-stream-count.p.rapidapi.com`

**Endpoint:**
```
GET /v1/spotify/tracks/{trackId}/streams
Headers:
  x-rapidapi-host: spotify-stream-count.p.rapidapi.com
  x-rapidapi-key: {RAPIDAPI_KEY}
```

**Response:** Array of `{ date: string, streams: number }` sorted chronologically.
The `streams` field is cumulative all-time count. The last entry contains the current total.

**Behavior:**
- `fetchTrackStreamCount(trackId)`: single track, 8-second timeout, returns `{ count: number | null, rateLimited: boolean }`
- `fetchBulkStreamCounts(trackIds[])`: sequential with 1.2s delay, returns `Map<trackId, count>`
- Rate limit handling: 2s extra backoff on 429, stops after 3 consecutive 429s
- Graceful fallback: returns `null` if env var missing, API fails, or response shape unexpected

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SPOTIFY_CLIENT_ID` | Yes | Spotify app client ID |
| `SPOTIFY_CLIENT_SECRET` | Yes | Spotify app client secret |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | For writing sniffer_results (bypasses RLS) |
| `RAPIDAPI_KEY` | No | RapidAPI key for real stream counts. Falls back to heuristic if absent. |

---

## Business Logic

### Stream Data Sources

**Primary (RapidAPI):** Real all-time play counts from Spotify via MusicAnalyticsApi. Shows green "Real stream data" badge in UI.

**Fallback (Heuristic):** Popularity-to-total-streams mapping when RapidAPI is unavailable:
```
Popularity 0-20:   ~0 - 100,000 total streams
Popularity 20-40:  ~100,000 - 1,000,000 total streams
Popularity 40-60:  ~1,000,000 - 10,000,000 total streams
Popularity 60-80:  ~10,000,000 - 100,000,000 total streams
Popularity 80-100: ~100,000,000+ total streams
```

### One-Time Check

**Client-side:** localStorage stores array of sniffed artist IDs. Blocks repeat searches for unauthenticated users before making API call.

**Server-side:** Queries `sniffer_results` for matching `artist_id` + `ip_hash`. Blocks duplicate regardless of localStorage state.

**Bypass:** Logged-in users (Privy authenticated) skip the client-side check. Server-side check applies to all anonymous users.

### Rate Limiting

- **Limit:** 2 requests per IP per hour
- **Mechanism:** IP hashed with SHA256, stored in `sniffer_results.ip_hash`
- **Window:** Rolling 1-hour window (`created_at >= NOW() - interval '1 hour'`)

### DSP Market Share Allocation

The Sniffer assumes a fixed platform distribution for every artist. Actual distribution varies by genre, region, and audience demographics.

| Platform | Share | Global Rate |
|----------|-------|-------------|
| Spotify | 60% | $0.0035/stream |
| Apple Music | 15% | $0.006/stream |
| YouTube Music | 12% | $0.002/stream |
| Amazon Music | 8% | $0.004/stream |
| Tidal | 5% | $0.009/stream |

---

## Known Limitations

1. **Top 10 by stream count from 30 candidates**: With dev-mode Spotify restrictions and per-track RapidAPI calls, we can only query 30 tracks per sniff. Artists with 50+ tracks may have mid-catalog hits missed if they fall outside the oldest-30 window.
2. **Spotify-only earnings**: Currently only calculates Spotify earnings (no cross-platform DSP breakdown). Uses Spotify rate from `dsp_rates` table.
3. **No country-specific rates**: Sniffer uses global rates only.
4. **Rate limit is IP-only**: Shared IPs (offices, cafes) may hit limits unfairly.
5. **7-day result caching**: Cached results are shared across all users for the same artist. Stream counts may be slightly stale within the cache window.
6. **RapidAPI rate limits**: Sequential 1.2s delay per track means 30 tracks takes ~36 seconds. Back-to-back tests can exhaust API quota.

---
---

# Post-Beta Roadmap: Soundcharts Integration

## API Strategy
- **Beta (current)**: RapidAPI for sniffer (cheap, low stakes, top 10 tracks only)
- **Post-beta**: Soundcharts for authenticated users (oracle, actuals, dashboard). $250/month for 500K queries
- **Long-term**: Soundcharts replaces RapidAPI in sniffer too (better data, ISRC lookup, full catalog)

## Soundcharts API Overview
- **Auth**: `x-app-id` + `x-api-key` headers
- **Base URL**: `https://customer.api.soundcharts.com`
- **Sandbox**: Free credentials (`soundcharts`/`soundcharts`) for development
- **Quota**: 500K queries/month base, 10K/minute recommended max, scales to 100M+
- **Data**: 16M+ artists, 84M+ songs, 4 years of history, 12+ platforms

## Key Endpoints for WavCash

| Endpoint | Use Case |
|----------|----------|
| `/artist/by-platform/spotify/{id}` | Resolve Spotify artist ID to Soundcharts UUID |
| `/artist/{uuid}/songs` | Get full catalog (not just top 10) |
| `/song/by-isrc/{isrc}` | Match uploaded statement lines to Soundcharts songs |
| `/song/{uuid}/audience/{platform}` | Daily stream counts per platform (time-series) |
| `/song/{uuid}/playlist/current/{platform}` | Current playlist placements |
| `/song/{uuid}/charts/ranks/{platform}` | Chart positions |
| `/song/{uuid}/broadcasts` | Radio spins |
| `/artist/{uuid}/streaming/{platform}/listening` | Streaming audience data |

### Supported Platforms for Stream Counts
Spotify, YouTube, Deezer, SoundCloud, and others (exact platform coverage for stream counts to be confirmed via sandbox testing; some platforms only support audience/playlist data, not stream counts)

## Phase 1: Sniffer Migration (replace RapidAPI)

**What changes:**
- Swap `src/lib/rapidapi/streams.ts` for `src/lib/soundcharts/client.ts`
- Look up artist by Spotify ID, get Soundcharts UUID
- Pull actual daily stream counts (not just all-time totals)
- Show daily/weekly/monthly streams with real time-series data
- Full catalog available (not limited to top 10)
- Cache Soundcharts responses in new `soundcharts_artist_cache` table

**User impact:** More accurate numbers, more platforms shown

## Phase 2: Oracle Snapshot Automation

**The problem:** `oracle_snapshots` table is empty. No cron job feeds it. The dashboard earnings chart has no data.

**Solution:**
- New cron endpoint: `src/app/api/cron/populate-snapshots/route.ts`
- Runs daily at 00:00 UTC
- For each user with connected Spotify: pull yesterday's streams per track per platform from Soundcharts
- Write to `oracle_snapshots` table with calibrated fair market rates
- Dashboard area chart finally works with real data

**New table:**
```sql
CREATE TABLE public.soundcharts_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id uuid NOT NULL REFERENCES public.tracks ON DELETE CASCADE,
  platform text NOT NULL,
  snapshot_date date NOT NULL,
  streams bigint NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(track_id, platform, snapshot_date)
);
```

## Phase 3: Actuals Enhancement

**The problem:** When users upload CSV statements, discrepancy detection compares actual earnings against `streams x seed_rate`. The stream count comes from the popularity heuristic, so discrepancy signals are noisy.

**Solution:**
- After ISRC match in `src/app/api/actuals/match/route.ts`, query Soundcharts for actual streams on that period + platform
- Use `actual_soundcharts_streams x calibrated_fair_rate` as the oracle estimate
- Gap between oracle estimate and actual payout becomes a real underpayment signal
- Add `soundcharts_streams` column to `rate_observations` for better calibration

**User impact:** "You earned $3,000 from 1M streams. At fair market rate, you should have earned $4,000. You're being underpaid by 25%."

## Phase 4: Dashboard Enrichment

- Per-track detail pages with stream history charts (Soundcharts time-series)
- Real platform breakdown (not the fixed 60/15/12/8/5 assumption)
- Playlist placement tracking: "Your song was added to 12 playlists this month"
- Radio airplay monitoring: "Your song was played 47 times across 8 stations"
- "Expected vs Actual" comparison cards on the dashboard
- CSV/PDF export of earnings reports

## Phase 5: Catalog Intelligence (future)

- Full catalog scan via `/artist/{uuid}/songs` (not just top 10)
- Automatic ISRC matching across user's entire discography
- "Unclaimed royalties" detection: streams on platforms where user has no distributor
- Genre/mood analysis via Soundcharts lyrics analysis endpoints
- Similar artist discovery for A&R and marketing insights

## Schema Additions Summary

```sql
-- Cache Soundcharts API responses
CREATE TABLE public.soundcharts_artist_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  spotify_artist_id text UNIQUE NOT NULL,
  artist_name text,
  snapshot_date date NOT NULL,
  tracks_data jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Daily stream snapshots from Soundcharts
CREATE TABLE public.soundcharts_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id uuid NOT NULL REFERENCES public.tracks ON DELETE CASCADE,
  platform text NOT NULL,
  snapshot_date date NOT NULL,
  streams bigint NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(track_id, platform, snapshot_date)
);

-- Extend rate observations with Soundcharts data
ALTER TABLE public.rate_observations
ADD COLUMN soundcharts_streams bigint,
ADD COLUMN soundcharts_gap_pct numeric(6,2);
```

## Env Variables
```
SOUNDCHARTS_APP_ID=       # Soundcharts x-app-id header
SOUNDCHARTS_API_KEY=      # Soundcharts x-api-key header
```
