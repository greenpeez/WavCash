"use client";

import { useWizard } from "../wizard-context";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function DisputeResolution() {
  const { state, dispatch } = useWizard();

  const update = (updates: Partial<typeof state.disputeResolution>) =>
    dispatch({ type: "UPDATE_DISPUTE", updates });

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-semibold font-[family-name:var(--font-general-sans)]">
          Dispute Resolution
        </h2>
        <p className="text-sm text-[var(--text-secondary)]">
          How disputes between parties should be handled.
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-xs">
            Good Faith Negotiation Period (days)
          </Label>
          <Input
            type="number"
            min={1}
            value={state.disputeResolution.negotiation_period_days}
            onChange={(e) =>
              update({
                negotiation_period_days: parseInt(e.target.value) || 30,
              })
            }
            className="h-9 text-sm font-[family-name:var(--font-jetbrains)]"
          />
          <p className="text-xs text-[var(--text-secondary)]">
            Parties must attempt to resolve disputes through good-faith
            negotiation for this many days before escalating.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Resolution Method</Label>
          <Select
            value={state.disputeResolution.method}
            onValueChange={(v) =>
              update({ method: v as "arbitration" | "litigation" })
            }
          >
            <SelectTrigger className="h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="arbitration">
                Binding Arbitration (AAA)
              </SelectItem>
              <SelectItem value="litigation">
                Court Litigation
              </SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-[var(--text-secondary)]">
            {state.disputeResolution.method === "arbitration"
              ? "Unresolved disputes will be submitted to binding arbitration under the rules of the American Arbitration Association."
              : "Parties consent to the exclusive jurisdiction of the courts in the governing jurisdiction below."}
          </p>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Governing Jurisdiction *</Label>
          <Input
            value={state.disputeResolution.governing_jurisdiction}
            onChange={(e) =>
              update({ governing_jurisdiction: e.target.value })
            }
            placeholder="e.g. State of California, USA"
            className="h-9 text-sm"
          />
          <p className="text-xs text-[var(--text-secondary)]">
            The laws of this jurisdiction will govern the agreement.
          </p>
        </div>
      </div>
    </div>
  );
}
