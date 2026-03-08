/**
 * One-time script to verify existing deployed WavCashSplit contracts on Snowtrace.
 *
 * Usage:
 *   npx tsx scripts/verify-existing-contracts.ts
 */
import { encodeAbiParameters } from "viem";
import WavCashSplitInput from "../src/lib/contracts/WavCashSplit.input.json";

const SNOWTRACE_API = "https://api-testnet.snowtrace.io/api";
const API_KEY = process.env.SNOWTRACE_API_KEY ?? "rs_49987f3bd0ac4cced0bab1af";

interface ContractToVerify {
  address: string;
  sharesBps: bigint[];
  feeRecipient: `0x${string}`;
  feeBasisPoints: bigint;
}

const CONTRACTS: ContractToVerify[] = [
  {
    address: "0x0cf12dc0c12ea360c8b330573b0e166ad6d9ff9d",
    sharesBps: [6000n, 4000n],
    feeRecipient: "0x8abD5cD06591DeF8cFf43EE3DdE3D135243a46B4",
    feeBasisPoints: 250n,
  },
  {
    address: "0xf364ede3305eff97e61f11d0f74ba186906672a6",
    sharesBps: [6000n, 4000n],
    feeRecipient: "0x8abD5cD06591DeF8cFf43EE3DdE3D135243a46B4",
    feeBasisPoints: 250n,
  },
];

async function verifyContract(contract: ContractToVerify): Promise<void> {
  console.log(`\n── Verifying ${contract.address} ──`);

  // ABI-encode constructor arguments (strip 0x prefix)
  const constructorArgs = encodeAbiParameters(
    [
      { type: "uint256[]" },
      { type: "address" },
      { type: "uint256" },
    ],
    [contract.sharesBps, contract.feeRecipient, contract.feeBasisPoints]
  ).slice(2);

  console.log(`Constructor args: ${constructorArgs.slice(0, 64)}...`);

  const params = new URLSearchParams({
    apikey: API_KEY,
    module: "contract",
    action: "verifysourcecode",
    sourceCode: JSON.stringify(WavCashSplitInput),
    codeformat: "solidity-standard-json-input",
    contractaddress: contract.address,
    contractname: "src/WavCashSplit.sol:WavCashSplit",
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
    console.log(`  ✗ Submission failed:`, data.result);
    return;
  }

  const guid = data.result;
  console.log(`  Submitted, guid: ${guid}`);

  // Poll for result (up to 90s)
  for (let i = 0; i < 18; i++) {
    await new Promise((r) => setTimeout(r, 5000));
    const check = await fetch(
      `${SNOWTRACE_API}?apikey=${API_KEY}&module=contract&action=checkverifystatus&guid=${guid}`
    );
    const status = await check.json();
    console.log(`  Poll ${i + 1}: ${status.result}`);

    if (status.result === "Pass - Verified") {
      console.log(`  ✓ ${contract.address} verified!`);
      return;
    }
    if (
      status.result !== "Pending in queue" &&
      !status.result.includes("Pending")
    ) {
      console.log(`  ✗ Verification failed: ${status.result}`);
      return;
    }
  }
  console.log(`  ✗ Timed out waiting for verification`);
}

async function main() {
  console.log("WavCash — Snowtrace Contract Verification");
  console.log(`API: ${SNOWTRACE_API}`);
  console.log(`Contracts to verify: ${CONTRACTS.length}`);

  for (const contract of CONTRACTS) {
    await verifyContract(contract);
  }

  console.log("\nDone.");
}

main().catch(console.error);
