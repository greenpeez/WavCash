import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

// POST /api/support/tickets
// Creates a new support ticket when user types their first message.
// Telegram is NOT pinged here — that happens when the user submits their
// detailed request (PATCH /api/support/tickets/[id]).
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { session_id, initial_message, privy_user_id } = body;

    if (!session_id || typeof session_id !== "string") {
      return NextResponse.json({ error: "session_id required" }, { status: 400 });
    }
    if (!initial_message || typeof initial_message !== "string") {
      return NextResponse.json({ error: "initial_message required" }, { status: 400 });
    }

    const supabase = await createServiceClient();

    // Check if there's already an open ticket for this session
    const { data: existing } = await supabase
      .from("support_tickets")
      .select("id, ticket_number, status")
      .eq("session_id", session_id)
      .in("status", ["open", "in_progress"])
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (existing) {
      return NextResponse.json({
        ticket_id: existing.id,
        ticket_number: existing.ticket_number,
        resumed: true,
      });
    }

    // Create new ticket
    const { data: ticket, error: ticketError } = await supabase
      .from("support_tickets")
      .insert({
        session_id,
        initial_message: initial_message.slice(0, 1000),
        user_privy_id: privy_user_id ?? null,
      })
      .select()
      .single();

    if (ticketError || !ticket) {
      console.error("Failed to create ticket:", ticketError);
      return NextResponse.json({ error: "Failed to create ticket" }, { status: 500 });
    }

    // Save first message to transcript
    await supabase.from("support_messages").insert({
      ticket_id: ticket.id,
      sender: "user",
      content: initial_message.slice(0, 1000),
    });

    return NextResponse.json({
      ticket_id: ticket.id,
      ticket_number: ticket.ticket_number,
      resumed: false,
    });
  } catch (err) {
    console.error("POST /api/support/tickets error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
