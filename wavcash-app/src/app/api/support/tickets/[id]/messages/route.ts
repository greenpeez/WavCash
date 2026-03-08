import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { sendAgentFollowUpAlert } from "@/lib/telegram/bot";

// GET /api/support/tickets/[id]/messages?session_id=xxx
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

    // Verify ticket belongs to this session
    const { data: ticket, error: ticketError } = await supabase
      .from("support_tickets")
      .select("id, session_id, status")
      .eq("id", id)
      .eq("session_id", sessionId)
      .single();

    if (ticketError || !ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    const { data: messages, error } = await supabase
      .from("support_messages")
      .select("id, sender, content, created_at")
      .eq("ticket_id", id)
      .order("created_at", { ascending: true });

    if (error) {
      return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
    }

    return NextResponse.json({ messages: messages ?? [] });
  } catch (err) {
    console.error("GET /api/support/tickets/[id]/messages error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/support/tickets/[id]/messages
// User sends a follow-up message after the initial flow is complete
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { session_id, content } = body;

    if (!session_id) {
      return NextResponse.json({ error: "session_id required" }, { status: 400 });
    }
    if (!content || typeof content !== "string" || !content.trim()) {
      return NextResponse.json({ error: "content required" }, { status: 400 });
    }

    const supabase = await createServiceClient();

    // Verify ticket belongs to this session
    const { data: ticket, error: ticketError } = await supabase
      .from("support_tickets")
      .select("*")
      .eq("id", id)
      .eq("session_id", session_id)
      .single();

    if (ticketError || !ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    // Save message
    const { data: message, error: msgError } = await supabase
      .from("support_messages")
      .insert({
        ticket_id: id,
        sender: "user",
        content: content.trim().slice(0, 5000),
      })
      .select()
      .single();

    if (msgError || !message) {
      return NextResponse.json({ error: "Failed to save message" }, { status: 500 });
    }

    // Notify Telegram group and store alert message_id for reply routing
    if (ticket.telegram_notification_msg_id) {
      try {
        // Chain to the most recent alert (stored on the ticket) so each new
        // alert threads under the previous one rather than the root notification.
        // Falls back to the original notification for the first follow-up.
        const chainTo =
          (ticket.latest_alert_msg_id as number | null) ??
          ticket.telegram_notification_msg_id;

        const alertMsgId = await sendAgentFollowUpAlert(
          ticket,
          content.trim().slice(0, 500),
          chainTo
        );

        // Write latest_alert_msg_id back to the ticket — this is the primary
        // routing key used by the webhook to route agent replies.
        await supabase
          .from("support_tickets")
          .update({ latest_alert_msg_id: alertMsgId })
          .eq("id", id);

        // Also attempt to tag the individual message row (requires migration 007;
        // fails silently if that migration hasn't been run).
        await supabase
          .from("support_messages")
          .update({ telegram_alert_msg_id: alertMsgId })
          .eq("id", message.id);
      } catch (tgErr) {
        console.error("Telegram follow-up alert failed:", tgErr);
      }
    }

    return NextResponse.json({ message });
  } catch (err) {
    console.error("POST /api/support/tickets/[id]/messages error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
