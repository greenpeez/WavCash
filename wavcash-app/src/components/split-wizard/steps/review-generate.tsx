"use client";

import { useMemo } from "react";
import { useWizard } from "../wizard-context";
import CompletenessScore from "../completeness-score";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Music,
  Users,
  PieChart,
  DollarSign,
  Disc3,
  Briefcase,
  Radio,
  Award,
  Scale,
  Loader2,
} from "lucide-react";

export default function ReviewGenerate() {
  const { state, dispatch } = useWizard();

  const sections = useMemo(() => {
    const s: {
      label: string;
      icon: React.ReactNode;
      summary: string;
      skipped?: boolean;
    }[] = [];

    // Track
    s.push({
      label: "Track",
      icon: <Music className="w-4 h-4" />,
      summary: state.trackTitle
        ? `${state.trackTitle} (${state.trackIsrc})`
        : "No track selected",
    });

    // Work details
    const workFields = [
      state.work.genre,
      state.work.date_of_creation,
      state.work.distributor_or_label,
    ].filter(Boolean);
    s.push({
      label: "Work Details",
      icon: <Disc3 className="w-4 h-4" />,
      summary: workFields.length > 0 ? workFields.join(" · ") : "Defaults applied",
    });

    // Contributors
    const songwriters = state.contributors.filter(
      (c) => c.role === "Songwriter"
    );
    const producers = state.contributors.filter((c) => c.role === "Producer");
    const others = state.contributors.filter(
      (c) => c.role !== "Songwriter" && c.role !== "Producer"
    );
    const parts: string[] = [];
    if (songwriters.length > 0)
      parts.push(`${songwriters.length} songwriter${songwriters.length !== 1 ? "s" : ""}`);
    if (producers.length > 0)
      parts.push(`${producers.length} producer${producers.length !== 1 ? "s" : ""}`);
    if (others.length > 0)
      parts.push(`${others.length} other${others.length !== 1 ? "s" : ""}`);
    s.push({
      label: "Contributors",
      icon: <Users className="w-4 h-4" />,
      summary:
        parts.length > 0 ? parts.join(", ") : "No contributors added",
    });

    // Ownership & Splits
    const compTotal = Object.values(state.compositionSplits).reduce(
      (acc, v) => acc + (v.writer_share_pct || 0) + (v.publisher_share_pct || 0),
      0
    );
    s.push({
      label: "Ownership & Splits",
      icon: <PieChart className="w-4 h-4" />,
      summary: `${state.master.ownership_type} master · composition ${compTotal.toFixed(0)}%`,
    });

    // Royalty & Admin
    s.push({
      label: "Royalty & Admin",
      icon: <DollarSign className="w-4 h-4" />,
      summary: `${state.royalty.mechanical_rate} rate · ${state.administration.administrating_party === "wavcash" ? "WavCash" : state.administration.administrating_party} admin · ${state.administration.accounting_frequency}`,
    });

    // Samples
    if (state.gates.hasSamples === false) {
      s.push({
        label: "Samples",
        icon: <Disc3 className="w-4 h-4" />,
        summary: "Skipped",
        skipped: true,
      });
    } else if (state.samples) {
      s.push({
        label: "Samples",
        icon: <Disc3 className="w-4 h-4" />,
        summary: `${state.samples.items.length} sample${state.samples.items.length !== 1 ? "s" : ""} documented`,
      });
    }

    // Work for Hire
    if (state.gates.hasWorkForHire === false) {
      s.push({
        label: "Work for Hire",
        icon: <Briefcase className="w-4 h-4" />,
        summary: "Skipped",
        skipped: true,
      });
    } else if (state.workForHire) {
      s.push({
        label: "Work for Hire",
        icon: <Briefcase className="w-4 h-4" />,
        summary: `${state.workForHire.contributor_name} · ${state.workForHire.flat_fee}`,
      });
    }

    // SoundExchange
    if (state.gates.wantsSoundExchange === false) {
      s.push({
        label: "SoundExchange",
        icon: <Radio className="w-4 h-4" />,
        summary: "Skipped",
        skipped: true,
      });
    } else if (state.soundexchange?.enabled) {
      s.push({
        label: "SoundExchange",
        icon: <Radio className="w-4 h-4" />,
        summary: "Letter of Direction enabled",
      });
    }

    // Credits
    const creditCount = Object.keys(state.credits).length;
    s.push({
      label: "Credits",
      icon: <Award className="w-4 h-4" />,
      summary:
        creditCount > 0
          ? `${creditCount} credit${creditCount !== 1 ? "s" : ""} configured`
          : "No credits",
    });

    // Dispute Resolution
    s.push({
      label: "Dispute Resolution",
      icon: <Scale className="w-4 h-4" />,
      summary: `${state.disputeResolution.method} · ${state.disputeResolution.governing_jurisdiction || "No jurisdiction set"}`,
    });

    return s;
  }, [state]);

  // Basic validation: required fields
  const canGenerate = useMemo(() => {
    if (!state.trackId) return false;
    if (state.contributors.length === 0) return false;
    if (!state.contributors.every((c) => c.legal_name.trim() && c.email.trim()))
      return false;
    if (!state.disputeResolution.governing_jurisdiction?.trim()) return false;

    // Mechanical rate validation
    if (state.royalty.mechanical_rate === "controlled") {
      const pct = state.royalty.controlled_pct;
      if (pct == null || pct <= 0 || pct >= 100) return false;
    }
    if (state.royalty.mechanical_rate === "other") {
      const desc = state.royalty.mechanical_rate_description?.trim();
      if (!desc || !/\d/.test(desc)) return false;
    }

    return true;
  }, [state]);

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-semibold font-[family-name:var(--font-general-sans)]">
          Review & Generate
        </h2>
        <p className="text-sm text-[var(--text-secondary)]">
          Review your agreement details, then generate.
        </p>
      </div>

      {/* Completeness score */}
      <Card>
        <CardContent className="py-4">
          <CompletenessScore />
        </CardContent>
      </Card>

      {/* Section summaries */}
      <div className="space-y-2">
        {sections.map((s) => (
          <div
            key={s.label}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-[var(--bg-surface)]"
          >
            <div className="text-[var(--text-tertiary)]">{s.icon}</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{s.label}</p>
              <p className="text-xs text-[var(--text-tertiary)] truncate">
                {s.summary}
              </p>
            </div>
            {s.skipped && (
              <Badge
                variant="outline"
                className="text-[10px] text-[var(--text-tertiary)]"
              >
                Skipped
              </Badge>
            )}
          </div>
        ))}
      </div>

      {/* Navigation + Generate */}
      <div className="space-y-3 pt-2">
        <Button
          onClick={() => dispatch({ type: "SET_SUBMITTING", value: true })}
          disabled={!canGenerate || state.submitting}
          className="btn-cta w-full h-11 text-sm"
        >
          {state.submitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            "Generate Agreement"
          )}
        </Button>
        <p className="text-xs text-[var(--text-tertiary)] text-center">
          By clicking &ldquo;Generate&rdquo; you agree to the{" "}
          <a href="/terms" className="underline hover:text-[var(--text-secondary)]">
            terms and conditions
          </a>{" "}
          of our service.
        </p>
        <Button
          variant="ghost"
          className="w-full"
          onClick={() => dispatch({ type: "PREV_STEP" })}
        >
          Back
        </Button>
      </div>
    </div>
  );
}
