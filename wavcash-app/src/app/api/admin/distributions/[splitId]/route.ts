import { NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/auth/verify-admin";
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
  getDistributionEventsFromTx,
} from "@/lib/contracts/interact";
import { createNotification } from "@/lib/notifications/create";

/**
 * POST /api/admin/distributions/[splitId]
 * Admin-triggered distribution for a split.
 * Uses verifyAdmin() — no ownership check required.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ splitId: string }> }
) {
  try {
    await verifyAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { splitId } = await params;
    const supabase = await createServiceClient();

    const { data: split } = await supabase
      .from("splits")
      .select(
        "id, title, status, contract_address, split_contributors(user_id, legal_name, percentage, wallet_address)"
      )
      .eq("id", splitId)
      .single();

    if (!split) {
      return NextResponse.json({ error: "Split not found" }, { status: 404 });
    }
    if (split.status !== "active") {
      return NextResponse.json(
        { error: "Split is not active" },
        { status: 400 }
      );
    }
    if (!split.contract_address) {
      return NextResponse.json(
        { error: "No contract deployed" },
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
          wallet_address: string | null;
        }>
      | undefined;

    // ── Native AVAX Distribution ──────────────────────────────
    const { hasBalance: hasAvax, balance: avaxBalance } =
      await hasDistributableBalance(contractAddress);

    if (hasAvax) {
      const txHash = await callDistributeAll(contractAddress);
      txHashes.push(txHash);
      avaxDistributed = avaxBalance;

      const { data: distRow } = await supabase
        .from("distributions")
        .insert({
          split_id: split.id,
          tx_hash: txHash,
          token_type: "native",
          total_amount: avaxBalance,
          status: "success",
        })
        .select("id")
        .single();

      // Read exact per-contributor amounts from on-chain events
      const payoutEvents = await getDistributionEventsFromTx(txHash, "native");
      if (distRow && payoutEvents.length > 0) {
        const { error: payoutError } = await supabase.from("distribution_payouts").insert(
          payoutEvents.map((e) => ({
            distribution_id: distRow.id,
            wallet_address: e.account.toLowerCase(),
            token_type: "native",
            amount: e.amount.toString(),
            amount_decimal: parseFloat(e.amountDecimal),
            tx_hash: txHash,
          }))
        );
        if (payoutError) {
          console.error("Failed to insert distribution_payouts:", payoutError);
        }
      }

      const payoutByWallet: Record<string, string> = {};
      for (const e of payoutEvents) {
        payoutByWallet[e.account.toLowerCase()] = e.amountDecimal;
      }

      if (contributors) {
        for (const c of contributors) {
          if (c.user_id) {
            const walletAddr = c.wallet_address?.toLowerCase();
            const exactAmount = walletAddr ? payoutByWallet[walletAddr] : null;
            const share = exactAmount ?? (
              (parseFloat(avaxBalance) * c.percentage) / 100
            ).toFixed(4);

            createNotification({
              userId: c.user_id,
              type: "payout_received",
              title: "Payout received",
              body: `You received ${share} AVAX from "${split.title}"`,
              metadata: {
                split_id: split.id,
                tx_hash: txHash,
                amount: share,
              },
            }).catch(() => {});
          }
        }
      }

      try {
        const pending = await getPendingFees(contractAddress);
        if (pending > 0n) await callCollectFees(contractAddress);
      } catch {
        // Non-critical
      }
    }

    // ── ERC-20 Token Distribution ─────────────────────────────
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

      const { data: tokenDistRow } = await supabase
        .from("distributions")
        .insert({
          split_id: split.id,
          tx_hash: txHash,
          token_type: token.dbKey,
          total_amount: balance,
          status: "success",
        })
        .select("id")
        .single();

      // Read exact per-contributor amounts from on-chain events
      const tokenPayoutEvents = await getDistributionEventsFromTx(txHash, token.dbKey);
      if (tokenDistRow && tokenPayoutEvents.length > 0) {
        const { error: tokenPayoutError } = await supabase.from("distribution_payouts").insert(
          tokenPayoutEvents.map((e) => ({
            distribution_id: tokenDistRow.id,
            wallet_address: e.account.toLowerCase(),
            token_type: token.dbKey,
            amount: e.amount.toString(),
            amount_decimal: parseFloat(e.amountDecimal),
            tx_hash: txHash,
          }))
        );
        if (tokenPayoutError) {
          console.error("Failed to insert token distribution_payouts:", tokenPayoutError);
        }
      }

      const tokenPayoutByWallet: Record<string, string> = {};
      for (const e of tokenPayoutEvents) {
        tokenPayoutByWallet[e.account.toLowerCase()] = e.amountDecimal;
      }

      if (contributors) {
        for (const c of contributors) {
          if (c.user_id) {
            const walletAddr = c.wallet_address?.toLowerCase();
            const exactAmount = walletAddr ? tokenPayoutByWallet[walletAddr] : null;
            const share = exactAmount ?? (
              (parseFloat(balance) * c.percentage) / 100
            ).toFixed(2);

            createNotification({
              userId: c.user_id,
              type: "payout_received",
              title: "Payout received",
              body: `You received $${share} ${token.symbol} from "${split.title}"`,
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

      try {
        const pending = await getPendingTokenFees(
          contractAddress,
          token.address
        );
        if (pending > 0n)
          await callCollectTokenFees(contractAddress, token.address);
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

    const tokenResults: Record<string, string> = {};
    for (const [key, amount] of Object.entries(tokenDistributed)) {
      const tok = SUPPORTED_TOKENS.find((t) => t.dbKey === key);
      tokenResults[key] = `$${amount} ${tok?.symbol ?? key.toUpperCase()}`;
    }

    return NextResponse.json({
      success: true,
      avax: avaxDistributed ? `${avaxDistributed} AVAX` : null,
      tokens: tokenResults,
      tx_hashes: txHashes,
    });
  } catch (err) {
    console.error("Admin distribute error:", err);
    return NextResponse.json(
      { error: "Distribution failed" },
      { status: 500 }
    );
  }
}
