"use client";

import { useEffect } from "react";
import { useWizard } from "../wizard-context";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function Credits() {
  const { state, dispatch } = useWizard();

  // Auto-populate credits from contributors if empty
  useEffect(() => {
    if (
      Object.keys(state.credits).length === 0 &&
      state.contributors.length > 0
    ) {
      const autoCredits: typeof state.credits = {};
      for (const c of state.contributors) {
        autoCredits[c.id] = {
          credit_name: c.stage_name || c.legal_name,
          role_credit: c.role
            ? `${c.role === "Songwriter" ? "Written by" : c.role === "Producer" ? "Produced by" : c.role === "Artist" ? "Performed by" : c.role}`
            : "",
          metadata_tag: "",
        };
      }
      dispatch({ type: "UPDATE_CREDITS", credits: autoCredits });
    }
  }, [state.contributors]);

  const updateCredit = (
    id: string,
    field: "credit_name" | "role_credit" | "metadata_tag",
    value: string
  ) => {
    const current = state.credits[id] || {
      credit_name: "",
      role_credit: "",
      metadata_tag: "",
    };
    dispatch({
      type: "UPDATE_CREDITS",
      credits: { ...state.credits, [id]: { ...current, [field]: value } },
    });
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-semibold font-[family-name:var(--font-general-sans)]">
          Credits & Attribution
        </h2>
        <p className="text-sm text-[var(--text-secondary)]">
          How each contributor should be credited on releases, streaming
          metadata, and liner notes.
        </p>
      </div>

      <div className="space-y-3">
        {/* Header row */}
        <div className="grid grid-cols-[1fr_1.2fr_1.2fr_1fr] gap-2 px-3 text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider">
          <span>Legal Name</span>
          <span>Credit As</span>
          <span>Role Credit</span>
          <span>Metadata Tag</span>
        </div>

        {state.contributors.map((c) => {
          const credit = state.credits[c.id] || {
            credit_name: c.legal_name,
            role_credit: "",
            metadata_tag: "",
          };
          return (
            <div
              key={c.id}
              className="grid grid-cols-[1fr_1.2fr_1.2fr_1fr] gap-2 items-center p-3 rounded-lg bg-[var(--bg-surface)]"
            >
              <p className="text-xs font-medium truncate">
                {c.legal_name || "—"}
              </p>
              <Input
                value={credit.credit_name}
                onChange={(e) =>
                  updateCredit(c.id, "credit_name", e.target.value)
                }
                placeholder="Display name"
                className="h-8 text-xs"
              />
              <Input
                value={credit.role_credit}
                onChange={(e) =>
                  updateCredit(c.id, "role_credit", e.target.value)
                }
                placeholder='e.g. "Written by"'
                className="h-8 text-xs"
              />
              <Input
                value={credit.metadata_tag || ""}
                onChange={(e) =>
                  updateCredit(c.id, "metadata_tag", e.target.value)
                }
                placeholder="Optional"
                className="h-8 text-xs"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
