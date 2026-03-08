"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2 } from "lucide-react";
import Link from "next/link";
import { authFetch } from "@/lib/auth/client";
import type { WizardContributor } from "@/lib/types/contract";

const PROS = [
  "ASCAP",
  "BMI",
  "SESAC",
  "PRS",
  "SOCAN",
  "GEMA",
  "SACEM",
  "APRA AMCOS",
  "JASRAC",
  "Other",
  "None",
];

interface ContributorCardProps {
  contributor: WizardContributor;
  onChange: (updates: Partial<WizardContributor>) => void;
  onRemove: () => void;
  /** Whether this card represents the contract creator's own entry */
  isCreator?: boolean;
  /** Whether to lock the role field (pre-set for songwriters/producers) */
  rolePreset?: string;
  /** Available roles for the selector */
  roles?: string[];
}

export default function ContributorCard({
  contributor,
  onChange,
  onRemove,
  isCreator = false,
  rolePreset,
  roles,
}: ContributorCardProps) {
  const hasPublisher = contributor.publishing_type === "publisher";

  // ── Legal name format validation (2-3 words) ──────────────────────────────
  const nameWords = contributor.legal_name.trim().split(/\s+/).filter(Boolean);
  const nameFormatError =
    contributor.legal_name.trim().length > 0 &&
    (nameWords.length < 2 || nameWords.length > 3)
      ? nameWords.length < 2
        ? "Please enter first and last name"
        : "Maximum 3 names allowed"
      : null;

  // ── Debounced email lookup for legal name mismatch ────────────────────────
  const [nameMismatch, setNameMismatch] = useState<string | null>(null);
  const [registeredName, setRegisteredName] = useState<string | null>(null);
  const registeredNameRef = useRef<string | null>(null);

  // Fetch registered legal name when email changes (debounced 500ms)
  useEffect(() => {
    const email = contributor.email.trim().toLowerCase();
    if (!email.includes("@")) {
      registeredNameRef.current = null;
      setRegisteredName(null);
      setNameMismatch(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await authFetch(
          `/api/user/lookup-by-email?email=${encodeURIComponent(email)}`
        );
        if (res.ok) {
          const data = await res.json();
          const name = data.legal_name || null;
          registeredNameRef.current = name;
          setRegisteredName(name);
          // Check mismatch against current legal_name
          if (
            name &&
            contributor.legal_name.trim() &&
            name.trim().toLowerCase() !==
              contributor.legal_name.trim().toLowerCase()
          ) {
            setNameMismatch(name);
          } else {
            setNameMismatch(null);
          }
        }
      } catch (err) {
        console.error("Email lookup failed:", err);
        registeredNameRef.current = null;
        setRegisteredName(null);
        setNameMismatch(null);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [contributor.email]); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-check mismatch when legal_name changes (no re-fetch needed)
  useEffect(() => {
    const registered = registeredNameRef.current;
    if (!registered || !contributor.legal_name.trim()) {
      setNameMismatch(null);
      return;
    }
    if (
      registered.trim().toLowerCase() !==
      contributor.legal_name.trim().toLowerCase()
    ) {
      setNameMismatch(registered);
    } else {
      setNameMismatch(null);
    }
  }, [contributor.legal_name]);

  return (
    <Card className="border-[var(--border-subtle)]">
      <CardContent className="pt-4 space-y-4">
        {/* Header with remove button */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-[var(--text-secondary)]">
            {contributor.legal_name || "New Contributor"}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-[var(--text-tertiary)] hover:text-destructive"
            onClick={onRemove}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>

        {/* Required fields */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Legal Name *</Label>
            <Input
              value={contributor.legal_name}
              onChange={(e) => onChange({ legal_name: e.target.value })}
              placeholder="Full legal name"
              className="h-9 text-sm"
            />
            {nameFormatError && (
              <p className="text-xs text-red-500">{nameFormatError}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Email *</Label>
            <Input
              type="email"
              value={contributor.email}
              onChange={(e) => onChange({ email: e.target.value })}
              placeholder="email@example.com"
              className="h-9 text-sm"
            />
          </div>
          {nameMismatch && (
            <p className="col-span-2 text-xs text-red-500" style={{ marginTop: -4 }}>
              Input does not match the legal name registered to this email.
              Please double-check with your contributors.
            </p>
          )}
          {!nameMismatch && registeredName && !contributor.legal_name.trim() && (
            <p className="col-span-2 text-xs text-[var(--color-amber)]" style={{ marginTop: -4 }}>
              This email is registered to {registeredName}.
            </p>
          )}
          <div className="space-y-1.5">
            <Label className="text-xs">Role *</Label>
            {rolePreset ? (
              <Input
                value={rolePreset}
                readOnly
                className="h-9 text-sm bg-[var(--bg-surface)]"
              />
            ) : (
              <Select
                value={contributor.role}
                onValueChange={(v) => onChange({ role: v })}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {(roles || []).map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Share % *</Label>
            <Input
              type="number"
              min={0}
              max={100}
              step={0.01}
              value={contributor.percentage || ""}
              onChange={(e) =>
                onChange({ percentage: parseFloat(e.target.value) || 0 })
              }
              placeholder="0"
              className="h-9 text-sm font-[family-name:var(--font-jetbrains)]"
            />
          </div>
        </div>

        {/* Optional: Stage name */}
        <div className="space-y-1.5">
          <Label className="text-xs">
            Stage / Artist Name{" "}
            <span className="text-[var(--text-tertiary)]">(optional)</span>
          </Label>
          <Input
            value={contributor.stage_name || ""}
            onChange={(e) => onChange({ stage_name: e.target.value })}
            placeholder="If different from legal name"
            className="h-9 text-sm"
          />
        </div>

        {/* Recommended fields */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1.5">
              PRO Affiliation
              <Badge
                variant="outline"
                className="text-[9px] px-1.5 py-0 text-[var(--color-amber)] border-[var(--color-amber)]/30"
              >
                Recommended
              </Badge>
            </Label>
            <Select
              value={contributor.pro_affiliation || ""}
              onValueChange={(v) => onChange({ pro_affiliation: v })}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Select PRO" />
              </SelectTrigger>
              <SelectContent>
                {PROS.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1.5">
              IPI / CAE Number
              <Badge
                variant="outline"
                className="text-[9px] px-1.5 py-0 text-[var(--color-amber)] border-[var(--color-amber)]/30"
              >
                Recommended
              </Badge>
            </Label>
            <Input
              value={contributor.ipi_number || ""}
              onChange={(e) => onChange({ ipi_number: e.target.value })}
              placeholder="e.g. 00123456789"
              className="h-9 text-sm font-[family-name:var(--font-jetbrains)]"
            />
          </div>
        </div>

        {/* Publishing toggle */}
        <div className="space-y-3 pt-2 border-t border-[var(--border-subtle)]">
          <Label className="text-xs">Publishing</Label>
          <div className="flex gap-2">
            <button
              onClick={() =>
                onChange({
                  publishing_type: "self",
                  publisher_name: undefined,
                  publisher_pro: undefined,
                })
              }
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all border ${
                !hasPublisher
                  ? "bg-[var(--color-amber)]/10 border-[var(--color-amber)]/30 text-[var(--color-amber)]"
                  : "bg-[var(--bg-surface)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--color-amber)]/20"
              }`}
            >
              Self-Published
            </button>
            <button
              onClick={() => onChange({ publishing_type: "publisher" })}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all border ${
                hasPublisher
                  ? "bg-[var(--color-amber)]/10 border-[var(--color-amber)]/30 text-[var(--color-amber)]"
                  : "bg-[var(--bg-surface)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--color-amber)]/20"
              }`}
            >
              Has Publisher
            </button>
          </div>

          {/* Self-published: Reclaim upsell (creator only) */}
          {!hasPublisher && isCreator && (
            <p className="text-sm text-[var(--text-secondary)]">
              Save up to 10% in commission by self-publishing through{" "}
              <Link
                href="/dashboard/reclaim"
                className="text-[var(--color-amber)] underline font-medium dark:hover:text-white transition-colors"
              >
                Reclaim
              </Link>
              .
            </p>
          )}

          {/* Has publisher */}
          {hasPublisher && (
            <div className="space-y-3">
              {/* Reclaim upsell above fields (creator only) */}
              {isCreator && (
                <p className="text-sm text-[var(--color-amber)]">
                  Save up to 10% in commission by self-publishing through{" "}
                  <Link
                    href="/dashboard/reclaim"
                    className="text-[var(--color-amber)] underline font-medium dark:hover:text-white transition-colors"
                  >
                    Reclaim
                  </Link>
                  .
                </p>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Publisher Name</Label>
                  <Input
                    value={contributor.publisher_name || ""}
                    onChange={(e) =>
                      onChange({ publisher_name: e.target.value })
                    }
                    placeholder="Publishing company"
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Publisher PRO</Label>
                  <Select
                    value={contributor.publisher_pro || ""}
                    onValueChange={(v) => onChange({ publisher_pro: v })}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Select PRO" />
                    </SelectTrigger>
                    <SelectContent>
                      {PROS.map((p) => (
                        <SelectItem key={p} value={p}>
                          {p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Legal responsibility tooltip + I understand (creator only) */}
              {isCreator && (
                <div className="rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] p-3 space-y-2">
                  <p className="text-sm text-[var(--text-primary)]">
                    It is your legal responsibility to ensure your publisher
                    pays to your WavCash account in order to enable automatic
                    redistribution to contributors.
                  </p>
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={contributor.publisher_acknowledged || false}
                      onChange={(e) =>
                        onChange({ publisher_acknowledged: e.target.checked })
                      }
                      className="mt-0.5 accent-[var(--color-amber)]"
                    />
                    <span className="text-sm font-medium">I understand</span>
                  </label>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
