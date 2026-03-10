"use client";

import { useState, useCallback } from "react";
import { authFetch } from "@/lib/auth/client";
import { useAuthSWR } from "@/lib/hooks/use-auth-swr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { UserPlus, X, Loader2, ShieldAlert } from "lucide-react";

interface AllowlistEntry {
  email: string;
  created_at: string;
}

export default function AdminSettingsPage() {
  const {
    data: allowlist,
    error,
    mutate: mutateAllowlist,
  } = useAuthSWR<AllowlistEntry[]>("admin-allowlist", async () => {
    const res = await authFetch("/api/admin/allowlist");
    if (res.status === 401) throw new Error("unauthorized");
    if (!res.ok) return [];
    return res.json();
  });

  const [newEmail, setNewEmail] = useState("");
  const [addingEmail, setAddingEmail] = useState(false);

  const handleAddEmail = useCallback(async () => {
    const email = newEmail.trim().toLowerCase();
    if (!email || !email.includes("@")) return;
    setAddingEmail(true);
    try {
      const res = await authFetch("/api/admin/allowlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        setNewEmail("");
        mutateAllowlist();
      }
    } finally {
      setAddingEmail(false);
    }
  }, [newEmail, mutateAllowlist]);

  const handleRemoveEmail = useCallback(
    async (email: string) => {
      const res = await authFetch("/api/admin/allowlist", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        mutateAllowlist();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to remove");
      }
    },
    [mutateAllowlist]
  );

  if (error?.message === "unauthorized") {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-3">
        <ShieldAlert className="w-10 h-10 text-[var(--text-tertiary)]" />
        <h1 className="text-lg font-semibold">Access Denied</h1>
        <p className="text-sm text-[var(--text-secondary)]">
          Your account is not authorized to access the admin dashboard.
        </p>
      </div>
    );
  }

  if (!allowlist) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">Settings</h1>
        <Skeleton className="h-32 w-full rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Settings</h1>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Admin Allowlist</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {allowlist.length > 0 && (
            <div className="space-y-1">
              {allowlist.map((entry) => (
                <div
                  key={entry.email}
                  className="flex items-center justify-between py-1.5 text-sm"
                >
                  <span>{entry.email}</span>
                  <button
                    onClick={() => handleRemoveEmail(entry.email)}
                    className="text-[var(--text-tertiary)] hover:text-red-500 transition-colors p-1"
                    title="Remove"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2">
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddEmail();
              }}
              placeholder="email@example.com"
              className="flex-1 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-md px-2 py-1.5 text-sm"
            />
            <Button
              size="sm"
              variant="outline"
              disabled={!newEmail.trim() || addingEmail}
              onClick={handleAddEmail}
            >
              {addingEmail ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <UserPlus className="w-3 h-3" />
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
