import { NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth/verify";
import { createServiceClient } from "@/lib/supabase/server";
import { isAddress } from "viem";
import { registerSignerOnChain } from "@/lib/contracts/interact";
import { createNotification } from "@/lib/notifications/create";
import { notifyAllLinkedUsers } from "@/lib/notifications/notify-split";

// GET: Load signing data (public, no auth — uses invite token)
export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const supabase = await createServiceClient();

    // Find contributor by invite token
    const { data: contributor } = await supabase
      .from("split_contributors")
      .select("id, split_id, legal_name, role, percentage, signed, signed_at")
      .eq("invite_token", token)
      .single();

    if (!contributor) {
      return NextResponse.json(
        { error: "Invalid or expired signing link" },
        { status: 404 }
      );
    }

    // Get split details
    const { data: split } = await supabase
      .from("splits")
      .select(`
        id, title, status, contract_address, created_at,
        tracks:track_id (title, isrc)
      `)
      .eq("id", contributor.split_id)
      .single();

    if (!split) {
      return NextResponse.json(
        { error: "Agreement not found" },
        { status: 404 }
      );
    }

    // Get all contributors for this split
    const { data: allContributors } = await supabase
      .from("split_contributors")
      .select("legal_name, role, percentage, signed")
      .eq("split_id", contributor.split_id)
      .order("percentage", { ascending: false });

    return NextResponse.json({
      split: {
        id: split.id,
        title: split.title,
        status: split.status,
        contract_address: split.contract_address,
        track: split.tracks,
        created_at: split.created_at,
      },
      contributor: {
        id: contributor.id,
        legal_name: contributor.legal_name,
        role: contributor.role,
        percentage: contributor.percentage,
        signed: contributor.signed,
      },
      all_contributors: allContributors || [],
      requires_auth: true,
    });
  } catch (err) {
    console.error("Sign GET error:", err);
    return NextResponse.json(
      { error: "Failed to load agreement" },
      { status: 500 }
    );
  }
}

// POST: Sign the agreement onchain (requires auth + EIP-712 signature)
export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    // ── Require authentication ────────────────────────────────────────
    let userId: string;
    try {
      const auth = await verifyAuth();
      userId = auth.userId;
    } catch {
      return NextResponse.json(
        { error: "Authentication required. Please sign in first." },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const walletAddress = body.wallet_address as string | undefined;
    const signature = body.signature as string | undefined;
    const supabase = await createServiceClient();

    // Validate wallet address
    if (!walletAddress || !isAddress(walletAddress)) {
      return NextResponse.json(
        { error: "Valid wallet address required." },
        { status: 400 }
      );
    }

    // Validate signature
    if (!signature) {
      return NextResponse.json(
        { error: "EIP-712 signature required." },
        { status: 400 }
      );
    }

    // Find contributor by invite token
    const { data: contributor } = await supabase
      .from("split_contributors")
      .select("id, split_id, signed, legal_name, slot_index")
      .eq("invite_token", token)
      .single();

    if (!contributor) {
      return NextResponse.json(
        { error: "Invalid or expired signing link" },
        { status: 404 }
      );
    }

    if (contributor.signed) {
      return NextResponse.json(
        { error: "You have already signed this agreement" },
        { status: 400 }
      );
    }

    if (contributor.slot_index === null || contributor.slot_index === undefined) {
      return NextResponse.json(
        { error: "Slot not assigned for this contributor" },
        { status: 400 }
      );
    }

    // Check split status
    const { data: split } = await supabase
      .from("splits")
      .select("id, status, title, created_by, contract_address")
      .eq("id", contributor.split_id)
      .single();

    if (!split || split.status !== "awaiting_signatures") {
      return NextResponse.json(
        { error: "This agreement is no longer accepting signatures" },
        { status: 400 }
      );
    }

    // ── Atomic claim: mark as signed BEFORE on-chain call ─────────────
    // This prevents race conditions where two concurrent requests both
    // see signed=false and both proceed to the on-chain call.
    const signedAt = new Date().toISOString();
    const { data: claimed, error: claimErr } = await supabase
      .from("split_contributors")
      .update({
        signed: true,
        signed_at: signedAt,
        wallet_address: walletAddress,
        user_id: userId,
      })
      .eq("id", contributor.id)
      .eq("signed", false) // ← atomic guard
      .select("id")
      .single();

    if (claimErr || !claimed) {
      return NextResponse.json(
        { error: "You have already signed this agreement" },
        { status: 400 }
      );
    }

    // ── Relay EIP-712 signature to contract ───────────────────────────
    let signingTxHash: string | null = null;
    let activated = false;

    if (split.contract_address && process.env.DEPLOYER_PRIVATE_KEY) {
      try {
        // Parse signature into v, r, s
        const sig = signature.startsWith("0x") ? signature.slice(2) : signature;
        const r = `0x${sig.slice(0, 64)}` as `0x${string}`;
        const s = `0x${sig.slice(64, 128)}` as `0x${string}`;
        let v = parseInt(sig.slice(128, 130), 16);
        // Normalize v: some wallets return 0/1 instead of 27/28
        if (v < 27) v += 27;

        const result = await registerSignerOnChain(
          split.contract_address as `0x${string}`,
          contributor.slot_index,
          walletAddress as `0x${string}`,
          v,
          r,
          s
        );

        signingTxHash = result.txHash;
        activated = result.activated;

        console.log(
          `Signer registered: slot=${contributor.slot_index} addr=${walletAddress} tx=${signingTxHash} activated=${activated}`
        );
      } catch (chainErr) {
        // Roll back: on-chain failed, so undo the DB claim
        console.error("On-chain registerSigner failed:", chainErr);
        await supabase
          .from("split_contributors")
          .update({
            signed: false,
            signed_at: null,
            wallet_address: null,
            user_id: null,
          })
          .eq("id", contributor.id);
        return NextResponse.json(
          { error: "Failed to record signature. Please try again." },
          { status: 500 }
        );
      }
    }

    // ── Log signed event ──────────────────────────────────────────────
    if (signingTxHash) {
      await supabase.from("split_events").insert({
        split_id: split.id,
        event_type: "signed",
        tx_hash: signingTxHash,
        data: {
          contributor_name: contributor.legal_name,
          wallet_address: walletAddress,
          slot_index: contributor.slot_index,
        },
      });
    }

    // ── Notify all linked users (creator + contributors, except signer)
    notifyAllLinkedUsers({
      splitId: split.id,
      excludeUserId: userId,
      type: "split_signed",
      title: `${contributor.legal_name} signed`,
      body: `${contributor.legal_name} has signed "${split.title}"`,
    }).catch(() => {});

    // ── If contract auto-activated, update split status ───────────────
    if (activated) {
      await supabase
        .from("splits")
        .update({ status: "active" })
        .eq("id", split.id);

      // Log activated event
      if (signingTxHash) {
        await supabase.from("split_events").insert({
          split_id: split.id,
          event_type: "activated",
          tx_hash: signingTxHash,
          data: { contract_address: split.contract_address },
        });
      }

      // Notify all linked users: all signed + agreement live
      notifyAllLinkedUsers({
        splitId: split.id,
        type: "all_signed",
        title: "All contributors signed",
        body: `All contributors have signed "${split.title}"`,
      }).catch(() => {});
      notifyAllLinkedUsers({
        splitId: split.id,
        type: "agreement_live",
        title: "Agreement is live",
        body: `"${split.title}" is now live`,
        metadata: { contract_address: split.contract_address },
      }).catch(() => {});
    }

    return NextResponse.json({
      success: true,
      all_signed: activated,
      tx_hash: signingTxHash,
      contract_address: activated ? split.contract_address : null,
    });
  } catch (err) {
    console.error("Sign POST error:", err);
    return NextResponse.json(
      { error: "Failed to sign agreement" },
      { status: 500 }
    );
  }
}
