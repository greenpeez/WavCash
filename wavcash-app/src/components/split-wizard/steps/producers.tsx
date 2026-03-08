"use client";

import { useWizard } from "../wizard-context";
import GateQuestion from "../gate-question";
import ContributorCard from "../contributor-card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function Producers() {
  const { state, dispatch } = useWizard();

  const producers = state.contributors.filter((c) => c.role === "Producer");

  const addProducer = () => {
    dispatch({
      type: "ADD_CONTRIBUTOR",
      contributor: {
        id: crypto.randomUUID(),
        email: "",
        legal_name: "",
        role: "Producer",
        percentage: 0,
        publishing_type: "self",
      },
    });
  };

  return (
    <GateQuestion
      gateKey="hasProducers"
      question="Are there producers to include in this split?"
      subtitle="Producers who contributed to the arrangement, beats, or overall production."
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Producers</h2>
          <Button variant="outline" size="sm" onClick={addProducer}>
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Add Producer
          </Button>
        </div>

        {producers.length === 0 && (
          <p className="text-sm text-[var(--text-tertiary)] text-center py-8">
            Add at least one producer to continue.
          </p>
        )}

        {producers.map((c) => (
          <ContributorCard
            key={c.id}
            contributor={c}
            onChange={(updates) =>
              dispatch({ type: "UPDATE_CONTRIBUTOR", id: c.id, updates })
            }
            onRemove={() => dispatch({ type: "REMOVE_CONTRIBUTOR", id: c.id })}
            rolePreset="Producer"
          />
        ))}
      </div>
    </GateQuestion>
  );
}
