"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { authFetch } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FlaskConical } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { WizardProvider, useWizard } from "@/components/split-wizard/wizard-context";
import type { WizardState } from "@/components/split-wizard/wizard-context";
import WizardShell from "@/components/split-wizard/wizard-shell";
import type { ContractData, WizardContributor } from "@/lib/types/contract";

const isDevMode = process.env.NEXT_PUBLIC_DEV_BYPASS === "true";

function WizardPage() {
  const router = useRouter();
  const { state, dispatch } = useWizard();
  const submittingRef = useRef(false);
  const [seeding, setSeeding] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;

    try {
      // Build ContractData from wizard state
      const contractData: ContractData = {
        version: "2.0",
        work: state.work,
        contributor_extras: Object.fromEntries(
          state.contributors.map((c) => [
            c.id,
            {
              stage_name: c.stage_name,
              pro_affiliation: c.pro_affiliation,
              ipi_number: c.ipi_number,
              publishing_type: c.publishing_type,
              publisher_name: c.publisher_name,
              publisher_pro: c.publisher_pro,
              publisher_acknowledged: c.publisher_acknowledged,
            },
          ])
        ),
        composition_splits: state.compositionSplits,
        master: state.master,
        royalty: state.royalty,
        administration: state.administration,
        samples: state.samples,
        work_for_hire: state.workForHire,
        credits: state.credits,
        soundexchange: state.soundexchange,
        dispute_resolution: state.disputeResolution,
        completeness_score: 0,
        skipped_sections: Object.entries(state.gates)
          .filter(([, v]) => v === false)
          .map(([k]) => k),
      };

      const res = await authFetch("/api/splits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          track_id: state.trackId,
          title: state.agreementTitle || `${state.trackTitle}: Split Agreement`,
          contributors: state.contributors.map((c) => ({
            email: c.email,
            legal_name: c.legal_name,
            role: c.role,
            percentage: c.percentage,
          })),
          contract_data: contractData,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create agreement");
      }

      const data = await res.json();
      const splitId = data.split_id;

      // Auto-send signing invites to all contributors
      try {
        const sendRes = await authFetch(`/api/splits/${splitId}/send`, {
          method: "POST",
        });
        if (sendRes.ok) {
          const sendData = await sendRes.json();
          if (sendData.failed > 0) {
            toast.success(
              `Agreement created — ${sendData.sent} invite(s) sent, ${sendData.failed} failed`
            );
          } else {
            toast.success("Agreement created — invites sent");
          }
        } else {
          toast.error("Agreement created but invites failed to send");
        }
      } catch {
        toast.error("Agreement created but invites failed to send");
      }

      router.push(`/dashboard/splits/${splitId}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create agreement");
      dispatch({ type: "SET_SUBMITTING", value: false });
    } finally {
      submittingRef.current = false;
    }
  }, [state, dispatch, router]);

  // Watch for submitting flag set by the review step's "Generate" button
  useEffect(() => {
    if (state.submitting) {
      handleSubmit();
    }
  }, [state.submitting, handleSubmit]);

  // ── Dev test flow: seed tracks + populate wizard + jump to review ──
  const seedTestData = async () => {
    setSeeding(true);
    try {
      // 1. Seed tracks via dev-bypass API
      const res = await authFetch("/api/user/dev-bypass", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          artist_name: "Dev Test Artist",
          mock_tracks: [
            { title: "Night Drive", isrc: "USTEST0000001", album: "Test Album" },
            { title: "Golden Hour", isrc: "USTEST0000002", album: "Test Album" },
            { title: "City Lights", isrc: "USTEST0000003", album: "Test EP" },
          ],
        }),
      });
      if (!res.ok) throw new Error("Failed to seed test data");
      const data = await res.json();
      const track = data.tracks?.[0];
      if (!track) throw new Error("No tracks returned");

      // 2. Build mock contributors
      const artistId = `test-artist-${Date.now()}`;
      const producerId = `test-producer-${Date.now()}`;
      const contributors: WizardContributor[] = [
        {
          id: artistId,
          email: "artist@test.com",
          legal_name: "Marcus Johnson",
          role: "Songwriter",
          percentage: 60,
          stage_name: "MJ Beats",
          pro_affiliation: "BMI",
          ipi_number: "00123456789",
          publishing_type: "self",
        },
        {
          id: producerId,
          email: "producer@test.com",
          legal_name: "Sarah Williams",
          role: "Producer",
          percentage: 40,
          pro_affiliation: "ASCAP",
          publishing_type: "publisher",
          publisher_name: "Bright Wave Publishing",
          publisher_pro: "SESAC",
        },
      ];

      // 3. Build full seed state
      const seed: Partial<WizardState> = {
        trackId: track.id,
        trackTitle: track.title,
        trackIsrc: track.isrc,
        agreementTitle: `${track.title}: Split Agreement`,
        contributors,
        gates: {
          hasSongwriters: true,
          hasProducers: true,
          hasOtherContributors: false,
          hasSamples: false,
          hasWorkForHire: false,
          wantsSoundExchange: false,
        },
        work: {
          genre: "Hip-Hop",
          date_of_creation: "2026-01-15",
          anticipated_release_date: "2026-04-01",
          distributor_or_label: "Independent",
          samples_used: false,
        },
        compositionSplits: {
          [artistId]: { writer_share_pct: 100, publisher_share_pct: 0 },
          [producerId]: { writer_share_pct: 90, publisher_share_pct: 10 },
        },
        master: {
          ownership_type: "joint",
          splits: {
            [artistId]: { pct: 60, publishing_type: "self" },
            [producerId]: { pct: 40, publishing_type: "publisher" },
          },
        },
        royalty: { mechanical_rate: "statutory" },
        administration: {
          administrating_party: "wavcash",
          has_third_party_publishing: false,
          payment_timeframe_days: 45,
          accounting_frequency: "quarterly",
        },
        credits: {
          [artistId]: { credit_name: "Marcus Johnson", role_credit: "Written by" },
          [producerId]: { credit_name: "Sarah Williams", role_credit: "Produced by" },
        },
        disputeResolution: {
          negotiation_period_days: 30,
          method: "arbitration",
          governing_jurisdiction: "State of California",
        },
      };

      // 4. Dispatch seed
      dispatch({ type: "SEED_STATE", seed });

      toast.success("Test data loaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to seed test data");
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/splits">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-semibold">New Agreement</h1>
          <p className="text-sm text-[var(--text-tertiary)]">
            Define how royalties are shared for a track
          </p>
        </div>
        {isDevMode && (
          <Button
            variant="outline"
            size="sm"
            onClick={seedTestData}
            disabled={seeding}
            className="border-dashed border-[var(--color-amber)]/40 text-[var(--color-amber)] hover:bg-[var(--color-amber)]/10"
          >
            <FlaskConical className="w-3.5 h-3.5 mr-1.5" />
            {seeding ? "Seeding..." : "Fill Test Data"}
          </Button>
        )}
      </div>

      <WizardShell />
    </div>
  );
}

export default function NewSplitPage() {
  const { ready, authenticated } = usePrivy();

  if (!ready || !authenticated) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-[var(--bg-surface)] rounded animate-pulse" />
        <div className="h-64 bg-[var(--bg-surface)] rounded-lg animate-pulse" />
      </div>
    );
  }

  return (
    <WizardProvider>
      <WizardPage />
    </WizardProvider>
  );
}
