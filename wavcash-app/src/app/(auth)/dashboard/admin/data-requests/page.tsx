"use client";

import { useState, useCallback } from "react";
import { authFetch } from "@/lib/auth/client";
import { useAuthSWR } from "@/lib/hooks/use-auth-swr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChevronDown,
  ChevronUp,
  Mail,
  CheckCircle2,
  Clock,
  Inbox,
  Send,
  Loader2,
} from "lucide-react";

interface DataRequest {
  id: string;
  reference: string;
  sender_email: string;
  sender_name: string | null;
  request_type: string;
  status: string;
  received_at: string;
  completed_at: string | null;
  completion_summary: string | null;
  original_subject: string | null;
  original_body: string | null;
  resend_email_id: string | null;
  created_at: string;
}

const REQUEST_TYPES = [
  { value: "data_rights", label: "Data Rights" },
  { value: "access", label: "Data Access" },
  { value: "deletion", label: "Data Deletion" },
  { value: "correction", label: "Data Correction" },
  { value: "portability", label: "Data Portability" },
  { value: "opt-out", label: "Opt-Out" },
  { value: "object", label: "Right to Object" },
];

const STATUS_COLORS: Record<string, string> = {
  received: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  in_progress: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  completed: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
};

const STATUS_ICONS: Record<string, typeof Inbox> = {
  received: Inbox,
  in_progress: Clock,
  completed: CheckCircle2,
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function AdminDataRequestsPage() {
  const { data: requests, mutate } = useAuthSWR<DataRequest[]>(
    "admin-data-requests",
    async () => {
      const res = await authFetch("/api/admin/data-requests");
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    }
  );

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [completionText, setCompletionText] = useState("");
  const [sending, setSending] = useState(false);
  const [editingName, setEditingName] = useState<Record<string, string>>({});

  const updateRequest = useCallback(
    async (id: string, fields: Record<string, unknown>) => {
      await authFetch("/api/admin/data-requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...fields }),
      });
      mutate();
    },
    [mutate]
  );

  const handleComplete = useCallback(
    async (dr: DataRequest) => {
      if (!completionText.trim()) return;
      setSending(true);
      try {
        const res = await authFetch(
          `/api/admin/data-requests/${dr.id}/complete`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              completion_summary: completionText.trim(),
              sender_name: editingName[dr.id] ?? dr.sender_name,
            }),
          }
        );
        if (!res.ok) {
          const err = await res.json();
          alert(err.error || "Failed to send completion email");
          return;
        }
        setCompletionText("");
        setExpandedId(null);
        mutate();
      } finally {
        setSending(false);
      }
    },
    [completionText, editingName, mutate]
  );

  if (!requests) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">Data Requests</h1>
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  const counts = {
    received: requests.filter((r) => r.status === "received").length,
    in_progress: requests.filter((r) => r.status === "in_progress").length,
    completed: requests.filter((r) => r.status === "completed").length,
  };

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Data Requests</h1>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        {(
          [
            ["Received", counts.received, "received"],
            ["In Progress", counts.in_progress, "in_progress"],
            ["Completed", counts.completed, "completed"],
          ] as const
        ).map(([label, count, status]) => {
          const Icon = STATUS_ICONS[status];
          return (
            <Card key={status}>
              <CardContent className="py-3 flex items-center gap-3">
                <Icon className="w-4 h-4 text-[var(--text-tertiary)]" />
                <div>
                  <p className="text-lg font-semibold font-[family-name:var(--font-jetbrains)]">
                    {count}
                  </p>
                  <p className="text-xs text-[var(--text-tertiary)]">{label}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Requests list */}
      {requests.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Mail className="w-8 h-8 text-[var(--text-tertiary)] mx-auto mb-2" />
            <p className="text-sm text-[var(--text-secondary)]">
              No data requests yet
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {requests.map((dr) => {
            const isExpanded = expandedId === dr.id;
            return (
              <Card key={dr.id}>
                <CardContent className="py-3">
                  {/* Row header */}
                  <button
                    onClick={() => {
                      setExpandedId(isExpanded ? null : dr.id);
                      setCompletionText("");
                    }}
                    className="w-full flex items-center justify-between text-left"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xs font-mono text-[var(--color-amber)] font-semibold shrink-0">
                        {dr.reference}
                      </span>
                      <span className="text-sm truncate">
                        {dr.sender_name || dr.sender_email}
                      </span>
                      <Badge
                        className={`text-[10px] shrink-0 ${STATUS_COLORS[dr.status] || ""}`}
                      >
                        {dr.status.replace("_", " ")}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs text-[var(--text-tertiary)]">
                        {formatDate(dr.received_at)}
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-[var(--text-tertiary)]" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-[var(--text-tertiary)]" />
                      )}
                    </div>
                  </button>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="mt-4 space-y-4 border-t border-[var(--border-subtle)] pt-4">
                      {/* Email info */}
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-xs text-[var(--text-tertiary)] mb-1">
                            Email
                          </p>
                          <p>{dr.sender_email}</p>
                        </div>
                        <div>
                          <p className="text-xs text-[var(--text-tertiary)] mb-1">
                            Name
                          </p>
                          <input
                            type="text"
                            value={
                              editingName[dr.id] ?? dr.sender_name ?? ""
                            }
                            onChange={(e) =>
                              setEditingName((prev) => ({
                                ...prev,
                                [dr.id]: e.target.value,
                              }))
                            }
                            onBlur={() => {
                              const val = editingName[dr.id];
                              if (val !== undefined && val !== dr.sender_name) {
                                updateRequest(dr.id, { sender_name: val });
                              }
                            }}
                            className="w-full bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-md px-2 py-1 text-sm"
                            placeholder="Sender name"
                          />
                        </div>
                      </div>

                      {/* Request type selector */}
                      <div>
                        <p className="text-xs text-[var(--text-tertiary)] mb-1">
                          Request Type
                        </p>
                        <select
                          value={dr.request_type}
                          onChange={(e) =>
                            updateRequest(dr.id, {
                              request_type: e.target.value,
                            })
                          }
                          className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-md px-2 py-1.5 text-sm"
                        >
                          {REQUEST_TYPES.map((t) => (
                            <option key={t.value} value={t.value}>
                              {t.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Original email */}
                      {(dr.original_subject || dr.original_body) && (
                        <div>
                          <p className="text-xs text-[var(--text-tertiary)] mb-1">
                            Original Email
                          </p>
                          <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg p-3 text-sm space-y-1">
                            {dr.original_subject && (
                              <p className="font-medium">
                                {dr.original_subject}
                              </p>
                            )}
                            {dr.original_body && (
                              <p className="text-[var(--text-secondary)] whitespace-pre-wrap text-xs">
                                {dr.original_body}
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Completion summary (if already completed) */}
                      {dr.status === "completed" && dr.completion_summary && (
                        <div>
                          <p className="text-xs text-[var(--text-tertiary)] mb-1">
                            Completion Summary
                          </p>
                          <p className="text-sm text-[var(--text-secondary)]">
                            {dr.completion_summary}
                          </p>
                          {dr.completed_at && (
                            <p className="text-xs text-[var(--text-tertiary)] mt-1">
                              Completed {formatDate(dr.completed_at)}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Actions */}
                      {dr.status !== "completed" && (
                        <div className="space-y-3">
                          {dr.status === "received" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                updateRequest(dr.id, {
                                  status: "in_progress",
                                })
                              }
                            >
                              <Clock className="w-3 h-3 mr-1.5" />
                              Mark In Progress
                            </Button>
                          )}

                          <div>
                            <p className="text-xs text-[var(--text-tertiary)] mb-1">
                              Completion Summary
                            </p>
                            <textarea
                              value={completionText}
                              onChange={(e) =>
                                setCompletionText(e.target.value)
                              }
                              placeholder="Describe what was done (e.g. 'A copy of your data has been sent to your email.' or 'Your account data has been deleted.')"
                              className="w-full bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm min-h-[80px] resize-y"
                            />
                          </div>

                          <Button
                            size="sm"
                            disabled={
                              !completionText.trim() || sending
                            }
                            onClick={() => handleComplete(dr)}
                          >
                            {sending ? (
                              <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
                            ) : (
                              <Send className="w-3 h-3 mr-1.5" />
                            )}
                            Send Completion Email
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
