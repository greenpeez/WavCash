# WavCash Learnings

Bug fixes, edge cases, and architectural decisions documented after each confirmed fix.

---

## White flash on page reload (FOUC)

**Problem:** On reload, the browser tears down the current page — WebGL canvas content disappears, revealing the default white background before the new page loads.

**Root cause:** Two-sided problem:
1. **Startup side:** New page has no content painted yet, shows white background
2. **Teardown side:** Old page's WebGL canvas is destroyed during navigation, briefly showing the background behind it

**Fix (layout.tsx only):**
- `<style>` in `<head>`: `html,body{background:#0a0a0a}` — parsed before any JS, prevents white default
- Inline `<script>` in `<body>`: Sets `body.style.opacity='0'` immediately, detects theme from localStorage, sets appropriate background
- `beforeunload` handler: `body.style.opacity='0'` — hides old page during teardown so canvas disappearing is invisible
- 3-second safety timeout: `setTimeout(function(){b.style.opacity='1'},3000)` — fallback reveal if mercury never draws

**Key insight:** The flash was happening on the teardown side, not the startup side. The startup gating was already working.

---

## Mercury canvas pages stuck on black screen

**Problem:** Pages with inline mercury WebGL canvas (docs, sniffer) appeared stuck on a black screen on fresh load.

**Root cause:** layout.tsx inline script sets `body.style.opacity = '0'`, but these pages never set it back to `'1'`. Only the 3-second safety timeout eventually revealed the page.

**Fix:** Add the `revealed` flag pattern to every inline mercury RAF loop:
```js
let revealed = false;
function loop() {
  // ... render code ...
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  if (!revealed) { revealed = true; document.body.style.opacity = "1"; }
}
```

**Rule:** Every page with a mercury canvas must include this pattern. Documented in CLAUDE.md under "Mercury Canvas — Default Loading Protocol".

---

## Dashboard pages showing empty state instead of loading skeleton

**Problem:** Splits page (and other dashboard pages) briefly showed "No data yet" empty state before the actual data loaded.

**Root cause:** `useAuthSWR` hook gates SWR on `ready && authenticated`. Before Privy initializes, the key is `null`, so SWR returns `{ data: undefined, isLoading: false }`. The page defaults `data` to `[]` and renders the empty state because `isLoading` is already `false`.

**Fix:** Destructure `ready` from `usePrivy()` and check `!ready || isLoading` before rendering content:
```tsx
const { user: privyUser, ready } = usePrivy();
// ...
if (!ready || isLoading) { return <loading skeleton>; }
```

**Applied to all dashboard pages:** splits, tracks, notifications, actuals, main dashboard.

---

## React declarative style trap (body opacity)

**Problem:** Using `style={{ opacity: 0 }}` in JSX for body opacity gating gets reset on every hydration/re-render by React.

**Fix:** Use an inline `<script>` with `dangerouslySetInnerHTML` that runs before React hydrates. This sets `body.style.opacity` imperatively, outside React's control. Add `suppressHydrationWarning` to `<body>` to prevent warnings.

---

## Split agreement title format

**Convention:** `Track Name: Split Agreement` (colon separator, not em dash). Track dropdown uses middle dot: `Title · ISRC`.

---

## Email logo: inline SVG stripped by most email clients

**Problem:** The invite email header uses an inline SVG waveform logo next to "WavCash". Most email clients (Gmail, Outlook, Yahoo) strip inline SVGs, so the logo is invisible.

**Current state:** SVG is kept as-is for dev/preview. Works in Apple Mail and a few others.

**TODO (when hosting on live domain):** Replace the inline SVG in `src/lib/email/templates/invite.ts` with a hosted PNG:
```html
<img src="https://wav.cash/logo-icon.png" alt="" width="22" height="18" />
```
Export the waveform logo as a transparent PNG (dark variant for dark bg, or single version that works on both). Host it at a permanent URL on the production domain. Also update the light-mode `@media` override if using separate dark/light logo variants.

---

## Contributor invite flow: email normalization

**Problem:** Emails stored as-entered (e.g. `Alice@Example.COM`). Causes inconsistency across downstream comparisons and potential email delivery issues with strict SMTP servers.

**Fix:** In `POST /api/splits` (splits/route.ts), normalize on insert: `c.email.trim().toLowerCase()`. Also added server-side email regex validation and duplicate email check per split.

---

## Signing race condition (TOCTOU)

**Problem:** `sign/[token]/route.ts` had a classic time-of-check-time-of-use race. Two concurrent requests could both read `signed = false`, both proceed to the on-chain call, and the second would overwrite the first's `wallet_address` and `user_id`.

**Fix:** Atomic claim pattern — mark as signed in DB BEFORE the on-chain call using `.eq("signed", false)` as an atomic guard. If on-chain fails, roll back the DB update. This way only the first request can claim the slot.

```ts
const { data: claimed } = await supabase
  .from("split_contributors")
  .update({ signed: true, ... })
  .eq("id", contributor.id)
  .eq("signed", false) // ← atomic guard
  .select("id")
  .single();
if (!claimed) return 400; // already signed
// ... on-chain call ...
// if on-chain fails → roll back DB
```

---

## Re-fetch ordering must match original fetch

**Problem:** `send/route.ts` fetches contributors with `.order("created_at", { ascending: true })` for slot assignment, but the re-fetch (for sending emails) had no `.order()`. Currently safe because per-row data is used, but fragile for any future position-dependent logic.

**Fix:** Always add `.order()` to re-fetches so ordering is deterministic and matches the original fetch.

---

## Frontend guard on null slot_index

**Problem:** Dashboard signing card used `slot_index ?? 0` fallback. If `slot_index` is null (edge case: send route failed to assign it), the frontend would sign an EIP-712 message for slot 0 — wrong slot, confusing error.

**Fix:** Added `myContributor.slot_index !== null` to the signing card render condition so the card simply doesn't appear if slot assignment failed.

---

## users.email never reliably persisted (name mismatch detection broken)

**Problem:** After a fresh DB (truncate + re-signup), `users.email` was null for all users, which broke:
1. Split wizard name mismatch detection (`lookup-by-email` found nothing)
2. Creator auto-link in `send/route.ts` (couldn't match `creator.email` to contributor rows)

**Root cause chain:**
1. `POST /api/user/register` INSERT only provides `id`, `wallet_address`, `email`, `phone` — missing NOT NULL fields `display_name`, `country`, `role` → INSERT fails silently
2. Onboarding profile save (`POST /api/user`) upserts with profile fields but **doesn't include `email`** → user created without email
3. Register backfill (on next page load) would fix it, but only AFTER the user navigates away

**Fix (3-part):**
1. Register route: provide defaults for NOT NULL columns (`display_name: ""`, `country: ""`, `role: "artist"`) so INSERT succeeds
2. User profile upsert: also fetch email/phone from Privy server-side and include in the upsert
3. Extracted `getPrivyUserInfo()` to shared module `src/lib/privy/user-info.ts`

**Also improved:** Contributor card now shows an amber hint "This email is registered to [Name]" when a known email is entered but the legal_name field is still empty.

---

## Contributor legal_name sync after onboarding

**Problem:** When an invited contributor completed onboarding with a different legal_name than what the split creator entered, the mismatch persisted silently. `split_contributors.legal_name` kept the creator's original input forever.

**Fix:** In `POST /api/sign/[token]/link` (called when user arrives at dashboard after onboarding), fetch the user's `legal_name` from the `users` table and sync it to the `split_contributors` record. Safe because legal_name is DB-only — the smart contract stores only wallet addresses and share basis points, never names.
