# Splits (Agreements)
> Royalty split agreements with multi-step wizard, email invitations, EIP-712 onchain signing, automated smart contract deployment, distribution pipeline (AVAX + ERC-20), and full lifecycle management.

## Overview

Splits (labeled "Agreements" in the sidebar) allow artists to define royalty ownership for individual tracks. A split specifies who gets what percentage, generates a comprehensive 14-section legal contract, and provides a signing workflow so all contributors can agree on-record. When the creator sends for signatures, a smart contract is deployed on Avalanche C-Chain. Contributors sign via EIP-712 typed data, and the contract auto-activates when all parties have signed.

**Key design decisions:**

1. **Crypto abstraction** -- The UI uses "Agreement," "Sign," "Verified record" -- never "wallet," "contract," "gas," or "chain." Onchain enforcement happens transparently behind the scenes.
2. **No-account signing** -- Contributors don't need a WavCash account to view an agreement. Each contributor gets a unique invite token, and the signing page is fully public. However, contributors must create an account and connect a wallet to actually sign.
3. **Deploy-first, sign-later** -- The smart contract is deployed when the creator sends for signatures (not when the last person signs). The contract starts in `Signing` state with empty slots. Each contributor fills their slot via EIP-712 signature.
4. **Auto-activation** -- When the last contributor's EIP-712 signature is registered onchain, the contract transitions to `Active` and the split status updates to `active`.
5. **Email invitations** -- Contributors are automatically emailed invite links via Resend when the creator sends an agreement for signatures.
6. **Comprehensive contract generation** -- A 14-section legal contract is generated from wizard data, available as HTML and downloadable as PDF. Includes live signatures (calligraphy font + date) and deployed contract address.
7. **2.5% platform fee** -- WavCash retains a 2.5% processing fee on each royalty distribution, disclosed in the contract text and enforced by the smart contract.
8. **Multi-token distribution** -- Supports AVAX (native) and ERC-20 tokens (USDC, EURC). Automated cron job + manual trigger.

**Status Lifecycle:**
```
draft -> awaiting_signatures -> active (terminal, contract deployed + all signed)
draft -> voided (terminal)
awaiting_signatures -> voided (terminal)
awaiting_signatures -> active (auto, on final EIP-712 signature)
```

---

## User Flow

### Creating a Split (Multi-Step Wizard)

1. User navigates to `/dashboard/splits`
2. Sees list of existing agreements (or empty state)
3. Clicks "+ New Agreement"
4. **Multi-step wizard** with gated optional sections:

**Mandatory Steps:**
| Step | Component | What it collects |
|------|-----------|-----------------|
| Track Selection | `track-selection.tsx` | Agreement title, track from catalog dropdown (tracks with existing active splits are disabled) |
| Work Details | `work-details.tsx` | Genre, creation date, session dates, release date, distributor/label, alternate titles, ISWC |
| Ownership & Splits | `ownership-splits.tsx` | Composition splits (writer % + publisher % per contributor), master ownership type (joint/single/work-for-hire) |
| Royalty & Admin | `royalty-admin.tsx` | Mechanical rate (statutory/controlled/other), administrating party, payment timeframe (default 45 days), accounting frequency |
| Credits | `credits.tsx` | Per-contributor credit name, role credit, metadata tag |
| Dispute Resolution | `dispute-resolution.tsx` | Negotiation period (default 30 days), resolution method (arbitration/litigation), governing jurisdiction |
| Review & Generate | `review-generate.tsx` | Final review of all data, contract preview, "Create Agreement" button |

**Gated Optional Steps** (shown only if user answers "yes" to a gate question):
| Step | Gate Question | Component |
|------|--------------|-----------|
| Songwriters | "Does this track have songwriters?" | `songwriters.tsx` |
| Producers | "Does this track have producers?" | `producers.tsx` |
| Other Contributors | "Are there other contributors?" | `other-contributors.tsx` |
| Samples | "Does this track use samples?" | `samples.tsx` |
| Work for Hire | "Is any contributor work-for-hire?" | `work-for-hire.tsx` |
| SoundExchange | "Include SoundExchange Letter of Direction?" | `soundexchange.tsx` |

5. On "Create Agreement" -> POST to `/api/splits` with full `contract_data` JSONB
6. Redirected to split detail page

### Sending for Signatures

7. On split detail page, clicks "Send for Signatures" (if still in draft)
8. Backend:
   - Assigns `slot_index` to each contributor (0-indexed, ordered by creation)
   - Generates UUID invite tokens for each contributor
   - Links existing WavCash users by email match (auto-populates `user_id` and `wallet_address`)
   - **Deploys WavCashSplit contract** on Avalanche C-Chain (in `Signing` state)
   - Updates split status from `draft` -> `awaiting_signatures`
   - Stores `contract_address` and `tx_hash` on the split
   - Sends invite emails via Resend to each contributor
9. Email sent from: `WavCash <splits@noreply.wav.cash>`
10. Subject: `"{senderName} has invited you to claim {percentage}% royalties on {trackTitle}"`
11. Creator's own slot gets a different subject: `"Sign your Split Agreement: {trackTitle}"`
12. Linked existing users also get an in-app `invite_received` notification

### Signing (EIP-712 Onchain)

13. Contributor clicks email link -> arrives at `/sign/{token}` (no login required to view)
14. Sees: agreement title, track info, their name/role/share highlighted, all other contributors
15. Can view the full contract document inline
16. To sign: must create a WavCash account (via Privy) and connect wallet
17. Frontend constructs EIP-712 typed data and requests wallet signature
18. Submits to `POST /api/sign/{token}` with `wallet_address` + `signature`
19. Backend flow:
    - Atomic DB claim: marks contributor as signed (with `signed=false` guard to prevent races)
    - Parses EIP-712 signature into v, r, s components
    - Calls `registerSigner(slotIndex, signer, v, r, s)` on the deployed contract
    - If on-chain call fails, rolls back the DB claim
    - Logs event to `split_events` table
    - Notifies all linked users (creator + other contributors) via `split_signed` notification
    - If contract auto-activated (all slots filled): updates split to `active`, sends `all_signed` + `agreement_live` notifications

### Voiding

20. Creator can void if status is `draft` or `awaiting_signatures`
21. Clicks "Void Agreement" -> confirmation dialog:
    - Title: "Void this agreement?"
    - Body: "This action is permanent and cannot be undone. All pending signatures will be cancelled and this agreement will no longer be valid."
22. Backend:
    - If contract is deployed, calls `void_()` on the smart contract (sets state to `Voided`)
    - Updates DB status to `voided`
    - Logs `voided` event to `split_events`
    - Notifies all linked users via `agreement_voided` notification
23. Signing page shows "This agreement has been voided" for any future link clicks

### Distribution

24. Automated via cron job every 5 minutes (see Distribution Pipeline below)
25. Manual trigger available via `POST /api/splits/{id}/distribute` (no UI button currently)
26. Distributes both native AVAX and all supported ERC-20 tokens (USDC, EURC) if balances exist
27. Logs each distribution to the `distributions` table
28. Notifies each contributor with their estimated share amount

---

## Smart Contract Architecture

### WavCashSplit Contract (Current)

**Solidity:** `WavCashSplit.sol` (compiled with solc v0.8.24)
**Chain:** Avalanche C-Chain (mainnet 43114 or Fuji testnet 43113)

**State Machine:**
```
Signing (0) -> Active (1)    [auto, when all slots filled]
Signing (0) -> Voided (2)    [admin calls void_()]
Active (1)  -> (terminal)    [cannot be voided or modified]
Voided (2)  -> (terminal)    [cannot be reactivated]
```

**Constructor Args:**
- `sharesBps` -- Array of share amounts in basis points (e.g., 50% = 5000, must total 10000)
- `feeRecipient` -- WavCash fee collection address
- `feeBasisPoints` -- 250 (2.5%)

**Key Functions:**

| Function | Type | Description |
|----------|------|-------------|
| `registerSigner(slot, signer, v, r, s)` | Write | Register an EIP-712 signature for a slot. Auto-activates when all filled. |
| `distributeAll()` | Write | Push all pending native AVAX to payees proportionally |
| `distributeAllToken(IERC20 token)` | Write | Push all pending ERC-20 tokens to payees proportionally |
| `void_()` | Write | Admin-only. Permanently disable the contract (only in Signing state) |
| `collectFees()` | Write | Retry sending stuck native fees to fee recipient |
| `collectTokenFees(IERC20 token)` | Write | Retry sending stuck ERC-20 fees to fee recipient |
| `state()` | Read | Returns current state: 0=Signing, 1=Active, 2=Voided |
| `getSlot(index)` | Read | Returns (sharesBps, signer, signedAt) for a slot |
| `pendingFees()` | Read | Unsent native fees |
| `pendingTokenFees(IERC20 token)` | Read | Unsent ERC-20 token fees |

**EIP-712 Signing:**
- Domain: contract name + version + chainId + verifyingContract
- The contributor's wallet signs a typed data message proving consent
- The deployer wallet relays this signature via `registerSigner()`, paying gas on behalf of the contributor

**Fee Model:**
- 2.5% (250 basis points) deducted before distribution
- Fee sent to `feeRecipient` address on each `distributeAll()` or `distributeAllToken()` call
- If fee transfer fails (e.g., recipient is a contract that rejects), fees accumulate as `pendingFees` and can be retried via `collectFees()`

### Legacy Contracts

There are three generations of deployed contracts:

- **RoyaltySplitter.sol** (oldest): Required wallet addresses at deploy time. No `state()` function, no EIP-712 signing, no ERC-20 distribution support. The cron detects these by the absence of `state()` at the state-check phase and excludes them from the token pass entirely. Still distributes native AVAX via `distributeAll()`. Immutable bytecode.
- **WavCashSplit v1** (intermediate): Has `state()` and EIP-712 signing, but was deployed before `distributeAllToken()` was added. The cron detects these at call time — `distributeAllToken()` reverts with empty data (unknown function selector) and is silently skipped. Still distributes native AVAX. Immutable bytecode.
- **WavCashSplit v2** (current): Full support — `state()`, EIP-712 signing, and both AVAX and ERC-20 distribution. All new deployments use this version.

### Deployment Flow

1. Creator clicks "Send for Signatures"
2. Backend builds `sharesBps` array from contributor percentages
3. Calls `deployWavCashSplit(sharesBps, feeRecipient, feeBasisPoints)`
4. Contract deployed via deployer wallet, receipt awaited (30s timeout)
5. Auto-verifies source on Snowtrace (non-blocking, polls up to 60s)
6. `contract_address` and `tx_hash` stored on the split record
7. Contract starts in `Signing` state with empty slots

### Supported Tokens

Configured in `src/lib/contracts/interact.ts`:

| Token | Symbol | Decimals | Mainnet Address | Fuji Address |
|-------|--------|----------|----------------|--------------|
| USDC | USDC | 6 | `0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E` | `0x5425890298aed601595a70AB815c96711a31Bc65` |
| EURC | EURC | 6 | `0xC891EB4cbdEFf6e073e859e987815Ed1505c2ACD` | `0x5E44db7996c682E92a960b65AC713a54AD815c6B` |

Adding a new ERC-20 token requires only adding an entry to the `SUPPORTED_TOKENS` array -- no contract changes needed.

---

## Distribution Pipeline

### Automated Cron Job

**Endpoint:** `GET /api/cron/distribute`
**Schedule:** Every 5 minutes (configured in `vercel.json`)
**Auth:** `Authorization: Bearer {CRON_SECRET}` (Vercel sends automatically)

**Process:**
1. Fetches all active splits with deployed contracts
2. **Contract state check (separate pass):** Reads on-chain `state()` for each contract in its own try/catch. Contracts not in Active state (1) are skipped. Contracts without `state()` (old RoyaltySplitter) fall through to AVAX distribution without joining the token pass.
3. **Native AVAX pass:** For each contract, checks balance. If >= 0.0001 AVAX, calls `distributeAll()`, logs to `distributions` table, notifies contributors. Dust amounts below this threshold are skipped to avoid pointless activity entries and notifications. Records which contracts confirmed Active for the ERC-20 pass.
4. **ERC-20 token pass:** Only attempted on contracts confirmed Active in step 2. For each supported token (USDC, EURC), checks token balance. If >= $0.01, calls `distributeAllToken()`, logs, notifies. Dust amounts below threshold are skipped. Contracts that revert with empty data (v1 WavCashSplit without `distributeAllToken()`) are silently skipped — no error log, no DB write.
5. **Fee retry:** After each successful distribution, checks for stuck fees and retries `collectFees()` / `collectTokenFees()`
6. Returns stats: `{ distributed, skipped, failed, token_stats, results }`

### Manual Distribution

**Endpoint:** `POST /api/splits/{id}/distribute`
**Auth:** Required (must be creator or contributor)

Same logic as cron but scoped to a single split. No frontend UI button currently; callable via API only.

### Distribution Notifications

Each contributor with a linked `user_id` receives a `payout_received` notification:
- AVAX: `"You received ~{share} AVAX from "{title}""`
- ERC-20: `"You received ~${share} {SYMBOL} from "{title}""`

Amounts are estimated from `(totalAmount * percentage / 100)` (actual onchain amounts may differ slightly due to integer rounding in the smart contract).

---

## Contract Document Generation

### Template Structure (14 Sections + Exhibit A)

The extended contract generator (`generateExtendedHtml`) produces a full legal agreement from the wizard's `ContractData`:

| Section | Title | Content |
|---------|-------|---------|
| 1 | Identification of the Work | Track title, ISRC, ISWC, alternate titles, creation date, session dates, genre, release date, distributor, samples flag |
| 2 | Parties | All contributors table: name, role, share %, PRO affiliation, IPI, publishing type |
| 3 | Composition Ownership & Publishing Splits | Writer % + Publisher % per contributor |
| 4 | Master Recording Ownership | Joint/single ownership, per-contributor master splits with publishing details |
| 5 | Royalty Distribution | Mechanical rate, net royalties description, WavCash 2.5% platform fee disclosure |
| 6 | Administration | Administrating party (default WavCash), payment timeframe, accounting frequency, third-party publishing note |
| 7 | Sample Clearance | *(conditional)* Sample details table, clearance status, responsible party |
| 8 | Work for Hire | *(conditional)* Contributor, engaging party, flat fee, credit retention |
| 9 | Credit & Attribution | Per-contributor credit names, role credits, metadata tags |
| 10 | Onchain Enforcement | Smart contract deployment language, **shows deployed contract address** in monospace when available, irreversibility acknowledgment |
| 11 | Term | Lifetime of copyright unless unanimously amended |
| 12 | Dispute Resolution | Negotiation period, arbitration/litigation method, governing jurisdiction |
| 13 | Amendments | Requires unanimous consent, may void existing contract |
| 14 | Acceptance & Signatures | Signature blocks with **live signatures** (calligraphy font + signed date) for signed contributors, placeholder lines for unsigned |
| Exhibit A | SoundExchange Letter of Direction | *(conditional)* Digital performance royalty distribution authorization |

**Live Signatures:**
- When a contributor signs, their name renders in "Dancing Script" (Google Fonts) cursive at 22px with the formatted date below
- Unsigned contributors show a "Signature / Date" placeholder with a line
- The contract address appears in Section 10 once deployed

**Legacy Fallback:** If no `contract_data` is present (older splits), a simpler 7-section text template is used.

### Contract Access

- **API:** `GET /api/splits/[id]/contract?format=html` (authenticated, creator or contributor)
- **Detail Page:** "View Contract" button renders inline HTML, "Download PDF" exports via html2pdf.js
- **Signing Page:** Contract viewable by contributors via their invite token

---

## Email Invitations

### Resend Integration

**Sender:** `WavCash <splits@noreply.wav.cash>`

**Template** (`src/lib/email/templates/invite.ts`):
- Dark-mode default with `@media (prefers-color-scheme: light)` overrides
- Header: WavCash logo + wordmark (inline SVG)
- Body: greeting, invitation headline, track info pill, role/share details with divider
- CTAs: "Review & Sign" (primary amber button), "View Contract" (secondary outline button)
- Footer: "You received this email because {sender} added you as a contributor on WavCash"
- Plain text fallback included

**Creator Self-Invite:**
- When the creator is also a contributor, they get a different email template
- Subject: `"Sign your Split Agreement: {trackTitle}"`
- Uses `buildCreatorReminderEmailHtml` / `buildCreatorReminderEmailText`

**Send Flow** (`/api/splits/[id]/send`):
1. Verify split ownership and draft status
2. Verify `RESEND_API_KEY` is configured
3. Assign `slot_index` to each contributor
4. Generate invite tokens (UUID) for contributors missing one
5. Link existing users by email match (auto-populate `user_id`, `wallet_address`)
6. Deploy WavCashSplit contract
7. Update status -> `awaiting_signatures` with contract address
8. Log deployment event to `split_events`
9. Send individual emails to each contributor
10. Send `invite_received` notifications to linked existing users
11. Return `{ success, sent, failed, skipped, contract_address }`

---

## Notifications

All linked users (creator + contributors with accounts) receive notifications for split events. The sender of an action is excluded from their own notification.

| Event | Type | Title | Recipients |
|-------|------|-------|------------|
| Contributor signs | `split_signed` | "{name} signed" | All linked except signer |
| All contributors signed | `all_signed` | "All contributors signed" | All linked users |
| Contract activated | `agreement_live` | "Agreement is live" | All linked users |
| Agreement voided | `agreement_voided` | "Agreement voided" | All linked except voider |
| Payout distributed | `payout_received` | "Payout received" | Each contributor individually |
| Invite sent (existing user) | `invite_received` | "You've been invited to sign" | Linked existing users |

Notifications are stored in the `notifications` table and displayed via the dashboard bell icon with unread count badge.

---

## API Endpoints

### `POST /api/splits`

**Auth:** Required (Privy token)

**Request:**
```typescript
{
  track_id: string;
  title: string;
  contributors: Array<{
    email: string;
    legal_name: string;
    role: string;
    percentage: number;
  }>;
  contract_data?: ContractData; // Full wizard data (v2.0)
}
```

**Processing:**
1. Verify track ownership (via artists join)
2. Validate shares sum to 100 (0.01 tolerance)
3. Insert `splits` record with `contract_data` JSONB
4. Insert `split_contributors` records
5. Return `{ split_id }`

### `POST /api/splits/[id]/send`

**Auth:** Required (must be split creator)

**Processing:**
1. Verify ownership and draft status
2. Verify `RESEND_API_KEY` is configured
3. Assign `slot_index` to each contributor
4. Generate invite tokens (UUID) for contributors missing one
5. Link existing users by email match
6. Deploy WavCashSplit contract on Avalanche C-Chain
7. Update status -> `awaiting_signatures`, store contract_address
8. Send invite emails via Resend
9. Return `{ success, sent, failed, skipped, contract_address }`

### `POST /api/splits/[id]/void`

**Auth:** Required (must be split creator)

**Processing:**
1. Verify ownership
2. Reject if status is `active` or already `voided`
3. If contract deployed, call `void_()` on-chain (sets contract state to Voided)
4. Update DB status -> `voided`
5. Log event, notify all linked users

### `POST /api/splits/[id]/distribute`

**Auth:** Required (creator or contributor)

**Processing:**
1. Verify split is active with deployed contract
2. Check native AVAX balance -- if > 0, call `distributeAll()`
3. For each supported token (USDC, EURC) -- if balance > 0, call `distributeAllToken()`
4. Log distributions, notify contributors
5. Retry stuck fees
6. Return `{ success, avax, tokens, tx_hashes }`

### `GET /api/splits/[id]/contract`

**Auth:** Required (must be creator or linked contributor)

**Query Params:** `format=html|text` (default: text, html recommended)

**Processing:**
1. Fetch split with track info, contributors (including signed/signed_at), contract_address
2. Generate contract via `generateContractHtml()` or `generateContractText()`
3. HTML includes live signatures (Dancing Script font) and contract address
4. Return raw HTML or plain text (text format includes Content-Disposition for download)

### `GET /api/sign/[token]`

**Auth:** None (public endpoint, uses service role client)

**Response:** Split details, contributor info, all contributors list, contract address

### `POST /api/sign/[token]`

**Auth:** Required (Privy token -- contributor must have account + wallet)

**Request:**
```typescript
{
  wallet_address: string;  // Contributor's connected wallet
  signature: string;       // EIP-712 signature hex
}
```

**Processing:**
1. Find contributor by invite_token
2. Verify not already signed and split is `awaiting_signatures`
3. Atomic DB claim (mark signed with `signed=false` guard)
4. Parse EIP-712 signature into v, r, s
5. Call `registerSigner()` on the smart contract
6. If on-chain fails, roll back DB claim
7. Log event to `split_events`
8. Notify all linked users
9. If auto-activated: update split to `active`, send additional notifications

### `GET /api/cron/distribute`

**Auth:** `Authorization: Bearer {CRON_SECRET}`

**Processing:**
1. Fetch all active splits with deployed contracts
2. Native AVAX distribution pass (check balance, distribute, log, notify)
3. ERC-20 token distribution pass for each supported token
4. Fee retry for stuck fees
5. Return `{ distributed, skipped, failed, token_stats, results }`

---

## Status State Machine

```
                    +----------+
                    |  draft   |
                    +-----+----+
                          |
               +----------+----------+
               | /send    |          | /void
               v          |          v
      +-----------------+ |   +----------+
      |   awaiting_     | |   |  voided  |
      |  signatures     | |   | (terminal)|
      +--------+--------+ |   +----------+
               |           |
      +--------+--------+
      | last   |        | /void
      | signs  |        |
      v        |        v
  +--------+   |   +----------+
  | active |   |   |  voided  |
  |(terminal)|  |   | (terminal)|
  +--------+   |   +----------+
```

**Transitions:**
| From | To | Trigger |
|------|----|---------|
| draft | awaiting_signatures | Creator calls `/send` (contract deployed, emails sent) |
| draft | voided | Creator calls `/void` (with confirmation dialog) |
| awaiting_signatures | active | Last contributor's EIP-712 signature registered on-chain |
| awaiting_signatures | voided | Creator calls `/void` (contract voided on-chain) |

**Terminal States:** `active` and `voided` cannot transition further.

---

## Database Schema

### `splits` Table
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| title | text | Agreement title (e.g., "Track Name: Split Agreement") |
| track_id | uuid | FK to tracks table |
| created_by | uuid | FK to users table (creator) |
| status | text | `draft`, `awaiting_signatures`, `active`, `voided` |
| contract_address | text | Deployed smart contract address (null until sent) |
| tx_hash | text | Deployment transaction hash |
| contract_data | jsonb | Full wizard data (ContractData v2.0) |
| created_at | timestamptz | Creation timestamp |

### `split_contributors` Table
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| split_id | uuid | FK to splits |
| legal_name | text | Contributor's legal name |
| role | text | Role (e.g., "Songwriter", "Producer") |
| percentage | numeric | Ownership percentage (0-100) |
| email | text | Contributor's email |
| user_id | uuid | FK to users (linked when user exists or signs) |
| wallet_address | text | Contributor's wallet address |
| invite_token | uuid | Unique signing link token |
| slot_index | integer | Position in the smart contract slots array |
| signed | boolean | Whether this contributor has signed |
| signed_at | timestamptz | When they signed |
| created_at | timestamptz | Creation timestamp |

### `split_events` Table
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| split_id | uuid | FK to splits |
| event_type | text | `deployed`, `signed`, `activated`, `voided` |
| tx_hash | text | Associated transaction hash |
| data | jsonb | Event-specific metadata |
| created_at | timestamptz | Event timestamp |

### `distributions` Table
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| split_id | uuid | FK to splits |
| tx_hash | text | Distribution transaction hash |
| token_type | text | `native`, `usdc`, `eurc` |
| total_amount | text | Distributed amount (human-readable) |
| status | text | `success`, `failed` |
| created_at | timestamptz | Distribution timestamp |

### `notifications` Table
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| user_id | uuid | FK to users (recipient) |
| type | text | Notification type (see Notifications section) |
| title | text | Notification title |
| body | text | Notification body |
| metadata | jsonb | Additional data (split_id, tx_hash, etc.) |
| read | boolean | Whether user has seen it |
| created_at | timestamptz | Creation timestamp |

---

## ContractData Schema (v2.0)

Stored in `splits.contract_data` JSONB column, populated by the wizard:

```typescript
interface ContractData {
  version: "2.0";
  work: {
    alternate_titles?: string;
    iswc_code?: string;
    date_of_creation?: string;
    recording_session_dates?: string;
    genre?: string;
    anticipated_release_date?: string;
    distributor_or_label?: string;
    samples_used: boolean;
  };
  contributor_extras: Record<string, {
    stage_name?: string;
    pro_affiliation?: string;
    ipi_number?: string;
    publishing_type: "self" | "publisher";
    publisher_name?: string;
    publisher_pro?: string;
  }>;
  composition_splits: Record<string, {
    writer_share_pct: number;
    publisher_share_pct: number;
  }>;
  master: {
    ownership_type: "joint" | "single" | "work_for_hire";
    owner_name?: string;
    splits?: Record<string, {
      pct: number;
      publishing_type: "self" | "publisher";
      publisher_name?: string;
      publisher_pro?: string;
    }>;
  };
  royalty: {
    mechanical_rate: "statutory" | "controlled" | "other";
    controlled_pct?: number;
    mechanical_rate_description?: string;
  };
  administration: {
    administrating_party: "wavcash" | string;
    has_third_party_publishing: boolean;
    payment_timeframe_days: number;
    accounting_frequency: "quarterly" | "semi-annually" | "annually";
  };
  samples?: {
    items: Array<{
      song_title: string;
      original_artist: string;
      owner: string;
      clearance_status: "cleared" | "pending" | "uncleared";
      split_adjustment_pct?: number;
    }>;
    clearance_responsible_party: string;
  };
  work_for_hire?: {
    contributor_name: string;
    engaging_party: string;
    flat_fee: string;
    retains_composition_credit: boolean;
  };
  credits: Record<string, {
    credit_name: string;
    role_credit: string;
    metadata_tag?: string;
  }>;
  soundexchange?: {
    enabled: boolean;
    accounts?: Record<string, string>;
  };
  dispute_resolution: {
    negotiation_period_days: number;
    method: "arbitration" | "litigation";
    governing_jurisdiction: string;
  };
  completeness_score: number;
  skipped_sections: string[];
}
```

---

## File Map

| File | Purpose |
|------|---------|
| `src/app/(auth)/dashboard/splits/page.tsx` | Splits list page |
| `src/app/(auth)/dashboard/splits/new/page.tsx` | Multi-step split creation wizard |
| `src/app/(auth)/dashboard/splits/[id]/page.tsx` | Split detail page (contract view, signing, distribution, void) |
| `src/app/(public)/sign/[token]/page.tsx` | Public signing page (no auth to view, auth to sign) |
| `src/app/api/splits/route.ts` | POST: create split with contract_data |
| `src/app/api/splits/[id]/send/route.ts` | POST: deploy contract + send for signatures + email invites |
| `src/app/api/splits/[id]/void/route.ts` | POST: void agreement (on-chain + DB) |
| `src/app/api/splits/[id]/contract/route.ts` | GET: generate contract HTML/text with live signatures |
| `src/app/api/splits/[id]/distribute/route.ts` | POST: manual distribution trigger (AVAX + ERC-20) |
| `src/app/api/sign/[token]/route.ts` | GET: load signing data, POST: EIP-712 sign + register on-chain |
| `src/app/api/cron/distribute/route.ts` | GET: automated distribution cron job |
| `src/lib/contracts/generate.ts` | Contract text/HTML generator (14 sections + Exhibit A + live signatures) |
| `src/lib/contracts/deploy.ts` | Smart contract deployment (WavCashSplit + legacy RoyaltySplitter) + Snowtrace verification |
| `src/lib/contracts/interact.ts` | Smart contract read/write helpers, token constants, distribution functions |
| `src/lib/contracts/WavCashSplit.json` | WavCashSplit contract ABI + bytecode |
| `src/lib/contracts/WavCashSplit.input.json` | Solidity standard JSON input (for Snowtrace verification) |
| `src/lib/contracts/RoyaltySplitter.json` | Legacy RoyaltySplitter ABI + bytecode |
| `src/lib/contracts/RoyaltySplitter.input.json` | Legacy Solidity standard JSON input |
| `src/lib/email/client.ts` | Resend email client |
| `src/lib/email/templates/invite.ts` | Invite + creator reminder email HTML/text templates |
| `src/lib/types/contract.ts` | ContractData, WizardContributor, WizardGates types |
| `src/lib/types/database.ts` | Split, SplitContributor, NotificationType types |
| `src/lib/notifications/create.ts` | Single notification creator |
| `src/lib/notifications/notify-split.ts` | Broadcast notification to all linked users on a split |
| `src/components/split-wizard/` | Wizard components (context, steps, gates) |
| `src/middleware.ts` | `/sign` added to public paths |

---

## Constants & Configuration

| Constant | Value | Location |
|----------|-------|----------|
| Platform fee | 2.5% (250 basis points) | `deploy.ts`, contract constructor |
| Fee recipient | `0x8abD5cD06591DeF8cFf43EE3DdE3D135243a46B4` | `send/route.ts` (env override: `WAVCASH_FEE_RECIPIENT`) |
| Deployer wallet | Derived from `DEPLOYER_PRIVATE_KEY` | `deploy.ts`, `interact.ts` |
| Shares precision | Basis points (10000 = 100%) | Smart contract |
| Distribution amounts | AVAX: 4 decimal places, tokens: 2 decimal places | UI formatting |
| Cron interval | 5 minutes | `vercel.json` |
| TX timeout | 30 seconds | All contract interactions |
| Email sender | `WavCash <splits@noreply.wav.cash>` | `send/route.ts` |
| Signature font | Dancing Script (Google Fonts) | `generate.ts` HTML head |
| Snowtrace verify timeout | 60 seconds (12 polls at 5s) | `deploy.ts` |

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | For public signing page (bypasses RLS) |
| `NEXT_PUBLIC_APP_URL` | Yes | For constructing signing URLs |
| `RESEND_API_KEY` | Yes | Resend API key for sending invite emails |
| `DEPLOYER_PRIVATE_KEY` | For onchain | Private key for deploying + interacting with smart contracts |
| `WAVCASH_FEE_RECIPIENT` | For onchain | Wallet address for 2.5% platform fee collection |
| `NEXT_PUBLIC_CHAIN_ID` | For chain | `43114` for mainnet, `43113` for Fuji testnet |
| `AVALANCHE_RPC_URL` | Optional | Custom RPC endpoint (defaults to public Avalanche RPC) |
| `CRON_SECRET` | For cron | Secret for authenticating cron job requests |
| `SNOWTRACE_API_KEY` | Optional | For auto-verifying deployed contracts on Snowtrace |

---

## Known Limitations & TODOs

1. **Invite tokens stored plaintext** -- Should be hashed in production for security.
2. **No rate limiting on signing** -- Public endpoint with no throttling.
3. **No audit log** -- No separate table tracking who signed when and from what IP. Only `signed_at` on the contributor record + `split_events` table.
4. **No edit after creation** -- Once created, a split's contributors and shares cannot be modified. Must void and recreate.
5. **Active splits can't be voided** -- By design, but no mechanism for disputes after activation.
6. **Single track per split** -- Each split covers one track. No multi-track agreements.
7. **Email SVG logo stripped** -- Inline SVG in invite email is stripped by Gmail/Outlook/Yahoo. TODO: replace with hosted PNG when live domain is available.
8. **No retry for failed emails** -- If individual emails fail during send, there's no retry mechanism. Creator sees sent/failed/skipped counts.
9. **Legacy contracts lack ERC-20 support** -- Contracts predating ERC-20 support (RoyaltySplitter and early WavCashSplit v1) cannot distribute USDC/EURC. The cron handles these gracefully: RoyaltySplitter contracts (no `state()`) are detected at the state-check phase and excluded from the token pass entirely; v1 WavCashSplit contracts (have `state()` but no `distributeAllToken()`) are detected when they revert with empty data and silently skipped. Neither type produces errors in logs or writes false-failure rows to the database.
10. **Distribution amount rounding** -- Notification amounts are estimated from `(total * percentage / 100)`. Actual on-chain amounts may differ slightly due to integer division in the smart contract.
11. **Google Fonts dependency** -- Live signature calligraphy (Dancing Script) requires internet access to load the font. PDF generation via html2pdf.js also depends on this. If the font fails to load, signatures fall back to the default sans-serif font.
