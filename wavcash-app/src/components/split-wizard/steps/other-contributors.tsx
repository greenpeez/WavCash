"use client";

import { useWizard } from "../wizard-context";
import GateQuestion from "../gate-question";
import ContributorCard from "../contributor-card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

const OTHER_ROLES = [
  "Artist",
  "Session Musician",
  "Engineer",
  "Manager",
  "Label",
  "Publisher",
  "Other",
];

export default function OtherContributors() {
  const { state, dispatch } = useWizard();

  const others = state.contributors.filter(
    (c) => c.role !== "Songwriter" && c.role !== "Producer"
  );

  const addOther = () => {
    dispatch({
      type: "ADD_CONTRIBUTOR",
      contributor: {
        id: crypto.randomUUID(),
        email: "",
        legal_name: "",
        role: "",
        percentage: 0,
        publishing_type: "self",
      },
    });
  };

  return (
    <GateQuestion
      gateKey="hasOtherContributors"
      question="Are there any other contributors to include?"
      subtitle="Featured artists, session musicians, engineers, or anyone else with a stake in royalties."
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Other Contributors</h2>
          <Button variant="outline" size="sm" onClick={addOther}>
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Add Contributor
          </Button>
        </div>

        {others.length === 0 && (
          <p className="text-sm text-[var(--text-tertiary)] text-center py-8">
            Add at least one contributor to continue.
          </p>
        )}

        {others.map((c) => (
          <ContributorCard
            key={c.id}
            contributor={c}
            onChange={(updates) =>
              dispatch({ type: "UPDATE_CONTRIBUTOR", id: c.id, updates })
            }
            onRemove={() => dispatch({ type: "REMOVE_CONTRIBUTOR", id: c.id })}
            roles={OTHER_ROLES}
          />
        ))}
      </div>
    </GateQuestion>
  );
}
