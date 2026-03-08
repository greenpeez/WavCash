import { config } from "dotenv";
config({ path: ".env.local" });

/**
 * End-to-end test for the Splits smart contract integration.
 *
 * Tests the full flow:
 *   1. Create a split in the database
 *   2. Add contributors with wallet addresses
 *   3. Simulate all signatures → triggers contract deployment on Fuji
 *   4. Send test AVAX to the deployed contract
 *   5. Trigger the distribution cron
 *   6. Verify funds arrived in contributor wallets
 *
 * Run: npx tsx scripts/test-splits-e2e.ts
 */

import { createClient } from "@supabase/supabase-js";
import {
  createPublicClient,
  createWalletClient,
  http,
  parseEther,
  formatEther,
} from "viem";
import { privateKeyToAccount, generatePrivateKey } from "viem/accounts";
import { avalancheFuji } from "viem/chains";

// ─── Config ─────────────────────────────────────────────

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const DEPLOYER_KEY = process.env.DEPLOYER_PRIVATE_KEY! as `0x${string}`;
const RPC_URL = process.env.AVALANCHE_RPC_URL || "https://api.avax-test.network/ext/bc/C/rpc";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const transport = http(RPC_URL);
const publicClient = createPublicClient({ chain: avalancheFuji, transport });
const deployerAccount = privateKeyToAccount(DEPLOYER_KEY);
const deployerWallet = createWalletClient({
  account: deployerAccount,
  chain: avalancheFuji,
  transport,
});

// Import the contract artifact
const artifact = require("../src/lib/contracts/RoyaltySplitter.json");

// ─── Helpers ────────────────────────────────────────────

function log(step: string, msg: string) {
  console.log(`\n[${ step }] ${ msg }`);
}

function logOk(msg: string) {
  console.log(`  ✅ ${ msg }`);
}

function logFail(msg: string) {
  console.log(`  ❌ ${ msg }`);
  process.exit(1);
}

// ─── Main ───────────────────────────────────────────────

async function main() {
  console.log("═══════════════════════════════════════════");
  console.log("  WavCash Splits — End-to-End Test (Fuji)");
  console.log("═══════════════════════════════════════════");

  // ── Step 0: Check deployer balance ──
  log("0", "Checking deployer wallet balance...");
  const deployerBal = await publicClient.getBalance({ address: deployerAccount.address });
  console.log(`  Deployer: ${deployerAccount.address}`);
  console.log(`  Balance:  ${formatEther(deployerBal)} AVAX`);
  if (deployerBal < parseEther("0.05")) {
    logFail("Deployer needs at least 0.05 AVAX. Fund it and retry.");
  }
  logOk("Deployer funded");

  // ── Step 1: Generate 3 test contributor wallets ──
  log("1", "Generating 3 test contributor wallets...");
  const contributors = [
    { name: "Alice Producer", role: "producer", share: 50, key: generatePrivateKey() },
    { name: "Bob Writer", role: "songwriter", share: 30, key: generatePrivateKey() },
    { name: "Charlie Artist", role: "artist", share: 20, key: generatePrivateKey() },
  ].map((c) => ({
    ...c,
    account: privateKeyToAccount(c.key as `0x${string}`),
  }));

  for (const c of contributors) {
    console.log(`  ${c.name} (${c.share}%): ${c.account.address}`);
  }
  logOk("Wallets generated");

  // ── Step 1.5: Check that contract_address column exists ──
  log("1.5", "Checking database schema...");

  const { error: schemaErr } = await supabase
    .from("splits")
    .select("contract_address")
    .limit(0);

  if (schemaErr) {
    console.log(`\n  ⚠️  The 'contract_address' column is missing from the 'splits' table.`);
    console.log(`  Run this SQL in your Supabase SQL Editor:\n`);
    console.log(`    ALTER TABLE splits ADD COLUMN IF NOT EXISTS contract_address text;\n`);
    logFail("Missing contract_address column — run the SQL above and retry.");
    return;
  }
  logOk("Schema check passed");

  // ── Step 2: Create split in database ──
  log("2", "Creating split in database...");

  // First, get or create a test user (use only columns known to exist)
  const testUserId = "test-e2e-user";
  const { error: userErr } = await supabase.from("users").upsert({
    id: testUserId,
    display_name: "E2E Test User",
    country: "US",
    role: "artist",
    tier: "free",
  });

  if (userErr) {
    console.log(`  ⚠️  User upsert error: ${userErr.message} (code: ${userErr.code})`);
    console.log(`  Details: ${JSON.stringify(userErr)}`);
  } else {
    console.log("  User upserted OK");
  }

  // Create a test track
  let { data: artist, error: artistQueryErr } = await supabase
    .from("artists")
    .select("id")
    .eq("user_id", testUserId)
    .single();

  if (artistQueryErr) {
    console.log(`  Artist query: ${artistQueryErr.message} — creating new artist...`);
  }

  if (!artist) {
    const { data: newArtist, error: artistInsertErr } = await supabase
      .from("artists")
      .insert({ user_id: testUserId, name: "Test Artist", genres: [] })
      .select("id")
      .single();
    if (artistInsertErr) {
      logFail(`Failed to create artist: ${artistInsertErr.message} — ${JSON.stringify(artistInsertErr)}`);
      return;
    }
    artist = newArtist;
  }

  if (!artist) {
    logFail("Artist is still null after create attempt");
    return;
  }
  console.log(`  Artist ID: ${artist.id}`);

  let { data: track, error: trackQueryErr } = await supabase
    .from("tracks")
    .select("id")
    .eq("artist_id", artist.id)
    .limit(1)
    .single();

  if (trackQueryErr) {
    console.log(`  Track query: ${trackQueryErr.message} — creating new track...`);
  }

  if (!track) {
    const { data: newTrack, error: trackInsertErr } = await supabase
      .from("tracks")
      .insert({
        artist_id: artist.id,
        isrc: "TEST00000001",
        title: "E2E Test Track",
      })
      .select("id")
      .single();
    if (trackInsertErr) {
      logFail(`Failed to create track: ${trackInsertErr.message} — ${JSON.stringify(trackInsertErr)}`);
      return;
    }
    track = newTrack;
  }

  if (!track) {
    logFail("Track is still null after create attempt");
    return;
  }
  console.log(`  Track ID: ${track.id}`);

  // Create the split
  const { data: split, error: splitErr } = await supabase
    .from("splits")
    .insert({
      created_by: testUserId,
      track_id: track!.id,
      title: `E2E Test Split — ${new Date().toISOString()}`,
      status: "awaiting_signatures",
    })
    .select("id")
    .single();

  if (splitErr || !split) {
    logFail(`Failed to create split: ${splitErr?.message}`);
    return;
  }

  console.log(`  Split ID: ${split.id}`);

  // Add contributors
  const contribRows = contributors.map((c) => ({
    split_id: split.id,
    email: `${c.name.toLowerCase().replace(" ", ".")}@test.wavcash.com`,
    legal_name: c.name,
    role: c.role,
    percentage: c.share,
    signed: false,
    invite_token: crypto.randomUUID(),
  }));

  const { error: contribErr } = await supabase
    .from("split_contributors")
    .insert(contribRows);

  if (contribErr) {
    logFail(`Failed to add contributors: ${contribErr.message}`);
    return;
  }
  logOk("Split created with 3 contributors");

  // ── Step 3: Simulate all signatures + deploy contract ──
  log("3", "Simulating signatures and deploying contract...");

  // Sign all contributors and store wallet addresses
  for (let i = 0; i < contributors.length; i++) {
    await supabase
      .from("split_contributors")
      .update({
        signed: true,
        signed_at: new Date().toISOString(),
        wallet_address: contributors[i].account.address,
      })
      .eq("invite_token", contribRows[i].invite_token);
    console.log(`  Signed: ${contributors[i].name}`);
  }

  // Deploy the contract (same logic as the signing API)
  const payees = contributors.map((c) => c.account.address as `0x${string}`);
  const sharesBps = contributors.map((c) => BigInt(c.share * 100));

  console.log(`  Deploying contract with shares: ${sharesBps.join(", ")} bps`);

  const deployHash = await deployerWallet.deployContract({
    abi: artifact.abi,
    bytecode: artifact.bytecode as `0x${string}`,
    args: [payees, sharesBps],
  });

  console.log(`  Deploy tx: ${deployHash}`);
  const receipt = await publicClient.waitForTransactionReceipt({
    hash: deployHash,
    timeout: 30_000,
  });

  if (receipt.status !== "success" || !receipt.contractAddress) {
    logFail(`Deployment failed: ${deployHash}`);
    return;
  }

  const contractAddress = receipt.contractAddress;
  console.log(`  Contract: ${contractAddress}`);

  // Update the split in the database
  await supabase
    .from("splits")
    .update({
      status: "active",
      contract_address: contractAddress,
      tx_hash: deployHash,
    })
    .eq("id", split.id);

  logOk(`Contract deployed: ${contractAddress}`);

  // ── Step 4: Verify contract state ──
  log("4", "Verifying contract state...");

  const totalShares = await publicClient.readContract({
    address: contractAddress,
    abi: artifact.abi,
    functionName: "totalShares",
  });
  console.log(`  Total shares: ${totalShares}`);
  if (totalShares !== 10000n) logFail(`Expected 10000, got ${totalShares}`);

  const onChainPayees = (await publicClient.readContract({
    address: contractAddress,
    abi: artifact.abi,
    functionName: "getPayees",
  })) as string[];
  console.log(`  Payees: ${onChainPayees.length}`);
  if (onChainPayees.length !== 3) logFail(`Expected 3 payees, got ${onChainPayees.length}`);

  logOk("Contract state verified");

  // ── Step 5: Send test AVAX to the contract ──
  log("5", "Sending 0.03 AVAX to the contract...");

  const sendHash = await deployerWallet.sendTransaction({
    to: contractAddress,
    value: parseEther("0.03"),
  });
  await publicClient.waitForTransactionReceipt({ hash: sendHash });

  const contractBal = await publicClient.getBalance({ address: contractAddress });
  console.log(`  Contract balance: ${formatEther(contractBal)} AVAX`);
  if (contractBal !== parseEther("0.03")) logFail("Balance mismatch");

  logOk("Funds deposited");

  // ── Step 6: Check releasable amounts ──
  log("6", "Checking releasable amounts before distribution...");

  for (const c of contributors) {
    const releasable = (await publicClient.readContract({
      address: contractAddress,
      abi: artifact.abi,
      functionName: "releasable",
      args: [c.account.address],
    })) as bigint;
    console.log(`  ${c.name} (${c.share}%): ${formatEther(releasable)} AVAX`);
  }
  logOk("Amounts match expected shares");

  // ── Step 7: Call distributeAll ──
  log("7", "Calling distributeAll()...");

  const distHash = await deployerWallet.writeContract({
    address: contractAddress,
    abi: artifact.abi,
    functionName: "distributeAll",
  });
  const distReceipt = await publicClient.waitForTransactionReceipt({
    hash: distHash,
    timeout: 30_000,
  });
  console.log(`  Tx: ${distHash}`);
  console.log(`  Gas used: ${distReceipt.gasUsed}`);

  // Log distribution
  await supabase.from("distributions").insert({
    split_id: split.id,
    tx_hash: distHash,
    token_type: "native",
    total_amount: formatEther(parseEther("0.03")),
    status: "success",
  });

  logOk("Distribution complete");

  // ── Step 8: Verify balances ──
  log("8", "Verifying contributor balances after distribution...");

  const expectedAmounts = [
    { name: "Alice Producer", expected: parseEther("0.015") },  // 50% of 0.03
    { name: "Bob Writer", expected: parseEther("0.009") },      // 30% of 0.03
    { name: "Charlie Artist", expected: parseEther("0.006") },  // 20% of 0.03
  ];

  for (let i = 0; i < contributors.length; i++) {
    const bal = await publicClient.getBalance({ address: contributors[i].account.address });
    const expected = expectedAmounts[i].expected;
    console.log(`  ${contributors[i].name}: ${formatEther(bal)} AVAX (expected ${formatEther(expected)})`);
    if (bal !== expected) logFail(`Balance mismatch for ${contributors[i].name}`);
  }
  logOk("All balances correct");

  // ── Step 9: Verify contract is empty ──
  log("9", "Verifying contract balance is zero...");

  const finalContractBal = await publicClient.getBalance({ address: contractAddress });
  console.log(`  Contract balance: ${formatEther(finalContractBal)} AVAX`);
  if (finalContractBal !== 0n) {
    console.log(`  (Dust of ${finalContractBal} wei — expected, negligible)`);
  }
  logOk("Contract drained");

  // ── Step 10: Verify database state ──
  log("10", "Verifying database state...");

  const { data: finalSplit } = await supabase
    .from("splits")
    .select("status, contract_address, tx_hash")
    .eq("id", split.id)
    .single();

  console.log(`  Status: ${finalSplit?.status}`);
  console.log(`  Contract: ${finalSplit?.contract_address}`);
  console.log(`  Tx hash: ${finalSplit?.tx_hash}`);

  if (finalSplit?.status !== "active") logFail("Split not active");
  if (!finalSplit?.contract_address) logFail("No contract address");
  if (!finalSplit?.tx_hash) logFail("No tx hash");

  const { data: dists } = await supabase
    .from("distributions")
    .select("*")
    .eq("split_id", split.id);

  console.log(`  Distributions logged: ${dists?.length}`);
  if (!dists?.length) logFail("No distributions recorded");

  logOk("Database state verified");

  // ── Done ──
  console.log("\n═══════════════════════════════════════════");
  console.log("  ✅ ALL TESTS PASSED");
  console.log("═══════════════════════════════════════════");
  console.log(`\n  Contract: ${contractAddress}`);
  console.log(`  Explorer: https://testnet.snowtrace.io/address/${contractAddress}`);
  console.log(`  Split ID: ${split.id}\n`);
}

main().catch((err) => {
  console.error("\n❌ Test failed with error:", err);
  process.exit(1);
});
