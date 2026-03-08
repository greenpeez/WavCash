# Royalty Sniffer
> Public tool that estimates unclaimed royalties for any Spotify artist — no login required.

## Overview

The Royalty Sniffer is WavCash's top-of-funnel acquisition tool. Any visitor can paste a Spotify artist URL and instantly see estimated royalty earnings broken down by DSP platform. It serves two purposes:

1. **Lead generation** — demonstrates WavCash's value proposition before signup
2. **Data seeding** — stores results in `sniffer_results` for pre-populating dashboard data after signup

The Sniffer is publicly accessible at `/sniffer` and requires no authentication.

---

## User Flow

1. User arrives at `/sniffer` (linked from landing page hero CTA)
2. Pastes a Spotify artist URL into the input field (e.g., `https://open.spotify.com/artist/3qm6nPuzMixnwycBHt663w`)
3. Clicks "Sniff" button
4. Loading spinner appears while API processes
5. Results render: artist card + per-track breakdown + per-DSP platform breakdown + annual estimate
6. Disclaimer shown about estimation accuracy
7. CTA prompts user to create a free account to upload actual statements

---

## File Map

| File | Purpose |
|------|---------|
| `src/app/(public)/sniffer/page.tsx` | Frontend page component |
| `src/app/api/sniffer/route.ts` | Backend API endpoint |
| `src/lib/spotify/client.ts` | Spotify API client (shared with onboarding) |
| `src/lib/supabase/server.ts` | Service role client for rate-limit tracking |
| `supabase/seed.sql` | DSP rates seed data |

---

## Pages & Components

### `/sniffer` — Sniffer Page

**Component:** `SnifferPage` (client component — `"use client"`)

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
- Right side (conditional on Privy auth state):
  - **If authenticated:** "My Dashboard" button (class `btn-cta`, links to `/dashboard`)
  - **If not authenticated:** "Sign in" link + "Get Started" link (both to `/login`)

**UI Sections (conditional rendering based on `result`):**

1. **Input Form** (always visible)
   - Glass-styled input for Spotify URL (`.glass-input` with `backdrop-filter: blur(12px)`)
   - "Sniff" button with Search icon (`.btn-primary`)
   - Loading state: button disabled, Loader2 spinner

2. **Error State** (`error !== ""`)
   - AlertCircle icon + red text message

3. **Results** (`result !== null`)
   - **Artist Card** (`.glass-card`): image, name, genres array (as badges), annual estimate in large text
   - **Stats Row**: monthly estimate, track count
   - **Track Breakdown Table** (`.glass-table`): Title, ISRC, Est. Monthly Streams, Monthly Earnings
   - **Platform Breakdown Table**: Platform, Rate/Stream, Est. Streams, Est. Earnings
   - **Disclaimer**: italic text explaining estimation methodology
   - **CTA**: "Upload your actual statements to find missing money" → links to `/signup`

**Dev Bypass:** When `NEXT_PUBLIC_DEV_BYPASS=true`, shows a dev shortcut for testing without hitting Spotify API.

**Styling:**
- Frosted glass cards with `backdrop-filter: blur(20px)`
- CSS custom properties: `--accent`, `--bg-surface`, `--text-secondary`, `--text-tertiary`
- Font families: `--font-general-sans` (headings), `--font-jetbrains` (ISRC codes)
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

1. **URL Validation** — extracts artist ID via regex:
   - `spotify.com/artist/{id}` (web URL)
   - `spotify:artist:{id}` (Spotify URI)
   - Returns 400 if no match

2. **Rate Limiting** — 2 queries per IP per hour:
   - Computes IP hash: `SHA256(ip).substring(0, 16)`
   - Queries `sniffer_results` where `ip_hash = hash AND created_at >= 1 hour ago`
   - Returns 429 if count >= 2

3. **Spotify Data Fetch** (Client Credentials flow):
   - Get access token via `getClientCredentialsToken()`
   - Fetch artist: `GET /artists/{artistId}`
   - Fetch top tracks: `GET /artists/{artistId}/top-tracks?market=US` (max 10)

4. **Stream Estimation** — maps Spotify popularity (0-100) to monthly streams:
   ```
   Popularity 0-20:   ~100 - 1,000 streams
   Popularity 20-40:  ~1,000 - 10,000 streams
   Popularity 40-60:  ~10,000 - 100,000 streams
   Popularity 60-80:  ~100,000 - 1,000,000 streams
   Popularity 80-100: ~1,000,000+ streams
   ```

5. **DSP Breakdown** — allocates streams by market share:
   ```typescript
   const DSP_SHARES = {
     spotify: 0.60,       // 60%
     apple_music: 0.15,   // 15%
     youtube_music: 0.12, // 12%
     amazon_music: 0.08,  // 8%
     tidal: 0.05,         // 5%
   }
   ```
   - Fetches rates from `dsp_rates` table (global rates where `country IS NULL`)
   - Calculates per-platform: `estimated_streams = total_streams * share`, `earnings = streams * rate`

6. **Result Storage** — inserts into `sniffer_results`:
   ```typescript
   { spotify_url, artist_name, results: fullResponseJSON, ip_hash }
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
    estimated_monthly_streams: number;
    dsp_breakdown: Array<{
      platform: string;
      estimated_streams: number;
      rate: number;
      estimated_earnings: number;
    }>;
    total_monthly_estimated: number;
  }>;
  total_annual_estimate: number;
  total_monthly_estimate: number;
  disclaimer: string;
}
```

**Error Responses:**
| Status | Body | Condition |
|--------|------|-----------|
| 400 | `{ error: "Please provide a Spotify URL" }` | Missing URL |
| 400 | `{ error: "Invalid Spotify artist URL..." }` | Bad format |
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
  results     jsonb NOT NULL,       -- Full API response object
  ip_hash     text,                 -- SHA256 first 16 chars for rate limiting
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX idx_sniffer_results_ip ON public.sniffer_results(ip_hash, created_at);
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

## Business Logic

### Stream Estimation Heuristic

Spotify does NOT expose actual stream counts through any public or Web API endpoint. The only signal available is the `popularity` score (0-100), which is a rolling metric based on recent play counts.

The Sniffer uses a logarithmic mapping from popularity to estimated monthly streams. This is an approximation with known inaccuracy of ±50-200%.

### Rate Limiting

- **Limit**: 2 requests per IP per hour
- **Mechanism**: IP hashed with SHA256, stored in `sniffer_results.ip_hash`
- **Window**: Rolling 1-hour window (`created_at >= NOW() - interval '1 hour'`)
- **No bypass**: No API key or auth override

### DSP Market Share Allocation

The Sniffer assumes a fixed platform distribution for every artist. This is a simplification — actual distribution varies by genre, region, and audience demographics. The breakdown is:

| Platform | Share | Global Rate |
|----------|-------|-------------|
| Spotify | 60% | $0.004/stream |
| Apple Music | 15% | $0.010/stream |
| YouTube Music | 12% | $0.002/stream |
| Amazon Music | 8% | $0.005/stream |
| Tidal | 5% | $0.013/stream |

---

## External Integrations

### Spotify Web API — Client Credentials Flow

**Token Exchange:**
```
POST https://accounts.spotify.com/api/token
Authorization: Basic {base64(SPOTIFY_CLIENT_ID:SPOTIFY_CLIENT_SECRET)}
Content-Type: application/x-www-form-urlencoded
Body: grant_type=client_credentials
```

**Endpoints Called:**
- `GET /v1/artists/{id}` — Artist metadata (name, images, genres, popularity)
- `GET /v1/artists/{id}/top-tracks?market=US` — Top 10 tracks with ISRCs

**Key Difference from Onboarding:** The Sniffer uses the Client Credentials flow (app-level auth, no user consent needed) while Onboarding uses Authorization Code flow (user grants access).

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SPOTIFY_CLIENT_ID` | Yes | Spotify app client ID |
| `SPOTIFY_CLIENT_SECRET` | Yes | Spotify app client secret |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | For writing sniffer_results (bypasses RLS) |

---

## Known Limitations & TODOs

1. **Stream estimates are inaccurate** — Popularity score is a poor proxy for actual stream counts. Error margin is ±50-200%.
2. **Top 10 tracks only** — Spotify `top-tracks` endpoint returns at most 10 tracks.
3. **Fixed DSP market shares** — Hardcoded percentages don't reflect any individual artist's actual platform distribution.
4. **No country-specific rates** — Sniffer uses global rates only.
5. **Rate limit is IP-only** — Shared IPs (offices, cafes) may hit limits unfairly.
6. **No result caching** — Every query hits Spotify API, even for the same artist.
