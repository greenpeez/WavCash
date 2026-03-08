// Contract data stored in splits.contract_data JSONB column.
// Populated by the wizard, consumed by the contract generator.

export interface ContractData {
  version: "2.0";

  // Section 1: Work identification
  work: {
    alternate_titles?: string;
    iswc_code?: string;
    date_of_creation?: string;
    recording_session_dates?: string;
    genre?: string;
    anticipated_release_date?: string;
    distributor_or_label?: string;
    samples_used: boolean;
  };

  // Section 2 extras: per-contributor fields beyond what split_contributors stores
  // Keyed by a client-side contributor ID that maps to split_contributors rows
  contributor_extras: Record<
    string,
    {
      stage_name?: string;
      pro_affiliation?: string;
      ipi_number?: string;
      publishing_type: "self" | "publisher";
      publisher_name?: string;
      publisher_pro?: string;
      // Whether this contributor acknowledged publisher responsibility (wizard only)
      publisher_acknowledged?: boolean;
    }
  >;

  // Section 3: Composition ownership & publishing splits
  composition_splits: Record<
    string,
    {
      writer_share_pct: number;
      publisher_share_pct: number; // 0 when self-published
    }
  >;

  // Section 4: Master recording ownership
  master: {
    ownership_type: "joint" | "single" | "work_for_hire";
    owner_name?: string; // if single
    splits?: Record<
      string,
      {
        pct: number;
        publishing_type: "self" | "publisher";
        publisher_name?: string;
        publisher_pro?: string;
        publisher_acknowledged?: boolean;
      }
    >;
  };

  // Section 5: Royalty configuration
  royalty: {
    mechanical_rate: "statutory" | "controlled" | "other";
    controlled_pct?: number;
    mechanical_rate_description?: string;
  };

  // Section 6: Administration
  administration: {
    administrating_party: "wavcash" | string;
    has_third_party_publishing: boolean;
    third_party_acknowledged?: boolean;
    payment_timeframe_days: number;
    accounting_frequency: "quarterly" | "semi-annually" | "annually";
  };

  // Section 7: Sample clearance (present only if samples_used = true)
  samples?: {
    items: Array<{
      song_title: string;
      original_artist: string;
      owner: string;
      clearance_status: "cleared" | "pending" | "uncleared";
      split_adjustment_pct?: number;
    }>;
    clearance_responsible_party: string;
    redistribution_acknowledged: boolean;
  };

  // Section 8: Work for hire (present only if applicable)
  work_for_hire?: {
    contributor_name: string;
    engaging_party: string;
    flat_fee: string;
    retains_composition_credit: boolean;
  };

  // Section 9: Credit & attribution
  credits: Record<
    string,
    {
      credit_name: string;
      role_credit: string;
      metadata_tag?: string;
    }
  >;

  // Exhibit A: SoundExchange Letter of Direction
  soundexchange?: {
    enabled: boolean;
    accounts?: Record<string, string>; // contributor ID → account/contact info
  };

  // Section 12: Dispute resolution
  dispute_resolution: {
    negotiation_period_days: number;
    method: "arbitration" | "litigation";
    governing_jurisdiction: string;
  };

  // Tracking
  completeness_score: number;
  skipped_sections: string[];
}

// Wizard contributor — extends split_contributors with wizard-only fields
export interface WizardContributor {
  id: string; // client-side UUID for keying
  email: string;
  legal_name: string;
  role: string;
  percentage: number;
  stage_name?: string;
  pro_affiliation?: string;
  ipi_number?: string;
  publishing_type: "self" | "publisher";
  publisher_name?: string;
  publisher_pro?: string;
  publisher_acknowledged?: boolean;
}

// Gate flags — which optional sections are included
export interface WizardGates {
  hasSongwriters: boolean | null;
  hasProducers: boolean | null;
  hasOtherContributors: boolean | null;
  hasSamples: boolean | null;
  hasWorkForHire: boolean | null;
  wantsSoundExchange: boolean | null;
}
