"use client";

import { useWizard } from "./wizard-context";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight } from "lucide-react";

// Step component imports
import TrackSelection from "./steps/track-selection";
import WorkDetails from "./steps/work-details";
import Songwriters from "./steps/songwriters";
import Producers from "./steps/producers";
import OtherContributors from "./steps/other-contributors";
import OwnershipSplits from "./steps/ownership-splits";
import RoyaltyAdmin from "./steps/royalty-admin";
import Samples from "./steps/samples";
import WorkForHire from "./steps/work-for-hire";
import SoundExchangeStep from "./steps/soundexchange";
import Credits from "./steps/credits";
import DisputeResolution from "./steps/dispute-resolution";
import ReviewGenerate from "./steps/review-generate";

import type { StepId } from "./wizard-context";

const STEP_COMPONENTS: Record<StepId, React.ComponentType> = {
  track: TrackSelection,
  work: WorkDetails,
  songwriters: Songwriters,
  producers: Producers,
  others: OtherContributors,
  splits: OwnershipSplits,
  royalty: RoyaltyAdmin,
  samples: Samples,
  wfh: WorkForHire,
  soundexchange: SoundExchangeStep,
  credits: Credits,
  dispute: DisputeResolution,
  review: ReviewGenerate,
};

export default function WizardShell() {
  const { state, dispatch, activeSteps, currentStepDef, totalActiveSteps } =
    useWizard();

  const StepComponent = STEP_COMPONENTS[currentStepDef.id];
  const isFirst = state.currentStep === 0;
  const isLast = state.currentStep === totalActiveSteps - 1;
  const progress = ((state.currentStep + 1) / totalActiveSteps) * 100;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-[var(--text-tertiary)]">
          <span>
            Step {state.currentStep + 1} of {totalActiveSteps}
          </span>
          <span>{currentStepDef.label}</span>
        </div>
        <div className="h-1 bg-[var(--bg-surface)] rounded-full overflow-hidden">
          <div
            className="h-full bg-[var(--color-amber)] rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Step content with slide transition */}
      <div
        key={currentStepDef.id}
        className="animate-in fade-in slide-in-from-right-4 duration-300"
      >
        <StepComponent />
      </div>

      {/* Navigation — hidden on review (it has its own Generate button) */}
      {currentStepDef.id !== "review" && (
        <div className="flex items-center justify-between pt-4 border-t border-[var(--border-subtle)]">
          <Button
            variant="ghost"
            onClick={() => dispatch({ type: "PREV_STEP" })}
            disabled={isFirst}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <Button
            onClick={() => dispatch({ type: "NEXT_STEP" })}
            disabled={isLast}
            className="btn-cta gap-2"
          >
            Continue
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
