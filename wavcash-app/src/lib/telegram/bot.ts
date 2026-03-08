import type { SupportTicket } from "@/lib/types/database";

const TELEGRAM_API = "https://api.telegram.org";

function botUrl(method: string) {
  return `${TELEGRAM_API}/bot${process.env.TELEGRAM_BOT_TOKEN}/${method}`;
}

export interface InlineKeyboardButton {
  text: string;
  callback_data?: string;
}

export interface InlineKeyboardMarkup {
  inline_keyboard: InlineKeyboardButton[][];
}

interface SendMessageOptions {
  parse_mode?: "HTML" | "Markdown" | "MarkdownV2";
  reply_markup?: InlineKeyboardMarkup;
  reply_to_message_id?: number;
  message_thread_id?: number;
}

interface EditMessageOptions {
  parse_mode?: "HTML" | "Markdown" | "MarkdownV2";
  reply_markup?: InlineKeyboardMarkup;
}

export interface TelegramMessage {
  message_id: number;
  chat: { id: number };
  text?: string;
  message_thread_id?: number;
  reply_to_message?: { message_id: number };
  from?: { id: number; username?: string; first_name?: string };
  is_topic_message?: boolean;
}

export interface TelegramCallbackQuery {
  id: string;
  from: { id: number; username?: string; first_name?: string };
  message?: TelegramMessage;
  data?: string;
}

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
}

// ── Core API wrappers ────────────────────────────────────────────────────────

export async function sendMessage(
  chatId: number | string,
  text: string,
  options: SendMessageOptions = {}
): Promise<TelegramMessage> {
  const res = await fetch(botUrl("sendMessage"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, ...options }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Telegram sendMessage failed: ${err}`);
  }

  const json = await res.json();
  return json.result as TelegramMessage;
}

export async function editMessageText(
  chatId: number | string,
  messageId: number,
  text: string,
  options: EditMessageOptions = {}
): Promise<void> {
  await fetch(botUrl("editMessageText"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      message_id: messageId,
      text,
      ...options,
    }),
  });
}

export async function editMessageReplyMarkup(
  chatId: number | string,
  messageId: number,
  replyMarkup: InlineKeyboardMarkup | null
): Promise<void> {
  await fetch(botUrl("editMessageReplyMarkup"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      message_id: messageId,
      reply_markup: replyMarkup ?? { inline_keyboard: [] },
    }),
  });
}

export async function answerCallbackQuery(
  callbackQueryId: string,
  text?: string
): Promise<void> {
  await fetch(botUrl("answerCallbackQuery"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ callback_query_id: callbackQueryId, text }),
  });
}

export async function setMyCommands(
  commands: { command: string; description: string }[]
): Promise<void> {
  await fetch(botUrl("setMyCommands"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ commands }),
  });
}

/** Sends multiple photos as an album. Returns the array of sent messages. */
export async function sendMediaGroup(
  chatId: number | string,
  photos: { blob: Blob; filename: string }[],
  options: {
    caption?: string;
    reply_to_message_id?: number;
    message_thread_id?: number;
  } = {}
): Promise<TelegramMessage[]> {
  const form = new FormData();
  form.append("chat_id", String(chatId));

  const media = photos.map((p, i) => {
    const key = `photo${i}`;
    form.append(key, p.blob, p.filename);
    return {
      type: "photo",
      media: `attach://${key}`,
      ...(i === 0 && options.caption ? { caption: options.caption } : {}),
    };
  });

  form.append("media", JSON.stringify(media));
  if (options.reply_to_message_id)
    form.append("reply_to_message_id", String(options.reply_to_message_id));
  if (options.message_thread_id)
    form.append("message_thread_id", String(options.message_thread_id));

  const res = await fetch(botUrl("sendMediaGroup"), { method: "POST", body: form });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Telegram sendMediaGroup failed: ${err}`);
  }
  const json = await res.json();
  return json.result as TelegramMessage[];
}

/** Sends a photo to a Telegram chat. The image is forwarded in-memory and
 *  never written to disk — the caller is responsible for the file data. */
export async function sendPhoto(
  chatId: number | string,
  photo: Blob,
  filename: string,
  options: {
    caption?: string;
    reply_to_message_id?: number;
    message_thread_id?: number;
  } = {}
): Promise<TelegramMessage> {
  const form = new FormData();
  form.append("chat_id", String(chatId));
  form.append("photo", photo, filename);
  if (options.caption) form.append("caption", options.caption);
  if (options.reply_to_message_id)
    form.append("reply_to_message_id", String(options.reply_to_message_id));
  if (options.message_thread_id)
    form.append("message_thread_id", String(options.message_thread_id));

  const res = await fetch(botUrl("sendPhoto"), { method: "POST", body: form });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Telegram sendPhoto failed: ${err}`);
  }
  const json = await res.json();
  return json.result as TelegramMessage;
}

/** Creates a forum topic in a supergroup. Returns the message_thread_id.
 *  Throws if the group doesn't have Topics enabled. */
export async function createForumTopic(
  chatId: number | string,
  name: string
): Promise<number> {
  const res = await fetch(botUrl("createForumTopic"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, name: name.slice(0, 128) }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`createForumTopic failed: ${err}`);
  }
  const json = await res.json();
  return (json.result as { message_thread_id: number }).message_thread_id;
}

// ── Keyboard builders ────────────────────────────────────────────────────────

/** Unclaimed open ticket — shows Claim button */
export function buildClaimableKeyboard(ticketId: string): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [
        { text: "👆 Claim", callback_data: `claim_${ticketId}` },
        { text: "🔍 View Details", callback_data: `view_${ticketId}` },
      ],
      [
        { text: "✅ Resolve", callback_data: `resolve_${ticketId}` },
        { text: "🗃 Archive", callback_data: `archive_${ticketId}` },
      ],
      [
        { text: "🗑 Delete", callback_data: `delete_${ticketId}` },
      ],
    ],
  };
}

/** Claimed ticket — shows who claimed it + Unclaim button */
export function buildClaimedKeyboard(
  ticketId: string,
  agentName: string
): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [
        { text: `👤 ${agentName}`, callback_data: `noop_${ticketId}` },
        { text: "🔍 View Details", callback_data: `view_${ticketId}` },
      ],
      [
        { text: "✅ Resolve", callback_data: `resolve_${ticketId}` },
        { text: "🗃 Archive", callback_data: `archive_${ticketId}` },
      ],
      [
        { text: "🔓 Unclaim", callback_data: `unclaim_${ticketId}` },
        { text: "🗑 Delete", callback_data: `delete_${ticketId}` },
      ],
    ],
  };
}

/** Closed ticket — resolved shows status badge only; archived shows Unarchive button */
export function buildClosedTicketKeyboard(
  ticketId: string,
  status: string
): InlineKeyboardMarkup {
  if (status === "resolved") {
    return {
      inline_keyboard: [[{ text: "✅ Resolved", callback_data: `noop_${ticketId}` }]],
    };
  }
  // archived — give agents a way to reopen it
  return {
    inline_keyboard: [
      [{ text: "🗃 Archived", callback_data: `noop_${ticketId}` }],
      [{ text: "🔄 Unarchive", callback_data: `unarchive_${ticketId}` }],
    ],
  };
}

// ── Ticket notification ──────────────────────────────────────────────────────

export async function sendTicketNotification(
  ticket: SupportTicket
): Promise<number> {
  const chatId = process.env.TELEGRAM_GROUP_CHAT_ID!;

  const accountLine = ticket.has_wavcash_account
    ? `👤 Has WavCash account: Yes\n🆔 WavCash ID: ${ticket.wavcash_id ?? "not provided"}`
    : `👤 Has WavCash account: No`;

  const requestLine = ticket.request_detail
    ? `\n📝 Request:\n"${ticket.request_detail}"`
    : "";

  const text =
    `🎫 <b>New Ticket — ${ticket.ticket_number}</b>\n` +
    `Status: 🟡 Open\n\n` +
    `${accountLine}${requestLine}\n\n` +
    `📅 Created: ${formatDate(ticket.created_at)}\n\n` +
    `💬 <i>To reply: reply to this message in the group</i>`;

  const msg = await sendMessage(chatId, text, {
    parse_mode: "HTML",
    reply_markup: buildClaimableKeyboard(ticket.id),
  });

  return msg.message_id;
}

// ── User follow-up alert ─────────────────────────────────────────────────────

/** Sends a follow-up alert when the user messages after ticket creation.
 *  Tags the claimed agent if set. Replies to the most recent alert in the
 *  chain (or the original notification if this is the first follow-up),
 *  so all messages for a ticket form a single thread agents can scroll.
 *  Returns the Telegram message_id so it can be stored on the
 *  support_messages row for reply routing. */
export async function sendAgentFollowUpAlert(
  ticket: SupportTicket,
  userMessage: string,
  replyToMsgId?: number | null  // most recent alert_msg_id, falls back to notification
): Promise<number> {
  const chatId = process.env.TELEGRAM_GROUP_CHAT_ID!;

  // Resolve the message to thread under: latest alert → original notification → nothing
  const threadRoot = replyToMsgId ?? ticket.telegram_notification_msg_id ?? null;

  // Tag the assigned agent so they're notified
  const mention = ticket.assigned_to_name ? `${ticket.assigned_to_name} ` : "";

  const text =
    `💬 ${mention}<b>${ticket.ticket_number} — user replied:</b>\n"${userMessage}"\n\n` +
    `<i>↩ Reply to this message to respond.</i>`;

  const msg = await sendMessage(chatId, text, {
    parse_mode: "HTML",
    ...(threadRoot ? { reply_to_message_id: threadRoot } : {}),
  });

  return msg.message_id;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

export function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
  });
}

export function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export function statusEmoji(status: string) {
  switch (status) {
    case "open": return "🟡";
    case "in_progress": return "🔵";
    case "resolved": return "✅";
    case "archived": return "🗃";
    default: return "⚪";
  }
}

/** For Telegram group mentions — includes @ prefix */
export function agentDisplayName(from: {
  username?: string;
  first_name?: string;
}): string {
  return from.username ? `@${from.username}` : (from.first_name ?? "Agent");
}

/** For user-facing system messages — no @ prefix */
export function agentFriendlyName(from: {
  username?: string;
  first_name?: string;
}): string {
  return from.username ?? from.first_name ?? "Agent";
}
