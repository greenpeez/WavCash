"use client";

import { Suspense, useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { useEnsureEmbeddedWallet } from "@/lib/hooks/use-ensure-embedded-wallet";
import {
  Bell,
  Settings,
  Sun,
  Moon,
} from "lucide-react";
import {
  AniBarChart,
  AniMusic,
  AniFileSpreadsheet,
  AniSplit,
  AniLockOpen,
  AniSettings,
  AniLogOut,
} from "@/components/dashboard/animated-icons";
import { useTheme } from "next-themes";
import { authFetch } from "@/lib/auth/client";
import type { User, Notification } from "@/lib/types/database";
import { useAuthSWR } from "@/lib/hooks/use-auth-swr";
import dynamic from "next/dynamic";
import Walkthrough from "@/components/dashboard/walkthrough";

const MercuryCanvas = dynamic(
  () => import("@/components/dashboard/mercury-canvas"),
  { ssr: false }
);

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: AniBarChart },
  { href: "/dashboard/tracks", label: "Tracks", icon: AniMusic },
  { href: "/dashboard/actuals", label: "Actuals", icon: AniFileSpreadsheet },
  { href: "/dashboard/splits", label: "Splits", icon: AniSplit },
  { href: "/dashboard/reclaim", label: "Reclaim", icon: AniLockOpen },
  { href: "/dashboard/settings", label: "Settings", icon: AniSettings },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense>
      <DashboardLayoutInner>{children}</DashboardLayoutInner>
    </Suspense>
  );
}

function DashboardLayoutInner({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { ready, authenticated, logout, user: privyUser } = usePrivy();
  const { walletAddress, walletCreated } = useEnsureEmbeddedWallet();
  const signTokenHandled = useRef(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [bellOpen, setBellOpen] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);
  const [greeting] = useState(() => ["Hello", "Hi", "Hey"][Math.floor(Math.random() * 3)]);
  const [showWalkthrough, setShowWalkthrough] = useState(false);
  const walkthroughDismissed = useRef(false);

  useEffect(() => { setMounted(true); }, []);

  // User profile via SWR — key is user-scoped to prevent stale data across accounts
  const { data: user = null } = useAuthSWR<User | null>(
    privyUser ? `user:${privyUser.id}` : null,
    async () => {
      try {
        const res = await authFetch("/api/user");
        if (res.ok) {
          const data = await res.json();
          if (data) {
            if (!data.onboarding_complete) {
              router.replace("/onboarding");
              return null;
            }
            return data as User;
          }
        } else if (res.status === 404) {
          router.replace("/onboarding");
          return null;
        } else {
          // Non-OK, non-404 (e.g. 401) — redirect to login, preserving sign_token
          const st = searchParams.get("sign_token");
          router.replace(st ? `/login?sign_token=${st}` : "/login");
        }
      } catch {}
      return null;
    }
  );

  // Notification count via SWR with 30s polling — user-scoped key
  const { data: unreadData, mutate: mutateUnread } = useAuthSWR<{ unread: number }>(
    privyUser ? `unread:${privyUser.id}` : null,
    async () => {
      try {
        const res = await authFetch("/api/notifications/count");
        if (res.ok) return res.json();
      } catch {}
      return { unread: 0 };
    },
    { refreshInterval: 30_000 }
  );
  const unreadCount = unreadData?.unread || 0;

  // Show walkthrough for first-time users — DB is the single source of truth.
  // The ref prevents re-showing if SWR re-fetches before the API call completes.
  useEffect(() => {
    if (!user || !privyUser) return;
    if (walkthroughDismissed.current) return;
    if (user.walkthrough_complete) return;
    setShowWalkthrough(true);
  }, [user, privyUser]);

  // B5: Handle sign_token — link user to agreement and redirect to split detail
  useEffect(() => {
    if (!ready || !authenticated || signTokenHandled.current) return;
    const signToken = searchParams.get("sign_token");
    if (!signToken) return;
    signTokenHandled.current = true;

    async function linkAndRedirect() {
      try {
        const res = await authFetch(`/api/sign/${signToken}/link`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ wallet_address: walletAddress }),
        });
        if (res.ok) {
          const data = await res.json();
          router.replace(`/dashboard/splits/${data.split_id}`);
          return;
        }
        // Wrong account — send to login so the correct user can authenticate
        if (res.status === 403) {
          router.replace(`/login?sign_token=${signToken}`);
          return;
        }
      } catch {
        // Non-critical — just redirect to splits list
      }
      router.replace("/dashboard/splits");
    }
    linkAndRedirect();
  }, [ready, authenticated, searchParams, walletAddress, router]);

  // Load recent notifications when bell opens
  useEffect(() => {
    if (!bellOpen) return;
    async function loadRecent() {
      try {
        const res = await authFetch("/api/notifications?limit=5");
        if (res.ok) {
          setNotifications(await res.json());
        }
      } catch {}
    }
    loadRecent();
  }, [bellOpen]);

  // Close bell dropdown on outside click
  useEffect(() => {
    if (!bellOpen) return;
    function handleClick(e: MouseEvent) {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setBellOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [bellOpen]);

  async function markAllRead() {
    try {
      await authFetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
      mutateUnread({ unread: 0 }, false);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch {}
  }

  function markOneRead(id: string) {
    // Optimistic updates
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    mutateUnread(
      (prev) => ({ unread: Math.max(0, (prev?.unread || 0) - 1) }),
      false
    );
    // Fire-and-forget API call
    authFetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [id] }),
    }).catch(() => {});
  }

  async function handleLogout() {
    // Clear all SWR cached data to prevent leaking between sessions
    const { mutate: globalMutate } = await import("swr");
    globalMutate(() => true, undefined, { revalidate: false });
    await logout();
    window.location.href = "/login";
  }

  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  return (
    <div className="dashboard-shell min-h-screen relative">
      {/* Mercury surface background */}
      <MercuryCanvas />

      {/* Fixed header */}
      <header className="dash-header">
        <Link href="/dashboard" className="dash-header-logo">
          <svg
            width="26"
            height="22"
            viewBox="0 0 26 22"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="text-current"
          >
            <line x1="5.5" y1="6" x2="5.5" y2="16" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.3" />
            <line x1="9" y1="4" x2="9" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
            <line x1="13" y1="2" x2="13" y2="20" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            <line x1="17" y1="4" x2="17" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
            <line x1="20.5" y1="6" x2="20.5" y2="16" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.3" />
          </svg>
          WavCash
        </Link>
        <div className="dash-header-right">
          {/* Notifications bell */}
          <div className="relative dash-header-hit" ref={bellRef}>
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
              <div data-cursor="collapse" className="absolute right-0 top-10 w-80 bg-[var(--popover)] border border-[var(--border-subtle)] rounded-xl shadow-lg z-50 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-subtle)]">
                  <span className="text-sm font-semibold">Notifications</span>
                  {unreadCount > 0 && (
                    <button
                      className="text-xs text-[var(--accent)] hover:underline"
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
                      <Link
                        key={n.id}
                        href={
                          n.metadata?.split_id
                            ? `/dashboard/splits/${n.metadata.split_id}`
                            : "/dashboard/notifications"
                        }
                        onClick={() => {
                          if (!n.read) markOneRead(n.id);
                          setBellOpen(false);
                        }}
                        className={`block px-4 py-3 hover:bg-[var(--bg-surface)] transition-colors border-l-2 ${
                          n.read
                            ? "border-transparent"
                            : "border-[var(--accent)]"
                        }`}
                      >
                        <p className="text-sm font-medium truncate">{n.title}</p>
                        <p className="text-xs text-[var(--text-tertiary)] truncate">
                          {n.body}
                        </p>
                        <p className="text-[10px] text-[var(--text-tertiary)] mt-1">
                          {new Date(n.created_at).toLocaleString()}
                        </p>
                      </Link>
                    ))
                  )}
                </div>
                <Link
                  href="/dashboard/notifications"
                  onClick={() => setBellOpen(false)}
                  data-cursor="hide"
                  className="block text-center text-xs text-[var(--accent)] py-2.5 border-t border-[var(--border-subtle)] hover:bg-[var(--bg-surface)] transition-colors"
                >
                  View All
                </Link>
              </div>
            )}
          </div>
          <div className="dash-header-hit">
            <button
              className="dash-header-theme-btn"
              onClick={() => { const next = theme === "dark" ? "light" : "dark"; setTheme(next); try { localStorage.setItem("wavcash-theme", next); } catch {} }}
              aria-label="Toggle theme"
            >
              {mounted ? (theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />) : <Sun className="h-4 w-4" />}
            </button>
          </div>
          <div className="dash-header-hit">
            <Link href="/dashboard/settings" className="dash-header-theme-btn" aria-label="Settings">
              <Settings className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Dynamic greeting label */}
      <span className="dash-sidebar-toggle">
        {user ? (user.display_name ? `${greeting}, ${user.display_name.split(" ")[0]}` : greeting) : ""}
      </span>

      {/* Overlay */}
      <div
        className={`dash-sidebar-overlay ${sidebarOpen ? "open" : ""}`}
        onClick={closeSidebar}
      />

      {/* Collapsible sidebar */}
      <aside className={`dash-sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="flex flex-col h-full">
          {/* User info */}
          {user && (
            <div className="pl-10 pr-4 py-4 border-b border-[var(--border-subtle)]">
              <span className="text-[10px] font-[family-name:var(--font-jetbrains)] text-[var(--accent)]">
                {user.wavcash_id}
              </span>
            </div>
          )}

          {/* Nav items */}
          <nav className="flex-1 px-3 py-4">
            {NAV_ITEMS.map((item) => {
              const isActive =
                item.href === "/dashboard"
                  ? pathname === "/dashboard"
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={closeSidebar}
                  className={`dash-nav-link flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm ${
                    isActive
                      ? "bg-[var(--accent)]/10 text-[var(--accent)] font-medium"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)]"
                  }`}
                >
                  <item.icon className={`h-4 w-4 ${isActive ? "" : "text-[var(--accent)]"}`} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Bottom actions */}
          <div className="px-3 py-4 border-t border-[var(--border-subtle)] space-y-1">
            <button
              onClick={handleLogout}
              className="dash-nav-link flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-[var(--text-secondary)] hover:text-destructive hover:bg-[var(--bg-surface)] w-full outline-none"
            >
              <AniLogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className={`dash-main ${sidebarOpen ? "sidebar-open" : ""}`}>
        <div className="dash-content">
          {children}
        </div>
      </main>

      {/* Walkthrough wizard for first-time users */}
      {showWalkthrough && privyUser && (
        <Walkthrough
          walletCreated={walletCreated}
          userId={privyUser.id}
          onComplete={() => { walkthroughDismissed.current = true; setShowWalkthrough(false); }}
        />
      )}
    </div>
  );
}
