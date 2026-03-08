import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import {
  sendMessage,
  answerCallbackQuery,
  editMessageReplyMarkup,
  editMessageText,
  createForumTopic,
  buildClaimableKeyboard,
  buildClaimedKeyboard,
  buildClosedTicketKeyboard,
  formatDate,
  formatRelativeTime,
  statusEmoji,
  agentDisplayName,
  agentFriendlyName,
  type TelegramUpdate,
  type TelegramMessage,
} from "@/lib/telegram/bot";

const PAGE_SIZE = 8;

// GET: returns current Telegram webhook info, or a lightweight health check
export async function GET(request: Request) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return NextResponse.json({ error: "No bot token" }, { status: 500 });

  const { searchParams } = new URL(request.url);

  // Lightweight health check for the frontend widget
  if (searchParams.get("check") === "health") {
    try {
      const res = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`);
      const json = await res.json();
      const lastErr = json.result?.last_error_date as number | undefined;
      // If the last webhook error was within the past 90 seconds, it's unhealthy
      const healthy = !lastErr || (Date.now() / 1000 - lastErr) > 90;
      return NextResponse.json({ healthy });
    } catch {
      return NextResponse.json({ healthy: false });
    }
  }

  const res = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`);
  const json = await res.json();
  return NextResponse.json(json);
}

export async function POST(request: Request) {
  console.log("[webhook] POST received");
  const secret = request.headers.get("x-telegram-bot-api-secret-token");
  if (secret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    console.log("[webhook] Unauthorized — secret mismatch");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let update: TelegramUpdate;
  try {
    update = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const chatId = process.env.TELEGRAM_GROUP_CHAT_ID!;

  try {
    if (update.callback_query) {
      console.log("[webhook] callback_query:", update.callback_query.data);
      await handleCallbackQuery(update.callback_query, chatId);
    } else if (update.message) {
      console.log("[webhook] message from:", update.message.from?.username ?? update.message.from?.id);
      await handleMessage(update.message, chatId);
    }
  } catch (err) {
    console.error("[webhook] handler error:", err);
  }

  return NextResponse.json({ ok: true });
}

// ── Callback query handler ───────────────────────────────────────────────────

async function handleCallbackQuery(
  cb: NonNullable<TelegramUpdate["callback_query"]>,
  chatId: string
) {
  const data = cb.data ?? "";
  const msgId = cb.message?.message_id;
  const supabase = await createServiceClient();

  // Parse "action_rest" — action is everything before the first underscore
  const underscoreIdx = data.indexOf("_");
  if (underscoreIdx === -1) {
    await answerCallbackQuery(cb.id);
    return;
  }
  const action = data.slice(0, underscoreIdx);
  const rest = data.slice(underscoreIdx + 1); // ticketId or "type_page" for lists

  if (action === "noop") {
    await answerCallbackQuery(cb.id, "No action available.");
    return;
  }

  // Pagination callbacks: list_pending_0, list_resolved_2, etc.
  if (action === "list") {
    const parts = rest.split("_");
    const type = parts[0];
    const page = parseInt(parts[1] ?? "0", 10);
    const agentId = cb.from.id;
    const result = await buildTicketListText(type, page, agentId, supabase);
    const keyboard = buildListKeyboard(type, page, result.totalPages, agentId, result.tickets);

    if (msgId) {
      // Edit the existing list message in place (no new message)
      await fetch(
        `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/editMessageText`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            message_id: msgId,
            text: result.body,
            parse_mode: "HTML",
            reply_markup: keyboard,
          }),
        }
      );
    }
    await answerCallbackQuery(cb.id);
    return;
  }

  // Confirm/cancel a held reply
  if (action === "confirm" && rest.startsWith("reply_")) {
    const targetUserId = parseInt(rest.slice("reply_".length), 10);
    const { data: state } = await supabase
      .from("telegram_bot_state")
      .select("*")
      .eq("telegram_user_id", targetUserId)
      .eq("action", "awaiting_reply_confirm")
      .single();

    if (!state || !state.ticket_id || !state.pending_content) {
      await answerCallbackQuery(cb.id, "No pending reply found.");
      return;
    }

    const { data: ticket } = await supabase
      .from("support_tickets")
      .select("*")
      .eq("id", state.ticket_id)
      .single();

    await answerCallbackQuery(cb.id, "Reply sent.");

    if (ticket) {
      await supabase.from("support_messages").insert({
        ticket_id: ticket.id,
        sender: "agent",
        content: state.pending_content,
      });
      if (ticket.status === "open") {
        await supabase
          .from("support_tickets")
          .update({ status: "in_progress" })
          .eq("id", ticket.id);
      }
      await sendMessage(chatId, `✅ Reply sent to <b>${ticket.ticket_number}</b>.`, {
        parse_mode: "HTML",
      });
    }

    await supabase.from("telegram_bot_state").delete().eq("telegram_user_id", targetUserId);
    return;
  }

  if (action === "cancel" && rest.startsWith("reply_")) {
    const targetUserId = parseInt(rest.slice("reply_".length), 10);
    await supabase.from("telegram_bot_state").delete().eq("telegram_user_id", targetUserId);
    await answerCallbackQuery(cb.id, "Reply cancelled.");
    await sendMessage(chatId, "❌ Reply cancelled.");
    return;
  }

  // Cancel a pending action confirmation — edit the confirmation message in place
  if (action === "cancel" && rest.startsWith("action_")) {
    if (msgId) {
      await editMessageText(chatId, msgId, "❌ Action cancelled.");
    }
    await answerCallbackQuery(cb.id, "Cancelled.");
    return;
  }

  // Execute a confirmed ticket action: do_<subAction>_<ticketId>
  if (action === "do") {
    const subIdx = rest.indexOf("_");
    if (subIdx === -1) { await answerCallbackQuery(cb.id); return; }
    const subAction = rest.slice(0, subIdx);
    const subTicketId = rest.slice(subIdx + 1);

    const { data: confirmedTicket, error: confirmedErr } = await supabase
      .from("support_tickets")
      .select("*")
      .eq("id", subTicketId)
      .single();

    if (confirmedErr || !confirmedTicket) {
      if (msgId) await editMessageText(chatId, msgId, "❌ Ticket not found.");
      await answerCallbackQuery(cb.id, "Ticket not found.");
      return;
    }

    const notifMsgId = confirmedTicket.telegram_notification_msg_id as number | null;

    switch (subAction) {
      case "claim": {
        if (confirmedTicket.assigned_to_telegram_id) {
          if (msgId) await editMessageText(chatId, msgId, `❌ Already claimed by ${confirmedTicket.assigned_to_name ?? "someone"}.`);
          await answerCallbackQuery(cb.id, "Already claimed.");
          break;
        }
        const name = agentDisplayName(cb.from);
        const friendlyName = agentFriendlyName(cb.from);
        const { error: claimErr } = await supabase.from("support_tickets").update({
          assigned_to_telegram_id: cb.from.id,
          assigned_to_name: name,
        }).eq("id", subTicketId);
        if (claimErr) {
          if (msgId) await editMessageText(chatId, msgId, `❌ Failed to claim ticket.\n<code>${claimErr.message}</code>\n\nMake sure migration 006 has been applied in Supabase.`, { parse_mode: "HTML" });
          await answerCallbackQuery(cb.id, "DB error — see message.");
          break;
        }
        await supabase.from("support_messages").insert({
          ticket_id: subTicketId,
          sender: "system",
          content: `Ticket claimed by ${friendlyName}.`,
        });
        if (notifMsgId) await editMessageReplyMarkup(chatId, notifMsgId, buildClaimedKeyboard(subTicketId, name));
        if (msgId) await editMessageText(chatId, msgId, `✅ <b>${confirmedTicket.ticket_number}</b> claimed by ${name}.`, { parse_mode: "HTML" });
        await answerCallbackQuery(cb.id, "Claimed!");
        break;
      }

      case "unclaim": {
        if (!confirmedTicket.assigned_to_telegram_id) {
          if (msgId) await editMessageText(chatId, msgId, "❌ Ticket is not claimed.");
          await answerCallbackQuery(cb.id, "Not claimed.");
          break;
        }
        const prevName = confirmedTicket.assigned_to_name ?? "Agent";
        const { error: unclaimErr } = await supabase.from("support_tickets").update({
          assigned_to_telegram_id: null,
          assigned_to_name: null,
        }).eq("id", subTicketId);
        if (unclaimErr) {
          if (msgId) await editMessageText(chatId, msgId, `❌ Failed to unclaim.\n<code>${unclaimErr.message}</code>`, { parse_mode: "HTML" });
          await answerCallbackQuery(cb.id, "DB error.");
          break;
        }
        await supabase.from("support_messages").insert({
          ticket_id: subTicketId,
          sender: "system",
          content: `Ticket unclaimed by ${prevName}.`,
        });
        if (notifMsgId) await editMessageReplyMarkup(chatId, notifMsgId, buildClaimableKeyboard(subTicketId));
        if (msgId) await editMessageText(chatId, msgId, `🔓 <b>${confirmedTicket.ticket_number}</b> unclaimed.`, { parse_mode: "HTML" });
        await answerCallbackQuery(cb.id, "Unclaimed.");
        break;
      }

      case "resolve": {
        if (confirmedTicket.status === "resolved") {
          if (msgId) await editMessageText(chatId, msgId, "Already resolved.");
          await answerCallbackQuery(cb.id, "Already resolved.");
          break;
        }
        const { error: resolveErr } = await supabase.from("support_tickets").update({
          status: "resolved",
          resolved_at: new Date().toISOString(),
        }).eq("id", subTicketId);
        if (resolveErr) {
          if (msgId) await editMessageText(chatId, msgId, `❌ Failed to resolve.\n<code>${resolveErr.message}</code>`, { parse_mode: "HTML" });
          await answerCallbackQuery(cb.id, "DB error.");
          break;
        }
        await supabase.from("support_messages").insert({
          ticket_id: subTicketId,
          sender: "system",
          content: "This ticket has been marked as resolved by the support team.",
        });
        if (notifMsgId) await editMessageReplyMarkup(chatId, notifMsgId, buildClosedTicketKeyboard(subTicketId, "resolved"));
        if (msgId) await editMessageText(chatId, msgId, `✅ <b>${confirmedTicket.ticket_number}</b> resolved.`, { parse_mode: "HTML" });
        // Post status update in the forum topic thread if one exists
        const resolveTopicId = confirmedTicket.telegram_topic_id as number | null;
        if (resolveTopicId) {
          await sendMessage(chatId, `✅ <b>${confirmedTicket.ticket_number}</b> has been resolved.`, {
            parse_mode: "HTML",
            message_thread_id: resolveTopicId,
          }).catch(() => {});
        }
        await answerCallbackQuery(cb.id, "Resolved!");
        break;
      }

      case "archive": {
        if (confirmedTicket.status === "archived") {
          if (msgId) await editMessageText(chatId, msgId, "Already archived.");
          await answerCallbackQuery(cb.id, "Already archived.");
          break;
        }
        const { error: archiveErr } = await supabase.from("support_tickets").update({ status: "archived" }).eq("id", subTicketId);
        if (archiveErr) {
          if (msgId) await editMessageText(chatId, msgId, `❌ Failed to archive.\n<code>${archiveErr.message}</code>`, { parse_mode: "HTML" });
          await answerCallbackQuery(cb.id, "DB error.");
          break;
        }
        await supabase.from("support_messages").insert({
          ticket_id: subTicketId,
          sender: "system",
          content: "This ticket has been archived.",
        });
        if (notifMsgId) await editMessageReplyMarkup(chatId, notifMsgId, buildClosedTicketKeyboard(subTicketId, "archived"));
        if (msgId) await editMessageText(chatId, msgId, `🗃 <b>${confirmedTicket.ticket_number}</b> archived.`, { parse_mode: "HTML" });
        // Post status update in the forum topic thread if one exists
        const archiveTopicId = confirmedTicket.telegram_topic_id as number | null;
        if (archiveTopicId) {
          await sendMessage(chatId, `🗃 <b>${confirmedTicket.ticket_number}</b> has been archived.`, {
            parse_mode: "HTML",
            message_thread_id: archiveTopicId,
          }).catch(() => {});
        }
        await answerCallbackQuery(cb.id, "Archived.");
        break;
      }

      case "unarchive": {
        if (confirmedTicket.status !== "archived") {
          if (msgId) await editMessageText(chatId, msgId, "❌ Ticket is not archived.");
          await answerCallbackQuery(cb.id, "Not archived.");
          break;
        }
        const { error: unarchiveErr } = await supabase.from("support_tickets").update({ status: "open" }).eq("id", subTicketId);
        if (unarchiveErr) {
          if (msgId) await editMessageText(chatId, msgId, `❌ Failed to reopen.\n<code>${unarchiveErr.message}</code>`, { parse_mode: "HTML" });
          await answerCallbackQuery(cb.id, "DB error.");
          break;
        }
        await supabase.from("support_messages").insert({
          ticket_id: subTicketId,
          sender: "system",
          content: "Ticket unarchived and reopened.",
        });
        if (notifMsgId) {
          const assignedName = confirmedTicket.assigned_to_name as string | null;
          await editMessageReplyMarkup(
            chatId,
            notifMsgId,
            assignedName ? buildClaimedKeyboard(subTicketId, assignedName) : buildClaimableKeyboard(subTicketId)
          );
        }
        if (msgId) await editMessageText(chatId, msgId, `🔄 <b>${confirmedTicket.ticket_number}</b> reopened.`, { parse_mode: "HTML" });
        // Post status update in the forum topic thread if one exists
        const unarchiveTopicId = confirmedTicket.telegram_topic_id as number | null;
        if (unarchiveTopicId) {
          await sendMessage(chatId, `🔄 <b>${confirmedTicket.ticket_number}</b> has been reopened.`, {
            parse_mode: "HTML",
            message_thread_id: unarchiveTopicId,
          }).catch(() => {});
        }
        await answerCallbackQuery(cb.id, "Reopened.");
        break;
      }

      case "delete": {
        const ticketNumber = confirmedTicket.ticket_number;
        await supabase.from("support_tickets").delete().eq("id", subTicketId);
        if (msgId) await editMessageText(chatId, msgId, `🗑 <b>${ticketNumber}</b> permanently deleted.`, { parse_mode: "HTML" });
        await answerCallbackQuery(cb.id, "Deleted.");
        break;
      }

      default:
        await answerCallbackQuery(cb.id);
    }
    return;
  }

  // Ticket actions — rest is the ticketId
  const ticketId = rest;
  const { data: ticket, error } = await supabase
    .from("support_tickets")
    .select("*")
    .eq("id", ticketId)
    .single();

  if (error || !ticket) {
    await answerCallbackQuery(cb.id, "Ticket not found.");
    return;
  }

  switch (action) {
    case "view": {
      await answerCallbackQuery(cb.id, "Opening thread…");

      // ── 1. Get or create a forum topic for this ticket ──────────────────
      let topicId = ticket.telegram_topic_id as number | null;
      if (!topicId) {
        try {
          topicId = await createForumTopic(chatId, ticket.ticket_number);
          await supabase
            .from("support_tickets")
            .update({ telegram_topic_id: topicId })
            .eq("id", ticketId);
        } catch (e) {
          // Group may not have Topics enabled — fall back to main chat
          console.warn("createForumTopic failed, posting to main chat:", e);
        }
      }

      // ── 2. Build ticket summary + last message ──────────────────────────
      const accountLine = ticket.has_wavcash_account
        ? `✅ WavCash ID: ${ticket.wavcash_id ?? "not provided"}`
        : `❌ No account`;
      const assignedLine = ticket.assigned_to_name
        ? `👤 ${ticket.assigned_to_name}`
        : "👤 Unclaimed";

      // Fetch the most recent message
      const { data: recentMsgs } = await supabase
        .from("support_messages")
        .select("*")
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: false })
        .limit(1);
      const lastMsg = recentMsgs?.[0];
      const senderIcon: Record<string, string> = { user: "👤", agent: "👮", system: "⚙️" };

      const viewRating = ticket.rating as number | null;
      const viewRatingLine = viewRating
        ? ` · ⭐ ${"★".repeat(viewRating)}${"☆".repeat(5 - viewRating)}`
        : "";

      let summary =
        `<b>📋 ${ticket.ticket_number}</b> — ${statusEmoji(ticket.status)} ${ticket.status}\n` +
        `${assignedLine} · ${accountLine}${viewRatingLine}\n` +
        `<i>Created ${formatDate(ticket.created_at)}</i>\n` +
        `─────────────────\n`;

      if (ticket.request_detail) {
        summary += `📝 <b>Request:</b>\n"${(ticket.request_detail as string).slice(0, 200)}"\n\n`;
      }

      if (lastMsg) {
        const icon = senderIcon[lastMsg.sender as string] ?? "•";
        summary += `💬 <b>Last message</b> (${icon} ${lastMsg.sender}, ${formatRelativeTime(lastMsg.created_at)}):\n"${(lastMsg.content as string).slice(0, 200)}"\n\n`;
      }

      summary += `─────────────────\n<i>↩ Reply here to respond · /transcript for full history</i>`;

      // ── 3. Send to topic (with retry if topic was deleted) ─────────────
      let sent = false;
      if (topicId) {
        try {
          await sendMessage(chatId, summary, {
            parse_mode: "HTML",
            message_thread_id: topicId,
          });
          sent = true;
        } catch {
          // Topic likely deleted — create a new one
          console.warn(`Topic ${topicId} unreachable for ${ticket.ticket_number}, recreating…`);
          try {
            topicId = await createForumTopic(chatId, ticket.ticket_number);
            await supabase
              .from("support_tickets")
              .update({ telegram_topic_id: topicId })
              .eq("id", ticketId);
            await sendMessage(chatId, summary, {
              parse_mode: "HTML",
              message_thread_id: topicId,
            });
            sent = true;
          } catch (e2) {
            console.warn("Topic recreation failed, falling back to main chat:", e2);
          }
        }
      }
      if (!sent) {
        await sendMessage(chatId, summary, { parse_mode: "HTML" });
      }
      break;
    }

    case "claim": {
      if (ticket.assigned_to_telegram_id) {
        await answerCallbackQuery(cb.id, `Already claimed by ${ticket.assigned_to_name ?? "someone"}.`);
        return;
      }
      await answerCallbackQuery(cb.id);
      await sendMessage(
        chatId,
        `⚠️ Claim <b>${ticket.ticket_number}</b>?\nThis will assign you as the handler.`,
        {
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [[
              { text: "✅ Yes, claim", callback_data: `do_claim_${ticketId}` },
              { text: "❌ Cancel", callback_data: `cancel_action_${ticketId}` },
            ]],
          },
        }
      );
      break;
    }

    case "unclaim": {
      if (!ticket.assigned_to_telegram_id) {
        await answerCallbackQuery(cb.id, "Ticket is not claimed.");
        return;
      }
      await answerCallbackQuery(cb.id);
      await sendMessage(
        chatId,
        `⚠️ Unclaim <b>${ticket.ticket_number}</b>?\nThis will release it back to the pool.`,
        {
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [[
              { text: "✅ Yes, unclaim", callback_data: `do_unclaim_${ticketId}` },
              { text: "❌ Cancel", callback_data: `cancel_action_${ticketId}` },
            ]],
          },
        }
      );
      break;
    }

    case "resolve": {
      if (ticket.status === "resolved") {
        await answerCallbackQuery(cb.id, "Already resolved.");
        return;
      }
      await answerCallbackQuery(cb.id);
      await sendMessage(
        chatId,
        `⚠️ Resolve <b>${ticket.ticket_number}</b>?\nThe user will be notified this ticket is closed.`,
        {
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [[
              { text: "✅ Yes, resolve", callback_data: `do_resolve_${ticketId}` },
              { text: "❌ Cancel", callback_data: `cancel_action_${ticketId}` },
            ]],
          },
        }
      );
      break;
    }

    case "archive": {
      if (ticket.status === "archived") {
        await answerCallbackQuery(cb.id, "Already archived.");
        return;
      }
      await answerCallbackQuery(cb.id);
      await sendMessage(
        chatId,
        `⚠️ Archive <b>${ticket.ticket_number}</b>?\nThe ticket will be removed from active queues.`,
        {
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [[
              { text: "✅ Yes, archive", callback_data: `do_archive_${ticketId}` },
              { text: "❌ Cancel", callback_data: `cancel_action_${ticketId}` },
            ]],
          },
        }
      );
      break;
    }

    case "unarchive": {
      if (ticket.status !== "archived") {
        await answerCallbackQuery(cb.id, "Ticket is not archived.");
        return;
      }
      await answerCallbackQuery(cb.id);
      await sendMessage(
        chatId,
        `⚠️ Reopen <b>${ticket.ticket_number}</b>?\nThe ticket will return to the open queue.`,
        {
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [[
              { text: "✅ Yes, reopen", callback_data: `do_unarchive_${ticketId}` },
              { text: "❌ Cancel", callback_data: `cancel_action_${ticketId}` },
            ]],
          },
        }
      );
      break;
    }

    case "delete": {
      await answerCallbackQuery(cb.id);
      await sendMessage(
        chatId,
        `⚠️ <b>Permanently delete ${ticket.ticket_number}?</b>\nThis cannot be undone.`,
        {
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [[
              { text: "🗑 Yes, delete", callback_data: `do_delete_${ticketId}` },
              { text: "❌ Cancel", callback_data: `cancel_action_${ticketId}` },
            ]],
          },
        }
      );
      break;
    }

    default:
      await answerCallbackQuery(cb.id);
  }
}

// ── Message handler ──────────────────────────────────────────────────────────

async function handleMessage(message: TelegramMessage, chatId: string) {
  const text = message.text?.trim();
  if (!text) return;

  const supabase = await createServiceClient();
  const telegramUserId = message.from?.id;
  const threadId = message.message_thread_id;

  // 1. Bot commands (must come first)
  if (text.startsWith("/")) {
    const cmd = text.split("@")[0].toLowerCase();

    // /transcript — only works inside a ticket's forum topic
    if (cmd === "/transcript") {
      if (!threadId) {
        await sendMessage(chatId, "ℹ️ Use /transcript inside a ticket's topic thread.");
        return;
      }
      const { data: topicTicket } = await supabase
        .from("support_tickets")
        .select("*")
        .eq("telegram_topic_id", threadId)
        .single();
      if (!topicTicket) {
        await sendMessage(chatId, "❌ No ticket found for this topic.", { message_thread_id: threadId });
        return;
      }
      const { data: allMsgs } = await supabase
        .from("support_messages")
        .select("*")
        .eq("ticket_id", topicTicket.id)
        .order("created_at", { ascending: true });

      const senderIcon: Record<string, string> = { user: "👤", agent: "👮", system: "⚙️" };
      const accountLine = topicTicket.has_wavcash_account
        ? `✅ WavCash ID: ${topicTicket.wavcash_id ?? "not provided"}`
        : "❌ No account";
      const assignedLine = topicTicket.assigned_to_name
        ? `👤 ${topicTicket.assigned_to_name}`
        : "👤 Unclaimed";
      const ratingStars = topicTicket.rating
        ? "★".repeat(topicTicket.rating) + "☆".repeat(5 - topicTicket.rating)
        : null;

      let transcript =
        `<b>📋 ${topicTicket.ticket_number}</b> — ${statusEmoji(topicTicket.status)} ${topicTicket.status}\n` +
        `${assignedLine} · ${accountLine}` +
        (ratingStars ? ` · ⭐ ${ratingStars}` : "") +
        `\n<i>Created ${formatDate(topicTicket.created_at)}</i>\n` +
        `─────────────────\n`;

      for (const m of allMsgs ?? []) {
        const icon = senderIcon[m.sender as string] ?? "•";
        transcript += `${icon} <b>${m.sender}</b>: ${m.content}\n`;
      }
      transcript += `─────────────────`;

      if (transcript.length > 4000) {
        transcript = transcript.slice(0, 3990) + "\n…<i>(truncated)</i>";
      }

      await sendMessage(chatId, transcript, {
        parse_mode: "HTML",
        message_thread_id: threadId,
      });
      return;
    }

    if (cmd === "/pending") {
      const result = await buildTicketListText("pending", 0, telegramUserId, supabase);
      await sendMessage(chatId, result.body, {
        parse_mode: "HTML",
        reply_markup: buildListKeyboard("pending", 0, result.totalPages, telegramUserId, result.tickets),
      });
      return;
    }
    if (cmd === "/resolved") {
      const result = await buildTicketListText("resolved", 0, telegramUserId, supabase);
      await sendMessage(chatId, result.body, {
        parse_mode: "HTML",
        reply_markup: buildListKeyboard("resolved", 0, result.totalPages, telegramUserId, result.tickets),
      });
      return;
    }
    if (cmd === "/archived") {
      const result = await buildTicketListText("archived", 0, telegramUserId, supabase);
      await sendMessage(chatId, result.body, {
        parse_mode: "HTML",
        reply_markup: buildListKeyboard("archived", 0, result.totalPages, telegramUserId, result.tickets),
      });
      return;
    }
    if (cmd === "/mine") {
      const result = await buildTicketListText("mine", 0, telegramUserId, supabase);
      await sendMessage(chatId, result.body, {
        parse_mode: "HTML",
        reply_markup: buildListKeyboard("mine", 0, result.totalPages, telegramUserId, result.tickets),
      });
      return;
    }
    return;
  }

  // 2. Tier 0: message sent inside a ticket's forum topic
  //    (topic messages have message_thread_id set; route directly to ticket)
  if (threadId) {
    const { data: topicTicket } = await supabase
      .from("support_tickets")
      .select("*")
      .eq("telegram_topic_id", threadId)
      .single();

    if (topicTicket) {
      await supabase.from("support_messages").insert({
        ticket_id: topicTicket.id,
        sender: "agent",
        content: text,
      });
      if (topicTicket.status === "open") {
        await supabase
          .from("support_tickets")
          .update({ status: "in_progress" })
          .eq("id", topicTicket.id);
      }
      // Confirm in the same topic
      await sendMessage(chatId, `✅ Reply sent to <b>${topicTicket.ticket_number}</b>.`, {
        parse_mode: "HTML",
        message_thread_id: threadId,
      });
      return;
    }
    // No ticket matched this topic — fall through (e.g. general group topics)
  }

  // 3. Ticket number lookup — agent types "TKT-008" in the main chat
  const ticketNumMatch = text.match(/^(TKT-\d+)$/i);
  if (ticketNumMatch && !threadId) {
    const ticketNumber = ticketNumMatch[1].toUpperCase();
    const { data: lookedUp } = await supabase
      .from("support_tickets")
      .select("*")
      .eq("ticket_number", ticketNumber)
      .single();

    if (!lookedUp) {
      await sendMessage(chatId, `❌ Ticket <b>${ticketNumber}</b> not found.`, { parse_mode: "HTML" });
      return;
    }

    // Fetch most recent message
    const { data: recentMsgs } = await supabase
      .from("support_messages")
      .select("*")
      .eq("ticket_id", lookedUp.id)
      .order("created_at", { ascending: false })
      .limit(1);

    const lastMsg = recentMsgs?.[0];
    const senderLabel =
      lastMsg?.sender === "user" ? "👤 User"
      : lastMsg?.sender === "agent" ? "👮 Agent"
      : "⚙️ System";

    const body = lastMsg
      ? `📨 <b>Last message in ${ticketNumber}:</b>\n\n${senderLabel}: "${lastMsg.content}"\n<i>${formatRelativeTime(lastMsg.created_at)}</i>`
      : `📋 <b>${ticketNumber}</b> — no messages yet.`;

    const statusLine =
      `\n\nStatus: ${statusEmoji(lookedUp.status)} ${lookedUp.status}` +
      (lookedUp.assigned_to_name ? ` · 👤 ${lookedUp.assigned_to_name}` : "") +
      `\n<i>↩ Reply to this message to respond, or open the full thread below.</i>`;

    const sentMsg = await sendMessage(chatId, body + statusLine, {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [[
          { text: "🧵 Open Full Thread", callback_data: `view_${lookedUp.id}` },
        ]],
      },
    });

    // Make this message replyable — store as latest_alert_msg_id
    await supabase
      .from("support_tickets")
      .update({ latest_alert_msg_id: sentMsg.message_id })
      .eq("id", lookedUp.id);

    return;
  }

  // 4. Reply to a known ticket notification or follow-up alert (Tiers 1–3)
  const replyToMsgId = message.reply_to_message?.message_id;
  if (replyToMsgId) {
    // Tier 1: original ticket notification
    let { data: ticket } = await supabase
      .from("support_tickets")
      .select("*")
      .eq("telegram_notification_msg_id", replyToMsgId)
      .single();

    // Tier 2: most recent follow-up alert stored on the ticket row
    if (!ticket) {
      const { data: t } = await supabase
        .from("support_tickets")
        .select("*")
        .eq("latest_alert_msg_id", replyToMsgId)
        .single();
      ticket = t;
    }

    // Tier 3: historical per-message alert (requires migration 007)
    if (!ticket) {
      const { data: alertMsg } = await supabase
        .from("support_messages")
        .select("ticket_id")
        .eq("telegram_alert_msg_id", replyToMsgId)
        .single();

      if (alertMsg) {
        const { data: t } = await supabase
          .from("support_tickets")
          .select("*")
          .eq("id", alertMsg.ticket_id)
          .single();
        ticket = t;
      }
    }

    if (ticket) {
      // Claim conflict check
      if (
        ticket.assigned_to_telegram_id &&
        telegramUserId &&
        ticket.assigned_to_telegram_id !== telegramUserId
      ) {
        await supabase.from("telegram_bot_state").upsert({
          telegram_user_id: telegramUserId,
          action: "awaiting_reply_confirm",
          ticket_id: ticket.id,
          pending_content: text,
          expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        });
        await sendMessage(
          chatId,
          `⚠️ <b>${ticket.ticket_number}</b> is claimed by ${ticket.assigned_to_name ?? "another agent"}.\n\nSend your reply anyway?`,
          {
            parse_mode: "HTML",
            reply_markup: {
              inline_keyboard: [[
                { text: "✅ Yes, send it", callback_data: `confirm_reply_${telegramUserId}` },
                { text: "❌ Cancel", callback_data: `cancel_reply_${telegramUserId}` },
              ]],
            },
          }
        );
        return;
      }

      await supabase.from("support_messages").insert({
        ticket_id: ticket.id,
        sender: "agent",
        content: text,
      });
      if (ticket.status === "open") {
        await supabase
          .from("support_tickets")
          .update({ status: "in_progress" })
          .eq("id", ticket.id);
      }
      await sendMessage(chatId, `✅ Reply sent to <b>${ticket.ticket_number}</b>.`, { parse_mode: "HTML" });
      return;
    }
  }

  // 5. Clean up expired bot state
  if (telegramUserId) {
    const { data: state } = await supabase
      .from("telegram_bot_state")
      .select("*")
      .eq("telegram_user_id", telegramUserId)
      .single();

    if (state && new Date(state.expires_at) <= new Date()) {
      await supabase.from("telegram_bot_state").delete().eq("telegram_user_id", telegramUserId);
    }
  }
}

// ── Ticket list builder ──────────────────────────────────────────────────────

type ListType = "pending" | "resolved" | "archived" | "mine";

async function buildTicketListText(
  type: ListType | string,
  page: number,
  agentId: number | undefined,
  supabase: Awaited<ReturnType<typeof import("@/lib/supabase/server").createServiceClient>>
): Promise<{ body: string; totalPages: number; tickets: Record<string, unknown>[] }> {
  const offset = page * PAGE_SIZE;

  let tickets: Record<string, unknown>[] = [];
  let total = 0;

  if (type === "pending") {
    // Open/in_progress tickets with zero agent replies
    const { data: allOpen } = await supabase
      .from("support_tickets")
      .select("*, support_messages(*)")
      .in("status", ["open", "in_progress"])
      .order("created_at", { ascending: true });

    const pending = (allOpen ?? []).filter((t) => {
      const msgs = (t.support_messages as { sender: string }[]) ?? [];
      return msgs.every((m) => m.sender !== "agent");
    });
    total = pending.length;
    tickets = pending.slice(offset, offset + PAGE_SIZE);
  } else if (type === "resolved") {
    const { data, count } = await supabase
      .from("support_tickets")
      .select("*", { count: "exact" })
      .eq("status", "resolved")
      .order("resolved_at", { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);
    tickets = data ?? [];
    total = count ?? 0;
  } else if (type === "archived") {
    const { data, count } = await supabase
      .from("support_tickets")
      .select("*", { count: "exact" })
      .eq("status", "archived")
      .order("updated_at", { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);
    tickets = data ?? [];
    total = count ?? 0;
  } else if (type === "mine") {
    const { data, count } = await supabase
      .from("support_tickets")
      .select("*", { count: "exact" })
      .eq("assigned_to_telegram_id", agentId ?? 0)
      .in("status", ["open", "in_progress"])
      .order("created_at", { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);
    tickets = data ?? [];
    total = count ?? 0;
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const titles: Record<string, string> = {
    pending: "⏳ Pending Tickets (unreplied)",
    resolved: "✅ Resolved Tickets",
    archived: "🗃 Archived Tickets",
    mine: "👤 My Tickets",
  };

  if (tickets.length === 0) {
    return {
      body: `${titles[type] ?? "Tickets"}\n\n<i>No tickets found.</i>`,
      totalPages: 1,
      tickets: [],
    };
  }

  const lines = tickets.map((t) => {
    const num = t.ticket_number as string;
    const status = t.status as string;
    const createdAt = t.created_at as string;
    const assignedName = t.assigned_to_name as string | null;
    const requestDetail = t.request_detail as string | null;
    const initialMsg = t.initial_message as string | null;
    const hasAccount = t.has_wavcash_account as boolean | null;
    const wavcashId = t.wavcash_id as string | null;

    const preview = (requestDetail ?? initialMsg ?? "").slice(0, 60);
    const accountTag = hasAccount ? `WC: ${wavcashId ?? "?"}` : "No account";
    const claimTag = assignedName ? ` · ${assignedName}` : "";
    const id = t.id as string;

    const ticketRating = t.rating as number | null;
    const ratingTag = ticketRating ? ` · ${"★".repeat(ticketRating)}${"☆".repeat(5 - ticketRating)}` : "";

    return (
      `${statusEmoji(status)} <b>${num}</b> · ${formatRelativeTime(createdAt)} · ${accountTag}${claimTag}${ratingTag}\n` +
      (preview ? `"${preview}${preview.length === 60 ? "…" : ""}"` : "")
    ).trim();
  });

  const pageInfo = totalPages > 1 ? ` (page ${page + 1}/${totalPages})` : "";
  const header = `<b>${titles[type] ?? "Tickets"}</b> — ${total} total${pageInfo}`;

  return {
    body: header + "\n\n" + lines.join("\n\n"),
    totalPages,
    tickets,
  };
}

function buildListKeyboard(
  type: string,
  page: number,
  totalPages: number,
  agentId: number | undefined,
  tickets: Record<string, unknown>[] = []
): InlineKeyboardMarkup {
  const rows: { text: string; callback_data: string }[][] = [];

  // One action row per ticket
  for (const t of tickets) {
    const id = t.id as string;
    const num = t.ticket_number as string;
    const status = t.status as string;

    if (status === "resolved") {
      rows.push([
        { text: `🔍 ${num}`, callback_data: `view_${id}` },
      ]);
    } else if (status === "archived") {
      rows.push([
        { text: `🔍 ${num}`, callback_data: `view_${id}` },
        { text: "🔄 Unarchive", callback_data: `unarchive_${id}` },
      ]);
    } else {
      // open / in_progress
      rows.push([
        { text: `🔍 ${num}`, callback_data: `view_${id}` },
        { text: "👆 Claim", callback_data: `claim_${id}` },
        { text: "✅ Resolve", callback_data: `resolve_${id}` },
        { text: "🗃 Archive", callback_data: `archive_${id}` },
      ]);
    }
  }

  // Pagination row
  const navRow: { text: string; callback_data: string }[] = [];
  if (page > 0) {
    navRow.push({ text: "← Prev", callback_data: `list_${type}_${page - 1}` });
  }
  if (page < totalPages - 1) {
    navRow.push({ text: "Next →", callback_data: `list_${type}_${page + 1}` });
  }
  if (navRow.length > 0) rows.push(navRow);

  return { inline_keyboard: rows };
}

// Local type alias to satisfy TS without importing the full type
interface InlineKeyboardMarkup {
  inline_keyboard: { text: string; callback_data?: string }[][];
}
