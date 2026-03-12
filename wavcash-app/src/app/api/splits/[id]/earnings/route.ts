import { NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth/verify";
import { createServiceClient } from "@/lib/supabase/server";

/**
 * GET /api/splits/[id]/earnings
 *
 * Returns per-contributor earnings breakdown for a split,
 * using exact on-chain payout amounts from distribution_payouts.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { userId } = await verifyAuth();
    const supabase = await createServiceClient();

    // Verify the split exists and user is creator or contributor
    const { data: split } = await supabase
      .from("splits")
      .select(
        "id, title, status, contract_address, created_by, split_contributors(user_id, wallet_address, legal_name, percentage)"
      )
      .eq("id", id)
      .single();

    if (!split) {
      return NextResponse.json(
        { error: "Agreement not found" },
        { status: 404 }
      );
    }

    const contributors = (split as Record<string, unknown>)
      .split_contributors as Array<{
      user_id: string | null;
      wallet_address: string | null;
      legal_name: string;
      percentage: number;
    }>;

    const isCreator = split.created_by === userId;
    const isContributor = contributors.some((c) => c.user_id === userId);

    if (!isCreator && !isContributor) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      );
    }

    // Get all distributions for this split
    const { data: distributions } = await supabase
      .from("distributions")
      .select("id, tx_hash, token_type, total_amount, status, created_at")
      .eq("split_id", id)
      .eq("status", "success")
      .order("created_at", { ascending: false });

    if (!distributions || distributions.length === 0) {
      return NextResponse.json({
        split_id: id,
        distributions: [],
        totals_by_wallet: {},
      });
    }

    // Get all distribution_payouts for these distributions
    const distributionIds = distributions.map((d) => d.id);
    const { data: payouts } = await supabase
      .from("distribution_payouts")
      .select("*")
      .in("distribution_id", distributionIds);

    // Group payouts by distribution
    const payoutsByDist: Record<string, typeof payouts> = {};
    for (const p of payouts || []) {
      if (!payoutsByDist[p.distribution_id]) {
        payoutsByDist[p.distribution_id] = [];
      }
      payoutsByDist[p.distribution_id]!.push(p);
    }

    // Build distributions with their payouts
    const distributionsWithPayouts = distributions.map((d) => ({
      ...d,
      payouts: payoutsByDist[d.id] || [],
    }));

    // Calculate totals per wallet
    const totalsByWallet: Record<
      string,
      { native: number; usdc: number; eurc: number }
    > = {};

    for (const p of payouts || []) {
      const wallet = p.wallet_address.toLowerCase();
      if (!totalsByWallet[wallet]) {
        totalsByWallet[wallet] = { native: 0, usdc: 0, eurc: 0 };
      }
      const amount = parseFloat(p.amount_decimal) || 0;
      if (p.token_type === "native") {
        totalsByWallet[wallet].native += amount;
      } else if (p.token_type === "usdc") {
        totalsByWallet[wallet].usdc += amount;
      } else if (p.token_type === "eurc") {
        totalsByWallet[wallet].eurc += amount;
      }
    }

    return NextResponse.json({
      split_id: id,
      distributions: distributionsWithPayouts,
      totals_by_wallet: totalsByWallet,
    });
  } catch (err) {
    console.error("Split earnings error:", err);
    return NextResponse.json(
      { error: "Failed to load earnings" },
      { status: 500 }
    );
  }
}
