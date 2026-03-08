"use client";

import { useMemo, useState, useEffect } from "react";
import { useWizard } from "../wizard-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Link from "next/link";

export default function OwnershipSplits() {
  const { state, dispatch } = useWizard();
  const { contributors } = state;

  // Local state for master splits (keyed by contributor id)
  const [masterSplits, setMasterSplits] = useState<
    Record<
      string,
      {
        pct: number;
        publishing_type: "self" | "publisher";
        publisher_name?: string;
        publisher_pro?: string;
        publisher_acknowledged?: boolean;
      }
    >
  >(state.master.splits || {});

  // Composition splits
  const compSplits = state.compositionSplits;

  // Auto-seed self-published contributors with 100% writer / 0% publisher
  useEffect(() => {
    let changed = false;
    const next = { ...compSplits };
    for (const c of contributors) {
      if (!next[c.id]) {
        next[c.id] =
          c.publishing_type === "self"
            ? { writer_share_pct: 100, publisher_share_pct: 0 }
            : { writer_share_pct: 0, publisher_share_pct: 0 };
        changed = true;
      }
    }
    if (changed) {
      dispatch({ type: "UPDATE_COMPOSITION_SPLITS", splits: next });
    }
  }, [contributors]);

  const updateCompSplit = (
    id: string,
    field: "writer_share_pct" | "publisher_share_pct",
    value: number
  ) => {
    const current = compSplits[id] || { writer_share_pct: 0, publisher_share_pct: 0 };
    dispatch({
      type: "UPDATE_COMPOSITION_SPLITS",
      splits: { ...compSplits, [id]: { ...current, [field]: value } },
    });
  };

  // Master splits
  const updateMasterSplit = (id: string, updates: Partial<(typeof masterSplits)[string]>) => {
    const current = masterSplits[id] || {
      pct: 0,
      publishing_type: "self" as const,
    };
    const next = { ...masterSplits, [id]: { ...current, ...updates } };
    setMasterSplits(next);
    dispatch({
      type: "UPDATE_MASTER",
      master: { ...state.master, splits: next },
    });
  };

  const masterTotal = useMemo(() => {
    return Object.values(masterSplits).reduce(
      (acc, s) => acc + (s.pct || 0),
      0
    );
  }, [masterSplits]);

  if (contributors.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[360px] text-center">
        <p className="text-sm text-[var(--text-tertiary)]">
          Add contributors first before configuring splits.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-semibold font-[family-name:var(--font-general-sans)]">
          Ownership & Splits
        </h2>
        <p className="text-sm text-[var(--text-secondary)]">
          Define how composition and master recording ownership is divided.
        </p>
      </div>

      {/* Composition splits */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Composition Splits</CardTitle>
          <p className="text-xs text-[var(--text-tertiary)]">
            The composition is the underlying musical work (melody, harmony,
            lyrics). Each song is divided into Writer&apos;s Share and
            Publisher&apos;s Share. Self-published contributors have a
            Writer&apos;s Share of 100% by default.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {contributors.map((c) => {
            const isSelfPub = c.publishing_type === "self";
            const split = compSplits[c.id] || {
              writer_share_pct: isSelfPub ? 100 : 0,
              publisher_share_pct: 0,
            };
            const contribTotal = (split.writer_share_pct || 0) + (split.publisher_share_pct || 0);

            return (
              <div
                key={c.id}
                className="p-3 rounded-lg bg-[var(--bg-surface)] space-y-2"
              >
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {c.legal_name || "—"}
                    </p>
                    <p className="text-xs text-[var(--text-tertiary)]">
                      {c.role} ·{" "}
                      {isSelfPub ? "Self-Published" : c.publisher_name || "Publisher"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="space-y-0.5 text-center">
                      <Label className="text-[10px] text-[var(--text-tertiary)]">
                        Writer %
                      </Label>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        step={0.01}
                        value={split.writer_share_pct || ""}
                        disabled={isSelfPub}
                        onChange={(e) =>
                          updateCompSplit(
                            c.id,
                            "writer_share_pct",
                            parseFloat(e.target.value) || 0
                          )
                        }
                        className={`h-8 w-20 text-sm text-center font-[family-name:var(--font-jetbrains)] ${
                          isSelfPub ? "opacity-60 cursor-not-allowed" : ""
                        }`}
                      />
                    </div>
                    {!isSelfPub && (
                      <div className="space-y-0.5 text-center">
                        <Label className="text-[10px] text-[var(--text-tertiary)]">
                          Publisher %
                        </Label>
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          step={0.01}
                          value={split.publisher_share_pct || ""}
                          onChange={(e) =>
                            updateCompSplit(
                              c.id,
                              "publisher_share_pct",
                              parseFloat(e.target.value) || 0
                            )
                          }
                          className="h-8 w-20 text-sm text-center font-[family-name:var(--font-jetbrains)]"
                        />
                      </div>
                    )}
                  </div>
                </div>
                {/* Per-contributor total indicator (only for publisher contributors) */}
                {!isSelfPub && (
                  <div
                    className={`text-right text-[10px] font-medium font-[family-name:var(--font-jetbrains)] ${
                      Math.abs(contribTotal - 100) < 0.01
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-destructive"
                    }`}
                  >
                    Writer + Publisher: {contribTotal.toFixed(1)}%{" "}
                    {Math.abs(contribTotal - 100) < 0.01 ? "✓" : "(must equal 100%)"}
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Master recording */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Master Recording</CardTitle>
          <p className="text-xs text-[var(--text-tertiary)]">
            The master is the specific recorded performance. Ownership is
            separate from the composition.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Ownership Structure</Label>
            <Select
              value={state.master.ownership_type}
              onValueChange={(v) =>
                dispatch({
                  type: "UPDATE_MASTER",
                  master: {
                    ...state.master,
                    ownership_type: v as "joint" | "single" | "work_for_hire",
                    splits: masterSplits,
                  },
                })
              }
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="joint">Jointly owned by contributors</SelectItem>
                <SelectItem value="single">Wholly owned by one party</SelectItem>
                <SelectItem value="work_for_hire">Work-for-hire</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {state.master.ownership_type === "single" && (
            <div className="space-y-1.5">
              <Label className="text-xs">Owner Name</Label>
              <Input
                value={state.master.owner_name || ""}
                onChange={(e) =>
                  dispatch({
                    type: "UPDATE_MASTER",
                    master: {
                      ...state.master,
                      owner_name: e.target.value,
                      splits: masterSplits,
                    },
                  })
                }
                placeholder="Name of sole owner"
                className="h-9 text-sm"
              />
            </div>
          )}

          {state.master.ownership_type === "joint" && (
            <div className="space-y-3">
              {contributors.map((c) => {
                const ms = masterSplits[c.id] || {
                  pct: 0,
                  publishing_type: "self" as const,
                };
                const hasPublisher = ms.publishing_type === "publisher";
                // Determine if this is the creator (first contributor added)
                const isCreator = contributors.indexOf(c) === 0;

                return (
                  <div
                    key={c.id}
                    className="p-3 rounded-lg bg-[var(--bg-surface)] space-y-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {c.legal_name || "—"}
                        </p>
                        <p className="text-xs text-[var(--text-tertiary)]">
                          {c.role}
                        </p>
                      </div>
                      <div className="space-y-0.5 text-center">
                        <Label className="text-[10px] text-[var(--text-tertiary)]">
                          Master %
                        </Label>
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          step={0.01}
                          value={ms.pct || ""}
                          onChange={(e) =>
                            updateMasterSplit(c.id, {
                              pct: parseFloat(e.target.value) || 0,
                            })
                          }
                          className="h-8 w-20 text-sm text-center font-[family-name:var(--font-jetbrains)]"
                        />
                      </div>
                    </div>

                    {/* Publishing toggle for master */}
                    <div className="flex gap-2">
                      <button
                        onClick={() =>
                          updateMasterSplit(c.id, {
                            publishing_type: "self",
                            publisher_name: undefined,
                            publisher_pro: undefined,
                          })
                        }
                        className={`flex-1 py-1.5 px-2 rounded text-xs font-medium transition-all border ${
                          !hasPublisher
                            ? "bg-[var(--color-amber)]/10 border-[var(--color-amber)]/30 text-[var(--color-amber)]"
                            : "bg-transparent border-[var(--border-subtle)] text-[var(--text-tertiary)]"
                        }`}
                      >
                        Self-Published
                      </button>
                      <button
                        onClick={() =>
                          updateMasterSplit(c.id, { publishing_type: "publisher" })
                        }
                        className={`flex-1 py-1.5 px-2 rounded text-xs font-medium transition-all border ${
                          hasPublisher
                            ? "bg-[var(--color-amber)]/10 border-[var(--color-amber)]/30 text-[var(--color-amber)]"
                            : "bg-transparent border-[var(--border-subtle)] text-[var(--text-tertiary)]"
                        }`}
                      >
                        Has Publisher
                      </button>
                    </div>

                    {hasPublisher && (
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <Input
                            value={ms.publisher_name || ""}
                            onChange={(e) =>
                              updateMasterSplit(c.id, {
                                publisher_name: e.target.value,
                              })
                            }
                            placeholder="Publisher name"
                            className="h-8 text-xs"
                          />
                          <Input
                            value={ms.publisher_pro || ""}
                            onChange={(e) =>
                              updateMasterSplit(c.id, {
                                publisher_pro: e.target.value,
                              })
                            }
                            placeholder="Publisher PRO"
                            className="h-8 text-xs"
                          />
                        </div>

                        {/* Legal responsibility — creator only */}
                        {isCreator && (
                          <div className="rounded-lg bg-[var(--card)] border border-[var(--border-subtle)] p-3 space-y-2">
                            {/* Reclaim upsell */}
                            <p className="text-xs text-[var(--color-amber)]">
                              Save up to 10% in commission by self-publishing
                              through{" "}
                              <Link
                                href="/dashboard/reclaim"
                                className="text-[var(--color-amber)] underline font-medium dark:hover:text-white transition-colors"
                              >
                                Reclaim
                              </Link>
                              .
                            </p>
                            <p className="text-xs text-[var(--text-primary)]">
                              It is your legal responsibility to ensure your
                              publisher pays to your WavCash account in order to
                              enable automatic redistribution to contributors.
                            </p>
                            <label className="flex items-start gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={ms.publisher_acknowledged || false}
                                onChange={(e) =>
                                  updateMasterSplit(c.id, {
                                    publisher_acknowledged: e.target.checked,
                                  })
                                }
                                className="mt-0.5 accent-[var(--color-amber)]"
                              />
                              <span className="text-xs font-medium">
                                I understand
                              </span>
                            </label>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              <div
                className={`text-right text-xs font-medium font-[family-name:var(--font-jetbrains)] ${
                  Math.abs(masterTotal - 100) < 0.01
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-destructive"
                }`}
              >
                Total: {masterTotal.toFixed(2)}%{" "}
                {Math.abs(masterTotal - 100) < 0.01 ? "✓" : "(must equal 100%)"}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
