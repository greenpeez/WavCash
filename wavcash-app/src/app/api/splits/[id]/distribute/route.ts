import { NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth/verify";
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
} from "@/lib/contracts/interact";

import { createNotification } from "@/lib/notifications/create";

/**
 * POST /api/splits/[id]/distribute
 *
 * Manually trigger distribution for a single active split.
 * Distributes both native AVAX and USDC if balances exist.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { userId } = await verifyAuth();
    const supabase = await createServiceClient();

    // Look up the split — must be active with a deployed contract
    const { data: split } = await supabase
      .from("splits")
      .select(
        "id, title, status, contract_address, created_by, split_contributors(user_id, legal_name, percentage)"
      )
      .eq("id", id)
      .single();

    if (!split) {
      return NextResponse.json(
        { error: "Agreement not found" },
        { status: 404 }
      );
    }

    if (split.status !== "active") {
      return NextResponse.json(
        { error: "Agreement is not active" },
        { status: 400 }
      );
    }

    if (!split.contract_address) {
      return NextResponse.json(
        { error: "No contract deployed for this agreement" },
        { status: 400 }
      );
    }

    const contractAddress = split.contract_address as `0x${string}`;
    const txHashes: string[] = [];
    let avaxDistributed: string | null = null;
    const tokenDistributed: Record<string, string> = {};

    const contributors = (split as Record<string, unknown>)
      .split_contributors as
      | Array<{
          user_id: string | null;
          legal_name: string;
          percentage: number;
        }>
      | undefined;

    // ── Native AVAX Distribution ────────────────────────────
    const { hasBalance: hasAvax, balance: avaxBalance } =
      await hasDistributableBalance(contractAddress);

    if (hasAvax) {
      const txHash = await callDistributeAll(contractAddress);
      txHashes.push(txHash);
      avaxDistributed = avaxBalance;

      await supabase.from("distributions").insert({
        split_id: split.id,
        tx_hash: txHash,
        token_type: "native",
        total_amount: avaxBalance,
        status: "success",
      });

      // Notify contributors
      if (contributors) {
        for (const c of contributors) {
          if (c.user_id) {
            const share = (
              (parseFloat(avaxBalance) * c.percentage) /
              100
            ).toFixed(4);
            createNotification({
              userId: c.user_id,
              type: "payout_received",
              title: "Payout received",
              body: `You received ~${share} AVAX from "${split.title}"`,
              metadata: {
                split_id: split.id,
                tx_hash: txHash,
                amount: share,
              },
            }).catch(() => {});
          }
        }
      }

      // Retry stuck fees
      try {
        const pending = await getPendingFees(contractAddress);
        if (pending > 0n) {
          await callCollectFees(contractAddress);
        }
      } catch {
        // Non-critical
      }
    }

    // ── ERC-20 Token Distribution (USDC, EURC, etc.) ────────
    for (const token of SUPPORTED_TOKENS) {
      const { hasBalance, balance } = await hasDistributableTokenBalance(
        contractAddress,
        token.address,
        token.decimals
      );

      if (!hasBalance) continue;

      const txHash = await callDistributeAllTokenSplit(
        contractAddress,
        token.address
      );
      txHashes.push(txHash);
      tokenDistributed[token.dbKey] = balance;

      await supabase.from("distributions").insert({
        split_id: split.id,
        tx_hash: txHash,
        token_type: token.dbKey,
        total_amount: balance,
        status: "success",
      });

      // Notify contributors
      if (contributors) {
        for (const c of contributors) {
          if (c.user_id) {
            const share = (
              (parseFloat(balance) * c.percentage) /
              100
            ).toFixed(2);
            createNotification({
              userId: c.user_id,
              type: "payout_received",
              title: "Payout received",
              body: `You received ~$${share} ${token.symbol} from "${split.title}"`,
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

      // Retry stuck token fees
      try {
        const pending = await getPendingTokenFees(
          contractAddress,
          token.address
        );
        if (pending > 0n) {
          await callCollectTokenFees(contractAddress, token.address);
        }
      } catch {
        // Non-critical
      }
    }

    const hasAnyTokens = Object.keys(tokenDistributed).length > 0;

    if (!hasAvax && !hasAnyTokens) {
      return NextResponse.json({
        success: true,
        message: "No distributable balance found",
        avax: null,
        tokens: {},
        tx_hashes: [],
      });
    }

    // Build token results (e.g. { usdc: "$10.00 USDC", eurc: "$5.00 EURC" })
    const tokenResults: Record<string, string> = {};
    for (const [key, amount] of Object.entries(tokenDistributed)) {
      const token = SUPPORTED_TOKENS.find((t) => t.dbKey === key);
      tokenResults[key] = `$${amount} ${token?.symbol ?? key.toUpperCase()}`;
    }

    return NextResponse.json({
      success: true,
      avax: avaxDistributed ? `${avaxDistributed} AVAX` : null,
      tokens: tokenResults,
      tx_hashes: txHashes,
    });
  } catch (err) {
    console.error("Manual distribute error:", err);
    return NextResponse.json(
      { error: "Distribution failed" },
      { status: 500 }
    );
  }
}
