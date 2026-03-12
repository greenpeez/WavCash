import {
  createPublicClient,
  createWalletClient,
  http,
  type Hex,
  formatEther,
  formatUnits,
  erc20Abi,
  decodeEventLog,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { avalanche, avalancheFuji } from "viem/chains";
import RoyaltySplitterArtifact from "./RoyaltySplitter.json";
import WavCashSplitArtifact from "./WavCashSplit.json";

const chain =
  process.env.NEXT_PUBLIC_CHAIN_ID === "43114" ? avalanche : avalancheFuji;

const rpcUrl =
  process.env.AVALANCHE_RPC_URL ??
  (chain.id === 43114
    ? "https://api.avax.network/ext/bc/C/rpc"
    : "https://api.avax-test.network/ext/bc/C/rpc");

function getPublicClient() {
  return createPublicClient({
    chain,
    transport: http(rpcUrl),
  });
}

function getWalletClient() {
  const key = process.env.DEPLOYER_PRIVATE_KEY;
  if (!key) throw new Error("DEPLOYER_PRIVATE_KEY not configured");
  return createWalletClient({
    account: privateKeyToAccount(key as Hex),
    chain,
    transport: http(rpcUrl),
  });
}

const abi = RoyaltySplitterArtifact.abi;
const splitAbi = WavCashSplitArtifact.abi;

// ─── Read Functions ─────────────────────────────────────

export async function getContractBalance(
  contractAddress: `0x${string}`
): Promise<bigint> {
  const client = getPublicClient();
  return client.getBalance({ address: contractAddress });
}

export async function getReleasable(
  contractAddress: `0x${string}`,
  account: `0x${string}`
): Promise<bigint> {
  const client = getPublicClient();
  return client.readContract({
    address: contractAddress,
    abi,
    functionName: "releasable",
    args: [account],
  }) as Promise<bigint>;
}

export async function getReleasableToken(
  contractAddress: `0x${string}`,
  token: `0x${string}`,
  account: `0x${string}`
): Promise<bigint> {
  const client = getPublicClient();
  return client.readContract({
    address: contractAddress,
    abi,
    functionName: "releasableToken",
    args: [token, account],
  }) as Promise<bigint>;
}

export async function getPayees(
  contractAddress: `0x${string}`
): Promise<`0x${string}`[]> {
  const client = getPublicClient();
  return client.readContract({
    address: contractAddress,
    abi,
    functionName: "getPayees",
  }) as Promise<`0x${string}`[]>;
}

export async function getShares(
  contractAddress: `0x${string}`,
  account: `0x${string}`
): Promise<bigint> {
  const client = getPublicClient();
  return client.readContract({
    address: contractAddress,
    abi,
    functionName: "shares",
    args: [account],
  }) as Promise<bigint>;
}

export async function getTotalReleased(
  contractAddress: `0x${string}`
): Promise<bigint> {
  const client = getPublicClient();
  return client.readContract({
    address: contractAddress,
    abi,
    functionName: "totalReleased",
  }) as Promise<bigint>;
}

// ─── Write Functions (called by deployer wallet) ────────

/**
 * Calls distributeAll() on the contract to push pending AVAX to all payees.
 * Returns the transaction hash.
 */
export async function callDistributeAll(
  contractAddress: `0x${string}`
): Promise<`0x${string}`> {
  const walletClient = getWalletClient();
  const publicClient = getPublicClient();

  const hash = await walletClient.writeContract({
    address: contractAddress,
    abi: splitAbi,
    functionName: "distributeAll",
  });

  const receipt = await publicClient.waitForTransactionReceipt({
    hash,
    timeout: 30_000,
  });

  if (receipt.status !== "success") {
    throw new Error(`distributeAll reverted: ${hash}`);
  }

  return hash;
}

/**
 * Calls distributeAllToken() to push pending ERC-20 tokens to all payees.
 */
export async function callDistributeAllToken(
  contractAddress: `0x${string}`,
  tokenAddress: `0x${string}`
): Promise<`0x${string}`> {
  const walletClient = getWalletClient();
  const publicClient = getPublicClient();

  const hash = await walletClient.writeContract({
    address: contractAddress,
    abi,
    functionName: "distributeAllToken",
    args: [tokenAddress],
  });

  const receipt = await publicClient.waitForTransactionReceipt({
    hash,
    timeout: 30_000,
  });

  if (receipt.status !== "success") {
    throw new Error(`distributeAllToken reverted: ${hash}`);
  }

  return hash;
}

/**
 * Checks if a contract has any distributable AVAX balance.
 * Ignores dust amounts below 0.0001 AVAX (100000000000000 wei).
 */
const MIN_AVAX_WEI = 100000000000000n; // 0.0001 AVAX
export async function hasDistributableBalance(
  contractAddress: `0x${string}`
): Promise<{ hasBalance: boolean; balance: string }> {
  const balance = await getContractBalance(contractAddress);
  return {
    hasBalance: balance >= MIN_AVAX_WEI,
    balance: formatEther(balance),
  };
}

// ─── Fee Functions ──────────────────────────────────────

/**
 * Returns the amount of unsent native fees stuck in the contract.
 */
export async function getPendingFees(
  contractAddress: `0x${string}`
): Promise<bigint> {
  const client = getPublicClient();
  return client.readContract({
    address: contractAddress,
    abi: splitAbi,
    functionName: "pendingFees",
  }) as Promise<bigint>;
}

/**
 * Returns the total lifetime native fees collected by the contract.
 */
export async function getTotalFeesCollected(
  contractAddress: `0x${string}`
): Promise<bigint> {
  const client = getPublicClient();
  return client.readContract({
    address: contractAddress,
    abi,
    functionName: "totalFeesCollected",
  }) as Promise<bigint>;
}

/**
 * Calls collectFees() on the contract to retry sending any stuck
 * native fees to the fee recipient.
 */
export async function callCollectFees(
  contractAddress: `0x${string}`
): Promise<`0x${string}`> {
  const walletClient = getWalletClient();
  const publicClient = getPublicClient();

  const hash = await walletClient.writeContract({
    address: contractAddress,
    abi: splitAbi,
    functionName: "collectFees",
  });

  const receipt = await publicClient.waitForTransactionReceipt({
    hash,
    timeout: 30_000,
  });

  if (receipt.status !== "success") {
    throw new Error(`collectFees reverted: ${hash}`);
  }

  return hash;
}

// ─── WavCashSplit Functions ─────────────────────────────

/**
 * Relay an EIP-712 signature to registerSigner() on a WavCashSplit contract.
 * The deployer wallet submits the tx and pays gas. The signature proves the
 * signer's wallet consented.
 *
 * @param contractAddress - The WavCashSplit contract
 * @param slotIndex       - Which slot to fill
 * @param signer          - The contributor's wallet address
 * @param v               - Recovery byte of the EIP-712 signature
 * @param r               - First 32 bytes of the signature
 * @param s               - Second 32 bytes of the signature
 * @returns Transaction hash and whether the contract auto-activated
 */
export async function registerSignerOnChain(
  contractAddress: `0x${string}`,
  slotIndex: number,
  signer: `0x${string}`,
  v: number,
  r: `0x${string}`,
  s: `0x${string}`
): Promise<{ txHash: `0x${string}`; activated: boolean }> {
  const walletClient = getWalletClient();
  const publicClient = getPublicClient();

  const hash = await walletClient.writeContract({
    address: contractAddress,
    abi: splitAbi,
    functionName: "registerSigner",
    args: [BigInt(slotIndex), signer, v, r, s],
  });

  const receipt = await publicClient.waitForTransactionReceipt({
    hash,
    timeout: 30_000,
  });

  if (receipt.status !== "success") {
    throw new Error(`registerSigner reverted: ${hash}`);
  }

  // Check if the contract auto-activated by reading state
  const state = await publicClient.readContract({
    address: contractAddress,
    abi: splitAbi,
    functionName: "state",
  }) as number;
  const activated = state === 1; // 1 = Active

  return { txHash: hash, activated };
}

/**
 * Call void_() on a WavCashSplit contract to permanently disable it.
 * Only callable by the admin (deployer).
 */
export async function voidContractOnChain(
  contractAddress: `0x${string}`
): Promise<`0x${string}`> {
  const walletClient = getWalletClient();
  const publicClient = getPublicClient();

  const hash = await walletClient.writeContract({
    address: contractAddress,
    abi: splitAbi,
    functionName: "void_",
  });

  const receipt = await publicClient.waitForTransactionReceipt({
    hash,
    timeout: 30_000,
  });

  if (receipt.status !== "success") {
    throw new Error(`void_ reverted: ${hash}`);
  }

  return hash;
}

/**
 * Read the current state of a WavCashSplit contract.
 * Returns 0 = Signing, 1 = Active, 2 = Voided.
 */
export async function getContractState(
  contractAddress: `0x${string}`
): Promise<number> {
  const client = getPublicClient();
  return client.readContract({
    address: contractAddress,
    abi: splitAbi,
    functionName: "state",
  }) as Promise<number>;
}

/**
 * Read slot info from a WavCashSplit contract.
 */
export async function getSlotInfo(
  contractAddress: `0x${string}`,
  slotIndex: number
): Promise<{ sharesBps: bigint; signer: `0x${string}`; signedAt: bigint }> {
  const client = getPublicClient();
  const result = await client.readContract({
    address: contractAddress,
    abi: splitAbi,
    functionName: "getSlot",
    args: [BigInt(slotIndex)],
  });
  const [sharesBps, signer, signedAt] = result as [bigint, `0x${string}`, bigint];
  return { sharesBps, signer, signedAt };
}

// ─── ERC-20 Token Functions (WavCashSplit) ──────────────

/** USDC contract addresses on Avalanche */
export const USDC_ADDRESS: `0x${string}` =
  process.env.NEXT_PUBLIC_CHAIN_ID === "43114"
    ? "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E"  // Mainnet
    : "0x5425890298aed601595a70AB815c96711a31Bc65"; // Fuji

/** EURC (Euro Coin) contract addresses on Avalanche */
export const EURC_ADDRESS: `0x${string}` =
  process.env.NEXT_PUBLIC_CHAIN_ID === "43114"
    ? "0xC891EB4cbdEFf6e073e859e987815Ed1505c2ACD"  // Mainnet
    : "0x5E44db7996c682E92a960b65AC713a54AD815c6B"; // Fuji

/** All supported ERC-20 tokens for distribution */
export const SUPPORTED_TOKENS: Array<{
  address: `0x${string}`;
  symbol: string;
  decimals: number;
  dbKey: string; // token_type value stored in distributions table
}> = [
  { address: USDC_ADDRESS, symbol: "USDC", decimals: 6, dbKey: "usdc" },
  { address: EURC_ADDRESS, symbol: "EURC", decimals: 6, dbKey: "eurc" },
];

/**
 * Read an ERC-20 token balance held by a contract.
 */
export async function getTokenBalance(
  contractAddress: `0x${string}`,
  tokenAddress: `0x${string}`
): Promise<bigint> {
  const client = getPublicClient();
  return client.readContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [contractAddress],
  }) as Promise<bigint>;
}

/**
 * Check if a contract has distributable ERC-20 token balance.
 * Ignores dust amounts below $0.01 (10000 units for 6-decimal tokens).
 */
const MIN_TOKEN_UNITS_6 = 10000n; // $0.01 for 6-decimal tokens (USDC, EURC)
export async function hasDistributableTokenBalance(
  contractAddress: `0x${string}`,
  tokenAddress: `0x${string}`,
  decimals = 6
): Promise<{ hasBalance: boolean; balance: string }> {
  const balance = await getTokenBalance(contractAddress, tokenAddress);
  const divisor = 10 ** decimals;
  const minUnits = decimals === 6 ? MIN_TOKEN_UNITS_6 : BigInt(10 ** Math.max(decimals - 2, 0));
  return {
    hasBalance: balance >= minUnits,
    balance: (Number(balance) / divisor).toFixed(decimals),
  };
}

/**
 * Calls distributeAllToken() on a WavCashSplit contract.
 */
export async function callDistributeAllTokenSplit(
  contractAddress: `0x${string}`,
  tokenAddress: `0x${string}`
): Promise<`0x${string}`> {
  const walletClient = getWalletClient();
  const publicClient = getPublicClient();

  const hash = await walletClient.writeContract({
    address: contractAddress,
    abi: splitAbi,
    functionName: "distributeAllToken",
    args: [tokenAddress],
  });

  const receipt = await publicClient.waitForTransactionReceipt({
    hash,
    timeout: 30_000,
  });

  if (receipt.status !== "success") {
    throw new Error(`distributeAllToken reverted: ${hash}`);
  }

  return hash;
}

/**
 * Read pending ERC-20 token fees stuck in a WavCashSplit contract.
 */
export async function getPendingTokenFees(
  contractAddress: `0x${string}`,
  tokenAddress: `0x${string}`
): Promise<bigint> {
  const client = getPublicClient();
  return client.readContract({
    address: contractAddress,
    abi: splitAbi,
    functionName: "pendingTokenFees",
    args: [tokenAddress],
  }) as Promise<bigint>;
}

/**
 * Retry sending stuck ERC-20 token fees to the fee recipient.
 */
export async function callCollectTokenFees(
  contractAddress: `0x${string}`,
  tokenAddress: `0x${string}`
): Promise<`0x${string}`> {
  const walletClient = getWalletClient();
  const publicClient = getPublicClient();

  const hash = await walletClient.writeContract({
    address: contractAddress,
    abi: splitAbi,
    functionName: "collectTokenFees",
    args: [tokenAddress],
  });

  const receipt = await publicClient.waitForTransactionReceipt({
    hash,
    timeout: 30_000,
  });

  if (receipt.status !== "success") {
    throw new Error(`collectTokenFees reverted: ${hash}`);
  }

  return hash;
}

// ─── Event Reading (per-contributor payout amounts) ──────

export interface PayoutEvent {
  account: `0x${string}`;
  amount: bigint;
  amountDecimal: string;
  tokenAddress?: `0x${string}`;
}

/**
 * Read PaymentReleased and TokenPaymentReleased events from a distribution
 * transaction receipt. Returns exact per-contributor payout amounts.
 */
export async function getDistributionEventsFromTx(
  txHash: `0x${string}`,
  tokenType: "native" | string = "native"
): Promise<PayoutEvent[]> {
  const client = getPublicClient();
  const receipt = await client.getTransactionReceipt({ hash: txHash });

  const events: PayoutEvent[] = [];

  // Determine decimals for formatting
  const decimals = tokenType === "native" ? 18 : 6; // USDC/EURC are 6 decimals

  for (const log of receipt.logs) {
    try {
      if (tokenType === "native") {
        // Decode PaymentReleased(address indexed account, uint256 amount)
        const decoded = decodeEventLog({
          abi: splitAbi,
          data: log.data,
          topics: log.topics,
          eventName: "PaymentReleased",
        });
        if (decoded.args && "account" in decoded.args && "amount" in decoded.args) {
          const account = decoded.args.account as `0x${string}`;
          const amount = decoded.args.amount as bigint;
          events.push({
            account,
            amount,
            amountDecimal: formatEther(amount),
          });
        }
      } else {
        // Decode TokenPaymentReleased(address indexed token, address indexed account, uint256 amount)
        const decoded = decodeEventLog({
          abi: splitAbi,
          data: log.data,
          topics: log.topics,
          eventName: "TokenPaymentReleased",
        });
        if (decoded.args && "account" in decoded.args && "amount" in decoded.args) {
          const tokenAddr = (decoded.args as Record<string, unknown>).token as `0x${string}`;
          const account = decoded.args.account as `0x${string}`;
          const amount = decoded.args.amount as bigint;
          events.push({
            account,
            amount,
            amountDecimal: formatUnits(amount, decimals),
            tokenAddress: tokenAddr,
          });
        }
      }
    } catch {
      // Not a matching event log, skip
      continue;
    }
  }

  return events;
}
