"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { usePathname } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { cn } from "@/lib/utils";
import { ChatBox } from "./ChatBox";

const EXCLUDED_PATHS = ["/login", "/signup"];
const EXCLUDED_PREFIXES = ["/onboarding"];

/** Distance (px) from the right edge at which reveal begins. */
const REVEAL_ZONE = 350;
/** Vertical radius (px) around the widget centre that affects sensitivity. */
const Y_RADIUS = 300;
/** Max reveal from proximity alone. Full reveal requires direct hover. */
const PASSIVE_MAX = 0.3;
const WIDGET_W = 48;
const WIDGET_H = 120;

export function SupportWidget() {
  const pathname = usePathname();
  const { user: privyUser } = usePrivy();
  const [isOpen, setIsOpen] = useState(false);
  const [topPx, setTopPx] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [revealPct, setRevealPct] = useState(0); // proximity-based, 0–PASSIVE_MAX
  const [isWidgetHovered, setIsWidgetHovered] = useState(false);
  const isWidgetHoveredRef = useRef(false);
  const [isRetreating, setIsRetreating] = useState(false);
  const retreatTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dragRef = useRef<{ startY: number; startTop: number } | null>(null);
  const didDragRef = useRef(false);
  const widgetRef = useRef<HTMLDivElement>(null);
  const topPxRef = useRef(topPx);
  topPxRef.current = topPx;

  // Initialise default Y position (only if not already set — preserves drag position across HMR)
  useEffect(() => {
    setTopPx((prev) => prev ?? Math.round(window.innerHeight * 0.4));
  }, []);

  // Upper barrier ~35 vh, lower at viewport - 200 (slightly higher to leave room for chat box)
  const clampTop = useCallback((val: number) => {
    const minTop = Math.round(window.innerHeight * 0.35);
    const maxTop = window.innerHeight - 200;
    return Math.max(minTop, Math.min(val, maxTop));
  }, []);

  // Mouse-proximity reveal with radial sensitivity (disabled when chat is open)
  useEffect(() => {
    if (isOpen) {
      setRevealPct(1);
      return;
    }

    // Touch-only devices — always show
    if (window.matchMedia("(hover: none)").matches) {
      setRevealPct(1);
      return;
    }

    function onMove(e: MouseEvent) {
      const distFromEdge = window.innerWidth - e.clientX;
      if (distFromEdge >= REVEAL_ZONE) {
        isWidgetHoveredRef.current = false; // cursor moved far away — clear stale hover
        setRevealPct(0);
        return;
      }

      // X proximity: 0 at REVEAL_ZONE, 1 at right edge
      const xPct = 1 - distFromEdge / REVEAL_ZONE;

      // Y proximity: strongest at widget centre, fades over Y_RADIUS
      const widgetCenterY = (topPxRef.current ?? window.innerHeight * 0.4) + WIDGET_H / 2;
      const yDist = Math.abs(e.clientY - widgetCenterY);
      const yFactor = Math.max(0, 1 - yDist / Y_RADIUS);

      // Blend: 8% minimum X contribution (slight peek even if cursor is
      // vertically far), 92% scaled by Y proximity. Squared xPct so the
      // reaction stays subtle until the cursor is very close to the edge.
      const yWeight = 0.08 + yFactor * 0.92;
      const target = Math.min(xPct * xPct * yWeight, PASSIVE_MAX);
      setRevealPct((prev) => prev + (target - prev) * 0.4);
    }

    function onLeave() {
      // If the widget was fully revealed (hovered), the cursor leaving the
      // browser is likely accidental — smoothly retreat to PASSIVE_MAX instead
      // of hiding completely.
      if (isWidgetHoveredRef.current) {
        setIsWidgetHovered(false);
        isWidgetHoveredRef.current = false;
        setRevealPct(PASSIVE_MAX);
        // Keep smooth transition active during the retreat animation
        setIsRetreating(true);
        if (retreatTimerRef.current) clearTimeout(retreatTimerRef.current);
        retreatTimerRef.current = setTimeout(() => setIsRetreating(false), 400);
      } else {
        setRevealPct(0);
      }
    }

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseleave", onLeave);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseleave", onLeave);
      if (retreatTimerRef.current) clearTimeout(retreatTimerRef.current);
    };
  }, [isOpen]);

  // Drag handlers (work whether chat is open or closed)
  // isDragging only becomes true after a 3px movement threshold — prevents
  // a simple click from switching to drag mode (cursor stays pointer).
  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.currentTarget.setPointerCapture(e.pointerId);
      didDragRef.current = false;
      dragRef.current = {
        startY: e.clientY,
        startTop: topPx ?? Math.round(window.innerHeight * 0.4),
      };
    },
    [topPx]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragRef.current) return;
      const delta = e.clientY - dragRef.current.startY;
      if (Math.abs(delta) > 3) {
        didDragRef.current = true;
        if (!isDragging) setIsDragging(true);
      }
      // Use the ref (sync) not isDragging state (async) to avoid stale closure lag
      if (didDragRef.current) {
        setTopPx(clampTop(dragRef.current.startTop + delta));
      }
    },
    [isDragging, clampTop]
  );

  const onPointerUp = useCallback(() => {
    setIsDragging(false);
    dragRef.current = null;
  }, []);

  // Safety net: document-level pointerup ensures drag mode exits even if
  // the element-level handler misses the event (e.g. pointer capture lost)
  useEffect(() => {
    if (!isDragging) return;
    function handleUp() {
      setIsDragging(false);
      dragRef.current = null;
    }
    document.addEventListener("pointerup", handleUp);
    document.addEventListener("pointercancel", handleUp);
    return () => {
      document.removeEventListener("pointerup", handleUp);
      document.removeEventListener("pointercancel", handleUp);
    };
  }, [isDragging]);

  // Excluded routes
  const excluded =
    EXCLUDED_PATHS.includes(pathname) ||
    EXCLUDED_PREFIXES.some((p) => pathname.startsWith(p));
  if (excluded) return null;

  const top = topPx ?? "40vh";

  // Final reveal: open → 1, hovering widget → 1, else proximity (max 0.4)
  const effectiveReveal = isOpen ? 1 : isWidgetHovered ? 1 : revealPct;
  const translateX = `${(1 - effectiveReveal) * 100}%`;

  // Chat box top — anchor bottom-area to the widget
  const chatTop =
    typeof top === "number" ? Math.max(10, top - 480 + 120) : undefined;

  return (
    <>
      {/* Chat box (to the left of the widget tab) */}
      {isOpen && (
        <div
          className="fixed z-[9999]"
          data-cursor="hide"
          style={{
            right: WIDGET_W + 8,
            top: chatTop,
            bottom: chatTop === undefined ? "10vh" : undefined,
          }}
        >
          <ChatBox onClose={() => setIsOpen(false)} userId={privyUser?.id ?? null} />
        </div>
      )}

      {/* Widget tab — pinned to right edge, slides via translateX */}
      <div
        ref={widgetRef}
        role="button"
        className={cn(
          "support-widget fixed right-0 z-[9999] flex select-none",
          isDragging ? "cursor-ns-resize" : "cursor-pointer"
        )}
        style={{
          top,
          transform: `translateX(${translateX})`,
          transition: isDragging
            ? "none"
            : (isWidgetHovered || isRetreating) && !isOpen
              ? "transform 0.35s cubic-bezier(0.4, 0, 0.2, 1), top 0.1s ease"
              : "transform 0.08s ease-out, top 0.1s ease",
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onMouseEnter={() => {
          if (!isOpen) {
            setIsWidgetHovered(true);
            isWidgetHoveredRef.current = true;
          }
        }}
        onMouseLeave={() => {
          setIsWidgetHovered(false);
          // Do NOT clear isWidgetHoveredRef here — the document mouseleave
          // handler needs it to know the cursor just left from a hovered state.
          // The ref is cleared by onMove (cursor moved away) or onLeave (cursor
          // left the browser) instead.
        }}
        onClick={() => {
          if (!didDragRef.current) setIsOpen((v) => !v);
        }}
      >
        <div
          className={cn(
            "relative flex flex-col items-center justify-center gap-2 rounded-l-xl",
            "border border-r-0 border-white/15 bg-[#0f0f0f]",
            "shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] overflow-hidden"
          )}
          style={{ width: WIDGET_W, height: WIDGET_H }}
        >
          <SpeechBubbleIcon />
          <span
            className="text-[10px] font-semibold text-white/70 tracking-wide"
            style={{
              writingMode: "vertical-rl",
              textOrientation: "mixed",
              transform: "rotate(180deg)",
              fontFamily: "var(--font-plus-jakarta)",
            }}
          >
            Live Support
          </span>

          {isOpen && (
            <span className="absolute top-2 right-2 size-1.5 rounded-full bg-green-400 animate-pulse" />
          )}
        </div>
      </div>
    </>
  );
}

function SpeechBubbleIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      className="shrink-0"
    >
      <path
        d="M3 3h14a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H7l-4 3V4a1 1 0 0 1 1-1Z"
        fill="white"
        fillOpacity="0.15"
        stroke="white"
        strokeOpacity="0.6"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx="7" cy="8.5" r="1" fill="white" fillOpacity="0.7" />
      <circle cx="10" cy="8.5" r="1" fill="white" fillOpacity="0.7" />
      <circle cx="13" cy="8.5" r="1" fill="white" fillOpacity="0.7" />
    </svg>
  );
}
