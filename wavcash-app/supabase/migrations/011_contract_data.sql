-- 011: Add contract_data JSONB column to splits table
-- Stores all extended contract wizard data (work details, contributor extras,
-- composition/master splits, royalty config, samples, WFH, credits, etc.)
ALTER TABLE public.splits ADD COLUMN IF NOT EXISTS contract_data jsonb DEFAULT '{}';
