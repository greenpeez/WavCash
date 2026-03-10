# WavCash Smart Contract Specification

> Architecture, deployment, signing ceremony, distribution, and block explorer verification.

---

## Overview

WavCash uses two Solidity contracts on Avalanche C-Chain to manage royalty splits for music tracks. Both are compiled with Solidity 0.8.24, deployed via a server-side deployer wallet (viem), and verified on Snowtrace automatically after deployment.

| Contract | Purpose | Payee Model | ERC-20 | State Machine |
|---|---|---|---|---|
| **WavCashSplit** | Signature-based split agreements | Dynamic — slots filled via EIP-712 signing ceremony | Yes (new deploys only) | Signing → Active → Voided |
| **RoyaltySplitter** | Fixed-payee royalty splits | Immutable — set at deployment | Yes | None (always active) |

**Network:** Avalanche C-Chain (mainnet `43114`, Fuji testnet `43113`)
**Platform fee:** 2.5% (250 basis points), configurable per-contract up to 10% max
**Compiler:** solc 0.8.24, optimizer enabled (200 runs)

---

## 1. WavCashSplit

The primary contract. Deployed when a creator sends a split agreement for signatures. Contributors don't pay gas — they sign EIP-712 typed data from their Privy embedded wallet, and the deployer relays the signature on-chain. Supports both native AVAX and ERC-20 token distribution (USDC, EURC).

> **Note:** Contracts are immutable once deployed. Only newly deployed splits include ERC-20 support. Existing live contracts remain AVAX-only.

### State Machine

```
CREATED ──→ SIGNING ──→ ACTIVE
                 │
                 └──→ VOIDED
```

- **Signing**: Deployed with N empty slots. Contributors sign via `registerSigner()`.
- **Active**: Auto-transitions when all slots are filled. `distributeAll()` becomes callable.
- **Voided**: Admin cancels during signing phase. Terminal state.

### Constructor

```solidity
constructor(
    uint256[] memory sharesBps_,   // per-slot shares, must sum to 10000
    address feeRecipient_,         // platform fee wallet
    uint256 feeBasisPoints_        // 0–1000 (0–10%)
)
```

Validation: at least 1 slot, each share > 0, total = 10000, fee recipient non-zero, fee ≤ 1000 bps.

### Storage

```solidity
enum State { Signing, Active, Voided }

struct Slot {
    uint256 sharesBps;   // e.g., 5000 = 50%
    address signer;      // zero until signed
    uint256 signedAt;    // block.timestamp
}

State public state;
Slot[] public slots;
uint256 public totalSlots;
uint256 public filledSlots;
address public admin;            // deployer wallet
address public feeRecipient;
uint256 public feeBasisPoints;

// Native AVAX accounting
uint256 public totalReleased;
uint256 public totalFeesCollected;
uint256 public pendingFees;

// ERC-20 per-token accounting
using SafeERC20 for IERC20;
mapping(IERC20 => uint256) public pendingTokenFees;
mapping(IERC20 => uint256) public totalTokenFeesCollected;

bytes32 public immutable DOMAIN_SEPARATOR;
bytes32 public constant SIGN_TYPEHASH =
    keccak256("SignAgreement(uint256 slotIndex,address signer)");
```

### Functions

#### `registerSigner(uint256 slotIndex, address signer, uint8 v, bytes32 r, bytes32 s)`

Called by the deployer wallet (relayer). Verifies the EIP-712 signature proves the signer's consent, then fills the slot. When `filledSlots == totalSlots`, auto-transitions to Active.

Guards:
- State must be Signing
- Slot must be empty
- Signer can't already occupy another slot
- Signature must recover to `signer`

```solidity
bytes32 structHash = keccak256(abi.encode(SIGN_TYPEHASH, slotIndex, signer));
bytes32 digest = keccak256(abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR, structHash));
address recovered = ecrecover(digest, v, r, s);
require(recovered == signer, "Invalid signature");
```

#### `distributeAll()`

Pushes the entire AVAX balance to all signers pro-rata. Deducts fee first. Anyone can call (permissionless).

```
balance → deduct fee → distribute
           │
           ├─ fee success → totalFeesCollected += fee
           └─ fee fail    → pendingFees += fee (retried later)
```

Per-payee: `amount = (distributable * slot.sharesBps) / 10000`. Failed transfers emit `DistributionFailed` but don't revert the whole batch.

#### `distributeAllToken(IERC20 token)`

Same logic as `distributeAll()` but for ERC-20 tokens. Uses `token.balanceOf(address(this))` for the total and `token.safeTransfer()` for payouts. Pre-calculates all amounts before state changes.

Per-payee transfers use the internal `_executeTokenTransfer()` helper wrapped in try/catch — failed transfers emit `TokenDistributionFailed` and accounting rolls back for that payee. Token fees track separately via `pendingTokenFees[token]`.

#### `collectTokenFees(IERC20 token)`

Retries sending stuck ERC-20 fees to `feeRecipient`. Mirrors `collectFees()` for tokens.

#### `_executeTokenTransfer(IERC20 token, address to, uint256 amount)`

Internal helper (callable only by `address(this)`) that calls `token.safeTransfer(to, amount)`. Exists solely so the caller can wrap it in try/catch — SafeERC20 reverts can't be caught directly in the same call frame.

#### `void_()`

Admin-only. Cancels during Signing phase. Terminal.

#### `collectFees()`

Retries sending stuck native AVAX fees to `feeRecipient`. Anyone can call.

#### View Functions

| Function | Returns |
|---|---|
| `getPayees()` | `address[]` — all signer addresses (zero for unfilled) |
| `shares(address)` | `uint256` — basis points for account |
| `getSlot(uint256)` | `(sharesBps, signer, signedAt)` |
| `releasable(address)` | `uint256` — estimated AVAX payout from current balance |
| `releasableToken(IERC20, address)` | `uint256` — estimated token payout from current balance |
| `state()` | `uint8` — 0=Signing, 1=Active, 2=Voided |

### Events

```solidity
// Native AVAX events
event SlotSigned(uint256 indexed slotIndex, address indexed signer, uint256 timestamp);
event SplitActivated(uint256 timestamp);
event SplitVoided(uint256 timestamp);
event PaymentReleased(address indexed account, uint256 amount);
event PaymentReceived(address indexed from, uint256 amount);
event DistributionFailed(address indexed account, uint256 amount);
event FeeCollected(uint256 amount);
event WavCashAction(string action);  // "CREATED" | "SIGNED" | "ACTIVATED" | "PAYMENT" | "VOIDED"

// ERC-20 token events
event TokenPaymentReleased(IERC20 indexed token, address indexed account, uint256 amount);
event TokenDistributionFailed(IERC20 indexed token, address indexed account, uint256 amount);
event TokenFeeCollected(IERC20 indexed token, uint256 amount);
```

`WavCashAction` is a human-readable label that shows up on block explorers alongside the method call.

---

## 2. RoyaltySplitter

Fixed-payee split for cases where all wallets are known upfront. Supports both native AVAX and ERC-20 tokens. Uses a push+pull hybrid distribution model with OpenZeppelin's `ReentrancyGuard`.

### Constructor

```solidity
constructor(
    address[] memory payees_,      // wallet addresses, no zeros, no duplicates
    uint256[] memory shares_,      // basis points per payee, must sum to 10000
    address feeRecipient_,         // platform fee wallet
    uint256 feeBasisPoints_        // 0–1000 (0–10%)
)
```

### Storage

```solidity
uint256 private _totalShares;              // always 10000
address[] private _payees;
mapping(address => uint256) private _shares;

address private immutable _feeRecipient;
uint256 private immutable _feeBasisPoints;

// Native AVAX accounting
uint256 private _totalReleased;
mapping(address => uint256) private _released;
uint256 private _pendingFees;
uint256 private _totalFeesCollected;

// ERC-20 per-token accounting
mapping(IERC20 => uint256) private _erc20TotalReleased;
mapping(IERC20 => mapping(address => uint256)) private _erc20Released;
mapping(IERC20 => uint256) private _pendingTokenFees;
mapping(IERC20 => uint256) private _erc20TotalFeesCollected;
```

### Functions

#### Push Distribution

| Function | Description |
|---|---|
| `distributeAll()` | Pushes pending AVAX to all payees. Pre-calculates gross payments to prevent mid-loop drift. Per-payee try/catch — failures roll back accounting. |
| `distributeAllToken(IERC20 token)` | Same for ERC-20. Uses `SafeERC20.safeTransfer` via external self-call for try/catch. |

#### Pull Distribution (Fallback)

| Function | Description |
|---|---|
| `release(address payable account)` | Individual AVAX claim. Deducts fee. Reverts on transfer failure. |
| `releaseToken(IERC20 token, address account)` | Individual ERC-20 claim. |

#### Fee Retry

| Function | Description |
|---|---|
| `collectFees()` | Retries stuck native AVAX fees. Reverts if still failing. |
| `collectTokenFees(IERC20 token)` | Retries stuck token fees. |

#### Pending Payment Formula

```
totalReceived = balance + totalReleased - pendingFees
grossEntitled = totalReceived * shares[account] / totalShares
pending = grossEntitled - released[account]
netPayout = pending - (pending * feeBasisPoints / 10000)
```

### Security

- **ReentrancyGuard** on all external-call functions
- **CEI pattern** — state updates before external calls
- **SafeERC20** for all token transfers
- **Immutable config** — no owner, no admin, no upgradability
- **Unsupported tokens:** fee-on-transfer and rebasing tokens (accounting assumes exact delivery)

---

## 3. Deployment Flow

### Where It Lives

```
wavcash-app/src/lib/contracts/
├── deploy.ts              — deployWavCashSplit(), deployRoyaltySplitter(), verifyOnSnowTrace()
├── interact.ts            — read/write wrappers, token addresses (USDC, EURC), SUPPORTED_TOKENS array
├── WavCashSplit.json      — ABI + bytecode artifact
├── WavCashSplit.input.json — Standard JSON input (for Snowtrace verification)
├── RoyaltySplitter.json
└── RoyaltySplitter.input.json
```

### Deployer Wallet

A single server-side private key (`DEPLOYER_PRIVATE_KEY`) is used for:
1. Contract deployment
2. Relaying EIP-712 signatures (`registerSigner`)
3. Voiding contracts (`void_`)
4. Triggering distributions (`distributeAll`, `distributeAllToken`)

The deployer pays all gas. Contributors and creators never interact with the chain directly.

### `deployWavCashSplit(sharesBps, feeRecipient, feeBasisPoints)`

Called from `POST /api/splits/[id]/send` when a creator sends a draft for signatures.

1. Validates shares sum to 10000, fee ≤ 1000 bps, valid addresses
2. `walletClient.deployContract()` — submits creation tx
3. `publicClient.waitForTransactionReceipt()` — 30s timeout, Avalanche finality ~1–2s
4. Triggers `verifyOnSnowTrace()` (non-blocking, fire-and-forget)
5. Returns `{ contractAddress, txHash }`

### `deployRoyaltySplitter(payees, sharesBps, feeRecipient, feeBasisPoints)`

Same flow but with payee addresses set at deploy time. Additional validation: no duplicate addresses, no zero addresses.

### Trigger: `POST /api/splits/[id]/send`

When a creator clicks "Send for Signatures" on a draft:

1. Assign `slot_index` to each contributor (0-based, ordered by creation time)
2. Generate `invite_token` UUIDs for email links
3. Auto-link creator if their email matches a contributor
4. Deploy WavCashSplit: `sharesBps = contributors.map(c => c.percentage * 100)`
5. Update split status to `awaiting_signatures`, store `contract_address` and `tx_hash`
6. Log `deployed` event to `split_events`
7. Send invite emails via Resend

---

## 4. EIP-712 Signing Ceremony

### Frontend: `useSignSplit()` Hook

Location: `src/lib/hooks/use-sign-split.ts`

The user clicks "Sign" on the agreement page. The hook:

1. Gets the Privy embedded wallet (custodial, no MetaMask popup)
2. Builds EIP-712 typed data:
   ```
   domain: { name: "WavCashSplit", version: "1", chainId, verifyingContract }
   message: { slotIndex, signer: walletAddress }
   ```
3. Calls `eth_signTypedData_v4` via Privy provider (silent signing)
4. POSTs `{ wallet_address, signature }` to `/api/sign/{invite_token}`

### Backend: `POST /api/sign/[token]`

1. Verify auth (Privy Bearer token)
2. Look up contributor by `invite_token`
3. Parse signature into `v`, `r`, `s`:
   ```ts
   const r = sig.slice(0, 64)
   const s = sig.slice(64, 128)
   let v = parseInt(sig.slice(128, 130), 16)
   if (v < 27) v += 27  // normalize for some wallets
   ```
4. Call `registerSignerOnChain(contractAddress, slotIndex, signer, v, r, s)`
5. Update DB: `signed = true`, `signed_at = now`, `wallet_address`, `user_id`
6. Log `signed` event to `split_events`
7. Notify creator
8. If `activated` (all slots filled):
   - Update split status to `active`
   - Log `activated` event
   - Send `all_signed` and `agreement_live` notifications

### Replay Protection

- `DOMAIN_SEPARATOR` is scoped to: contract name, version, chainId, contract address
- A signature is only valid for a specific contract on a specific chain
- Each signer can only fill one slot (on-chain loop check)

---

## 5. Distribution

### Distribution Triggers

Distribution can be triggered three ways:
1. **Automated cron** — `GET /api/cron/distribute` (every 5 minutes, all active splits)
2. **User manual** — `POST /api/splits/{id}/distribute` (creator or contributor, single split)
3. **Admin manual** — `POST /api/admin/distributions/{splitId}` (admin only via `verifyAdmin()`, no ownership check, single split — failsafe from admin dashboard)

All three use the same underlying contract calls (`distributeAll()`, `distributeAllToken()`), DB logging, and contributor notifications.

### Cron Job: `GET /api/cron/distribute`

Runs every 5 minutes via Vercel Cron. Protected by `CRON_SECRET`. Two distribution passes per cycle:

**Pass 1 — Native AVAX:**

For each active split with a deployed contract:

1. `hasDistributableBalance(contractAddress)` — skip if zero
2. `callDistributeAll(contractAddress)` — pushes AVAX to all signers
3. Log distribution to `distributions` table with `token_type: "native"`
4. Notify each contributor: "You received ~X AVAX from {title}"
5. Check `getPendingFees()` — retry stuck fees via `callCollectFees()`

**Pass 2 — ERC-20 Tokens (USDC, EURC):**

Iterates over the `SUPPORTED_TOKENS` array. For each token, for each active split with a deployed contract:

1. `hasDistributableTokenBalance(contractAddress, tokenAddress)` — skip if balance below $0.01 (10000 raw units for 6-decimal tokens)
2. `callDistributeAllTokenSplit(contractAddress, tokenAddress)` — pushes tokens to all signers
3. Log distribution to `distributions` table with `token_type` set to the token's `dbKey` (e.g., `"usdc"` or `"eurc"`)
4. Notify each contributor: "You received ~$X.XX {SYMBOL} from {title}"
5. Check `getPendingTokenFees()` — retry stuck token fees via `callCollectTokenFees()`

Both USDC and EURC use 6 decimals. Amounts are formatted accordingly.

**Supported ERC-20 tokens** (determined by `NEXT_PUBLIC_CHAIN_ID`):

| Token | Mainnet (43114) | Fuji (43113) |
|---|---|---|
| USDC | `0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E` | `0x5425890298aed601595a70AB815c96711a31Bc65` |
| EURC | `0xC891EB4cbdEFf6e073e859e987815Ed1505c2ACD` | `0x5E44db7996c682E92a960b65AC713a54AD815c6B` |

Per-split try/catch — one failure doesn't stop others. AVAX and token failures are tracked independently per token type.

### Fee Math Example

**Native AVAX:**
```
Input:     10 AVAX, fee = 2.5% (250 bps)
Fee:       10 × 250 / 10000 = 0.25 AVAX → feeRecipient
Net:       10 − 0.25 = 9.75 AVAX
Payee A:   9.75 × 6000 / 10000 = 5.85 AVAX (60%)
Payee B:   9.75 × 4000 / 10000 = 3.90 AVAX (40%)
```

**ERC-20 (6 decimals — USDC, EURC):**
```
Input:     1000 USDC (1000000000 raw), fee = 2.5% (250 bps)
Fee:       1000000000 × 250 / 10000 = 25000000 (25 USDC) → feeRecipient
Net:       1000000000 − 25000000 = 975000000 (975 USDC)
Payee A:   975000000 × 6000 / 10000 = 585000000 ($585.00 USDC, 60%)
Payee B:   975000000 × 4000 / 10000 = 390000000 ($390.00 USDC, 40%)
```

EURC follows the same math — both use 6 decimals.

---

## 6. Voiding

### `POST /api/splits/[id]/void`

Creator-only. Only during `awaiting_signatures` status (not active, not already voided).

1. Verify auth + ownership
2. `voidContractOnChain(contractAddress)` — calls `void_()` on-chain
3. Update split status to `voided`
4. Log `voided` event to `split_events`

If the on-chain call fails, the DB update still proceeds — the API status check blocks further signing regardless.

---

## 7. Snowtrace Verification

### Why

Without verification, Snowtrace shows raw hex method selectors (`0x6b465d89`) instead of human-readable names (`registerSigner`). Verification uploads the source so the explorer can decode function calls and display them clearly.

### Auto-Verification on Deploy

`verifyOnSnowTrace()` in `deploy.ts` runs automatically after each deployment. Non-blocking — logs success/failure but never throws.

```ts
export async function verifyOnSnowTrace(
  contractAddress: string,
  contractName: string,       // "src/WavCashSplit.sol:WavCashSplit"
  constructorArgs: string,    // ABI-encoded, no 0x prefix
  standardInput: Record<string, unknown>
): Promise<void>
```

Flow:
1. Wait 5 seconds for node to index the creation tx
2. POST to Snowtrace API with `solidity-standard-json-input` format
3. Poll `checkverifystatus` every 5 seconds (up to 60s)
4. Log result

### API Details

```
Mainnet:  https://api.snowtrace.io/api
Testnet:  https://api-testnet.snowtrace.io/api

Parameters:
  module: contract
  action: verifysourcecode
  codeformat: solidity-standard-json-input
  sourceCode: JSON.stringify(standardInput)
  contractname: src/WavCashSplit.sol:WavCashSplit
  compilerversion: v0.8.24+commit.e11b9ed9
  constructorArguements: <ABI-encoded, no 0x prefix>  // Etherscan typo is intentional
```

### Standard JSON Input Files

Pre-compiled and committed to the repo so they're available at runtime without Hardhat:

- `WavCashSplit.input.json` — evmVersion: `paris`, optimizer: enabled (200 runs)
- `RoyaltySplitter.input.json` — evmVersion: `cancun`, optimizer: enabled (200 runs)

These contain the full source tree and compiler settings. Extracted from `artifacts/build-info/*.json` after `npx hardhat compile`.

### Retroactive Verification

For contracts deployed before auto-verification was added:

```bash
npx tsx scripts/verify-existing-contracts.ts
```

The script hardcodes known contract addresses and constructor args, then calls the Snowtrace API directly (same as `verifyOnSnowTrace()`).

---

## 8. Database Schema

### `splits`

| Column | Type | Description |
|---|---|---|
| `id` | UUID (PK) | |
| `created_by` | UUID (FK → users) | Creator's user ID |
| `track_id` | UUID (FK → tracks) | Linked music track |
| `title` | TEXT | e.g., "Night Drive: Split Agreement" |
| `status` | TEXT | `draft` → `awaiting_signatures` → `active` / `voided` |
| `contract_address` | TEXT | Avalanche contract address |
| `tx_hash` | TEXT | Deployment transaction hash |
| `contract_data` | JSONB | Extended form data (work, credits, royalty, etc.) |

### `split_contributors`

| Column | Type | Description |
|---|---|---|
| `id` | UUID (PK) | |
| `split_id` | UUID (FK → splits) | |
| `user_id` | UUID (FK → users) | Linked after login |
| `email` | TEXT | Invite email |
| `legal_name` | TEXT | Full name |
| `role` | TEXT | e.g., "Producer", "Songwriter" |
| `percentage` | NUMERIC(5,2) | e.g., 60.00 for 60% |
| `signed` | BOOLEAN | |
| `signed_at` | TIMESTAMPTZ | |
| `invite_token` | TEXT (UNIQUE) | UUID for signing link |
| `wallet_address` | TEXT | Set during signing ceremony |
| `slot_index` | INTEGER | Position in contract slots array |

**Conversion:** `percentage × 100 = basis points` (60.00% → 6000 bps)

### `split_events`

| Column | Type | Description |
|---|---|---|
| `split_id` | UUID (FK → splits) | |
| `event_type` | TEXT | `deployed`, `signed`, `activated`, `voided` |
| `tx_hash` | TEXT | On-chain transaction |
| `data` | JSONB | Event-specific metadata |

### `distributions`

| Column | Type | Description |
|---|---|---|
| `split_id` | UUID (FK → splits) | |
| `tx_hash` | TEXT | Distribution transaction |
| `token_type` | TEXT | `native` (AVAX), `usdc`, or `eurc` |
| `total_amount` | TEXT | Human-readable amount |
| `status` | TEXT | `success`, `partial`, `failed` |

---

## 9. Hardhat Configuration

Two separate Hardhat projects compile the two contracts independently:

### RoyaltySplitter — `contracts/`

```ts
solidity: {
  version: "0.8.24",
  settings: {
    evmVersion: "cancun",
    optimizer: { enabled: true, runs: 200 },
  },
},
```

Dependencies: OpenZeppelin Contracts (SafeERC20, ReentrancyGuard)

### WavCashSplit — `wavcash-app/contracts/`

```ts
solidity: {
  version: "0.8.24",
  settings: {
    optimizer: { enabled: true, runs: 200 },
    // evmVersion defaults to "paris"
  },
},
paths: { sources: "./src", artifacts: "./artifacts" },
```

Dependencies: OpenZeppelin Contracts (IERC20, SafeERC20)

Both configs include Snowtrace API key via `etherscan.apiKey.avalancheFujiTestnet`.

---

## 10. Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DEPLOYER_PRIVATE_KEY` | Yes | Private key for deploying, relaying signatures, distributing |
| `NEXT_PUBLIC_CHAIN_ID` | Yes | `43113` (Fuji) or `43114` (mainnet) |
| `WAVCASH_FEE_RECIPIENT` | Yes | Wallet that receives platform fees |
| `SNOWTRACE_API_KEY` | Yes | For auto-verification after deployment |
| `AVALANCHE_RPC_URL` | No | Override default public RPC |
| `CRON_SECRET` | Yes | Protects `/api/cron/distribute` |
| `RESEND_API_KEY` | Yes | Email service for invite links |

---

## 11. Contract Comparison

| Aspect | WavCashSplit | RoyaltySplitter |
|---|---|---|
| Payee setup | Dynamic — EIP-712 signing ceremony | Fixed at deployment |
| State machine | Signing → Active / Voided | Always active (immutable) |
| ERC-20 support | Yes (new deploys only — contracts are immutable) | Yes (any standard ERC-20) |
| Distribution model | Push only | Push + pull hybrid |
| Reentrancy guard | No (CEI pattern sufficient) | Yes (OpenZeppelin) |
| Void capability | Yes (admin, signing phase only) | No |
| Auto-activation | Yes (when all slots filled) | N/A |
| Dependencies | OpenZeppelin (IERC20, SafeERC20) | OpenZeppelin (SafeERC20, ReentrancyGuard) |
| evmVersion | paris | cancun |

---

## 12. Lifecycle Diagram

```
┌───────────────────────────────────────────────────────────────────┐
│                        CREATOR FLOW                               │
│                                                                   │
│  Draft Split ──→ Send for Signatures ──→ Deploy WavCashSplit     │
│      │                   │                     │                  │
│      │                   │              Snowtrace Verify (async)  │
│      │                   │                     │                  │
│      │             Assign slot_index     Store contract_address   │
│      │             Generate invite_token  Log "deployed" event    │
│      │                   │                                        │
│      │             Send invite emails                             │
│      │                   │                                        │
│      │           status = awaiting_signatures                     │
└──────┼───────────────────┼────────────────────────────────────────┘
       │                   │
┌──────┼───────────────────┼────────────────────────────────────────┐
│      │          CONTRIBUTOR FLOW                                  │
│      │                   │                                        │
│      │          Open /sign/{token}                                │
│      │                   │                                        │
│      │          Login with Privy                                  │
│      │                   │                                        │
│      │          Click "Sign" → EIP-712 signature (silent)        │
│      │                   │                                        │
│      │          POST /api/sign/{token}                            │
│      │                   │                                        │
│      │          registerSigner() on-chain                         │
│      │                   │                                        │
│      │          Log "signed" event                                │
│      │                   │                                        │
│      │          ┌─ All slots filled? ─┐                           │
│      │          │                     │                           │
│      │        No                    Yes                           │
│      │          │                     │                           │
│      │        Wait            Auto-activate                       │
│      │                        status = active                     │
│      │                        Log "activated" event               │
└──────┼────────────────────────────────────────────────────────────┘
       │
┌──────┼────────────────────────────────────────────────────────────┐
│      │              DISTRIBUTION FLOW                             │
│      │                                                            │
│      │        Cron (every 5 min):                                 │
│      │              │                                             │
│      │        For each active split:                              │
│      │              │                                             │
│      │        ┌─ Pass 1: Native AVAX ─┐                           │
│      │        │  Check AVAX balance    │                          │
│      │        │  distributeAll()       │                          │
│      │        │  Log + notify          │                          │
│      │        │  Retry stuck fees      │                          │
│      │        └────────────────────────┘                          │
│      │              │                                             │
│      │        ┌─ Pass 2: ERC-20 (USDC, EURC) ─┐                   │
│      │        │  For each SUPPORTED_TOKEN:     │                  │
│      │        │    Check token balance          │                  │
│      │        │    distributeAllToken()         │                  │
│      │        │    Log + notify                 │                  │
│      │        │    Retry stuck token fees       │                  │
│      │        └────────────────────────────────┘                  │
└──────┴────────────────────────────────────────────────────────────┘
```

---

## 13. Block Explorer Mapping

After Snowtrace verification, transactions display as:

| Dashboard Badge | On-chain Method | Block Explorer Display |
|---|---|---|
| DEPLOYED | Contract creation | "Contract Creation" |
| SIGNED | `registerSigner()` | "Register Signer" |
| ACTIVATED | (implicit in last `registerSigner`) | Same tx as final SIGNED |
| VOIDED | `void_()` | "Void" |
| PAYMENT | `distributeAll()` | "Distribute All" |
| PAYMENT (ERC-20) | `distributeAllToken()` | "Distribute All Token" |

The `WavCashAction` event emits a string label (`"CREATED"`, `"SIGNED"`, `"ACTIVATED"`, `"PAYMENT"`, `"VOIDED"`) that also appears in the explorer's event logs tab.
