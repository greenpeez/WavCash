import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { verifyAuth } from "@/lib/auth/verify";
import { isAddress } from "viem";
import { createNotification } from "@/lib/notifications/create";
import type { NotificationType } from "@/lib/types/database";

/**
 * POST /api/sign/[token]/link
 *
 * Links an authenticated user to a split_contributors record via invite token.
 * Called from the dashboard when a user arrives with a sign_token query param
 * after going through login → onboarding.
 *
 * Body: { wallet_address?: string }
 * Returns: { split_id, contributor_id, signed }
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    // Verify authentication
    let auth: { userId: string };
    try {
      auth = await verifyAuth();
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const walletAddress = body.wallet_address as string | undefined;

    const supabase = await createServiceClient();

    // Find contributor by invite token
    const { data: contributor } = await supabase
      .from("split_contributors")
      .select("id, split_id, signed, user_id, wallet_address, email")
      .eq("invite_token", token)
      .single();

    if (!contributor) {
      return NextResponse.json(
        { error: "Invalid or expired signing link" },
        { status: 404 }
      );
    }

    // Link user_id if not already linked
    const updates: Record<string, unknown> = {};

    if (!contributor.user_id) {
      updates.user_id = auth.userId;
    }

    if (!contributor.wallet_address && walletAddress && isAddress(walletAddress)) {
      updates.wallet_address = walletAddress;
    }

    // Sync legal_name from user profile → contributor record.
    // The user's self-declared legal_name (set during onboarding) takes
    // precedence over what the creator originally typed.
    // Safe: legal_name is DB-only, never stored on-chain.
    // Also backfill users.email from the invite email if missing.
    if (!contributor.user_id || contributor.user_id !== auth.userId) {
      const { data: userProfile } = await supabase
        .from("users")
        .select("legal_name, email")
        .eq("id", auth.userId)
        .single();

      if (userProfile?.legal_name) {
        updates.legal_name = userProfile.legal_name;
      }

      // Backfill users.email from the invite email if the user has no email
      // (e.g. signed up via phone/wallet). The invited email is the best
      // available identifier since the creator sent the invite there.
      if (!userProfile?.email && contributor.email) {
        await supabase
          .from("users")
          .update({ email: contributor.email })
          .eq("id", auth.userId);
      }
    }

    if (Object.keys(updates).length > 0) {
      await supabase
        .from("split_contributors")
        .update(updates)
        .eq("id", contributor.id);
    }

    // ── Backfill notifications for first-time links ─────────────────────
    // When a new user links via invite, generate retroactive notifications
    // from split_events so they see the full history in their dashboard.
    if (!contributor.user_id) {
      try {
        const { data: split } = await supabase
          .from("splits")
          .select("title")
          .eq("id", contributor.split_id)
          .single();

        const { data: events } = await supabase
          .from("split_events")
          .select("event_type, data, created_at")
          .eq("split_id", contributor.split_id)
          .order("created_at", { ascending: true });

        const splitTitle = split?.title || "Split Agreement";

        for (const event of events || []) {
          const eventData = (event.data || {}) as Record<string, unknown>;
          let type: NotificationType | null = null;
          let title = "";
          let body = "";

          switch (event.event_type) {
            case "deployed":
              type = "invite_received";
              title = "You've been invited to sign";
              body = `You've been invited to sign "${splitTitle}"`;
              break;
            case "signed": {
              const signerName = (eventData.contributor_name as string) || "A contributor";
              type = "split_signed";
              title = `${signerName} signed`;
              body = `${signerName} has signed "${splitTitle}"`;
              break;
            }
            case "activated":
              // Create both all_signed and agreement_live
              createNotification({
                userId: auth.userId,
                type: "all_signed",
                title: "All contributors signed",
                body: `All contributors have signed "${splitTitle}"`,
                metadata: { split_id: contributor.split_id },
              }).catch(() => {});
              type = "agreement_live";
              title = "Agreement is live";
              body = `"${splitTitle}" is now live`;
              break;
            case "voided":
              type = "agreement_voided";
              title = "Agreement voided";
              body = `"${splitTitle}" has been voided`;
              break;
          }

          if (type) {
            createNotification({
              userId: auth.userId,
              type,
              title,
              body,
              metadata: { split_id: contributor.split_id },
            }).catch(() => {});
          }
        }
      } catch {
        // Non-critical — backfill failure shouldn't block linking
      }
    }

    return NextResponse.json({
      split_id: contributor.split_id,
      contributor_id: contributor.id,
      signed: contributor.signed,
    });
  } catch (err) {
    console.error("Sign link error:", err);
    return NextResponse.json(
      { error: "Failed to link user to agreement" },
      { status: 500 }
    );
  }
}
