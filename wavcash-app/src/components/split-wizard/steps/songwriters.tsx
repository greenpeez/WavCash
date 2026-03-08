"use client";

import { useWizard } from "../wizard-context";
import GateQuestion from "../gate-question";
import ContributorCard from "../contributor-card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function Songwriters() {
  const { state, dispatch } = useWizard();

  const songwriters = state.contributors.filter(
    (c) => c.role === "Songwriter"
  );

  const addSongwriter = () => {
    dispatch({
      type: "ADD_CONTRIBUTOR",
      contributor: {
        id: crypto.randomUUID(),
        email: "",
        legal_name: "",
        role: "Songwriter",
        percentage: 0,
        publishing_type: "self",
      },
    });
  };

  return (
    <GateQuestion
      gateKey="hasSongwriters"
      question="Are there songwriters to include in this split?"
      subtitle="Songwriters who contributed to the lyrics or melody of the work."
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Songwriters</h2>
          <Button variant="outline" size="sm" onClick={addSongwriter}>
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Add Songwriter
          </Button>
        </div>

        {songwriters.length === 0 && (
          <p className="text-sm text-[var(--text-tertiary)] text-center py-8">
            Add at least one songwriter to continue.
          </p>
        )}

        {songwriters.map((c) => (
          <ContributorCard
            key={c.id}
            contributor={c}
            onChange={(updates) =>
              dispatch({ type: "UPDATE_CONTRIBUTOR", id: c.id, updates })
            }
            onRemove={() => dispatch({ type: "REMOVE_CONTRIBUTOR", id: c.id })}
            rolePreset="Songwriter"
          />
        ))}
      </div>
    </GateQuestion>
  );
}
