# Signup & Authentication
> Privy-based auth with Google, Spotify, and email OTP login, automatic embedded wallet creation, session middleware, and auto-generated WavCash IDs.

## Overview

The Signup & Auth system manages user identity across WavCash. It provides:

1. **Multi-method login** via Privy: Google OAuth, Spotify OAuth, or email + OTP code
2. **Automatic embedded wallet** — Privy creates an Ethereum wallet on Avalanche for every user on first login
3. **Session management** via HTTP-only Privy cookies, validated in Next.js middleware
4. **WavCash ID generation** — unique `WC-XXXXXX` identifier assigned on first profile creation
5. **Lazy registration** — user record is created on first login, not via a separate signup form

Authentication gates all protected features. The system uses Privy for identity with Supabase as the data store (not for auth).

---

## User Flow

### First Login (Signup)

1. User navigates to `/login` (or `/signup`, which redirects to `/login`)
2. Chooses auth method:
   - **Google** → OAuth popup
   - **Spotify** → OAuth popup
   - **Email** → enters email → receives OTP code → enters code
3. Privy validates identity, sets HTTP-only session cookies
4. App calls `GET /api/user` to check if user exists in database
5. If 404 (new user) → calls `POST /api/user/register` to create minimal record
6. Database trigger generates `WC-XXXXXX` WavCash ID
7. Privy automatically creates an embedded Ethereum wallet on Avalanche
8. Checks `onboarding_complete`:
   - `false` → redirect to `/onboarding`
   - `true` → redirect to `/dashboard`

### Returning Login

1. User navigates to `/login`
2. Authenticates via chosen method
3. Privy sets session cookies
4. App fetches user record → `onboarding_complete = true` → redirect to `/dashboard`

### Session Protection

1. Every request passes through `middleware.ts`
2. Middleware checks for Privy cookies: `privy-token`, `privy-id-token`, `privy-access-token`
3. For protected paths: if no cookie found → redirect to `/login?redirect={originalPath}`
4. For public paths: pass through
5. API routes handle their own auth via `verifyAuth()`

---

## File Map

| File | Purpose |
|------|---------|
| `src/app/(public)/login/page.tsx` | Login page (all auth methods) |
| `src/app/(public)/signup/page.tsx` | Redirects to `/login` |
| `src/components/providers/privy-provider.tsx` | Privy SDK configuration |
| `src/lib/auth/verify.ts` | Server-side Privy token verification |
| `src/lib/auth/client.ts` | Client-side `authFetch()` helper |
| `src/lib/privy/server.ts` | Privy server client singleton |
| `src/app/api/user/route.ts` | GET: fetch user, POST: update profile |
| `src/app/api/user/register/route.ts` | POST: create user on first login |
| `src/middleware.ts` | Route protection via Privy cookies + geo cookie |
| `src/app/layout.tsx` | Root layout with PrivyProviderWrapper, CookieBanner |
| `src/components/cookie-banner.tsx` | EU-only cookie consent banner |

---

## Pages & Components

### `/login` — Login Page

**Component:** `LoginPage` (client component)

**Background:** Mercury WebGL canvas with frosted glass card overlay.

**Auth Methods:**
```typescript
// Privy hooks used:
useLoginWithOAuth({ provider: "google" })   // Google OAuth
useLoginWithOAuth({ provider: "spotify" })  // Spotify OAuth
useLoginWithEmail()                          // Email + OTP
```

**UI:**
- Glass card centered on page
- "Welcome to WavCash" heading
- Three auth buttons: Google, Spotify, Email
- Email flow: input field → "Send Code" → OTP input → "Verify"
- Loading states on each button

**Post-Auth Handler (`handleAuthComplete`):**
```typescript
async function handleAuthComplete() {
  // 1. Fetch user record
  const res = await authFetch("/api/user");

  // 2. If new user, register
  if (res.status === 404) {
    await authFetch("/api/user/register", { method: "POST" });
  }

  // 3. Check onboarding status
  const user = await authFetch("/api/user").then(r => r.json());

  // 4. Route accordingly (preserves sign_token if present)
  if (!user.onboarding_complete) {
    router.push(`/onboarding${sign_token ? `?sign_token=${sign_token}` : ""}`);
  } else {
    router.push(redirect || "/dashboard");
  }
}
```

**Sign Token Threading:** If the user arrives from a signing link (`/login?sign_token=xxx`), the token is preserved through the entire flow: login → onboarding → dashboard, so the user can be connected to their split agreement.

### `/signup` — Signup Page

**Redirects to `/login`:**
```typescript
export default function SignupPage() {
  redirect("/login");
}
```

No separate signup flow exists. First login creates the user.

---

## Privy Configuration

### Provider Setup (`privy-provider.tsx`)

```typescript
<PrivyProvider
  appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID}
  config={{
    loginMethods: ["email", "google", "spotify"],
    embeddedWallets: {
      ethereum: { createOnLogin: "all-users" },
    },
    defaultChain: avalanche,
    supportedChains: [avalanche],
  }}
>
```

**Key behaviors:**
- Embedded Ethereum wallet created automatically for every user on Avalanche
- No manual wallet connection needed
- Wallet used for signing split agreements and receiving royalty distributions

---

## Auth Verification

### Server-Side (`src/lib/auth/verify.ts`)

```typescript
async function verifyAuth(): Promise<{ userId: string }> {
  // 1. Check Authorization: Bearer <token> header
  // 2. Fall back to Privy cookies
  // 3. Call Privy's verifyAuthToken() to validate
  // 4. Return { userId: claims.user_id }
}
```

Used by all protected API routes.

### Client-Side (`src/lib/auth/client.ts`)

```typescript
async function authFetch(url: string, options?: RequestInit): Promise<Response> {
  // 1. Get access token from Privy SDK
  // 2. Inject as "Authorization: Bearer <token>" header
  // 3. Return fetch response
}
```

Used by all client components for authenticated API calls.

### Privy Server Client (`src/lib/privy/server.ts`)

Singleton `PrivyClient` initialized with `appId` + `appSecret`. Used server-side for token verification and user lookups.

---

## Middleware

### `src/middleware.ts`

**Public Paths** (no auth required):
```typescript
const publicPaths = [
  "/", "/login", "/signup", "/sniffer", "/sign",
  "/spotify-callback", "/docs", "/splits", "/pricing",
  "/faq", "/terms", "/privacy", "/data-request"
]
```

**Auth Check:**
```typescript
// Look for any Privy cookie
const hasToken = request.cookies.has("privy-token")
  || request.cookies.has("privy-id-token")
  || request.cookies.has("privy-access-token");

if (!hasToken && !isPublicPath) {
  redirect to /login?redirect={pathname}
}
```

**Geo Cookie (EU detection):**

The middleware sets a `wc-geo` cookie on every response (if not already present) using Vercel's `x-vercel-ip-country` header. This enables the client-side cookie consent banner to show only for EU/EEA/UK visitors. Falls back to `"XX"` when the header is absent (local dev).

```typescript
function withGeoCookie(request, response) {
  if (!request.cookies.has("wc-geo")) {
    const country = request.headers.get("x-vercel-ip-country") || "XX";
    response.cookies.set("wc-geo", country, {
      path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax",
    });
  }
  return response;
}
```

**API routes** (`/api/*`) are excluded from middleware — they handle their own auth via `verifyAuth()`.

---

## API Endpoints

### `POST /api/user/register`

**Auth:** Required (Privy token)

**Processing:**
1. Verify auth via `verifyAuth()`
2. Check if user already exists in `users` table
3. If new: insert minimal record `{ id: userId, wallet_address }`
4. Database trigger `generate_wavcash_id()` auto-generates `WC-XXXXXX`
5. If existing: update wallet address if not set
6. Idempotent — safe to call multiple times

**Wallet Resolution:**
- Prefers client-provided wallet from embedded Privy wallet
- Falls back to server-side Privy API user lookup for embedded Ethereum wallet

### `GET /api/user`

**Auth:** Required

**Response:** Full user record from `users` table (display_name, country, role, tier, wavcash_id, etc.)

### `POST /api/user` (Update)

**Auth:** Required

**Updatable fields:** `display_name`, `country`, `role`, `distributor`, `wallet_address`

---

## Database Schema

### `users`
```sql
CREATE TABLE public.users (
  id                      uuid PRIMARY KEY,     -- Privy user ID
  display_name            text,
  country                 text,
  role                    text CHECK (role IN ('artist','producer','songwriter','publisher','manager','label')),
  tier                    text NOT NULL DEFAULT 'free' CHECK (tier IN ('free','basic','premium','enterprise')),
  genre_tags              text[] DEFAULT '{}',
  distributor             text,
  wallet_address          text,                  -- Embedded Ethereum wallet (Avalanche)
  spotify_connected       boolean DEFAULT false,
  spotify_artist_id       text,
  spotify_access_token    text,
  spotify_refresh_token   text,
  spotify_token_expires_at timestamptz,
  wavcash_id              text UNIQUE,           -- Auto-generated WC-XXXXXX
  onboarding_complete     boolean DEFAULT false,
  created_at              timestamptz DEFAULT now(),
  updated_at              timestamptz DEFAULT now()
);
```

**Triggers:**

1. **WavCash ID Generation** (`set_wavcash_id`):
   ```sql
   -- Fires BEFORE INSERT when wavcash_id is NULL
   -- Generates unique 'WC-XXXXXX' (6 hex chars from MD5 of random)
   CREATE OR REPLACE FUNCTION public.generate_wavcash_id()
   RETURNS trigger AS $$
   DECLARE new_id text; exists_already boolean;
   BEGIN
     LOOP
       new_id := 'WC-' || upper(substr(md5(random()::text), 1, 6));
       SELECT EXISTS(SELECT 1 FROM public.users WHERE wavcash_id = new_id) INTO exists_already;
       EXIT WHEN NOT exists_already;
     END LOOP;
     new.wavcash_id := new_id;
     RETURN new;
   END;
   $$ LANGUAGE plpgsql;
   ```

2. **Auto-update `updated_at`** (`users_updated_at`)

---

## TypeScript Types

```typescript
export type Tier = "free" | "basic" | "premium" | "enterprise";
export type UserRole = "artist" | "producer" | "songwriter" | "publisher" | "manager" | "label";

export interface User {
  id: string;
  display_name: string;
  country: string;
  role: UserRole;
  tier: Tier;
  genre_tags: string[];
  distributor: string | null;
  wallet_address: string | null;
  spotify_connected: boolean;
  spotify_artist_id: string | null;
  wavcash_id: string | null;
  onboarding_complete: boolean;
  created_at: string;
  updated_at: string;
}
```

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_PRIVY_APP_ID` | Yes | Privy app ID |
| `PRIVY_APP_SECRET` | Yes | Privy app secret (server-side token verification) |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Admin key (bypasses RLS) |
| `NEXT_PUBLIC_APP_URL` | Yes | App base URL (e.g., `http://127.0.0.1:3001`) |

---

## Known Limitations & TODOs

1. **No password-based login** — Privy uses OAuth and OTP only. No traditional email/password.
2. **No session expiration UI** — If session expires, next protected request hard-redirects to login.
3. **No account deletion** — No self-service account deletion flow.
4. **No email change flow** — Email is tied to Privy identity.
5. **Spotify tokens stored in plaintext** — `spotify_access_token` and `spotify_refresh_token` are stored unencrypted. Should use Supabase Vault in production.
6. **Settings page is placeholder** — Currently shows "Coming soon."
