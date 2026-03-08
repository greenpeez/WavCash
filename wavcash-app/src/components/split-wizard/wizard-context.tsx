"use client";

import {
  createContext,
  useContext,
  useReducer,
  useMemo,
  type ReactNode,
  type Dispatch,
} from "react";
import type {
  ContractData,
  WizardContributor,
  WizardGates,
} from "@/lib/types/contract";

// ── Step definitions ────────────────────────────────────────────────────────

export type StepId =
  | "track"
  | "work"
  | "songwriters"
  | "producers"
  | "others"
  | "splits"
  | "royalty"
  | "samples"
  | "wfh"
  | "soundexchange"
  | "credits"
  | "dispute"
  | "review";

interface StepDef {
  id: StepId;
  label: string;
  gateKey?: keyof WizardGates; // undefined = always shown
}

const ALL_STEPS: StepDef[] = [
  { id: "track", label: "Track Selection" },
  { id: "work", label: "Work Details" },
  { id: "songwriters", label: "Songwriters", gateKey: "hasSongwriters" },
  { id: "producers", label: "Producers", gateKey: "hasProducers" },
  { id: "others", label: "Other Contributors", gateKey: "hasOtherContributors" },
  { id: "splits", label: "Ownership & Splits" },
  { id: "royalty", label: "Royalty & Administration" },
  { id: "samples", label: "Samples", gateKey: "hasSamples" },
  { id: "wfh", label: "Work for Hire", gateKey: "hasWorkForHire" },
  { id: "soundexchange", label: "SoundExchange", gateKey: "wantsSoundExchange" },
  { id: "credits", label: "Credits" },
  { id: "dispute", label: "Dispute Resolution" },
  { id: "review", label: "Review & Generate" },
];

// ── State ───────────────────────────────────────────────────────────────────

export interface WizardState {
  currentStep: number; // index into activeSteps
  trackId: string | null;
  trackTitle: string;
  trackIsrc: string;
  agreementTitle: string;
  contributors: WizardContributor[];
  gates: WizardGates;
  work: ContractData["work"];
  compositionSplits: ContractData["composition_splits"];
  master: ContractData["master"];
  royalty: ContractData["royalty"];
  administration: ContractData["administration"];
  samples: ContractData["samples"];
  workForHire: ContractData["work_for_hire"];
  credits: ContractData["credits"];
  soundexchange: ContractData["soundexchange"];
  disputeResolution: ContractData["dispute_resolution"];
  submitting: boolean;
}

const initialState: WizardState = {
  currentStep: 0,
  trackId: null,
  trackTitle: "",
  trackIsrc: "",
  agreementTitle: "",
  contributors: [],
  gates: {
    hasSongwriters: null,
    hasProducers: null,
    hasOtherContributors: null,
    hasSamples: null,
    hasWorkForHire: null,
    wantsSoundExchange: null,
  },
  work: {
    samples_used: false,
  },
  compositionSplits: {},
  master: {
    ownership_type: "joint",
    splits: {},
  },
  royalty: {
    mechanical_rate: "statutory",
  },
  administration: {
    administrating_party: "wavcash",
    has_third_party_publishing: false,
    payment_timeframe_days: 45,
    accounting_frequency: "quarterly",
  },
  samples: undefined,
  workForHire: undefined,
  credits: {},
  soundexchange: undefined,
  disputeResolution: {
    negotiation_period_days: 30,
    method: "arbitration",
    governing_jurisdiction: "",
  },
  submitting: false,
};

// ── Actions ─────────────────────────────────────────────────────────────────

export type WizardAction =
  | { type: "SET_STEP"; step: number }
  | { type: "NEXT_STEP" }
  | { type: "PREV_STEP" }
  | { type: "SET_TRACK"; trackId: string; title: string; isrc: string }
  | { type: "SET_AGREEMENT_TITLE"; title: string }
  | { type: "SET_GATE"; key: keyof WizardGates; value: boolean }
  | { type: "ADD_CONTRIBUTOR"; contributor: WizardContributor }
  | { type: "REMOVE_CONTRIBUTOR"; id: string }
  | { type: "UPDATE_CONTRIBUTOR"; id: string; updates: Partial<WizardContributor> }
  | { type: "UPDATE_WORK"; updates: Partial<ContractData["work"]> }
  | { type: "UPDATE_COMPOSITION_SPLITS"; splits: ContractData["composition_splits"] }
  | { type: "UPDATE_MASTER"; master: ContractData["master"] }
  | { type: "UPDATE_ROYALTY"; updates: Partial<ContractData["royalty"]> }
  | { type: "UPDATE_ADMINISTRATION"; updates: Partial<ContractData["administration"]> }
  | { type: "UPDATE_SAMPLES"; samples: ContractData["samples"] }
  | { type: "UPDATE_WFH"; wfh: ContractData["work_for_hire"] }
  | { type: "UPDATE_CREDITS"; credits: ContractData["credits"] }
  | { type: "UPDATE_SOUNDEXCHANGE"; se: ContractData["soundexchange"] }
  | { type: "UPDATE_DISPUTE"; updates: Partial<ContractData["dispute_resolution"]> }
  | { type: "SET_SUBMITTING"; value: boolean }
  | { type: "SEED_STATE"; seed: Partial<WizardState> };

function reducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case "SET_STEP":
      return { ...state, currentStep: action.step };
    case "NEXT_STEP":
      return { ...state, currentStep: state.currentStep + 1 };
    case "PREV_STEP":
      return { ...state, currentStep: Math.max(0, state.currentStep - 1) };
    case "SET_TRACK":
      return {
        ...state,
        trackId: action.trackId,
        trackTitle: action.title,
        trackIsrc: action.isrc,
        agreementTitle: state.agreementTitle || `${action.title}: Split Agreement`,
      };
    case "SET_AGREEMENT_TITLE":
      return { ...state, agreementTitle: action.title };
    case "SET_GATE":
      return { ...state, gates: { ...state.gates, [action.key]: action.value } };
    case "ADD_CONTRIBUTOR":
      return { ...state, contributors: [...state.contributors, action.contributor] };
    case "REMOVE_CONTRIBUTOR":
      return {
        ...state,
        contributors: state.contributors.filter((c) => c.id !== action.id),
      };
    case "UPDATE_CONTRIBUTOR":
      return {
        ...state,
        contributors: state.contributors.map((c) =>
          c.id === action.id ? { ...c, ...action.updates } : c
        ),
      };
    case "UPDATE_WORK":
      return { ...state, work: { ...state.work, ...action.updates } };
    case "UPDATE_COMPOSITION_SPLITS":
      return { ...state, compositionSplits: action.splits };
    case "UPDATE_MASTER":
      return { ...state, master: action.master };
    case "UPDATE_ROYALTY":
      return { ...state, royalty: { ...state.royalty, ...action.updates } };
    case "UPDATE_ADMINISTRATION":
      return {
        ...state,
        administration: { ...state.administration, ...action.updates },
      };
    case "UPDATE_SAMPLES":
      return { ...state, samples: action.samples };
    case "UPDATE_WFH":
      return { ...state, workForHire: action.wfh };
    case "UPDATE_CREDITS":
      return { ...state, credits: action.credits };
    case "UPDATE_SOUNDEXCHANGE":
      return { ...state, soundexchange: action.se };
    case "UPDATE_DISPUTE":
      return {
        ...state,
        disputeResolution: { ...state.disputeResolution, ...action.updates },
      };
    case "SET_SUBMITTING":
      return { ...state, submitting: action.value };
    case "SEED_STATE":
      return { ...state, ...action.seed };
    default:
      return state;
  }
}

// ── Context ─────────────────────────────────────────────────────────────────

interface WizardContextValue {
  state: WizardState;
  dispatch: Dispatch<WizardAction>;
  activeSteps: StepDef[];
  currentStepDef: StepDef;
  totalActiveSteps: number;
  canProceed: boolean;
}

const WizardContext = createContext<WizardContextValue | null>(null);

export function WizardProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const activeSteps = useMemo(() => {
    return ALL_STEPS.filter((step) => {
      if (!step.gateKey) return true;
      const gateValue = state.gates[step.gateKey];
      // Show if gate answered true, or not yet answered (for gated steps that are the next to show)
      // Actually: hide only if explicitly false
      return gateValue !== false;
    });
  }, [state.gates]);

  const currentStepDef = activeSteps[state.currentStep] || activeSteps[0];
  const totalActiveSteps = activeSteps.length;

  // Basic "can proceed" check: at minimum the gate hasn't been answered null on a gated step
  const canProceed = useMemo(() => {
    const step = currentStepDef;
    if (!step) return false;

    // Track selection requires a track
    if (step.id === "track" && !state.trackId) return false;

    // Gated steps: the gate question component handles its own advancement
    if (step.gateKey) {
      const gateVal = state.gates[step.gateKey];
      if (gateVal === null) return false; // gate not answered yet
      if (gateVal === true) return true; // answered yes, details can be filled
    }

    return true;
  }, [currentStepDef, state]);

  const value = useMemo(
    () => ({
      state,
      dispatch,
      activeSteps,
      currentStepDef,
      totalActiveSteps,
      canProceed,
    }),
    [state, dispatch, activeSteps, currentStepDef, totalActiveSteps, canProceed]
  );

  return (
    <WizardContext.Provider value={value}>{children}</WizardContext.Provider>
  );
}

export function useWizard() {
  const ctx = useContext(WizardContext);
  if (!ctx) throw new Error("useWizard must be used inside WizardProvider");
  return ctx;
}
