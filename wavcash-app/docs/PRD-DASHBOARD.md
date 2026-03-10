# Dashboard
> Central hub showing oracle-estimated royalties, earnings trends, platform breakdown, full track catalog, notifications, and live support.

## Overview

The Dashboard is where users spend most of their time. It aggregates oracle snapshot data (estimated stream counts × per-stream rates) into actionable views:

- **Summary Cards** — total estimated earnings, last 12 months, top track, top platform
- **Earnings Chart** — monthly trend area chart (Recharts)
- **Platform Donut** — earnings distribution by DSP
- **Tracks Table** — searchable/sortable catalog with per-track estimates
- **Notifications** — bell icon with dropdown + full notifications page
- **Live Support** — floating chat widget with ticket system

The dashboard reads from `oracle_snapshots` joined with `tracks` and `dsp_rates`. It requires a connected Spotify account (shows "Connect Spotify" CTA if not connected).

**Auth:** Privy (Google, Spotify, or Email OTP). Session validated via HTTP-only cookies in middleware.

---

## User Flow

1. User logs in via Privy → middleware validates session → redirected to `/dashboard`
2. Dashboard loads, fetches user profile via `/api/user`
3. **If not connected to Spotify:** shows "Connect Spotify to get started" card with "Go to Settings" CTA button
4. **If connected:** fetches artists → tracks → oracle_snapshots
5. Aggregates data into summary metrics, monthly time series, platform breakdown
6. Renders summary cards, charts, and track summary
7. User can navigate to `/dashboard/tracks` for full track table with search and sort

---

## File Map

| File | Purpose |
|------|---------|
| `src/app/(auth)/dashboard/layout.tsx` | Dashboard layout with header, sidebar nav, mercury canvas |
| `src/app/(auth)/dashboard/page.tsx` | Main dashboard overview page |
| `src/app/(auth)/dashboard/tracks/page.tsx` | Full track catalog table |
| `src/app/(auth)/dashboard/splits/page.tsx` | Splits (agreements) list |
| `src/app/(auth)/dashboard/notifications/page.tsx` | Notifications page |
| `src/app/(auth)/dashboard/settings/page.tsx` | Settings page (placeholder) |
| `src/components/dashboard/earnings-chart.tsx` | Monthly earnings area chart |
| `src/components/dashboard/platform-donut.tsx` | Platform earnings donut chart |
| `src/components/dashboard/mercury-canvas.tsx` | WebGL background canvas |
| `src/components/dashboard/animated-icons.tsx` | Animated nav icons |
| `src/components/dashboard/walkthrough.tsx` | First-time user onboarding walkthrough (7 steps) |
| `src/components/dashboard/atom-cursor.tsx` | Animated atom SVG cursor replacement |
| `src/components/cookie-banner.tsx` | EU-only cookie consent banner (global, in layout.tsx) |
| `src/components/support/SupportWidget.tsx` | Floating support chat widget |
| `src/components/support/ChatBox.tsx` | Support ticket chat interface |
| `src/lib/hooks/use-auth-swr.ts` | Auth-aware SWR hook |
| `src/lib/auth/client.ts` | Client-side auth fetch helper |
| `src/lib/types/database.ts` | All database types |

---

## Pages & Components

### Dashboard Layout (`layout.tsx`)

**Component:** `DashboardLayout` (client component, wrapped in `<Suspense>`)

**Auth:** Uses `usePrivy()` hook for user state, `authFetch()` for API calls.

**Background:** Mercury WebGL canvas (dynamic import, `ssr: false`) renders a water-ripple surface behind the UI.

**Structure:**
```
┌────────────────────────────────────────────────────────────┐
│ [Header: Logo | ──────── | 🔔 Notifications | ☀️ Theme | ⚙ Settings] │
├──────────────┬─────────────────────────────────────────────┤
│ [Sidebar]    │  [Main Content Area]                        │
│              │                                              │
│ Hello, {name}│  {children}                                 │
│ WC-XXXXXX   │                                              │
│ ───────────  │                                              │
│ Dashboard    │                                              │
│ Tracks       │                                              │
│ Actuals      │                                              │
│ Splits       │                                              │
│ Reclaim      │                                              │
│ Settings     │                                              │
│ ───────────  │                                              │
│ Logout       │                                              │
└──────────────┴─────────────────────────────────────────────┘
```

**Header:**
- WavCash logo (left)
- Notification bell with unread count badge (max "9+")
- Theme toggle (Sun/Moon icons, `next-themes`)
- Settings gear icon link

**Sidebar Navigation:**
```typescript
const NAV_ITEMS = [
  { href: "/dashboard",         label: "Dashboard",  icon: AniBarChart },
  { href: "/dashboard/tracks",  label: "Tracks",     icon: AniMusic },
  { href: "/dashboard/actuals", label: "Actuals",    icon: AniFileSpreadsheet },
  { href: "/dashboard/splits",  label: "Splits",     icon: AniSplit },
  { href: "/dashboard/reclaim", label: "Reclaim",    icon: AniShield },
  { href: "/dashboard/settings",label: "Settings",   icon: AniSettings },
]
```

**Active Route Detection:**
- Exact match for `/dashboard` (only active on dashboard root)
- Prefix match for all others: `pathname.startsWith(item.href + "/")`

**User Info Section:**
- Random greeting: "Hello," / "Hi," / "Hey," + user's first name
- WavCash ID in monospace font (`WC-XXXXXX`)

**Notification Bell:**
- Polls `/api/user` (or notifications endpoint) every 30 seconds for unread count
- Dropdown shows last 5 notifications on click
- "Mark all as read" button
- "View all" link → `/dashboard/notifications`

**Sign Token Handling:**
- Preserves `sign_token` query param through navigation
- Links contributor to their split agreement when signing in

**Theme Toggle:** `next-themes` hook, toggles between `light` and `dark`

**Logout:** Calls Privy `logout()` → redirect to `/login`

### Dashboard Home (`page.tsx`)

**Component:** `DashboardPage` (client component)

**Data Flow:**
```
1. usePrivy() → check ready + authenticated
2. authFetch("/api/user") → user profile (spotify_connected, country)
3. If !spotify_connected → show CTA card, return
4. Fetch artists → tracks → oracle_snapshots
5. Aggregate into SummaryData → render
```

**SummaryData Interface:**
```typescript
interface SummaryData {
  totalEstimated: number;       // Sum of all oracle estimated_royalty
  last12Months: number;         // Sum within trailing 12 months
  topTrack: {
    title: string;
    earnings: number;
  } | null;
  topPlatform: {
    name: string;
    percentage: number;
  } | null;
  monthlyData: {                // Earnings chart data
    month: string;              // "Jan '25" format
    earnings: number;
  }[];
  platformData: {               // Platform donut data
    platform: string;
    earnings: number;
    color: string;
  }[];
  trackCount: number;
  hasData: boolean;
}
```

**Summary Cards (4-column responsive grid):**

| Card | Icon | Label | Value | Badge |
|------|------|-------|-------|-------|
| Total Estimated | DollarSign | TOTAL ESTIMATED | Formatted currency | "Verified" if data exists |
| Last 12 Months | TrendingUp | LAST 12 MONTHS | Formatted currency | — |
| Top Track | Music | TOP TRACK | Title + earnings | — |
| Top Platform | BarChart3 | TOP PLATFORM | Name + percentage | — |

**Not-Connected State:** Card with "Connect Spotify to get started" message + "Go to Settings" button (class `btn-cta`)

**UI States:**
1. **Loading**: Skeleton placeholders for all sections (gated on `!ready || isLoading`)
2. **Not Connected**: Large CTA card → link to Settings
3. **Connected, No Data**: Cards show "—", charts hidden
4. **Connected, Has Data**: Full render with charts

### Earnings Chart (`earnings-chart.tsx`)

**Component:** `EarningsChart` (client component)

**Chart Configuration:**
- Library: Recharts `AreaChart`
- Container: `ResponsiveContainer` (100% width, 240px height)
- Area: single series with gradient fill
- Gradient: `#D4883A` (amber/accent) → transparent
- X-Axis: month labels, gray text
- Y-Axis: dollar amounts with `$` prefix
- Tooltip: custom styled, shows `"$X.XX Estimated"`
- Grid: horizontal dashed lines

### Platform Donut (`platform-donut.tsx`)

**Component:** `PlatformDonut` (client component)

**Platform Colors:**
```typescript
const PLATFORM_COLORS: Record<string, string> = {
  spotify:       "#1DB954",  // Spotify green
  apple_music:   "#FC3C44",  // Apple red
  youtube_music: "#FF0000",  // YouTube red
  amazon_music:  "#00A8E1",  // Amazon blue
  tidal:         "#000000",  // Tidal black
}
```

### Notifications Page (`notifications/page.tsx`)

**Component:** `NotificationsPage` (client component)

**Features:**
- Notifications grouped by date: Today, Yesterday, This Week, Older
- Each notification shows: title, body, timestamp
- "Mark all as read" button
- Clicking a notification links to the relevant split detail page
- Data fetched via `useAuthSWR` hook

### Tracks Table (`tracks/page.tsx`)

**Component:** `TracksPage` (client component)

**Table Columns:**
| Column | Source | Format |
|--------|--------|--------|
| Track | tracks.title + album_art_url + album | Image + text + subtitle |
| ISRC | tracks.isrc | Monospace (`--font-jetbrains`) |
| Streams | Sum of oracle_snapshots.stream_count | Localized number |
| Estimated | Sum of oracle_snapshots.estimated_royalty | $X.XX currency |
| Top Platform | Calculated from snapshot aggregation | Platform label or "—" |

**Search:** Filters on `title` or `isrc` (case-insensitive `includes()`)

**Sort Options:**
- "By earnings" — descending
- "By streams" — descending
- "By name" — alphabetical ascending

---

## Walkthrough (`walkthrough.tsx`)

**Component:** `Walkthrough` (client component, desktop only)

A 7-step guided tour that runs on first dashboard visit. Highlights sidebar nav items and explains each section. Skipped on mobile (sidebar is hidden).

**Steps:**
1. Welcome (centered dialog)
2. Dashboard (highlights nav, explains earnings overview)
3. Tracks (highlights nav, explains catalog)
4. Actuals (highlights nav, explains statement upload)
5. Splits (highlights nav, explains agreement creation)
6. Reclaim (highlights nav, explains CMO registration)
7. Complete (centered dialog, "You're all set!")

Completion tracked via `POST /api/user/complete-walkthrough`.

---

## Atom Cursor (`atom-cursor.tsx`)

**Component:** `AtomCursor` (client component, dynamic import with `ssr: false`)

Custom animated SVG cursor replacement (36x36 atom with 3 orbiting electrons + nucleus). Replaces the system cursor via global `cursor: none !important`.

**Behavior Modes:**
- **Normal areas:** Full atom (orbits + electrons + nucleus)
- **Cards** (`[data-slot=card]`, `[data-cursor=collapse]`): Smooth collapse to nucleus dot only
- **Buttons/links/inputs:** Fully hidden (opacity 0), system cursor restored where overridden

**Hide selectors** (cursor fully hides):
```
button, a, input, textarea, select, [role=button], label, .dash-header-hit, .wc-cookie-banner-inner
```

**Collapse selectors** (cursor collapses to dot):
```
[data-slot=card], [data-cursor=collapse]
```

The cookie banner card (`.wc-cookie-banner-inner`) and its children use `cursor: default !important` to override the global `cursor: none` and show the system arrow pointer.

---

## Cookie Banner (`cookie-banner.tsx`)

**Component:** `CookieBanner` (client component, global in `layout.tsx`)

EU-only GDPR cookie consent banner. Only shows for visitors from EU/EEA/UK countries.

**Detection:** Reads `wc-geo` cookie (set by middleware from Vercel's `x-vercel-ip-country` header). Checks against a set of 31 country codes (27 EU + 3 EEA + UK).

**Consent Storage:** `localStorage` key `wc-cookie-consent` with values `"all"` or `"necessary"`.

**UI:** Fixed bottom bar with two buttons: "Necessary only" (secondary) and "Accept all" (primary). Links to `/privacy#cookies`. Solid opaque backgrounds (not frosted glass) for reliable contrast in both themes.

**Future-ready:** When Google Analytics is added, it should check `localStorage.getItem('wc-cookie-consent')` before loading the gtag script.

---

## Support Widget

### SupportWidget (`src/components/support/SupportWidget.tsx`)

**Behavior:**
- Floating tab pinned to right edge of viewport
- Proximity-based reveal: appears when cursor approaches right edge near the widget's Y position
- Fully visible on touch devices
- Draggable vertically (desktop)
- Shows speech bubble icon + "Live Support" vertical text
- Green pulse dot when chat is open
- Excluded from: `/login`, `/signup`, `/onboarding*`

**CSS:** Has `support-widget` class with `cursor: pointer !important` override (global cursor is `none` due to custom atom cursor).

### ChatBox (`src/components/support/ChatBox.tsx`)

**Multi-step support ticket flow:**
1. User types initial message → ticket created via API
2. Optional: asks if user has a WavCash account
3. Optional: asks for WavCash ID
4. Live chat with support agent
5. Rating system when ticket is closed
6. Image upload support (up to 5 images, 10MB each)
7. Session persistence via localStorage
8. Polls every 5 seconds for new messages
9. Webhook health check for connectivity status

---

## Database Schema

### `oracle_snapshots`
```sql
CREATE TABLE public.oracle_snapshots (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id          uuid NOT NULL REFERENCES public.tracks ON DELETE CASCADE,
  platform          text NOT NULL,
  stream_count      bigint NOT NULL,
  previous_count    bigint DEFAULT 0,
  delta             bigint DEFAULT 0,
  estimated_royalty numeric(12,4),
  snapshot_date     date NOT NULL,
  created_at        timestamptz DEFAULT now(),
  UNIQUE(track_id, platform, snapshot_date)
);
```

### `notifications`
```sql
-- Stores in-app notifications (split_signed, all_signed, agreement_live, etc.)
-- Populated by lib/notifications/create.ts
-- Read by dashboard layout (bell dropdown) and notifications page
```

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase public key |
| `NEXT_PUBLIC_PRIVY_APP_ID` | Yes | Privy app ID for auth |

---

## Known Limitations & TODOs

1. **No automated oracle snapshot population** — Snapshots need to be populated by a cron job or manual insertion.
2. **Client-side aggregation** — All data processing happens in the browser. Large catalogs may be slow.
3. **No date range selector** — Dashboard always shows last 12 months.
4. **No real-time updates** — Data loads once on mount.
5. **No export** — Can't export earnings data as CSV or PDF.
6. **No per-track detail page** — Clicking a track in the table doesn't go anywhere.
7. **Settings page is placeholder** — Shows "Coming soon."
8. **Reclaim page is placeholder** — Shows "Coming soon." Listed in sidebar nav but not yet functional.
9. **Google Analytics not yet implemented** — Privacy policy documents it, cookie consent banner is ready for it, but no gtag script exists in the codebase yet.
