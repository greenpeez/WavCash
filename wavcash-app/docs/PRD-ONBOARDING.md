# Onboarding
> 3-step post-login wizard: profile creation, Spotify OAuth connection, and full catalog import with ISRC extraction.

## Overview

Onboarding is the bridge between login and the dashboard. Every new user must complete it before accessing protected features. The flow:

1. **Profile** — collects display name, country, role, and distributor
2. **Spotify Connect** — OAuth authorization code flow grants access to the user's Spotify catalog
3. **Catalog Review** — shows imported tracks with ISRCs, confirms everything is ready

The Spotify connection triggers a deep catalog import: all albums → all tracks → ISRC extraction. ISRCs are the universal identifier that links streaming data across platforms to the user's actual tracks, which powers the entire oracle and Actuals matching system.

Onboarding is gated: `users.onboarding_complete = false` prevents access to the dashboard. Login redirects to `/onboarding` until this flag is set to `true`.

**Auth:** Privy (user must be logged in). If user logged in with Spotify, step 2 is auto-skipped.

**Background:** Mercury WebGL canvas with frosted glass card overlay (same aesthetic as login page).

---

## User Flow

### Step 1: Profile Information
1. User arrives at `/onboarding` after first login
2. Sees glass card with form fields:
   - **Display Name** (text input, required)
   - **Primary Country** (dropdown): Nigeria, Brazil, South Africa, Ghana, Kenya, Other
   - **Role** (dropdown): Artist, Songwriter, Producer, Publisher, Manager/Label
   - **Distributor** (dropdown): DistroKid, TuneCore, Amuse, CD Baby, Other
3. Clicks "Continue"
4. Frontend calls `POST /api/user` to update profile
5. Advances to Step 2 (or Step 3 if logged in with Spotify)

### Step 2: Spotify Connection
1. User sees "Connect Spotify" button
2. Clicks button → redirected to Spotify authorization page
3. User authorizes WavCash at Spotify
4. Spotify redirects to `/api/spotify/callback?code={code}&state=onboarding`
5. Backend:
   - Exchanges code for access + refresh tokens
   - Fetches Spotify profile (`/me`)
   - Updates `users` record with tokens + `spotify_connected = true`
   - Resolves artist profile (direct lookup or search)
   - Creates `artists` record
   - Imports full catalog: albums → tracks → ISRCs
6. Redirects back to `/onboarding`
7. Frontend detects `spotify_connected = true`, shows connected state
8. Option to "Skip" (can connect later from Settings)

**Note:** If user logged in via Spotify OAuth through Privy, step 2 is automatically skipped since Spotify is already connected.

### Step 3: Catalog Review
1. Displays imported tracks (max 20 shown with "+X more" indicator)
2. Each track shows: album art, title, ISRC
3. Shows total count: "{X} tracks imported. Your dashboard is ready."
4. User clicks "Go to my dashboard"
5. Backend calls `POST /api/user/complete-onboarding` → sets `onboarding_complete = true`
6. Redirect to `/dashboard` (preserves `sign_token` if present)

---

## File Map

| File | Purpose |
|------|---------|
| `src/app/(auth)/onboarding/page.tsx` | 3-step onboarding wizard |
| `src/app/api/spotify/callback/route.ts` | Spotify OAuth callback + catalog import |
| `src/app/api/user/complete-onboarding/route.ts` | POST: marks onboarding as done |
| `src/lib/spotify/client.ts` | Spotify API client (token exchange, artist fetch, catalog import) |
| `src/lib/auth/client.ts` | `authFetch()` for authenticated API calls |
| `src/lib/types/database.ts` | User, Artist, Track interfaces |

---

## Pages & Components

### `/onboarding` — Onboarding Page

**Component:** `OnboardingPage` → `OnboardingContent` (client component, wrapped in `<Suspense>`)

**Auth:** Uses `usePrivy()` for user state, `authFetch()` for API calls.

**Background:** Mercury WebGL canvas (inline implementation with GLSL shaders, same water-ripple surface used across the app).

**State:**
```typescript
const [step, setStep] = useState(1)            // Current step (1-3)
const [loading, setLoading] = useState(false)
const [error, setError] = useState("")

// Step 1: Profile
const [displayName, setDisplayName] = useState("")
const [country, setCountry] = useState("")
const [role, setRole] = useState<UserRole | "">("")
const [distributor, setDistributor] = useState("")

// Step 2: Spotify
const [spotifyConnected, setSpotifyConnected] = useState(false)

// Step 3: Catalog
const [tracks, setTracks] = useState<CatalogTrack[]>([])
```

**Progress Indicator:**
- 3 horizontal dots at top of card
- Active step: full width amber dot
- Inactive: narrow dot
- Uses CSS variable `--accent` for active color

**Step 1 UI (glass card):**
- "Welcome to WavCash" heading
- Display Name input
- Country dropdown (NG, BR, ZA, MX, KE, OTHER)
- Role dropdown (artist, songwriter, producer, publisher, manager)
- Distributor dropdown (DistroKid, TuneCore, Amuse, CD Baby, Other)
- "Continue" button

**Step 2 UI:**
- If not connected: "Connect Spotify" button (primary accent)
- If connected: artist card with name, green "Connected" badge
- "Skip for now" link
- Auto-skipped if user logged in with Spotify OAuth

**Step 3 UI:**
- Track grid (max 20) with album art, title, ISRC
- Track count: "{X} tracks imported"
- "Go to my dashboard" button → completes onboarding
- If no tracks (skipped Spotify): "You're all set. Connect Spotify later from Settings."

**Dev Bypass:** When `NEXT_PUBLIC_DEV_BYPASS=true`, mock tracks are used instead of requiring Spotify connection:
```typescript
const MOCK_TRACKS = [
  { title: "Midnight in Lagos", isrc: "USRC17607839", album: "Neon Nights" },
  { title: "Favela Dreams", isrc: "USRC17607840", album: "Neon Nights" },
  // ... etc
];
```

**`useEffect` on mount:**
- Checks if user already has profile data (resumes where they left off)
- Pre-fills form fields from existing record
- If `spotify_connected` already true → auto-advances to Step 3
- Fetches imported tracks for catalog display

---

## API Endpoints

### `GET /api/spotify/callback`

**Auth:** Requires authenticated session (Privy token)

**Query Params:**
- `code` — Spotify authorization code
- `state` — `"onboarding"` (routing context)
- `error` — Spotify error (if user denied access)

**Processing Steps:**

1. **Exchange code for tokens:**
   ```typescript
   const tokens = await exchangeCodeForTokens(code, redirectUri)
   // Returns: { access_token, refresh_token, expires_in }
   ```

2. **Fetch Spotify profile:**
   ```
   GET https://api.spotify.com/v1/me
   Authorization: Bearer {access_token}
   ```

3. **Update user record:**
   ```typescript
   await supabase.from("users").update({
     spotify_connected: true,
     spotify_artist_id: me.id,
     spotify_access_token: tokens.access_token,
     spotify_refresh_token: tokens.refresh_token,
     spotify_token_expires_at: expiry
   }).eq("id", userId)
   ```

4. **Resolve artist profile:**
   - Primary: `GET /v1/artists/{me.id}` — checks if user IS an artist
   - Fallback: `GET /v1/search?q={display_name}&type=artist` — search by name
   - If neither works: continue without artist data

5. **Create artist record:**
   ```typescript
   await supabase.from("artists").upsert({
     user_id: userId,
     spotify_artist_id: artistData.id,
     name: artistData.name,
     image_url: artistData.images?.[0]?.url,
     genres: artistData.genres,
     popularity: artistData.popularity
   }, { onConflict: "user_id,spotify_artist_id" })
   ```

6. **Import catalog:**
   ```typescript
   await importArtistCatalog(spotifyArtistId, artistDbId, accessToken, supabase)
   ```

7. **Redirect** to `/onboarding`

### Catalog Import Function (`importArtistCatalog`)

Located in: `src/lib/spotify/client.ts`

**Algorithm:**
```
1. GET /v1/artists/{id}/albums?include_groups=album,single&limit=50
2. Follow pagination until all albums fetched
3. For each album:
   a. GET /v1/albums/{albumId}
   b. Extract track IDs
   c. Batch fetch tracks: GET /v1/tracks?ids={csv} (max 50)
   d. For each track with ISRC: upsert into tracks table
4. Per-album errors caught and logged (don't stop import)
```

### `POST /api/user/complete-onboarding`

**Auth:** Required (Privy token)

**Processing:** `UPDATE users SET onboarding_complete = true WHERE id = userId`

---

## Spotify OAuth Configuration

### Authorization URL
```typescript
const authUrl = new URL("https://accounts.spotify.com/authorize")
authUrl.searchParams.set("response_type", "code")
authUrl.searchParams.set("client_id", SPOTIFY_CLIENT_ID)
authUrl.searchParams.set("scope", "user-read-private user-read-email")
authUrl.searchParams.set("redirect_uri", SPOTIFY_REDIRECT_URI)
authUrl.searchParams.set("state", "onboarding")
```

### Scopes
| Scope | Purpose |
|-------|---------|
| `user-read-private` | Access user's subscription details, country |
| `user-read-email` | Access user's email |

### Redirect URI
Must be `http://127.0.0.1:3001/api/spotify/callback` during development. Spotify requires `127.0.0.1` — `localhost` is NOT accepted.

---

## Database Schema

### `artists`
```sql
CREATE TABLE public.artists (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES public.users ON DELETE CASCADE,
  spotify_artist_id text,
  name              text NOT NULL,
  image_url         text,
  genres            text[] DEFAULT '{}',
  popularity        integer,
  created_at        timestamptz DEFAULT now()
);
```

### `tracks`
```sql
CREATE TABLE public.tracks (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id        uuid NOT NULL REFERENCES public.artists ON DELETE CASCADE,
  isrc             text NOT NULL,
  title            text NOT NULL,
  album            text,
  spotify_track_id text,
  release_date     date,
  duration_ms      integer,
  popularity       integer,
  album_art_url    text,
  created_at       timestamptz DEFAULT now(),
  UNIQUE(artist_id, isrc)
);
```

---

## Business Logic

### ISRC (International Standard Recording Code)
ISRCs are the critical link between streaming platforms. Every track on Spotify, Apple Music, etc., has the same ISRC regardless of platform. WavCash uses ISRCs to:
- Match uploaded royalty statements to imported tracks (Actuals feature)
- Cross-reference stream data across DSPs
- Identify tracks for CMO registration (Reclaim feature)

### Artist Resolution Strategy
Not every Spotify user account is an artist account. The callback handles this:
1. Try direct artist lookup using the Spotify user ID
2. Fall back to name search
3. If neither works → user can still complete onboarding, but catalog won't be imported

### Catalog Import Error Handling
The import is **best-effort**: individual album failures don't stop the process. Each album is fetched in a try/catch, errors logged but skipped.

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SPOTIFY_CLIENT_ID` | Yes | Spotify app client ID |
| `SPOTIFY_CLIENT_SECRET` | Yes | Spotify app client secret |
| `NEXT_PUBLIC_SPOTIFY_CLIENT_ID` | Yes | Same as above, exposed to browser for auth URL |
| `NEXT_PUBLIC_SPOTIFY_REDIRECT_URI` | Yes | Must be `http://127.0.0.1:3001/api/spotify/callback` (dev) |
| `NEXT_PUBLIC_PRIVY_APP_ID` | Yes | Privy app ID |

---

## Known Limitations & TODOs

1. **No token refresh** — Spotify access tokens expire after 1 hour. The refresh token is stored but never used.
2. **Single artist per user** — MVP supports one artist profile per user.
3. **No manual catalog upload** — Artists not on Spotify cannot import tracks.
4. **No catalog refresh** — Tracks are only imported once. No way to re-import after releasing new music.
5. **Artist search fallback is fragile** — Searching by display name may match the wrong artist for common names.
6. **No progress indicator for import** — Large catalogs (100+ tracks) may take 10-30 seconds with no progress feedback.
7. **Skip without Spotify** — Users who skip have an empty dashboard with no tracks.
