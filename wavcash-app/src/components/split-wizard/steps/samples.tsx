"use client";

import { useWizard } from "../wizard-context";
import GateQuestion from "../gate-question";
import SampleCard from "../sample-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";

export default function Samples() {
  const { state, dispatch } = useWizard();

  const samples = state.samples || {
    items: [],
    clearance_responsible_party: "",
    redistribution_acknowledged: false,
  };

  const update = (next: typeof samples) =>
    dispatch({ type: "UPDATE_SAMPLES", samples: next });

  const addSample = () => {
    update({
      ...samples,
      items: [
        ...samples.items,
        {
          song_title: "",
          original_artist: "",
          owner: "",
          clearance_status: "pending" as const,
        },
      ],
    });
  };

  const updateItem = (
    index: number,
    updates: Partial<(typeof samples.items)[0]>
  ) => {
    const items = [...samples.items];
    items[index] = { ...items[index], ...updates };
    update({ ...samples, items });
  };

  const removeItem = (index: number) => {
    const items = samples.items.filter((_, i) => i !== index);
    update({ ...samples, items });
  };

  return (
    <GateQuestion
      gateKey="hasSamples"
      question="Does this work incorporate any samples from existing recordings?"
      subtitle="If your track uses portions of another artist's recording, you'll need to document the samples here."
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Samples</h2>
          <Button variant="outline" size="sm" onClick={addSample}>
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Add Sample
          </Button>
        </div>

        {samples.items.length === 0 && (
          <p className="text-sm text-[var(--text-tertiary)] text-center py-8">
            Add the samples used in this work.
          </p>
        )}

        {samples.items.map((s, i) => (
          <SampleCard
            key={i}
            sample={s}
            onChange={(updates) => updateItem(i, updates)}
            onRemove={() => removeItem(i)}
          />
        ))}

        {samples.items.length > 0 && (
          <>
            <div className="space-y-1.5">
              <Label className="text-xs">
                Who is responsible for sample clearance?
              </Label>
              <Input
                value={samples.clearance_responsible_party}
                onChange={(e) =>
                  update({
                    ...samples,
                    clearance_responsible_party: e.target.value,
                  })
                }
                placeholder="Name of responsible party"
                className="h-9 text-sm"
              />
            </div>

            {/* Redistribution acknowledgment */}
            <div className="rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] p-3 space-y-2">
              <p className="text-xs text-[var(--text-secondary)]">
                You agree to redistribute payments to the rights holders of any
                samples used in this work.
              </p>
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={samples.redistribution_acknowledged}
                  onChange={(e) =>
                    update({
                      ...samples,
                      redistribution_acknowledged: e.target.checked,
                    })
                  }
                  className="mt-0.5 accent-[var(--color-amber)]"
                />
                <span className="text-xs font-medium">I understand</span>
              </label>
            </div>
          </>
        )}
      </div>
    </GateQuestion>
  );
}
