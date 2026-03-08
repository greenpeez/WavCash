# Actuals
> CSV upload, distributor-specific parsing, ISRC matching, discrepancy detection, and a self-calibrating oracle with bias protection.

## Overview

The Actuals feature is the core value engine of WavCash. It allows users to upload royalty statements from their music distributor, parses the data, matches it to their imported track catalog via ISRCs, and compares actual payments against oracle-estimated fair market rates. Discrepancies > 15% are flagged as "missing money."

Additionally, each upload feeds the **self-calibrating oracle** — a system that learns fair market rates from community data while protecting against bias from systematic underpayment.

**Three subsystems work together:**

1. **CSV Parser** — distributor-specific column mapping (DistroKid, TuneCore, Amuse, CD Baby)
2. **ISRC Matcher** — links statement lines to imported tracks, calculates deltas
3. **Rate Calibration Engine** — derives observed rates, classifies data quality, updates community fair market rates

---

## User Flow

### Upload & Parse
1. User navigates to `/dashboard/actuals`
2. Selects distributor from dropdown (DistroKid, TuneCore, Amuse, CD Baby)
3. Selects CSV file from filesystem
4. Clicks "Upload"
5. API parses CSV using distributor-specific column mappings
6. Returns preview: total earnings, period range, line count, first 20 rows
7. User reviews preview table

### Match & Detect
8. User clicks "Confirm & Detect Missing Money"
9. API matches each statement line to user's tracks by ISRC
10. For matched lines: resolves fair market rate → calculates oracle estimate → computes delta
11. Lines where `|delta_pct| > 15%` are flagged
12. Returns results: matched count, unmatched count, flagged count, total gap amount

### Calibrate (Background)
13. After matching, calibration engine processes all matched lines
14. For each line: derives observed_rate = earnings/streams
15. Classifies: qualified (≥50% of fair rate) or flagged_underpayment (<50%)
16. Recalculates community calibrated rate from qualified observations
17. Results returned alongside match data

### View History
18. Past statements shown in reverse chronological order
19. User can click any statement to see its flagged discrepancies

---

## File Map

| File | Purpose |
|------|---------|
| `src/app/(auth)/dashboard/actuals/page.tsx` | Actuals page (upload + results UI) |
| `src/app/api/actuals/upload/route.ts` | CSV upload and parsing API |
| `src/app/api/actuals/match/route.ts` | ISRC matching + rate comparison + calibration trigger |
| `src/lib/csv/parser.ts` | Distributor-specific CSV parser |
| `src/lib/oracle/rates.ts` | Rate resolver (fallback chain) |
| `src/lib/oracle/calibrate.ts` | Calibration engine (bias protection) |
| `src/lib/types/database.ts` | All types (RoyaltyStatement, StatementLine, CalibratedRate, etc.) |
| `supabase/migrations/001_initial_schema.sql` | royalty_statements + statement_lines tables |
| `supabase/migrations/002_calibrated_rates.sql` | calibrated_rates + rate_observations tables |
| `supabase/seed.sql` | DSP seed rates (country-specific) |

---

## API Endpoints

### `POST /api/actuals/upload`

**Auth:** Required (authenticated user)

**Request:**
```
Content-Type: multipart/form-data

file: File (CSV)
distributor: string (distrokid | tunecore | amuse | cd_baby)
```

**Processing:**
1. Validate auth and get user ID
2. Read file content as text
3. Call `parseDistributorCsv(csvText, distributor)`
4. Calculate `period_start`, `period_end`, `total_earnings` from parsed lines
5. Create `royalty_statements` record (status = "parsed")
6. Batch insert all parsed lines into `statement_lines`
7. Return preview

**Response (200):**
```typescript
{
  statement_id: string;
  lines_count: number;
  total_earnings: number;
  period_start: string;       // "2024-01"
  period_end: string;         // "2024-12"
  parse_errors: string[];     // First 5 parsing errors
  preview: ParsedLine[];      // First 20 rows
}
```

**Errors:**
| Status | Condition |
|--------|-----------|
| 401 | Unauthorized |
| 400 | Missing file or distributor |
| 400 | No valid rows parsed from CSV |
| 500 | Processing error |

### `POST /api/actuals/match`

**Auth:** Required (authenticated user, must own the statement)

**Request:**
```typescript
{
  statement_id: string
}
```

**Processing:**
1. Verify statement ownership (`user_id = auth.uid()`)
2. Fetch all statement_lines for this statement
3. Fetch all user's tracks (via artists) → build ISRC → track_id map
4. Get user's country from profile (for country-specific rate resolution)
5. For each statement_line:
   - Skip if no ISRC
   - Skip if ISRC not in user's catalog
   - If matched:
     - `resolveRate(supabase, platform, country, period)` → resolved rate
     - `oracle_estimated = streams × resolved.rate`
     - `delta_pct = ((oracle_estimated - earnings) / oracle_estimated) × 100`
     - `flagged = |delta_pct| > 15`
     - Update statement_line record
6. After all matches: trigger `calibrateFromStatement()` (non-blocking)
7. Update statement status to "confirmed"

**Response (200):**
```typescript
{
  matched: number;
  unmatched: number;
  flagged: number;
  total_gap: number;          // Sum of (oracle_estimated - earnings) for flagged lines
  calibration: {
    observations_created: number;
    qualified: number;
    flagged_underpayment: number;
    excluded_low_streams: number;
    rates_updated: number;
  }
}
```

---

## CSV Parser

### `src/lib/csv/parser.ts`

**Dependency:** `papaparse` (CSV parsing library)

### `parseDistributorCsv(csvText: string, distributor: string)`

**Returns:** `{ lines: ParsedLine[], errors: string[] }`

**ParsedLine Interface:**
```typescript
interface ParsedLine {
  isrc: string | null;
  track_title: string | null;
  platform: string | null;    // Normalized: spotify, apple_music, youtube_music, etc.
  streams: number | null;
  earnings: number | null;
  period: string | null;
  country: string | null;
}
```

### Distributor Column Mappings

Each distributor uses different column names. The parser tries multiple candidate names:

**DistroKid:**
```typescript
{
  isrc:     ["ISRC", "isrc"],
  title:    ["Title", "Song", "Song Title", "title"],
  platform: ["Store", "Store Name", "store", "Platform"],
  streams:  ["Quantity", "Streams", "Units", "quantity"],
  earnings: ["Earnings (USD)", "Total", "Net Amount", "earnings", "Earnings"],
  period:   ["Reporting Month", "Sale Month", "Month", "Period", "reporting_month"],
  country:  ["Country", "Territory", "country"],
}
```

**TuneCore:**
```typescript
{
  isrc:     ["ISRC", "isrc"],
  title:    ["Release Title", "Title", "Song Title", "release_title"],
  platform: ["Store Name", "Store", "store_name", "Platform"],
  streams:  ["Units", "Quantity", "Streams", "units"],
  earnings: ["Paid", "Revenue", "Earnings", "paid"],
  period:   ["Sale Month", "Report Month", "sale_month", "Period"],
  country:  ["Country", "Territory", "country"],
}
```

**Amuse:**
```typescript
{
  isrc:     ["ISRC", "isrc"],
  title:    ["Track Title", "Title", "track_title"],
  platform: ["Store", "Service", "Platform", "store"],
  streams:  ["Streams", "Units", "Quantity", "streams"],
  earnings: ["Revenue", "Earnings", "Amount", "revenue"],
  period:   ["Period", "Month", "Reporting Period", "period"],
  country:  ["Country", "Territory", "country"],
}
```

**CD Baby:**
```typescript
{
  isrc:     ["ISRC", "isrc"],
  title:    ["Title", "Track", "Song", "title"],
  platform: ["Store", "Vendor", "Platform", "store"],
  streams:  ["Quantity", "Units", "Streams", "quantity"],
  earnings: ["Amount", "Subtotal", "Earnings", "amount"],
  period:   ["Period", "Accounting Period", "Month", "period"],
  country:  ["Country", "Territory", "country"],
}
```

### Helper Functions

**`findColumn(row, candidates)`** — Case-insensitive column lookup. Tries exact match first, then case-insensitive.

**`parseNumber(val)`** — Strips `$` and `,` characters, returns `parseFloat()` or `null`.

**`normalizePlatform(raw)`** — Maps varied platform names to standard identifiers:
```typescript
"spotify" in raw.toLowerCase()                → "spotify"
"apple" or "itunes" in raw.toLowerCase()      → "apple_music"
"youtube" or "yt" in raw.toLowerCase()        → "youtube_music"
"amazon" in raw.toLowerCase()                 → "amazon_music"
"tidal" in raw.toLowerCase()                  → "tidal"
otherwise                                      → raw.trim()
```

### Row Filtering
After parsing, rows are filtered: only rows with at least one of `isrc`, `track_title`, or `earnings` are kept.

---

## Oracle Rate Resolver

### `src/lib/oracle/rates.ts`

### `resolveRate(supabase, platform, country, period)`

Resolves the best available per-stream rate using a fallback chain:

```
1. CALIBRATED RATE (highest priority)
   ↓ Query calibrated_rates WHERE platform=X, country=Y, period=Z
   ↓ Only use if sample_size >= 10 (medium+ confidence)
   ↓ If found → return { rate, source: "calibrated", confidence }

2. COUNTRY SEED RATE
   ↓ Query dsp_rates WHERE platform=X, country=Y
   ↓ Ordered by effective_date DESC, take first
   ↓ If found → return { rate, source: "seed_country", confidence: "medium" }

3. GLOBAL SEED RATE
   ↓ Query dsp_rates WHERE platform=X, country IS NULL
   ↓ Ordered by effective_date DESC, take first
   ↓ If found → return { rate, source: "seed_global", confidence: "low" }

4. HARDCODED DEFAULT (last resort)
   ↓ return { rate: DEFAULT_RATES[platform], source: "default", confidence: "low" }
```

**Default Rates:**
```typescript
const DEFAULT_RATES: Record<string, number> = {
  spotify:       0.004,
  apple_music:   0.01,
  youtube_music: 0.002,
  amazon_music:  0.005,
  tidal:         0.013,
  deezer:        0.004,
}
```

**ResolvedRate Interface:**
```typescript
interface ResolvedRate {
  rate: number;
  source: "calibrated" | "seed_country" | "seed_global" | "default";
  confidence: "low" | "medium" | "high";
  platform: string;
  country: string | null;
}
```

**Batch resolver:** `resolveRates(supabase, requests[])` — resolves multiple rates in parallel via `Promise.all`.

---

## Rate Calibration Engine

### `src/lib/oracle/calibrate.ts`

### Critical Design: Bias Protection

**The Problem:** If artists are systematically underpaid, and we calibrate our fair market rate from their actual payments, we'd normalize the underpayment. The oracle would learn that "this is what artists get paid" rather than "this is what artists should get paid."

**The Solution:** Two separate rate concepts:

| Rate | Purpose | Fed By |
|------|---------|--------|
| **Fair Market Rate** | What artists should earn (used for estimates) | Only qualified observations (≥50% of fair rate) |
| **Observed Rate** | What artists actually earn (reference only) | All observations including underpayments |

### Constants
```typescript
const UNDERPAYMENT_THRESHOLD = 0.5;        // 50% — below this, flag as underpayment
const MIN_STREAMS_FOR_OBSERVATION = 100;   // Ignore tiny stream counts (noisy data)
const MIN_SAMPLES_FOR_CALIBRATION = 10;    // Don't override seed rate without enough data
```

### `calibrateFromStatement(supabase, statementId, userId)`

**Returns:** `CalibrationResult`
```typescript
interface CalibrationResult {
  observations_created: number;
  qualified: number;
  flagged_underpayment: number;
  excluded_low_streams: number;
  rates_updated: number;
}
```

**Algorithm:**
```
1. Fetch all matched statement_lines WHERE streams > 0 AND earnings > 0

2. For each line:
   a. If streams < 100 → create observation with status "excluded_low_streams", skip
   b. observed_rate = earnings / streams
   c. Resolve current fair_rate for this platform/country/period
   d. If observed_rate >= fair_rate × 0.5 → status = "qualified"
   e. Else → status = "flagged_underpayment"
   f. Insert into rate_observations

3. Collect all unique platform/country/period combos that were touched

4. For each combo: recalculateCalibratedRate()
```

### `recalculateCalibratedRate(supabase, platform, country, period)`

**Algorithm:**
```
1. Fetch all "qualified" observations for this platform/country/period
2. Fetch ALL observations (qualified + flagged) for counting
3. Extract observed_rate values from qualified observations
4. Calculate fair_rate = trimmedMedian(qualified_rates, 0.1)
5. Calculate observed_rate = mean(all_rates) — for reference only
6. Determine confidence:
   - >= 50 qualified samples → "high"
   - >= 10 qualified samples → "medium"
   - < 10 qualified samples → "low"
7. Upsert into calibrated_rates:
   { platform, country, period, fair_rate, observed_rate, sample_size, confidence, flagged_count }
```

### `trimmedMedian(values, trim)`

Drops the top and bottom `trim` fraction (10%) of sorted values, then returns the median of the remaining values. This removes outliers from both ends, producing a more robust central estimate than mean or raw median.

```typescript
function trimmedMedian(values: number[], trim: number): number {
  if (values.length === 0) return 0;
  if (values.length <= 2) return mean(values);

  const sorted = [...values].sort((a, b) => a - b);
  const trimCount = Math.floor(sorted.length * trim);
  const trimmed = sorted.slice(trimCount, sorted.length - trimCount);

  const mid = Math.floor(trimmed.length / 2);
  return trimmed.length % 2 === 0
    ? (trimmed[mid - 1] + trimmed[mid]) / 2
    : trimmed[mid];
}
```

---

## Database Schema

### `royalty_statements`
```sql
CREATE TABLE public.royalty_statements (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES public.users ON DELETE CASCADE,
  distributor     text NOT NULL,           -- distrokid, tunecore, amuse, cd_baby
  upload_filename text,
  period_start    date,
  period_end      date,
  total_earnings  numeric(12,4),
  status          text DEFAULT 'pending' CHECK (status IN ('pending','parsed','confirmed','error')),
  created_at      timestamptz DEFAULT now()
);
```

### `statement_lines`
```sql
CREATE TABLE public.statement_lines (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  statement_id     uuid NOT NULL REFERENCES public.royalty_statements ON DELETE CASCADE,
  isrc             text,
  track_title      text,
  platform         text,                   -- Normalized: spotify, apple_music, etc.
  streams          bigint,
  earnings         numeric(12,4),
  period           text,                   -- "2024-01" format
  country          text,
  matched_track_id uuid REFERENCES public.tracks ON DELETE SET NULL,
  oracle_estimated numeric(12,4),          -- Fair rate × streams
  delta_pct        numeric(6,2),           -- ((oracle - actual) / oracle) × 100
  flagged          boolean DEFAULT false,  -- |delta_pct| > 15
  created_at       timestamptz DEFAULT now()
);

CREATE INDEX idx_statement_lines_isrc ON public.statement_lines(isrc);
```

### `calibrated_rates`
```sql
CREATE TABLE public.calibrated_rates (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform      text NOT NULL,
  country       text,                    -- null = global
  period        text NOT NULL,           -- "2025-01" format
  fair_rate     numeric(10,6) NOT NULL,  -- Trimmed median of qualified observations
  observed_rate numeric(10,6),           -- Mean of ALL observations (reference)
  sample_size   integer NOT NULL DEFAULT 0,
  confidence    text NOT NULL DEFAULT 'low' CHECK (confidence IN ('low','medium','high')),
  flagged_count integer DEFAULT 0,       -- Count of underpayment observations
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now(),
  UNIQUE(platform, country, period)
);

CREATE INDEX idx_calibrated_rates_lookup ON public.calibrated_rates(platform, country, period);
```

### `rate_observations`
```sql
CREATE TABLE public.rate_observations (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  statement_line_id   uuid REFERENCES public.statement_lines ON DELETE SET NULL,
  user_id             uuid REFERENCES public.users ON DELETE SET NULL,
  platform            text NOT NULL,
  country             text,
  period              text NOT NULL,
  streams             bigint NOT NULL,
  earnings            numeric(12,4) NOT NULL,
  observed_rate       numeric(10,6) NOT NULL,     -- earnings / streams
  calibration_status  text NOT NULL DEFAULT 'pending'
    CHECK (calibration_status IN ('pending','qualified','flagged_underpayment','excluded_low_streams')),
  reference_fair_rate numeric(10,6),              -- Fair rate at time of observation
  created_at          timestamptz DEFAULT now()
);

CREATE INDEX idx_rate_observations_platform ON public.rate_observations(platform, country, period);
CREATE INDEX idx_rate_observations_status ON public.rate_observations(calibration_status);
CREATE INDEX idx_rate_observations_user ON public.rate_observations(user_id);
```

### `dsp_rates` (Seed Data)

Country-specific seed rates (Q1 2025):

| Platform | Country | Rate | Source |
|----------|---------|------|--------|
| Spotify | Global | $0.004000 | Loud & Clear report |
| Spotify | US | $0.004500 | Industry average |
| Spotify | GB | $0.003800 | Industry average |
| Spotify | NG | $0.000400 | BusinessDay Nigeria |
| Spotify | BR | $0.001500 | Derived from subscription ratio |
| Spotify | ZA | $0.001500 | Derived |
| Spotify | MX | $0.002000 | Derived |
| Spotify | KE | $0.000500 | Derived |
| Apple Music | Global | $0.010000 | Apple Music for Artists (official) |
| Apple Music | NG | $0.004000 | Derived |
| YouTube Music | Global | $0.002000 | Industry average |
| YouTube Music | NG | $0.000300 | Derived |
| Amazon Music | Global | $0.005000 | Industry average |
| Tidal | Global | $0.013000 | Royalty Exchange |
| Deezer | Global | $0.004000 | Industry average |

**Key insight:** Nigeria rates are ~10x lower than US rates for Spotify. This is why country-specific rates are critical for Africa/LatAm markets.

**RLS Policies:**
- `royalty_statements`: user can only view/insert/update own statements
- `statement_lines`: access through statement ownership (join)
- `calibrated_rates`: public read, service-role insert/update
- `rate_observations`: user can view own, service-role insert

---

## TypeScript Types

```typescript
export type StatementStatus = "pending" | "parsed" | "confirmed" | "error";
export type Platform = "spotify" | "apple_music" | "youtube_music" | "amazon_music" | "tidal" | "deezer";
export type CalibrationStatus = "pending" | "qualified" | "flagged_underpayment" | "excluded_low_streams";
export type RateConfidence = "low" | "medium" | "high";

export interface RoyaltyStatement { /* see database.ts */ }
export interface StatementLine { /* see database.ts */ }
export interface CalibratedRate { /* see database.ts */ }
export interface RateObservation { /* see database.ts */ }
```

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | For authenticated user queries |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | For calibration writes (bypasses RLS) |

---

## Known Limitations & TODOs

1. **No XLSX support** — Input accepts `.csv,.xlsx` but the parser only handles CSV text. Need to add an XLSX-to-CSV conversion step using a library like `xlsx`.
2. **Calibration is non-blocking** — After matching, calibration runs but errors are caught silently. If it fails, the user doesn't know.
3. **No batch recalibration** — Calibrated rates only update when a new statement is uploaded. No scheduled job to recalculate periodically.
4. **No statement deletion** — Users can't delete mistakenly uploaded statements.
5. **No multi-currency** — Assumes all earnings are in USD. Statements in other currencies would need conversion.
6. **15% flagging threshold is hardcoded** — Not configurable by user or tier.
7. **No duplicate detection** — Same CSV can be uploaded multiple times, creating duplicate statement_lines.
8. **Country field often missing** — Many distributor CSVs don't include per-line country data. Falls back to user's profile country.

---

## Extension Points

### Adding XLSX Support
1. Install `xlsx` package: `npm install xlsx`
2. In upload route, detect file type by extension or MIME type
3. If XLSX: `const workbook = XLSX.read(buffer); const csv = XLSX.utils.sheet_to_csv(workbook.Sheets[0])`
4. Pass resulting CSV text to existing `parseDistributorCsv()`

### Adding More Distributors
1. Add new entry in `COLUMN_MAPS` object in `src/lib/csv/parser.ts`
2. Map the distributor's column names to the standard fields
3. Add to distributor dropdown in Actuals page UI
4. No database changes needed

### Adding Duplicate Detection
1. Before creating a new statement, hash the CSV content: `SHA256(csvText)`
2. Check if a statement with the same hash already exists for this user
3. Warn user: "This file appears to already be uploaded"

### Improving Calibration with Songstats
When Songstats provides actual stream counts:
1. Replace Spotify popularity heuristic in oracle snapshots with real data
2. Calibrated rates become more accurate (real streams vs estimated)
3. May need to add Songstats-specific platform identifiers to normalization
