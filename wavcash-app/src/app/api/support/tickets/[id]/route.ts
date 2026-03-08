import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { sendTicketNotification } from "@/lib/telegram/bot";

// GET /api/support/tickets/[id]?session_id=xxx
// Returns ticket + all messages for the given session
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("session_id");

    if (!sessionId) {
      return NextResponse.json({ error: "session_id required" }, { status: 400 });
    }

    const supabase = await createServiceClient();

    const { data: ticket, error } = await supabase
      .from("support_tickets")
      .select("*")
      .eq("id", id)
      .eq("session_id", sessionId)
      .single();

    if (error || !ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    const { data: messages } = await supabase
      .from("support_messages")
      .select("*")
      .eq("ticket_id", id)
      .order("created_at", { ascending: true });

    return NextResponse.json({ ticket, messages: messages ?? [] });
  } catch (err) {
    console.error("GET /api/support/tickets/[id] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH /api/support/tickets/[id]
// Updates ticket fields. When request_detail is set for the first time,
// fires the Telegram notification to the support group.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { session_id, has_wavcash_account, wavcash_id, request_detail, status, rating } = body;

    if (!session_id) {
      return NextResponse.json({ error: "session_id required" }, { status: 400 });
    }

    const supabase = await createServiceClient();

    // Verify ticket belongs to this session
    const { data: existing, error: fetchError } = await supabase
      .from("support_tickets")
      .select("*")
      .eq("id", id)
      .eq("session_id", session_id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    const updates: Record<string, unknown> = {};
    if (has_wavcash_account !== undefined) updates.has_wavcash_account = has_wavcash_account;
    if (wavcash_id !== undefined) updates.wavcash_id = wavcash_id || null;
    if (request_detail !== undefined) updates.request_detail = request_detail.slice(0, 5000);
    if (status !== undefined) updates.status = status;
    if (rating !== undefined && typeof rating === "number" && rating >= 1 && rating <= 5) {
      updates.rating = rating;
    }

    const { data: updated, error: updateError } = await supabase
      .from("support_tickets")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (updateError || !updated) {
      return NextResponse.json({ error: "Update failed" }, { status: 500 });
    }

    // Fire Telegram notification once request_detail is set for the first time
    const shouldNotify =
      request_detail &&
      !existing.telegram_notification_msg_id &&
      !existing.request_detail;

    if (shouldNotify) {
      try {
        // Save the detailed request as a user message in the transcript
        await supabase.from("support_messages").insert({
          ticket_id: id,
          sender: "user",
          content: request_detail.slice(0, 5000),
        });

        // Ping Telegram
        const notifMsgId = await sendTicketNotification(updated);

        // Store message ID for reply routing
        await supabase
          .from("support_tickets")
          .update({ telegram_notification_msg_id: notifMsgId })
          .eq("id", id);

        // Save the "connecting to a human" notice as a system message so it
        // persists in the chat transcript (survives client-side polling resets)
        await supabase.from("support_messages").insert({
          ticket_id: id,
          sender: "system",
          content:
            "We're connecting you to a human. Our advisors try to respond as quickly as possible. If you can't stick around, you can keep this tab open and return to your conversation later.",
        });
      } catch (tgErr) {
        // Don't fail the request if Telegram is down — ticket still created
        console.error("Telegram notification failed:", tgErr);
      }
    }

    return NextResponse.json({ ticket: updated });
  } catch (err) {
    console.error("PATCH /api/support/tickets/[id] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
