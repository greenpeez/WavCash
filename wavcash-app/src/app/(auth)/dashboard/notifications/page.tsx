"use client";

import { usePrivy } from "@privy-io/react-auth";
import { authFetch } from "@/lib/auth/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, CheckCheck } from "lucide-react";
import Link from "next/link";
import type { Notification } from "@/lib/types/database";
import { useAuthSWR } from "@/lib/hooks/use-auth-swr";
import { useSWRConfig } from "swr";

function groupByDate(items: Notification[]): Record<string, Notification[]> {
  const groups: Record<string, Notification[]> = {};
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const weekAgo = new Date(today.getTime() - 7 * 86400000);

  for (const n of items) {
    const date = new Date(n.created_at);
    let label: string;
    if (date >= today) {
      label = "Today";
    } else if (date >= yesterday) {
      label = "Yesterday";
    } else if (date >= weekAgo) {
      label = "This Week";
    } else {
      label = "Older";
    }
    if (!groups[label]) groups[label] = [];
    groups[label].push(n);
  }
  return groups;
}

export default function NotificationsPage() {
  const { user: privyUser, ready } = usePrivy();
  const { mutate: globalMutate } = useSWRConfig();

  const { data: notifications = [], isLoading, mutate } = useAuthSWR<Notification[]>(
    privyUser ? `notifications:${privyUser.id}` : null,
    async () => {
      const res = await authFetch("/api/notifications?limit=100");
      if (res.ok) return res.json();
      return [];
    }
  );

  // Sync the header badge counter after any read-state change
  function syncUnreadBadge(delta: number) {
    const unreadKey = privyUser ? `unread:${privyUser.id}` : null;
    if (!unreadKey) return;
    globalMutate(
      unreadKey,
      (prev: { unread: number } | undefined) => ({
        unread: Math.max(0, (prev?.unread || 0) + delta),
      }),
      false
    );
  }

  async function markAllRead() {
    const unreadIds = notifications.filter((n) => !n.read).length;
    try {
      await authFetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
      mutate(notifications.map((n) => ({ ...n, read: true })), false);
      syncUnreadBadge(-unreadIds);
    } catch {}
  }

  function markOneRead(id: string) {
    // Optimistic update on the notifications list
    mutate(
      notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
      false
    );
    // Decrement the header badge counter
    syncUnreadBadge(-1);
    // Fire-and-forget API call
    authFetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [id] }),
    }).catch(() => {});
  }

  if (!ready || isLoading) {
    return (
      <div className="space-y-4 max-w-2xl">
        <div className="h-8 w-48 bg-[var(--bg-surface)] rounded animate-pulse" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 bg-[var(--bg-surface)] rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  const unreadCount = notifications.filter((n) => !n.read).length;
  const grouped = groupByDate(notifications);
  const groupOrder = ["Today", "Yesterday", "This Week", "Older"];

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Notifications</h1>
          <p className="text-sm text-[var(--text-tertiary)] mt-1">
            {unreadCount > 0
              ? `${unreadCount} unread notification${unreadCount !== 1 ? "s" : ""}`
              : "All caught up"}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={markAllRead}>
            <CheckCheck className="w-3.5 h-3.5 mr-1.5" />
            Mark all as read
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Bell className="w-10 h-10 text-[var(--text-tertiary)] mb-3" />
            <p className="text-sm text-[var(--text-secondary)] text-center">
              No notifications yet. You&apos;ll see activity here when agreements are signed or payouts are distributed.
            </p>
          </CardContent>
        </Card>
      ) : (
        groupOrder.map((label) => {
          const items = grouped[label];
          if (!items || items.length === 0) return null;
          return (
            <div key={label}>
              <p className="text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider mb-2">
                {label}
              </p>
              <div className="space-y-6">
                {items.map((n) => (
                  <Link
                    key={n.id}
                    className="block"
                    href={
                      n.metadata?.split_id
                        ? `/dashboard/splits/${n.metadata.split_id}`
                        : "#"
                    }
                    onClick={() => {
                      if (!n.read) markOneRead(n.id);
                    }}
                  >
                    <Card
                      className={`hover:border-[var(--color-amber)]/30 transition-colors cursor-pointer ${
                        !n.read ? "border-l-2 border-l-[var(--accent)]" : ""
                      }`}
                    >
                      <CardContent className="py-3">
                        <div className="flex items-center justify-between">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">{n.title}</p>
                            <p className="text-xs text-[var(--text-tertiary)] truncate">
                              {n.body}
                            </p>
                          </div>
                          <span className="text-[10px] text-[var(--text-tertiary)] shrink-0 ml-4">
                            {new Date(n.created_at).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
