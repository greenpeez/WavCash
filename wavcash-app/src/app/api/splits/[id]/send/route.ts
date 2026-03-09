import { NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth/verify";
import { createServiceClient } from "@/lib/supabase/server";
import { getResendClient } from "@/lib/email/client";
import {
  buildInviteEmailHtml,
  buildInviteEmailText,
  buildCreatorReminderEmailHtml,
  buildCreatorReminderEmailText,
} from "@/lib/email/templates/invite";
import { deployWavCashSplit } from "@/lib/contracts/deploy";
import { createNotification } from "@/lib/notifications/create";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { userId } = await verifyAuth();
    const supabase = await createServiceClient();

    // ── Fail-fast: email service must be configured ──────────────────
    if (!process.env.RESEND_API_KEY) {
      console.error("RESEND_API_KEY not configured — cannot send invites");
      return NextResponse.json(
        { error: "Email service not configured" },
        { status: 500 }
      );
    }

    // ── Verify ownership and status ──────────────────────────────────
    const { data: split, error: splitErr } = await supabase
      .from("splits")
      .select("id, title, status, created_by, tracks:track_id(title, isrc)")
      .eq("id", id)
      .eq("created_by", userId)
      .single();

    if (splitErr || !split) {
      console.error("Split lookup failed:", splitErr);
      return NextResponse.json({ error: "Agreement not found" }, { status: 404 });
    }

    if (split.status !== "draft") {
      return NextResponse.json(
        { error: "Can only send draft agreements" },
        { status: 400 }
      );
    }

    // ── Get creator display name, email, wallet ─────────────────────────
    const { data: creator } = await supabase
      .from("users")
      .select("display_name, wallet_address, email")
      .eq("id", userId)
      .single();
    const senderName = creator?.display_name || "Someone";
    const creatorEmail: string | null = creator?.email?.toLowerCase() || null;

    // ── Fetch contributors ───────────────────────────────────────────
    const { data: contributors, error: contribErr } = await supabase
      .from("split_contributors")
      .select("id, invite_token, email, legal_name, role, percentage")
      .eq("split_id", id)
      .order("created_at", { ascending: true });

    if (contribErr || !contributors || contributors.length === 0) {
      console.error("Contributors fetch failed:", contribErr);
      return NextResponse.json(
        { error: "No contributors found for this agreement" },
        { status: 400 }
      );
    }

    // ── Batch-lookup existing users by contributor emails ──────────────
    const contribEmails = contributors.map((c) => c.email.toLowerCase());
    const { data: existingUsers } = await supabase
      .from("users")
      .select("id, email, wallet_address")
      .in("email", contribEmails);

    const usersByEmail = new Map<string, { id: string; wallet_address: string | null }>();
    for (const u of existingUsers || []) {
      if (u.email) usersByEmail.set(u.email.toLowerCase(), u);
    }

    // Track which non-creator users were linked (for notifications later)
    const linkedContributorUserIds: { userId: string; name: string }[] = [];

    // ── Assign slot_index + generate invite tokens ────────────────────
    for (let i = 0; i < contributors.length; i++) {
      const c = contributors[i];
      const updates: Record<string, unknown> = { slot_index: i };

      if (!c.invite_token) {
        updates.invite_token = crypto.randomUUID();
      }

      // Link any contributor whose email matches an existing user
      const matchedUser = usersByEmail.get(c.email.toLowerCase());
      if (matchedUser) {
        updates.user_id = matchedUser.id;
        if (matchedUser.wallet_address) {
          updates.wallet_address = matchedUser.wallet_address;
        }
        // Track non-creator links for notifications
        if (matchedUser.id !== userId) {
          linkedContributorUserIds.push({ userId: matchedUser.id, name: c.legal_name });
        }
      }

      const { error: updateErr } = await supabase
        .from("split_contributors")
        .update(updates)
        .eq("id", c.id);

      if (updateErr) {
        console.error(`Failed to update contributor ${c.email}:`, updateErr);
      }
    }

    // ── Deploy WavCashSplit contract ──────────────────────────────────
    let contractAddress: string | null = null;
    let deployTxHash: string | null = null;

    if (process.env.DEPLOYER_PRIVATE_KEY) {
      try {
        // Build shares array ordered by slot_index
        const sharesBps = contributors.map((c) =>
          BigInt(Math.round(c.percentage * 100))
        );

        const feeRecipient = (process.env.WAVCASH_FEE_RECIPIENT ||
          "0x8abD5cD06591DeF8cFf43EE3DdE3D135243a46B4") as `0x${string}`;
        const feeBasisPoints = 250n; // 2.5%

        const result = await deployWavCashSplit(
          sharesBps,
          feeRecipient,
          feeBasisPoints
        );

        contractAddress = result.contractAddress;
        deployTxHash = result.txHash;

        console.log(
          `WavCashSplit deployed: ${contractAddress} (tx: ${deployTxHash})`
        );
      } catch (deployErr) {
        console.error("Contract deployment failed:", deployErr);
        // Continue without contract — emails still go out, but signing
        // won't have onchain backing until a retry mechanism is built
      }
    } else {
      console.warn("DEPLOYER_PRIVATE_KEY not set — skipping contract deployment");
    }

    // ── Update split: status + contract info ──────────────────────────
    const splitUpdate: Record<string, unknown> = {
      status: "awaiting_signatures",
    };
    if (contractAddress) splitUpdate.contract_address = contractAddress;
    if (deployTxHash) splitUpdate.tx_hash = deployTxHash;

    const { error: statusErr } = await supabase
      .from("splits")
      .update(splitUpdate)
      .eq("id", id);

    if (statusErr) {
      console.error("Failed to update split status:", statusErr);
      return NextResponse.json(
        { error: "Failed to update agreement status" },
        { status: 500 }
      );
    }

    // ── Log deployment event ──────────────────────────────────────────
    if (deployTxHash) {
      await supabase.from("split_events").insert({
        split_id: id,
        event_type: "deployed",
        tx_hash: deployTxHash,
        data: {
          contract_address: contractAddress,
          slot_count: contributors.length,
        },
      });
    }

    // ── Re-fetch contributors with generated tokens ──────────────────
    const { data: updatedContributors, error: refetchErr } = await supabase
      .from("split_contributors")
      .select("id, invite_token, email, legal_name, role, percentage")
      .eq("split_id", id)
      .order("created_at", { ascending: true });

    if (refetchErr || !updatedContributors) {
      console.error("Failed to re-fetch contributors:", refetchErr);
      return NextResponse.json(
        { error: "Failed to load contributor data for emails" },
        { status: 500 }
      );
    }

    // ── Send invite emails via Resend ────────────────────────────────
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://wav.cash";
    const trackInfo = split.tracks as unknown as { title: string; isrc: string } | null;
    const trackTitle = trackInfo?.title || split.title;
    const resend = getResendClient();

    let sent = 0;
    let failed = 0;
    let skipped = 0;

    for (const c of updatedContributors) {
      if (!c.invite_token || !c.email) {
        console.warn(`Skipping contributor ${c.id} (${c.legal_name}): missing token or email`);
        skipped++;
        continue;
      }

      const signUrl = `${appUrl}/sign/${c.invite_token}`;
      const isCreatorSelfInvite =
        creatorEmail && c.email.toLowerCase() === creatorEmail;

      // Use different subject + template for creator's own slot
      const subject = isCreatorSelfInvite
        ? `Sign your Split Agreement: ${trackTitle}`
        : `${senderName} has invited you to claim ${c.percentage}% royalties on ${trackTitle}`;

      const html = isCreatorSelfInvite
        ? buildCreatorReminderEmailHtml({
            creatorName: c.legal_name,
            trackTitle,
            role: c.role,
            percentage: c.percentage,
            signUrl,
          })
        : buildInviteEmailHtml({
            senderName,
            trackTitle,
            contributorName: c.legal_name,
            role: c.role,
            percentage: c.percentage,
            signUrl,
          });

      const text = isCreatorSelfInvite
        ? buildCreatorReminderEmailText({
            creatorName: c.legal_name,
            trackTitle,
            role: c.role,
            percentage: c.percentage,
            signUrl,
          })
        : buildInviteEmailText({
            senderName,
            trackTitle,
            contributorName: c.legal_name,
            role: c.role,
            percentage: c.percentage,
            signUrl,
          });

      try {
        const { data: emailData, error: emailError } = await resend.emails.send({
          from: "WavCash <splits@noreply.wav.cash>",
          to: c.email,
          subject,
          html,
          text,
        });

        if (emailError) {
          console.error(`Resend error for ${c.email}:`, emailError);
          failed++;
        } else {
          console.log(`${isCreatorSelfInvite ? "Reminder" : "Invite"} sent to ${c.email} (Resend ID: ${emailData?.id})`);
          sent++;
        }
      } catch (emailErr) {
        console.error(`Failed to send email to ${c.email}:`, emailErr);
        failed++;
      }
    }

    // ── Notify linked contributors (existing users) ──────────────────
    for (const linked of linkedContributorUserIds) {
      createNotification({
        userId: linked.userId,
        type: "invite_received",
        title: "You've been invited to sign",
        body: `${senderName} invited you to sign "${trackTitle}: Split Agreement"`,
        metadata: { split_id: id },
      }).catch(() => {});
    }

    // ── Return result ─────────────────────────────────────────────────
    if (sent === 0) {
      return NextResponse.json(
        {
          error: `No invites sent (${failed} failed, ${skipped} skipped)`,
          sent,
          failed,
          skipped,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      sent,
      failed,
      skipped,
      contract_address: contractAddress,
    });
  } catch (err) {
    console.error("Send error:", err);
    return NextResponse.json(
      { error: "Failed to send for signatures" },
      { status: 500 }
    );
  }
}
