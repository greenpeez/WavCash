import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import {
  hasDistributableBalance,
  callDistributeAll,
  getPendingFees,
  callCollectFees,
  hasDistributableTokenBalance,
  callDistributeAllTokenSplit,
  getPendingTokenFees,
  callCollectTokenFees,
  SUPPORTED_TOKENS,
  getContractState,
} from "@/lib/contracts/interact";
import { formatEther, formatUnits } from "viem";
import { createNotification } from "@/lib/notifications/create";

/**
 * GET /api/cron/distribute
 *
 * Auto-push distribution cron job. Checks all active split contracts
 * for pending AVAX balance and distributes to payees.
 *
 * Protected by CRON_SECRET — Vercel automatically sends this as
 * an Authorization: Bearer header on scheduled cron invocations.
 *
 * Runs every 5 minutes via Vercel Cron (configured in vercel.json).
 */
export async function GET(request: Request) {
  try {
    // Verify cron secret (Vercel sends Authorization: Bearer <CRON_SECRET>)
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      return NextResponse.json(
        { error: "CRON_SECRET not configured" },
        { status: 500 }
      );
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = await createServiceClient();

    // Get all active splits with deployed contracts and their contributors
    const { data: splits, error } = await supabase
      .from("splits")
      .select("id, title, contract_address, split_contributors(user_id, legal_name, percentage)")
      .eq("status", "active")
      .not("contract_address", "is", null);

    if (error) {
      console.error("Failed to query splits:", error);
      return NextResponse.json(
        { error: "Database query failed" },
        { status: 500 }
      );
    }

    if (!splits || splits.length === 0) {
      return NextResponse.json({
        distributed: 0,
        skipped: 0,
        failed: 0,
        message: "No active contracts found",
      });
    }

    let distributed = 0;
    let skipped = 0;
    let failed = 0;
    const tokenStats: Record<string, { distributed: number; skipped: number; failed: number }> = {};
    for (const t of SUPPORTED_TOKENS) {
      tokenStats[t.dbKey] = { distributed: 0, skipped: 0, failed: 0 };
    }
    const results: Array<{
      split_id: string;
      action: string;
      amount?: string;
      error?: string;
    }> = [];

    // Track which contracts are on-chain Active — reused by the token pass
    const activeContractAddresses = new Set<string>();

    for (const split of splits) {
      const contractAddress = split.contract_address as `0x${string}`;

      // Check contract type — own try/catch so incompatible contracts don't pollute stats
      try {
        const contractState = await getContractState(contractAddress);
        if (contractState !== 1) {
          skipped++;
          results.push({ split_id: split.id, action: "skipped_not_active" });
          continue;
        }
        activeContractAddresses.add(contractAddress);
      } catch {
        // state() not available — old RoyaltySplitter or unknown contract type
        // Don't add to activeContractAddresses (skips token pass)
        // Fall through to attempt AVAX distribution below
      }

      try {
        // Check if there's any AVAX balance to distribute
        const { hasBalance, balance } =
          await hasDistributableBalance(contractAddress);

        if (!hasBalance) {
          skipped++;
          continue;
        }

        // Distribute
        const txHash = await callDistributeAll(contractAddress);

        // Log to distributions table
        await supabase.from("distributions").insert({
          split_id: split.id,
          tx_hash: txHash,
          token_type: "native",
          total_amount: balance,
          status: "success",
        });

        distributed++;
        results.push({
          split_id: split.id,
          action: "distributed",
          amount: `${balance} AVAX`,
        });

        // Notify each contributor about their payout
        const contributors = (split as Record<string, unknown>).split_contributors as Array<{
          user_id: string | null;
          legal_name: string;
          percentage: number;
        }> | undefined;
        if (contributors) {
          for (const c of contributors) {
            if (c.user_id) {
              const share = (parseFloat(balance) * c.percentage / 100).toFixed(4);
              createNotification({
                userId: c.user_id,
                type: "payout_received",
                title: "Payout received",
                body: `You received ~${share} AVAX from "${(split as Record<string, unknown>).title}"`,
                metadata: { split_id: split.id, tx_hash: txHash, amount: share },
              }).catch(() => {});
            }
          }
        }

        // Safety net: collect any stuck fees from failed fee transfers
        try {
          const pending = await getPendingFees(contractAddress);
          if (pending > 0n) {
            await callCollectFees(contractAddress);
            results.push({
              split_id: split.id,
              action: "fees_collected",
              amount: `${formatEther(pending)} AVAX`,
            });
          }
        } catch {
          // Non-critical — fees will be retried next cycle
        }
      } catch (err) {
        failed++;
        const errorMsg =
          err instanceof Error ? err.message : "Unknown error";
        console.error(
          `Distribution failed for split ${split.id}:`,
          errorMsg
        );
        results.push({
          split_id: split.id,
          action: "failed",
          error: errorMsg,
        });

        // Log failed distribution
        await supabase.from("distributions").insert({
          split_id: split.id,
          tx_hash: "0x0",
          token_type: "native",
          total_amount: "0",
          status: "failed",
        });
      }
    }

    // ─── ERC-20 Token Distribution Pass ────────────────────
    for (const token of SUPPORTED_TOKENS) {
      for (const split of splits) {
        const contractAddress = split.contract_address as `0x${string}`;

        // Skip contracts that weren't Active in the AVAX pass
        if (!activeContractAddresses.has(contractAddress)) {
          tokenStats[token.dbKey].skipped++;
          continue;
        }

        try {
          const { hasBalance, balance } = await hasDistributableTokenBalance(
            contractAddress,
            token.address,
            token.decimals
          );

          if (!hasBalance) {
            tokenStats[token.dbKey].skipped++;
            continue;
          }

          // Distribute token
          const txHash = await callDistributeAllTokenSplit(
            contractAddress,
            token.address
          );

          const formattedAmount = balance;

          // Log to distributions table
          await supabase.from("distributions").insert({
            split_id: split.id,
            tx_hash: txHash,
            token_type: token.dbKey,
            total_amount: formattedAmount,
            status: "success",
          });

          tokenStats[token.dbKey].distributed++;
          results.push({
            split_id: split.id,
            action: `distributed_${token.dbKey}`,
            amount: `$${formattedAmount} ${token.symbol}`,
          });

          // Notify each contributor about their payout
          const contributors = (split as Record<string, unknown>)
            .split_contributors as
            | Array<{
                user_id: string | null;
                legal_name: string;
                percentage: number;
              }>
            | undefined;
          if (contributors) {
            for (const c of contributors) {
              if (c.user_id) {
                const share = (
                  (parseFloat(formattedAmount) * c.percentage) /
                  100
                ).toFixed(2);
                createNotification({
                  userId: c.user_id,
                  type: "payout_received",
                  title: "Payout received",
                  body: `You received ~$${share} ${token.symbol} from "${(split as Record<string, unknown>).title}"`,
                  metadata: {
                    split_id: split.id,
                    tx_hash: txHash,
                    amount: share,
                    token: token.dbKey,
                  },
                }).catch(() => {});
              }
            }
          }

          // Safety net: collect any stuck token fees
          try {
            const pending = await getPendingTokenFees(
              contractAddress,
              token.address
            );
            if (pending > 0n) {
              await callCollectTokenFees(contractAddress, token.address);
              results.push({
                split_id: split.id,
                action: `token_fees_collected_${token.dbKey}`,
                amount: `${formatUnits(pending, token.decimals)} ${token.symbol}`,
              });
            }
          } catch {
            // Non-critical - token fees will be retried next cycle
          }
        } catch (err) {
          const errorMsg =
            err instanceof Error ? err.message : "Unknown error";
          // "unknown reason" = function selector not found on contract (old v1 without token support)
          // Skip silently — the contract simply doesn't support ERC-20 distribution
          if (errorMsg.includes("unknown reason")) {
            tokenStats[token.dbKey].skipped++;
            continue;
          }
          tokenStats[token.dbKey].failed++;
          console.error(
            `${token.symbol} distribution failed for split ${split.id}:`,
            errorMsg
          );
          results.push({
            split_id: split.id,
            action: `failed_${token.dbKey}`,
            error: errorMsg,
          });
          // No DB write — token failures are non-critical; avoid spamming false-failure rows
        }
      }
    }

    return NextResponse.json({
      distributed,
      skipped,
      failed,
      token_stats: tokenStats,
      total_contracts: splits.length,
      results,
    });
  } catch (err) {
    console.error("Cron distribute error:", err);
    return NextResponse.json(
      { error: "Distribution job failed" },
      { status: 500 }
    );
  }
}
