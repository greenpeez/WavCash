-- ============================================================
-- CALIBRATED RATES: Self-improving oracle rate table
-- ============================================================
-- When users upload Actuals CSVs, we derive observed per-stream rates.
-- Qualified data points (within ±50% of fair rate) calibrate the community
-- rate over time. Outliers (<50% of fair rate) are flagged as potential
-- underpayments and excluded from calibration.

-- Calibrated rates (community-derived fair market rates)
create table public.calibrated_rates (
  id uuid primary key default gen_random_uuid(),

  -- Which platform + country this rate applies to
  platform text not null,
  country text,           -- null = global fallback
  period text not null,   -- e.g. '2025-01' (monthly granularity)

  -- The calibrated fair market rate (trimmed median of qualified data points)
  fair_rate numeric(10,6) not null,

  -- The raw observed rate (mean of ALL data points, including outliers)
  observed_rate numeric(10,6),

  -- How many data points contributed to this rate
  sample_size integer not null default 0,

  -- Confidence: 'low' (<10 samples), 'medium' (10-50), 'high' (>50)
  confidence text not null default 'low' check (confidence in ('low', 'medium', 'high')),

  -- How many data points were flagged as potential underpayments
  flagged_count integer default 0,

  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  -- One rate per platform/country/period
  unique(platform, country, period)
);

-- Individual rate observations (from user Actuals uploads)
-- These feed into calibrated_rates via aggregation
create table public.rate_observations (
  id uuid primary key default gen_random_uuid(),

  -- Source data
  statement_line_id uuid references public.statement_lines on delete set null,
  user_id uuid references public.users on delete set null,

  -- Rate details
  platform text not null,
  country text,           -- listener country if known
  period text not null,   -- e.g. '2025-01'
  streams bigint not null,
  earnings numeric(12,4) not null,
  observed_rate numeric(10,6) not null,  -- earnings / streams

  -- Calibration status
  -- 'qualified': within 50% of fair rate, used for calibration
  -- 'flagged_underpayment': <50% of fair rate, excluded from calibration
  -- 'excluded_low_streams': too few streams to be meaningful (<100)
  calibration_status text not null default 'pending'
    check (calibration_status in ('pending', 'qualified', 'flagged_underpayment', 'excluded_low_streams')),

  -- Reference rate at time of observation (for audit trail)
  reference_fair_rate numeric(10,6),

  created_at timestamptz default now()
);

-- Indexes
create index idx_calibrated_rates_lookup on public.calibrated_rates(platform, country, period);
create index idx_rate_observations_platform on public.rate_observations(platform, country, period);
create index idx_rate_observations_status on public.rate_observations(calibration_status);
create index idx_rate_observations_user on public.rate_observations(user_id);

-- RLS
alter table public.calibrated_rates enable row level security;
alter table public.rate_observations enable row level security;

-- Calibrated rates: public read (these are community aggregate rates)
create policy "Anyone can read calibrated rates" on public.calibrated_rates for select using (true);

-- Rate observations: users can see their own
create policy "Users can view own rate observations" on public.rate_observations for select
  using (auth.uid() = user_id);

-- Service role handles inserts/updates (done in API routes)
create policy "Service can insert rate observations" on public.rate_observations for insert
  with check (true);
create policy "Service can insert calibrated rates" on public.calibrated_rates for insert
  with check (true);
create policy "Service can update calibrated rates" on public.calibrated_rates for update
  using (true);

-- Trigger for updated_at
create trigger calibrated_rates_updated_at
  before update on public.calibrated_rates
  for each row execute function public.handle_updated_at();
