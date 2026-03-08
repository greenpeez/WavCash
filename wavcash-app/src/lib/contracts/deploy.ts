import {
  createPublicClient,
  createWalletClient,
  encodeAbiParameters,
  http,
  type Hex,
  isAddress,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { avalanche, avalancheFuji } from "viem/chains";
import RoyaltySplitterArtifact from "./RoyaltySplitter.json";
import WavCashSplitArtifact from "./WavCashSplit.json";
import RoyaltySplitterInput from "./RoyaltySplitter.input.json";
import WavCashSplitInput from "./WavCashSplit.input.json";

const chain =
  process.env.NEXT_PUBLIC_CHAIN_ID === "43114" ? avalanche : avalancheFuji;

const rpcUrl =
  process.env.AVALANCHE_RPC_URL ??
  (chain.id === 43114
    ? "https://api.avax.network/ext/bc/C/rpc"
    : "https://api.avax-test.network/ext/bc/C/rpc");

function getDeployerAccount() {
  const key = process.env.DEPLOYER_PRIVATE_KEY;
  if (!key) {
    throw new Error("DEPLOYER_PRIVATE_KEY not configured");
  }
  return privateKeyToAccount(key as Hex);
}

function getPublicClient() {
  return createPublicClient({
    chain,
    transport: http(rpcUrl),
  });
}

function getWalletClient() {
  return createWalletClient({
    account: getDeployerAccount(),
    chain,
    transport: http(rpcUrl),
  });
}

// ── Snowtrace Auto-Verification ──────────────────────────────────────────────

const SNOWTRACE_API =
  chain.id === 43114
    ? "https://api.snowtrace.io/api"
    : "https://api-testnet.snowtrace.io/api";

/**
 * Submits contract source for verification on Snowtrace (Etherscan-compatible API).
 * Non-blocking — logs success/failure but never throws.
 */
export async function verifyOnSnowTrace(
  contractAddress: string,
  contractName: string,
  constructorArgs: string,
  standardInput: Record<string, unknown>
): Promise<void> {
  const apiKey = process.env.SNOWTRACE_API_KEY;
  if (!apiKey) {
    console.log("[verify] Skipping — SNOWTRACE_API_KEY not set");
    return;
  }

  try {
    // Wait a few seconds for the node to index the contract
    await new Promise((r) => setTimeout(r, 5000));

    const params = new URLSearchParams({
      apikey: apiKey,
      module: "contract",
      action: "verifysourcecode",
      sourceCode: JSON.stringify(standardInput),
      codeformat: "solidity-standard-json-input",
      contractaddress: contractAddress,
      contractname: contractName,
      compilerversion: "v0.8.24+commit.e11b9ed9",
      constructorArguements: constructorArgs, // Etherscan API typo is intentional
    });

    const res = await fetch(SNOWTRACE_API, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });
    const data = await res.json();

    if (data.status !== "1") {
      console.log(`[verify] Submission failed for ${contractAddress}:`, data.result);
      return;
    }

    const guid = data.result;
    console.log(`[verify] Submitted ${contractAddress}, guid: ${guid}`);

    // Poll for result (up to 60s)
    for (let i = 0; i < 12; i++) {
      await new Promise((r) => setTimeout(r, 5000));
      const check = await fetch(
        `${SNOWTRACE_API}?apikey=${apiKey}&module=contract&action=checkverifystatus&guid=${guid}`
      );
      const status = await check.json();
      if (status.result === "Pass - Verified") {
        console.log(`[verify] ✓ ${contractAddress} verified on Snowtrace`);
        return;
      }
      if (status.result !== "Pending in queue") {
        console.log(`[verify] ${contractAddress}:`, status.result);
        return;
      }
    }
    console.log(`[verify] Timed out waiting for ${contractAddress}`);
  } catch (err) {
    console.log(`[verify] Error verifying ${contractAddress}:`, err);
  }
}

/**
 * Deploys a RoyaltySplitter contract on Avalanche C-Chain.
 *
 * @param payees        - Array of payee wallet addresses (must be valid, non-zero, no duplicates)
 * @param sharesBps     - Array of share amounts in basis points (must total 10000)
 * @param feeRecipient  - Address that receives the processing fee on each payout
 * @param feeBasisPoints - Fee in basis points (250 = 2.5%, max 1000 = 10%)
 * @returns Contract address and deployment transaction hash
 */
export async function deployRoyaltySplitter(
  payees: `0x${string}`[],
  sharesBps: bigint[],
  feeRecipient: `0x${string}`,
  feeBasisPoints: bigint = 250n
): Promise<{ contractAddress: `0x${string}`; txHash: `0x${string}` }> {
  // Validate inputs before spending gas
  if (payees.length === 0) {
    throw new Error("No payees provided");
  }
  if (payees.length !== sharesBps.length) {
    throw new Error("Payees and shares arrays must match in length");
  }

  const totalShares = sharesBps.reduce((sum, s) => sum + s, 0n);
  if (totalShares !== 10000n) {
    throw new Error(`Shares must total 10000 basis points, got ${totalShares}`);
  }

  for (const addr of payees) {
    if (!isAddress(addr)) {
      throw new Error(`Invalid address: ${addr}`);
    }
  }

  if (!isAddress(feeRecipient)) {
    throw new Error(`Invalid fee recipient address: ${feeRecipient}`);
  }

  if (feeBasisPoints > 1000n) {
    throw new Error(`Fee basis points too high: ${feeBasisPoints} (max 1000)`);
  }

  const seen = new Set<string>();
  for (const addr of payees) {
    const lower = addr.toLowerCase();
    if (seen.has(lower)) {
      throw new Error(`Duplicate payee: ${addr}`);
    }
    seen.add(lower);
  }

  const walletClient = getWalletClient();
  const publicClient = getPublicClient();

  // Deploy the contract
  const hash = await walletClient.deployContract({
    abi: RoyaltySplitterArtifact.abi,
    bytecode: RoyaltySplitterArtifact.bytecode as Hex,
    args: [payees, sharesBps, feeRecipient, feeBasisPoints],
  });

  // Wait for confirmation (Avalanche finality ~1-2s)
  const receipt = await publicClient.waitForTransactionReceipt({
    hash,
    timeout: 30_000,
  });

  if (receipt.status !== "success") {
    throw new Error(`Deployment transaction reverted: ${hash}`);
  }

  if (!receipt.contractAddress) {
    throw new Error(`No contract address in receipt: ${hash}`);
  }

  // Auto-verify on Snowtrace (non-blocking)
  const constructorArgs = encodeAbiParameters(
    [
      { type: "address[]" },
      { type: "uint256[]" },
      { type: "address" },
      { type: "uint256" },
    ],
    [payees, sharesBps, feeRecipient, feeBasisPoints]
  ).slice(2); // strip 0x prefix
  verifyOnSnowTrace(
    receipt.contractAddress,
    "contracts/RoyaltySplitter.sol:RoyaltySplitter",
    constructorArgs,
    RoyaltySplitterInput as Record<string, unknown>
  );

  return {
    contractAddress: receipt.contractAddress,
    txHash: hash,
  };
}

/**
 * Deploys a WavCashSplit contract with N empty signing slots.
 * The contract starts in Signing phase. Each slot has a share in basis points.
 * Contributors sign via EIP-712, and the contract auto-activates when all slots are filled.
 *
 * @param sharesBps      - Array of share amounts in basis points (must total 10000), one per slot
 * @param feeRecipient   - Address that receives the processing fee on each payout
 * @param feeBasisPoints - Fee in basis points (250 = 2.5%, max 1000 = 10%)
 * @returns Contract address and deployment transaction hash
 */
export async function deployWavCashSplit(
  sharesBps: bigint[],
  feeRecipient: `0x${string}`,
  feeBasisPoints: bigint = 250n
): Promise<{ contractAddress: `0x${string}`; txHash: `0x${string}` }> {
  if (sharesBps.length === 0) {
    throw new Error("No slots provided");
  }

  const totalShares = sharesBps.reduce((sum, s) => sum + s, 0n);
  if (totalShares !== 10000n) {
    throw new Error(`Shares must total 10000 basis points, got ${totalShares}`);
  }

  if (!isAddress(feeRecipient)) {
    throw new Error(`Invalid fee recipient address: ${feeRecipient}`);
  }

  if (feeBasisPoints > 1000n) {
    throw new Error(`Fee basis points too high: ${feeBasisPoints} (max 1000)`);
  }

  const walletClient = getWalletClient();
  const publicClient = getPublicClient();

  const hash = await walletClient.deployContract({
    abi: WavCashSplitArtifact.abi,
    bytecode: WavCashSplitArtifact.bytecode as Hex,
    args: [sharesBps, feeRecipient, feeBasisPoints],
  });

  const receipt = await publicClient.waitForTransactionReceipt({
    hash,
    timeout: 30_000,
  });

  if (receipt.status !== "success") {
    throw new Error(`WavCashSplit deployment reverted: ${hash}`);
  }

  if (!receipt.contractAddress) {
    throw new Error(`No contract address in receipt: ${hash}`);
  }

  // Auto-verify on Snowtrace (non-blocking)
  const constructorArgs = encodeAbiParameters(
    [
      { type: "uint256[]" },
      { type: "address" },
      { type: "uint256" },
    ],
    [sharesBps, feeRecipient, feeBasisPoints]
  ).slice(2); // strip 0x prefix
  verifyOnSnowTrace(
    receipt.contractAddress,
    "src/WavCashSplit.sol:WavCashSplit",
    constructorArgs,
    WavCashSplitInput as Record<string, unknown>
  );

  return {
    contractAddress: receipt.contractAddress,
    txHash: hash,
  };
}
