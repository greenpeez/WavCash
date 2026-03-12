export type Tier = "free" | "basic" | "premium" | "enterprise";
export type UserRole = "artist" | "producer" | "songwriter" | "publisher" | "manager" | "label";
export type SplitStatus = "draft" | "awaiting_signatures" | "active" | "voided";
export type StatementStatus = "pending" | "parsed" | "confirmed" | "error";
export type CmoStatus = "not_started" | "in_progress" | "forms_ready" | "submitted" | "confirmed" | "rejected";
export type Platform = "spotify" | "apple_music" | "youtube_music" | "amazon_music" | "tidal" | "deezer";
export type CalibrationStatus = "pending" | "qualified" | "flagged_underpayment" | "excluded_low_streams";
export type RateConfidence = "low" | "medium" | "high";

export interface User {
  id: string;
  display_name: string;
  country: string;
  role: UserRole;
  tier: Tier;
  genre_tags: string[];
  distributor: string | null;
  spotify_connected: boolean;
  spotify_artist_id: string | null;
  wallet_address: string | null;
  wavcash_id: string | null;
  onboarding_complete: boolean;
  walkthrough_complete: boolean;
  email: string | null;
  phone: string | null;
  legal_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Artist {
  id: string;
  user_id: string;
  spotify_artist_id: string | null;
  name: string;
  image_url: string | null;
  genres: string[];
  popularity: number | null;
  created_at: string;
}

export interface Track {
  id: string;
  artist_id: string;
  isrc: string;
  title: string;
  album: string | null;
  spotify_track_id: string | null;
  release_date: string | null;
  duration_ms: number | null;
  popularity: number | null;
  album_art_url: string | null;
  created_at: string;
}

export interface DspRate {
  id: string;
  platform: Platform;
  country: string | null;
  rate_per_stream: number;
  effective_date: string;
  source: string;
  created_at: string;
}

export interface OracleSnapshot {
  id: string;
  track_id: string;
  platform: Platform;
  stream_count: number;
  previous_count: number;
  delta: number;
  estimated_royalty: number;
  snapshot_date: string;
  created_at: string;
}

export type StatementType = "distributor" | "publisher";

export interface RoyaltyStatement {
  id: string;
  user_id: string;
  distributor: string;
  statement_type: StatementType;
  upload_filename: string | null;
  period_start: string | null;
  period_end: string | null;
  total_earnings: number | null;
  status: StatementStatus;
  created_at: string;
}

export interface StatementLine {
  id: string;
  statement_id: string;
  isrc: string | null;
  track_title: string | null;
  platform: string | null;
  streams: number | null;
  earnings: number | null;
  period: string | null;
  country: string | null;
  matched_track_id: string | null;
  oracle_estimated: number | null;
  delta_pct: number | null;
  flagged: boolean;
  // Publisher-specific fields (null for distributor CSVs)
  income_type: string | null;
  source_name: string | null;
  iswc: string | null;
  share_received: number | null;
  gross_earnings: number | null;
  created_at: string;
}

export interface Split {
  id: string;
  created_by: string;
  track_id: string;
  title: string;
  status: SplitStatus;
  contract_address: string | null;
  tx_hash: string | null;
  contract_data: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface SplitContributor {
  id: string;
  split_id: string;
  user_id: string | null;
  email: string;
  legal_name: string;
  role: string;
  percentage: number;
  signed: boolean;
  signed_at: string | null;
  invite_token: string | null;
  wallet_address: string | null;
  slot_index: number | null;
  created_at: string;
}

export interface Distribution {
  id: string;
  split_id: string;
  tx_hash: string;
  token_type: string;
  total_amount: string;
  status: "success" | "partial" | "failed";
  created_at: string;
}

export interface DistributionPayout {
  id: string;
  distribution_id: string;
  wallet_address: string;
  token_type: string;
  amount: string;
  amount_decimal: number | null;
  tx_hash: string;
  created_at: string;
}

export interface CmoRegistration {
  id: string;
  user_id: string;
  cmo_code: string;
  status: CmoStatus;
  selected_track_ids: string[];
  documents: CmoDocument[];
  personal_info: Record<string, string>;
  current_step: string;
  submission_date: string | null;
  rejection_reason: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CmoDocument {
  type: string;
  label: string;
  file_url?: string;
  uploaded_at?: string;
}

export interface CmoDirectory {
  id: string;
  code: string;
  name: string;
  country: string;
  website: string | null;
  registration_url: string | null;
  submission_channel: string | null;
  royalty_types: string[];
  required_documents: CmoRequiredDocument[];
  processing_time: string | null;
  notes: string | null;
  region: string | null;
  self_registration: boolean;
  registration_cost: string | null;
  royalty_category: string | null;
  accepts_international: boolean;
  publisher_registration: boolean;
  display_order: number;
}

export interface CmoRequiredDocument {
  type: string;
  label: string;
  formats: string[];
}

export interface SnifferResult {
  id: string;
  spotify_url: string;
  artist_name: string | null;
  results: SnifferDspResult[];
  ip_hash: string | null;
  created_at: string;
}

export interface SnifferDspResult {
  platform: Platform;
  estimated_streams: number;
  rate: number;
  estimated_earnings: number;
}

export interface Attestation {
  id: string;
  snapshot_date: string;
  merkle_root: string;
  tx_hash: string | null;
  status: "pending" | "submitted" | "confirmed";
  created_at: string;
}

export interface CalibratedRate {
  id: string;
  platform: string;
  country: string | null;
  period: string;
  fair_rate: number;
  observed_rate: number | null;
  sample_size: number;
  confidence: RateConfidence;
  flagged_count: number;
  created_at: string;
  updated_at: string;
}

// ── Split Events (onchain activity timeline) ─────────────────────────────────

export type SplitEventType = "deployed" | "signed" | "activated" | "voided";

export interface SplitEvent {
  id: string;
  split_id: string;
  event_type: SplitEventType;
  tx_hash: string | null;
  data: Record<string, unknown>;
  created_at: string;
}

// ── Notifications ────────────────────────────────────────────────────────────

export type NotificationType = "payout_received" | "split_signed" | "all_signed" | "agreement_live" | "invite_received" | "agreement_voided";

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  read: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
}

// ── Support / Live Chat ──────────────────────────────────────────────────────

export type TicketStatus = "open" | "in_progress" | "resolved" | "archived";
export type MessageSender = "user" | "agent" | "system";

export interface SupportTicket {
  id: string;
  ticket_number: string;
  status: TicketStatus;
  has_wavcash_account: boolean | null;
  wavcash_id: string | null;
  initial_message: string | null;
  request_detail: string | null;
  session_id: string;
  user_privy_id: string | null;
  telegram_notification_msg_id: number | null;
  latest_alert_msg_id: number | null;
  telegram_topic_id: number | null;
  assigned_to_telegram_id: number | null;
  assigned_to_name: string | null;
  rating: number | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
}

export interface SupportMessage {
  id: string;
  ticket_id: string;
  sender: MessageSender;
  content: string;
  created_at: string;
}

export interface TelegramBotState {
  telegram_user_id: number;
  action: string;
  ticket_id: string | null;
  expires_at: string;
}

// ────────────────────────────────────────────────────────────────────────────

export interface RateObservation {
  id: string;
  statement_line_id: string | null;
  user_id: string | null;
  platform: string;
  country: string | null;
  period: string;
  streams: number;
  earnings: number;
  observed_rate: number;
  calibration_status: CalibrationStatus;
  reference_fair_rate: number | null;
  created_at: string;
}
