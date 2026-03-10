"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { Sun, Moon, LogOut } from "lucide-react";
import { useTheme } from "next-themes";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { ready, authenticated, logout } = usePrivy();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (ready && !authenticated) {
      router.replace("/login");
    }
  }, [ready, authenticated, router]);

  if (!ready || !authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[var(--color-amber)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <header className="border-b border-[var(--border-subtle)] px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <svg
            width="22"
            height="18"
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
          <span className="font-semibold text-sm">WavCash</span>
          <span className="text-xs text-[var(--text-tertiary)] bg-[var(--bg-surface)] px-2 py-0.5 rounded">
            Admin
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="p-2 rounded-lg hover:bg-[var(--bg-surface)] transition-colors"
            aria-label="Toggle theme"
          >
            {mounted ? (
              theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />
            ) : (
              <Sun className="h-4 w-4" />
            )}
          </button>
          <button
            onClick={async () => {
              await logout();
              window.location.href = "/login";
            }}
            className="p-2 rounded-lg hover:bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-red-500 transition-colors"
            aria-label="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-6 py-8">
        {children}
      </main>
    </div>
  );
}
