"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import type { SupportMessage } from "@/lib/types/database";

// Extends SupportMessage with an optional local blob URL for images uploaded
// this session — only present on optimistic messages, never persisted.
type LocalMessage = SupportMessage & { localImageSrc?: string };

type ChatStep =
  | "idle"
  | "creating_ticket"
  | "ask_has_account"
  | "ask_wavcash_id"
  | "ask_request_detail"
  | "live_chat"
  | "closed"
  | "rated";

interface ChatBoxProps {
  onClose: () => void;
  userId: string | null;
}

const MAX_IMAGES = 5;
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10 MB

function sessionKey(userId: string | null) {
  return userId ? `wavcash_support_session:${userId}` : "wavcash_support_session";
}

function ticketIdKey(userId: string | null) {
  return userId ? `wavcash_support_ticket_id:${userId}` : "wavcash_support_ticket_id";
}

function getOrCreateSessionId(userId: string | null): string {
  if (typeof window === "undefined") return "";
  const key = sessionKey(userId);
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}

export function ChatBox({ onClose, userId }: ChatBoxProps) {
  const [step, setStep] = useState<ChatStep>("idle");
  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [ticketNumber, setTicketNumber] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [rating, setRating] = useState<number | null>(null);
  const [pendingImages, setPendingImages] = useState<File[]>([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);
  const [imageError, setImageError] = useState<string | null>(null);
  const [webhookHealthy, setWebhookHealthy] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewUrlsRef = useRef<string[]>([]);

  const sessionId = getOrCreateSessionId(userId);

  // Keep ref in sync for cleanup
  previewUrlsRef.current = imagePreviewUrls;

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, step]);

  // On mount: check if there's an existing ticket to resume
  useEffect(() => {
    const savedTicketId = localStorage.getItem(ticketIdKey(userId));
    if (!savedTicketId) return;

    fetch(`/api/support/tickets/${savedTicketId}?session_id=${sessionId}`)
      .then((r) => r.json())
      .then(({ ticket, messages: msgs }) => {
        if (!ticket) {
          localStorage.removeItem(ticketIdKey(userId));
          return;
        }

        setTicketId(ticket.id);
        setTicketNumber(ticket.ticket_number);
        setMessages(msgs ?? []);

        if (ticket.status === "open" || ticket.status === "in_progress") {
          if (ticket.request_detail) {
            setStep("live_chat");
          } else if (ticket.has_wavcash_account !== null) {
            setStep("ask_request_detail");
          } else {
            setStep("ask_has_account");
          }
        } else if (ticket.status === "resolved" || ticket.status === "archived") {
          if (ticket.rating) {
            setRating(ticket.rating);
            setStep("rated");
          } else {
            setStep("closed");
          }
        } else {
          localStorage.removeItem(ticketIdKey(userId));
        }
      })
      .catch(() => {
        localStorage.removeItem(ticketIdKey(userId));
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Poll for new messages + ticket status changes during live_chat (and closed/rated)
  const fetchTicketAndMessages = useCallback(async () => {
    if (!ticketId) return;
    try {
      const res = await fetch(
        `/api/support/tickets/${ticketId}?session_id=${sessionId}`
      );
      if (!res.ok) return;
      const { ticket: updatedTicket, messages: newMsgs } = await res.json();
      if (newMsgs) setMessages(newMsgs);
      if (!updatedTicket) return;

      const isNowClosed =
        updatedTicket.status === "resolved" || updatedTicket.status === "archived";
      const isNowOpen =
        updatedTicket.status === "open" || updatedTicket.status === "in_progress";

      setStep((prev) => {
        // Ticket closed → move to closed step
        if (isNowClosed && prev === "live_chat") return "closed";
        // Ticket reopened after being closed/rated → return to live chat
        if (isNowOpen && (prev === "closed" || prev === "rated")) return "live_chat";
        return prev;
      });
    } catch {}

    // Webhook health check (only during live_chat)
    try {
      const hRes = await fetch("/api/telegram/webhook?check=health");
      if (hRes.ok) {
        const { healthy } = await hRes.json();
        setWebhookHealthy(!!healthy);
      } else {
        setWebhookHealthy(false);
      }
    } catch {
      setWebhookHealthy(false);
    }
  }, [ticketId, sessionId]);

  useEffect(() => {
    // Poll during live chat AND while closed/rated (to detect reopening)
    if (!ticketId || !["live_chat", "closed", "rated"].includes(step)) return;

    fetchTicketAndMessages();
    pollIntervalRef.current = setInterval(fetchTicketAndMessages, 5000);

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [step, ticketId, fetchTicketAndMessages]);

  // Auto-dismiss image error
  useEffect(() => {
    if (!imageError) return;
    const t = setTimeout(() => setImageError(null), 4000);
    return () => clearTimeout(t);
  }, [imageError]);

  // Cleanup preview URLs on unmount
  useEffect(() => {
    return () => {
      previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  // --- Handlers ---

  async function handleInitialMessage() {
    const text = inputValue.trim();
    if (!text || isLoading) return;

    setIsLoading(true);
    setInputValue("");
    setStep("creating_ticket");

    try {
      const res = await fetch("/api/support/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, initial_message: text }),
      });
      const data = await res.json();
      if (!res.ok || !data.ticket_id) throw new Error("Failed to create ticket");

      setTicketId(data.ticket_id);
      setTicketNumber(data.ticket_number);
      localStorage.setItem(ticketIdKey(userId), data.ticket_id);

      setMessages([{
        id: "init",
        ticket_id: data.ticket_id,
        sender: "user",
        content: text,
        created_at: new Date().toISOString(),
      }]);
      setStep("ask_has_account");
    } catch {
      setStep("idle");
      setInputValue(text);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleHasAccount(answer: boolean) {
    if (!ticketId || isLoading) return;
    setIsLoading(true);

    const systemMsg = {
      id: `sys-${Date.now()}`,
      ticket_id: ticketId,
      sender: "system" as const,
      content: answer
        ? "You selected: Yes, I have a WavCash account."
        : "You selected: No, I don't have an account.",
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, systemMsg]);

    try {
      await fetch(`/api/support/tickets/${ticketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, has_wavcash_account: answer }),
      });
      setStep(answer ? "ask_wavcash_id" : "ask_request_detail");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleWavcashId() {
    const id = inputValue.trim();
    if (!id || !ticketId || isLoading) return;

    setIsLoading(true);
    setInputValue("");

    const userMsg = {
      id: `u-${Date.now()}`,
      ticket_id: ticketId,
      sender: "user" as const,
      content: id,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);

    try {
      await fetch(`/api/support/tickets/${ticketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, wavcash_id: id }),
      });
      setStep("ask_request_detail");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleRequestDetail() {
    const text = inputValue.trim();
    if (!text || !ticketId || isLoading) return;

    setIsLoading(true);
    setInputValue("");

    // Show the user's message immediately in the UI
    const userMsg = {
      id: `u-${Date.now()}`,
      ticket_id: ticketId,
      sender: "user" as const,
      content: text,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);

    try {
      await fetch(`/api/support/tickets/${ticketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, request_detail: text }),
      });
      setStep("live_chat");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleLiveChatMessage() {
    const text = inputValue.trim();
    if (!text || !ticketId || isLoading) return;

    setIsLoading(true);
    setInputValue("");

    const optimistic: SupportMessage = {
      id: `opt-${Date.now()}`,
      ticket_id: ticketId,
      sender: "user",
      content: text,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);

    try {
      await fetch(`/api/support/tickets/${ticketId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, content: text }),
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleRating(stars: number) {
    if (!ticketId) return;
    setRating(stars);
    setStep("rated");
    try {
      await fetch(`/api/support/tickets/${ticketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, rating: stars }),
      });
    } catch {}
  }

  function handleNewTicket() {
    localStorage.removeItem(ticketIdKey(userId));
    setStep("idle");
    setMessages([]);
    setTicketId(null);
    setTicketNumber(null);
    setRating(null);
    setInputValue("");
  }

  function handleCloseChat() {
    localStorage.removeItem(ticketIdKey(userId));
    setStep("idle");
    setMessages([]);
    setTicketId(null);
    setTicketNumber(null);
    setRating(null);
    setInputValue("");
    onClose();
  }

  // --- Image handlers ---

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;

    const oversized = files.filter((f) => f.size > MAX_IMAGE_SIZE);
    const valid = files.filter((f) => f.size <= MAX_IMAGE_SIZE);

    if (oversized.length) {
      setImageError("Please attach images under 10 MB.");
    }

    if (!valid.length) {
      e.target.value = "";
      return;
    }

    setPendingImages((prev) => {
      const combined = [...prev, ...valid].slice(0, MAX_IMAGES);
      return combined;
    });
    setImagePreviewUrls((prev) => {
      const newUrls = valid.map((f) => URL.createObjectURL(f));
      const combined = [...prev, ...newUrls].slice(0, MAX_IMAGES);
      // Revoke any excess
      if (prev.length + newUrls.length > MAX_IMAGES) {
        newUrls.slice(MAX_IMAGES - prev.length).forEach((url) => URL.revokeObjectURL(url));
      }
      return combined;
    });

    e.target.value = "";
  }

  function removeImage(index: number) {
    setPendingImages((prev) => prev.filter((_, i) => i !== index));
    setImagePreviewUrls((prev) => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  }

  function clearPendingImages() {
    imagePreviewUrls.forEach((url) => URL.revokeObjectURL(url));
    setPendingImages([]);
    setImagePreviewUrls([]);
  }

  async function handleImageSend() {
    if (pendingImages.length === 0 || !ticketId || isLoading) return;
    const files = [...pendingImages];
    const caption = inputValue.trim() || null;

    setIsLoading(true);
    clearPendingImages();
    setInputValue("");

    // Build optimistic message
    const count = files.length;
    const contentText =
      count === 1
        ? caption ? `[📎 Image: ${caption}]` : "[📎 Image]"
        : caption ? `[📎 ${count} images: ${caption}]` : `[📎 ${count} images]`;

    const blobUrl = URL.createObjectURL(files[0]);
    const optimistic: LocalMessage = {
      id: `img-${Date.now()}`,
      ticket_id: ticketId,
      sender: "user",
      content: contentText,
      localImageSrc: blobUrl,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);

    try {
      const form = new FormData();
      files.forEach((f) => form.append("images", f));
      form.append("session_id", sessionId);
      if (caption) form.append("caption", caption);
      await fetch(`/api/support/tickets/${ticketId}/images`, {
        method: "POST",
        body: form,
      });
    } finally {
      URL.revokeObjectURL(blobUrl);
      setIsLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleSend() {
    if (step === "live_chat" && pendingImages.length > 0) { handleImageSend(); return; }
    if (step === "idle") handleInitialMessage();
    else if (step === "ask_wavcash_id") handleWavcashId();
    else if (step === "ask_request_detail") handleRequestDetail();
    else if (step === "live_chat") handleLiveChatMessage();
  }

  const isClosed = step === "closed" || step === "rated";

  const showInput =
    step === "idle" ||
    step === "ask_wavcash_id" ||
    step === "ask_request_detail" ||
    step === "live_chat";

  const inputPlaceholder =
    step === "idle"
      ? "Contact WavCash Support."
      : step === "ask_wavcash_id"
      ? "Your WavCash ID (e.g. WC-123-456-789)"
      : "";

  return (
    <div
      className="flex flex-col rounded-xl border border-white/10 bg-[#0f0f0f] shadow-2xl"
      style={{ width: 380, height: 520 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div className="flex items-center gap-2">
          {isClosed ? (
            <span className="size-2 rounded-full bg-white/20" />
          ) : (
            <span className="size-2 rounded-full bg-green-400 animate-pulse" />
          )}
          <span
            className="font-medium text-sm text-white"
            style={{ fontFamily: "var(--font-plus-jakarta)" }}
          >
            WavCash Support
          </span>
          {ticketNumber && (
            <span className="text-xs text-white/40 font-mono">{ticketNumber}</span>
          )}
        </div>
        <button
          onClick={onClose}
          className="text-white/40 hover:text-white/80 transition-colors text-lg leading-none"
          aria-label="Close"
        >
          ×
        </button>
      </div>

      {/* Connectivity banner */}
      {!webhookHealthy && step === "live_chat" && (
        <div className="px-4 py-2 bg-amber-500/10 border-b border-amber-500/20">
          <p
            className="text-xs text-amber-400/90 text-center"
            style={{ fontFamily: "var(--font-plus-jakarta)" }}
          >
            We&apos;re experiencing connectivity issues. Our agents will respond to you shortly.
          </p>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.length === 0 && step === "idle" && (
          <div className="text-white/30 text-sm text-center mt-16">
            How can we help you today?
          </div>
        )}

        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg as LocalMessage} />
        ))}

        {step === "creating_ticket" && (
          <div className="flex gap-1 items-center">
            <span className="size-1.5 rounded-full bg-white/30 animate-bounce [animation-delay:0ms]" />
            <span className="size-1.5 rounded-full bg-white/30 animate-bounce [animation-delay:100ms]" />
            <span className="size-1.5 rounded-full bg-white/30 animate-bounce [animation-delay:200ms]" />
          </div>
        )}

        {step === "ask_has_account" && (
          <div className="space-y-2">
            <SystemBubble text="Do you have a WavCash account?" />
            <div className="flex gap-2">
              <button
                onClick={() => handleHasAccount(true)}
                disabled={isLoading}
                className="flex-1 rounded-lg border border-white/20 bg-white/5 py-2 text-sm text-white hover:bg-white/10 transition-colors disabled:opacity-50"
              >
                Yes
              </button>
              <button
                onClick={() => handleHasAccount(false)}
                disabled={isLoading}
                className="flex-1 rounded-lg border border-white/20 bg-white/5 py-2 text-sm text-white hover:bg-white/10 transition-colors disabled:opacity-50"
              >
                No
              </button>
            </div>
          </div>
        )}

        {step === "ask_wavcash_id" && (
          <SystemBubble text="Please enter your WavCash ID:" />
        )}

        {step === "ask_request_detail" && (
          <SystemBubble text="Please enter your request in as much detail as possible." />
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      {showInput && (
        <div className="border-t border-white/10">
          {/* Image error */}
          {imageError && (
            <div className="px-3 pt-2 text-xs text-red-400">{imageError}</div>
          )}

          {/* Image preview strip (multi-image) */}
          {pendingImages.length > 0 && (
            <div className="px-3 pt-2 flex items-center gap-2 overflow-x-auto">
              {pendingImages.map((file, i) => (
                <div key={i} className="relative shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imagePreviewUrls[i]}
                    alt={`pending ${i + 1}`}
                    className="h-14 w-14 rounded-lg object-cover border border-white/20"
                  />
                  <button
                    onClick={() => removeImage(i)}
                    className="absolute -top-1.5 -right-1.5 size-4 rounded-full bg-black border border-white/30 text-white/80 flex items-center justify-center text-[10px] leading-none hover:bg-white/20"
                    aria-label={`Remove ${file.name}`}
                  >
                    ×
                  </button>
                </div>
              ))}
              {pendingImages.length < MAX_IMAGES && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="shrink-0 h-14 w-14 rounded-lg border border-dashed border-white/20 flex items-center justify-center text-white/30 hover:text-white/50 hover:border-white/30 transition-colors"
                  aria-label="Add more images"
                >
                  +
                </button>
              )}
            </div>
          )}

          <div className="p-3 flex gap-2 items-end">
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleImageSelect}
            />

            {/* Attachment button — only in live chat */}
            {step === "live_chat" && (
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading || pendingImages.length >= MAX_IMAGES}
                className="shrink-0 size-9 rounded-lg flex items-center justify-center text-white/40 hover:text-white/70 hover:bg-white/5 transition-all disabled:opacity-30"
                aria-label="Attach image"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <rect x="1" y="3" width="14" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
                  <circle cx="5.5" cy="6.5" r="1" fill="currentColor" />
                  <path d="M1 10.5L5 7L8 10L11 7.5L15 11" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            )}

            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={pendingImages.length > 0 ? "Add a caption (optional)" : inputPlaceholder}
              disabled={isLoading}
              rows={1}
              className={cn(
                "flex-1 resize-none rounded-lg border border-white/10 bg-white/5 px-3 py-2",
                "text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/30",
                "transition-colors disabled:opacity-50",
                "max-h-24 min-h-[36px]"
              )}
              style={{ fontFamily: "var(--font-plus-jakarta)", height: "auto" }}
              onInput={(e) => {
                const el = e.currentTarget;
                el.style.height = "auto";
                el.style.height = Math.min(el.scrollHeight, 96) + "px";
              }}
            />
            <button
              onClick={handleSend}
              disabled={isLoading || (!inputValue.trim() && pendingImages.length === 0)}
              className={cn(
                "shrink-0 size-9 rounded-lg flex items-center justify-center transition-all",
                "bg-white text-black hover:bg-white/90 disabled:opacity-30 disabled:cursor-not-allowed"
              )}
              aria-label="Send"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M2 8L14 2L8 14L7 9L2 8Z" fill="currentColor" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Closed — rating prompt */}
      {step === "closed" && (
        <div className="border-t border-white/10 px-4 py-4 space-y-3">
          <p
            className="text-xs text-white/50 text-center"
            style={{ fontFamily: "var(--font-plus-jakarta)" }}
          >
            How was your experience?
          </p>
          <StarRating onRate={handleRating} />
        </div>
      )}

      {/* Rated — thank you + new ticket */}
      {step === "rated" && (
        <div className="border-t border-white/10 px-4 py-4 space-y-3">
          <div className="flex items-center justify-center gap-1">
            {[1, 2, 3, 4, 5].map((s) => (
              <span
                key={s}
                className="text-lg"
                style={{ color: s <= (rating ?? 0) ? "#facc15" : "rgba(255,255,255,0.15)" }}
              >
                ★
              </span>
            ))}
          </div>
          <p
            className="text-xs text-white/50 text-center"
            style={{ fontFamily: "var(--font-plus-jakarta)" }}
          >
            Thanks for your feedback!
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleNewTicket}
              className={cn(
                "flex-1 rounded-lg border border-white/20 bg-white/5 py-2",
                "text-sm text-white hover:bg-white/10 transition-colors"
              )}
              style={{ fontFamily: "var(--font-plus-jakarta)" }}
            >
              New ticket
            </button>
            <button
              onClick={handleCloseChat}
              className={cn(
                "flex-1 rounded-lg border border-white/20 bg-white/5 py-2",
                "text-sm text-white/60 hover:bg-white/10 hover:text-white transition-colors"
              )}
              style={{ fontFamily: "var(--font-plus-jakarta)" }}
            >
              Close chat
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StarRating({ onRate }: { onRate: (stars: number) => void }) {
  const [hovered, setHovered] = useState(0);

  return (
    <div className="flex gap-1 justify-center">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          onClick={() => onRate(star)}
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          className="text-2xl transition-colors leading-none"
          style={{ color: star <= hovered ? "#facc15" : "rgba(255,255,255,0.2)" }}
          aria-label={`Rate ${star} star${star > 1 ? "s" : ""}`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

function MessageBubble({ message }: { message: LocalMessage }) {
  const isUser = message.sender === "user";
  const isSystem = message.sender === "system";

  if (isSystem) {
    return <SystemBubble text={message.content} />;
  }

  const isImageMsg = message.content.startsWith("[📎");
  // Parse: [📎 Image], [📎 Image: caption], [📎 N images], [📎 N images: caption]
  let imageCount = 1;
  let caption: string | null = null;
  if (isImageMsg) {
    const multi = message.content.match(/^\[📎 (\d+) images(?:: (.*))?\]$/);
    const single = message.content.match(/^\[📎 Image(?:: (.*))?\]$/);
    if (multi) {
      imageCount = parseInt(multi[1]);
      caption = multi[2]?.trim() || null;
    } else if (single) {
      caption = single[1]?.trim() || null;
    }
  }

  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <div className="shrink-0 size-6 rounded-full bg-white/10 flex items-center justify-center mr-2 mt-1">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <circle cx="6" cy="4" r="2" fill="white" opacity="0.7" />
            <path
              d="M2 10c0-2.2 1.8-4 4-4s4 1.8 4 4"
              stroke="white"
              strokeOpacity="0.7"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </div>
      )}
      <div
        className={cn(
          "max-w-[75%] rounded-2xl text-sm overflow-hidden",
          isUser
            ? "bg-white text-black rounded-tr-sm"
            : "bg-white/10 text-white rounded-tl-sm",
          isImageMsg ? "" : "px-3 py-2"
        )}
        style={{ fontFamily: "var(--font-plus-jakarta)" }}
      >
        {isImageMsg ? (
          <div>
            {message.localImageSrc ? (
              // Local blob preview — shown during this session only
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={message.localImageSrc}
                alt={caption ?? "image"}
                className="max-w-full max-h-48 object-cover"
              />
            ) : (
              // Placeholder shown after page reload / once server message arrives
              <div className={cn(
                "flex items-center gap-2 px-3 py-2",
                isUser ? "text-black/60" : "text-white/50"
              )}>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="shrink-0">
                  <rect x="1" y="3" width="14" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
                  <circle cx="5.5" cy="6.5" r="1" fill="currentColor" />
                  <path d="M1 10.5L5 7L8 10L11 7.5L15 11" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className="text-xs">
                  {imageCount > 1 ? `${imageCount} images` : "Image"}
                </span>
              </div>
            )}
            {caption && (
              <p className={cn("px-3 py-1.5 text-xs", isUser ? "text-black/80" : "text-white/80")}>
                {caption}
              </p>
            )}
          </div>
        ) : (
          message.content
        )}
      </div>
    </div>
  );
}

function SystemBubble({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2 my-0.5">
      <div className="h-px flex-1 bg-white/10" />
      <span
        className="text-xs text-white/40 text-center shrink-0 max-w-[75%]"
        style={{ fontFamily: "var(--font-plus-jakarta)" }}
      >
        {text}
      </span>
      <div className="h-px flex-1 bg-white/10" />
    </div>
  );
}
