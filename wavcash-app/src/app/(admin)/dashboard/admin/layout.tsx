"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { Sun, Moon, LogOut, Bell } from "lucide-react";
import { useTheme } from "next-themes";
import { authFetch } from "@/lib/auth/client";
import { useAuthSWR } from "@/lib/hooks/use-auth-swr";

interface AdminNotification {
  id: string;
  admin_email: string;
  title: string;
  body: string;
  read: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { ready, authenticated, user: privyUser, logout } = usePrivy();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Notifications
  const [bellOpen, setBellOpen] = useState(false);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const bellRef = useRef<HTMLDivElement>(null);

  const { data: unreadData, mutate: mutateUnread } = useAuthSWR<{ unread: number }>(
    privyUser ? `admin-unread:${privyUser.id}` : null,
    async () => {
      const res = await authFetch("/api/admin/notifications/count");
      if (res.ok) return res.json();
      return { unread: 0 };
    },
    { refreshInterval: 15_000 }
  );
  const unreadCount = unreadData?.unread || 0;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (ready && !authenticated) {
      router.replace("/login?redirect=/dashboard/admin/data-requests");
    }
  }, [ready, authenticated, router]);

  // Load recent notifications when bell opens
  useEffect(() => {
    if (!bellOpen) return;
    async function loadRecent() {
      const res = await authFetch("/api/admin/notifications?limit=5");
      if (res.ok) setNotifications(await res.json());
    }
    loadRecent();
  }, [bellOpen]);

  // Close bell on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setBellOpen(false);
      }
    }
    if (bellOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [bellOpen]);

  const markOneRead = useCallback((id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    mutateUnread((prev) => ({ unread: Math.max(0, (prev?.unread || 0) - 1) }), false);
    authFetch("/api/admin/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [id] }),
    }).catch(() => {});
  }, [mutateUnread]);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    mutateUnread({ unread: 0 }, false);
    authFetch("/api/admin/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    }).catch(() => {});
  }, [mutateUnread]);

  if (!ready || !authenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[var(--color-amber)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="admin-shell min-h-screen bg-background">
      <header className="sticky top-0 z-50 flex items-center justify-between h-[64px] px-10 bg-[var(--bg-surface)] border-b border-[var(--border-subtle)] backdrop-blur-xl">
        <div className="flex items-center gap-2.5" style={{ fontFamily: "var(--font-general-sans), 'General Sans', sans-serif" }}>
          <svg
            width="24"
            height="20"
            viewBox="0 0 26 22"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <line x1="5.5" y1="6" x2="5.5" y2="16" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.3" />
            <line x1="9" y1="4" x2="9" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
            <line x1="13" y1="2" x2="13" y2="20" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            <line x1="17" y1="4" x2="17" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
            <line x1="20.5" y1="6" x2="20.5" y2="16" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.3" />
          </svg>
          <span className="text-lg font-bold tracking-tight text-[var(--text-primary)]">WavCash</span>
          <span className="text-[11px] text-[var(--color-amber)] bg-[rgba(212,136,58,0.1)] px-2 py-0.5 rounded font-medium">
            Admin
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Notifications bell */}
          <div className="relative" ref={bellRef}>
            <button
              className="dash-header-theme-btn relative"
              onClick={() => setBellOpen((o) => !o)}
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>
            {bellOpen && (
              <div className="absolute right-0 top-10 w-80 bg-[var(--popover)] border border-[var(--border-subtle)] rounded-xl shadow-lg z-50 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-subtle)]">
                  <span className="text-sm font-semibold">Notifications</span>
                  {unreadCount > 0 && (
                    <button
                      className="text-xs text-[var(--color-amber)] hover:underline"
                      onClick={markAllRead}
                    >
                      Mark all read
                    </button>
                  )}
                </div>
                <div className="max-h-72 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <p className="text-center text-xs text-[var(--text-tertiary)] py-8">
                      No notifications yet
                    </p>
                  ) : (
                    notifications.map((n) => (
                      <button
                        key={n.id}
                        onClick={() => {
                          if (!n.read) markOneRead(n.id);
                          setBellOpen(false);
                        }}
                        className={`block w-full text-left px-4 py-3 hover:bg-[var(--bg-surface)] transition-colors border-l-2 ${
                          n.read ? "border-transparent" : "border-[var(--color-amber)]"
                        }`}
                      >
                        <p className="text-sm font-medium truncate">{n.title}</p>
                        <p className="text-xs text-[var(--text-tertiary)] truncate">{n.body}</p>
                        <p className="text-[10px] text-[var(--text-tertiary)] mt-1">
                          {new Date(n.created_at).toLocaleString()}
                        </p>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
          <button
            className="dash-header-theme-btn"
            onClick={() => { const next = theme === "dark" ? "light" : "dark"; setTheme(next); try { localStorage.setItem("wavcash-theme", next); } catch {} }}
            aria-label="Toggle theme"
          >
            {mounted ? (
              theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />
            ) : (
              <Sun className="h-4 w-4" />
            )}
          </button>
          <button
            className="dash-header-theme-btn"
            onClick={async () => {
              await logout();
              window.location.href = "/login";
            }}
            aria-label="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-10 py-8">
        {children}
      </main>
    </div>
  );
}
