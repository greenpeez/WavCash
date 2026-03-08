import { NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth/verify";
import { createServiceClient } from "@/lib/supabase/server";
import { voidContractOnChain } from "@/lib/contracts/interact";
import { notifyAllLinkedUsers } from "@/lib/notifications/notify-split";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { userId } = await verifyAuth();
    const supabase = await createServiceClient();

    // Verify ownership (only creator can void)
    const { data: split } = await supabase
      .from("splits")
      .select("id, title, status, created_by, contract_address")
      .eq("id", id)
      .eq("created_by", userId)
      .single();

    if (!split) {
      return NextResponse.json({ error: "Agreement not found" }, { status: 404 });
    }

    if (split.status === "voided") {
      return NextResponse.json(
        { error: "Agreement already voided" },
        { status: 400 }
      );
    }

    if (split.status === "active") {
      return NextResponse.json(
        { error: "Cannot void an active agreement" },
        { status: 400 }
      );
    }

    // ── Void on-chain if contract is deployed ─────────────────────────
    let voidTxHash: string | null = null;

    if (split.contract_address && process.env.DEPLOYER_PRIVATE_KEY) {
      try {
        voidTxHash = await voidContractOnChain(
          split.contract_address as `0x${string}`
        );
        console.log(`Contract voided: ${split.contract_address} (tx: ${voidTxHash})`);
      } catch (chainErr) {
        console.error("On-chain void failed:", chainErr);
        // Continue with DB void even if on-chain fails
        // The API status check blocks signing regardless
      }
    }

    // ── Update DB status ──────────────────────────────────────────────
    await supabase
      .from("splits")
      .update({ status: "voided" })
      .eq("id", id);

    // ── Log voided event ──────────────────────────────────────────────
    await supabase.from("split_events").insert({
      split_id: id,
      event_type: "voided",
      tx_hash: voidTxHash,
      data: { voided_by: userId },
    });

    // ── Notify all linked users ────────────────────────────────────────
    notifyAllLinkedUsers({
      splitId: id,
      excludeUserId: userId,
      type: "agreement_voided",
      title: "Agreement voided",
      body: `"${split.title}" has been voided`,
    }).catch(() => {});

    return NextResponse.json({ success: true, tx_hash: voidTxHash });
  } catch (err) {
    console.error("Void error:", err);
    return NextResponse.json(
      { error: "Failed to void agreement" },
      { status: 500 }
    );
  }
}
