import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { sendPhoto, sendMediaGroup } from "@/lib/telegram/bot";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  // Accept multiple via "images" field, or single via "image" for backwards compat
  let images = formData.getAll("images") as File[];
  const single = formData.get("image") as File | null;
  if (single && single.size > 0 && images.length === 0) images = [single];

  const caption = (formData.get("caption") as string | null)?.trim() || null;
  const sessionId = formData.get("session_id") as string | null;

  if (images.length === 0 || images.every((f) => f.size === 0)) {
    return NextResponse.json({ error: "No images provided" }, { status: 400 });
  }
  if (images.length > 5) {
    return NextResponse.json({ error: "Max 5 images per batch" }, { status: 400 });
  }
  for (const img of images) {
    if (img.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: `"${img.name}" exceeds 10 MB limit` },
        { status: 413 }
      );
    }
  }

  const supabase = await createServiceClient();

  const { data: ticket, error } = await supabase
    .from("support_tickets")
    .select("*")
    .eq("id", id)
    .eq("session_id", sessionId ?? "")
    .single();

  if (error || !ticket) {
    return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  }

  // Save message record FIRST so polling picks it up immediately
  const count = images.length;
  const content =
    count === 1
      ? caption
        ? `[📎 Image: ${caption}]`
        : "[📎 Image]"
      : caption
        ? `[📎 ${count} images: ${caption}]`
        : `[📎 ${count} images]`;

  const { data: message } = await supabase
    .from("support_messages")
    .insert({ ticket_id: id, sender: "user", content })
    .select()
    .single();

  // Forward to Telegram — image bytes pass through, nothing stored
  const chatId = process.env.TELEGRAM_GROUP_CHAT_ID!;
  const replyToMsgId =
    (ticket.latest_alert_msg_id as number | null) ??
    (ticket.telegram_notification_msg_id as number | null) ??
    undefined;
  const topicId = (ticket.telegram_topic_id as number | null) ?? undefined;

  let alertMsgId: number | null = null;
  try {
    const tgCaption = caption
      ? `📎 ${ticket.ticket_number}: ${caption}`
      : count === 1
        ? `📎 ${ticket.ticket_number} — image from user`
        : `📎 ${ticket.ticket_number} — ${count} images from user`;

    const tgOpts = {
      caption: tgCaption,
      ...(replyToMsgId ? { reply_to_message_id: replyToMsgId } : {}),
      ...(topicId ? { message_thread_id: topicId } : {}),
    };

    if (count === 1) {
      // Pass the File directly (File extends Blob) — avoids arrayBuffer round-trip
      const img = images[0];
      const sentMsg = await sendPhoto(chatId, img, img.name || "image.jpg", tgOpts);
      alertMsgId = sentMsg.message_id;
    } else {
      const photos = images.map((img) => ({
        blob: img as Blob,
        filename: img.name || "image.jpg",
      }));
      const sentMsgs = await sendMediaGroup(chatId, photos, tgOpts);
      alertMsgId = sentMsgs[0]?.message_id ?? null;
    }
  } catch (e) {
    // Message already saved to DB — log the Telegram failure but don't block
    console.error(
      "Image forward to Telegram failed:",
      e,
      `(count=${count}, sizes=${images.map((i) => i.size)}, types=${images.map((i) => i.type)})`
    );
  }

  // Update ticket status + latest_alert_msg_id for reply threading
  const updates: Record<string, unknown> = {};
  if (alertMsgId) updates.latest_alert_msg_id = alertMsgId;
  if (ticket.status === "open") updates.status = "in_progress";
  if (Object.keys(updates).length > 0) {
    await supabase.from("support_tickets").update(updates).eq("id", id);
  }

  return NextResponse.json({ ok: true, message });
}
