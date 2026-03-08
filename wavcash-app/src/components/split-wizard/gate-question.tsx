"use client";

import { useCallback } from "react";
import { useWizard, type WizardAction } from "./wizard-context";
import type { WizardGates } from "@/lib/types/contract";

interface GateQuestionProps {
  gateKey: keyof WizardGates;
  question: string;
  subtitle?: string;
  /** Content to render when gate is answered "Yes" */
  children?: React.ReactNode;
}

export default function GateQuestion({
  gateKey,
  question,
  subtitle,
  children,
}: GateQuestionProps) {
  const { state, dispatch } = useWizard();
  const value = state.gates[gateKey];

  const answer = useCallback(
    (val: boolean) => {
      dispatch({ type: "SET_GATE", key: gateKey, value: val });
      // If "No", auto-advance after a short delay
      if (!val) {
        setTimeout(() => dispatch({ type: "NEXT_STEP" }), 300);
      }
    },
    [dispatch, gateKey]
  );

  // Gate not yet answered — show the question
  if (value === null) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[360px] text-center space-y-6">
        <h2 className="text-2xl font-semibold font-[family-name:var(--font-general-sans)] leading-tight max-w-md">
          {question}
        </h2>
        {subtitle && (
          <p className="text-sm text-[var(--text-secondary)] max-w-sm">
            {subtitle}
          </p>
        )}
        <div className="flex gap-4">
          <button
            onClick={() => answer(true)}
            className="px-8 py-3 rounded-full text-sm font-medium bg-[var(--color-amber)] text-black hover:bg-[var(--color-amber)]/90 transition-all hover:scale-105"
          >
            Yes
          </button>
          <button
            onClick={() => answer(false)}
            className="px-8 py-3 rounded-full text-sm font-medium bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-subtle)] hover:border-[var(--color-amber)]/30 transition-all hover:scale-105"
          >
            No
          </button>
        </div>
      </div>
    );
  }

  // Gate answered "Yes" — show the children (contributor cards, etc.)
  if (value === true && children) {
    return <>{children}</>;
  }

  // Gate answered "No" — will auto-advance, show brief confirmation
  return (
    <div className="flex flex-col items-center justify-center min-h-[360px] text-center">
      <p className="text-sm text-[var(--text-tertiary)]">Skipping...</p>
    </div>
  );
}
