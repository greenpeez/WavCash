"use client";

import { useWizard } from "../wizard-context";
import GateQuestion from "../gate-question";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function WorkForHire() {
  const { state, dispatch } = useWizard();

  const wfh = state.workForHire || {
    contributor_name: "",
    engaging_party: "",
    flat_fee: "",
    retains_composition_credit: false,
  };

  const update = (updates: Partial<typeof wfh>) =>
    dispatch({ type: "UPDATE_WFH", wfh: { ...wfh, ...updates } });

  return (
    <GateQuestion
      gateKey="hasWorkForHire"
      question="Are there any work-for-hire parties to include?"
      subtitle="These are contributors who received a flat fee and waive future royalties on the master recording."
    >
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Work-for-Hire Details</h2>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">WFH Contributor Name *</Label>
            <Input
              value={wfh.contributor_name}
              onChange={(e) => update({ contributor_name: e.target.value })}
              placeholder="Full legal name"
              className="h-9 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Engaging Party *</Label>
            <Input
              value={wfh.engaging_party}
              onChange={(e) => update({ engaging_party: e.target.value })}
              placeholder="Who engaged them"
              className="h-9 text-sm"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Flat Fee *</Label>
          <Input
            value={wfh.flat_fee}
            onChange={(e) => update({ flat_fee: e.target.value })}
            placeholder="e.g. $5,000 USD"
            className="h-9 text-sm"
          />
        </div>

        <label className="flex items-center gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={wfh.retains_composition_credit}
            onChange={(e) =>
              update({ retains_composition_credit: e.target.checked })
            }
            className="accent-[var(--color-amber)]"
          />
          <span className="text-sm">
            WFH contributor retains composition credit (name appears in
            composition splits)
          </span>
        </label>
      </div>
    </GateQuestion>
  );
}
