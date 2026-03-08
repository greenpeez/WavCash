-- Migration: Add blockchain integration fields for splits
-- Adds wallet_address to contributors (populated when signing via Privy auth)
-- Adds tx_hash to splits (deployment transaction hash)
-- Creates distributions table for auto-push audit trail

-- 1. Wallet address on contributors (from Privy embedded wallet)
ALTER TABLE split_contributors ADD COLUMN IF NOT EXISTS wallet_address text;

-- 2. Contract address on splits (should exist from 001 but add if missing)
ALTER TABLE splits ADD COLUMN IF NOT EXISTS contract_address text;

-- 3. Deployment transaction hash on splits
ALTER TABLE splits ADD COLUMN IF NOT EXISTS tx_hash text;

-- 3. Distribution audit log
CREATE TABLE IF NOT EXISTS public.distributions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  split_id     uuid NOT NULL REFERENCES public.splits ON DELETE CASCADE,
  tx_hash      text NOT NULL,
  token_type   text NOT NULL DEFAULT 'native',
  total_amount text NOT NULL,
  status       text NOT NULL DEFAULT 'success'
    CHECK (status IN ('success', 'partial', 'failed')),
  created_at   timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_distributions_split ON public.distributions(split_id);
CREATE INDEX IF NOT EXISTS idx_distributions_created ON public.distributions(created_at);
