import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { verifyAdmin } from "@/lib/auth/verify-admin";
import { getResendClient } from "@/lib/email/client";
import {
  buildCompletionEmailHtml,
  buildCompletionEmailText,
} from "@/lib/email/templates/data-request";

/**
 * POST /api/admin/data-requests/[id]/complete
 *
 * Marks a data request as completed and sends the completion email.
 * Body: { completion_summary, request_type?, sender_name? }
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await verifyAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const { completion_summary, request_type, sender_name } = body;

  if (!completion_summary) {
    return NextResponse.json(
      { error: "completion_summary is required" },
      { status: 400 }
    );
  }

  const supabase = await createServiceClient();

  // Fetch the data request
  const { data: dr, error: fetchError } = await supabase
    .from("data_requests")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchError || !dr) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Build updates
  const updates: Record<string, unknown> = {
    status: "completed",
    completed_at: new Date().toISOString(),
    completion_summary,
  };
  if (request_type) updates.request_type = request_type;
  if (sender_name !== undefined) updates.sender_name = sender_name;

  const { error: updateError } = await supabase
    .from("data_requests")
    .update(updates)
    .eq("id", id);

  if (updateError) {
    console.error("Failed to update data request:", updateError);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }

  // Send completion email
  const recipientName = sender_name || dr.sender_name || "there";
  const finalType = request_type || dr.request_type || "Data Rights";
  const receivedDate = new Date(dr.received_at).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Map request_type values to human-readable labels
  const typeLabels: Record<string, string> = {
    access: "Data Access",
    deletion: "Data Deletion",
    correction: "Data Correction",
    portability: "Data Portability",
    "opt-out": "Opt-Out",
    object: "Right to Object",
    data_rights: "Data Rights",
  };
  const displayType = typeLabels[finalType] || finalType;

  try {
    const resend = getResendClient();
    await resend.emails.send({
      from: "WavCash Privacy <privacy@noreply.wav.cash>",
      to: dr.sender_email,
      subject: "Your data rights request has been completed — WavCash",
      html: buildCompletionEmailHtml({
        name: recipientName,
        requestType: displayType,
        date: receivedDate,
        completionSummary: completion_summary,
      }),
      text: buildCompletionEmailText({
        name: recipientName,
        requestType: displayType,
        date: receivedDate,
        completionSummary: completion_summary,
      }),
    });
  } catch (err) {
    console.error("Failed to send completion email:", err);
    return NextResponse.json(
      { error: "Request marked complete but email failed to send" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
