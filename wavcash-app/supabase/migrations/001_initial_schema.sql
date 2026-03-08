-- WavCash MVP Database Schema
-- Run this in Supabase SQL Editor

-- ============================================================
-- CORE TABLES
-- ============================================================

-- Users (extends Supabase auth.users)
create table public.users (
  id uuid references auth.users on delete cascade primary key,
  display_name text not null,
  country text not null,
  role text not null check (role in ('artist','producer','songwriter','publisher','manager','label')),
  tier text not null default 'free' check (tier in ('free','basic','premium','enterprise')),
  genre_tags text[] default '{}',
  distributor text,
  spotify_connected boolean default false,
  spotify_artist_id text,
  spotify_access_token text,
  spotify_refresh_token text,
  spotify_token_expires_at timestamptz,
  wavcash_id text unique,
  onboarding_complete boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Artists (a user can manage multiple artist profiles for Enterprise)
create table public.artists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users on delete cascade not null,
  spotify_artist_id text,
  name text not null,
  image_url text,
  genres text[] default '{}',
  popularity integer,
  created_at timestamptz default now()
);

-- Tracks
create table public.tracks (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid references public.artists on delete cascade not null,
  isrc text not null,
  title text not null,
  album text,
  spotify_track_id text,
  release_date date,
  duration_ms integer,
  popularity integer,
  album_art_url text,
  created_at timestamptz default now(),
  unique(artist_id, isrc)
);

-- DSP Rates (static seed, updated quarterly)
create table public.dsp_rates (
  id uuid primary key default gen_random_uuid(),
  platform text not null,
  country text,
  rate_per_stream numeric(10,6) not null,
  effective_date date not null,
  source text default 'manual',
  created_at timestamptz default now()
);

-- Oracle Snapshots (daily stream count captures)
create table public.oracle_snapshots (
  id uuid primary key default gen_random_uuid(),
  track_id uuid references public.tracks on delete cascade not null,
  platform text not null,
  stream_count bigint not null,
  previous_count bigint default 0,
  delta bigint default 0,
  estimated_royalty numeric(12,4),
  snapshot_date date not null,
  created_at timestamptz default now(),
  unique(track_id, platform, snapshot_date)
);

-- Royalty Statements (CSV uploads)
create table public.royalty_statements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users on delete cascade not null,
  distributor text not null,
  upload_filename text,
  period_start date,
  period_end date,
  total_earnings numeric(12,4),
  status text default 'pending' check (status in ('pending','parsed','confirmed','error')),
  created_at timestamptz default now()
);

-- Statement Line Items (parsed from CSV)
create table public.statement_lines (
  id uuid primary key default gen_random_uuid(),
  statement_id uuid references public.royalty_statements on delete cascade not null,
  isrc text,
  track_title text,
  platform text,
  streams bigint,
  earnings numeric(12,4),
  period text,
  country text,
  matched_track_id uuid references public.tracks on delete set null,
  oracle_estimated numeric(12,4),
  delta_pct numeric(6,2),
  flagged boolean default false,
  created_at timestamptz default now()
);

-- Attestations (placeholder until onchain integration)
create table public.attestations (
  id uuid primary key default gen_random_uuid(),
  snapshot_date date not null unique,
  merkle_root text not null,
  tx_hash text,
  status text default 'pending' check (status in ('pending','submitted','confirmed')),
  created_at timestamptz default now()
);

-- Splits
create table public.splits (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references public.users on delete cascade not null,
  track_id uuid references public.tracks on delete cascade not null,
  title text not null,
  status text default 'draft' check (status in ('draft','awaiting_signatures','active','voided')),
  contract_address text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Split Contributors
create table public.split_contributors (
  id uuid primary key default gen_random_uuid(),
  split_id uuid references public.splits on delete cascade not null,
  user_id uuid references public.users on delete set null,
  email text not null,
  legal_name text not null,
  role text not null,
  percentage numeric(5,2) not null check (percentage > 0 and percentage <= 100),
  signed boolean default false,
  signed_at timestamptz,
  invite_token text unique,
  created_at timestamptz default now()
);

-- CMO Registrations (Reclaim)
create table public.cmo_registrations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users on delete cascade not null,
  cmo_code text not null,
  status text default 'not_started' check (status in ('not_started','in_progress','forms_ready','submitted','confirmed','rejected')),
  selected_track_ids uuid[] default '{}',
  documents jsonb default '[]',
  personal_info jsonb default '{}',
  submission_date date,
  rejection_reason text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- CMO Directory (reference data)
create table public.cmo_directory (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  country text not null,
  website text,
  registration_url text,
  submission_channel text,
  royalty_types text[] default '{}',
  required_documents jsonb default '[]',
  processing_time text,
  notes text
);

-- Sniffer Results (cached, pre-populate on signup)
create table public.sniffer_results (
  id uuid primary key default gen_random_uuid(),
  spotify_url text not null,
  artist_name text,
  results jsonb not null,
  ip_hash text,
  created_at timestamptz default now()
);

-- ============================================================
-- INDEXES
-- ============================================================

create index idx_artists_user_id on public.artists(user_id);
create index idx_tracks_artist_id on public.tracks(artist_id);
create index idx_tracks_isrc on public.tracks(isrc);
create index idx_oracle_snapshots_track_date on public.oracle_snapshots(track_id, snapshot_date);
create index idx_oracle_snapshots_date on public.oracle_snapshots(snapshot_date);
create index idx_statement_lines_isrc on public.statement_lines(isrc);
create index idx_splits_creator on public.splits(created_by);
create index idx_split_contributors_split on public.split_contributors(split_id);
create index idx_split_contributors_user on public.split_contributors(user_id);
create index idx_split_contributors_token on public.split_contributors(invite_token);
create index idx_cmo_registrations_user on public.cmo_registrations(user_id);
create index idx_sniffer_results_ip on public.sniffer_results(ip_hash, created_at);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.users enable row level security;
alter table public.artists enable row level security;
alter table public.tracks enable row level security;
alter table public.oracle_snapshots enable row level security;
alter table public.royalty_statements enable row level security;
alter table public.statement_lines enable row level security;
alter table public.splits enable row level security;
alter table public.split_contributors enable row level security;
alter table public.cmo_registrations enable row level security;
alter table public.sniffer_results enable row level security;
alter table public.dsp_rates enable row level security;
alter table public.cmo_directory enable row level security;
alter table public.attestations enable row level security;

-- Users: own row only
create policy "Users can view own profile" on public.users for select using (auth.uid() = id);
create policy "Users can update own profile" on public.users for update using (auth.uid() = id);
create policy "Users can insert own profile" on public.users for insert with check (auth.uid() = id);

-- Artists: own artists only
create policy "Users can view own artists" on public.artists for select using (auth.uid() = user_id);
create policy "Users can insert own artists" on public.artists for insert with check (auth.uid() = user_id);
create policy "Users can update own artists" on public.artists for update using (auth.uid() = user_id);
create policy "Users can delete own artists" on public.artists for delete using (auth.uid() = user_id);

-- Tracks: through artist ownership
create policy "Users can view own tracks" on public.tracks for select using (
  exists (select 1 from public.artists where artists.id = tracks.artist_id and artists.user_id = auth.uid())
);
create policy "Users can insert own tracks" on public.tracks for insert with check (
  exists (select 1 from public.artists where artists.id = tracks.artist_id and artists.user_id = auth.uid())
);

-- Oracle Snapshots: through track ownership
create policy "Users can view own snapshots" on public.oracle_snapshots for select using (
  exists (
    select 1 from public.tracks t
    join public.artists a on a.id = t.artist_id
    where t.id = oracle_snapshots.track_id and a.user_id = auth.uid()
  )
);

-- Royalty Statements: own statements only
create policy "Users can view own statements" on public.royalty_statements for select using (auth.uid() = user_id);
create policy "Users can insert own statements" on public.royalty_statements for insert with check (auth.uid() = user_id);
create policy "Users can update own statements" on public.royalty_statements for update using (auth.uid() = user_id);

-- Statement Lines: through statement ownership
create policy "Users can view own statement lines" on public.statement_lines for select using (
  exists (select 1 from public.royalty_statements rs where rs.id = statement_lines.statement_id and rs.user_id = auth.uid())
);
create policy "Users can insert own statement lines" on public.statement_lines for insert with check (
  exists (select 1 from public.royalty_statements rs where rs.id = statement_lines.statement_id and rs.user_id = auth.uid())
);
create policy "Users can update own statement lines" on public.statement_lines for update using (
  exists (select 1 from public.royalty_statements rs where rs.id = statement_lines.statement_id and rs.user_id = auth.uid())
);

-- Splits: creator can manage, contributors can view
create policy "Creators can view own splits" on public.splits for select using (auth.uid() = created_by);
create policy "Contributors can view their splits" on public.splits for select using (
  exists (select 1 from public.split_contributors sc where sc.split_id = splits.id and sc.user_id = auth.uid())
);
create policy "Creators can insert splits" on public.splits for insert with check (auth.uid() = created_by);
create policy "Creators can update own splits" on public.splits for update using (auth.uid() = created_by);

-- Split Contributors: creator of parent split can manage, contributor can read/sign
create policy "Split creators can view contributors" on public.split_contributors for select using (
  exists (select 1 from public.splits s where s.id = split_contributors.split_id and s.created_by = auth.uid())
);
create policy "Contributors can view own entry" on public.split_contributors for select using (auth.uid() = user_id);
create policy "Split creators can insert contributors" on public.split_contributors for insert with check (
  exists (select 1 from public.splits s where s.id = split_contributors.split_id and s.created_by = auth.uid())
);
create policy "Contributors can sign (update own)" on public.split_contributors for update using (auth.uid() = user_id);
create policy "Split creators can update contributors" on public.split_contributors for update using (
  exists (select 1 from public.splits s where s.id = split_contributors.split_id and s.created_by = auth.uid())
);

-- CMO Registrations: own only
create policy "Users can view own registrations" on public.cmo_registrations for select using (auth.uid() = user_id);
create policy "Users can insert own registrations" on public.cmo_registrations for insert with check (auth.uid() = user_id);
create policy "Users can update own registrations" on public.cmo_registrations for update using (auth.uid() = user_id);

-- Public read tables
create policy "Anyone can read DSP rates" on public.dsp_rates for select using (true);
create policy "Anyone can read CMO directory" on public.cmo_directory for select using (true);
create policy "Anyone can read attestations" on public.attestations for select using (true);

-- Sniffer: public insert (via service role in API), no user reads needed
create policy "Anyone can read sniffer results" on public.sniffer_results for select using (true);
create policy "Service can insert sniffer results" on public.sniffer_results for insert with check (true);

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Generate WavCash ID on user creation
create or replace function public.generate_wavcash_id()
returns trigger as $$
declare
  new_id text;
  exists_already boolean;
begin
  loop
    new_id := 'WC-' || upper(substr(md5(random()::text), 1, 6));
    select exists(select 1 from public.users where wavcash_id = new_id) into exists_already;
    exit when not exists_already;
  end loop;
  new.wavcash_id := new_id;
  return new;
end;
$$ language plpgsql;

create trigger set_wavcash_id
  before insert on public.users
  for each row
  when (new.wavcash_id is null)
  execute function public.generate_wavcash_id();

-- Auto-update updated_at
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger users_updated_at before update on public.users for each row execute function public.handle_updated_at();
create trigger splits_updated_at before update on public.splits for each row execute function public.handle_updated_at();
create trigger cmo_registrations_updated_at before update on public.cmo_registrations for each row execute function public.handle_updated_at();
