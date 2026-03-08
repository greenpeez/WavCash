-- 015: Ensure walkthrough_complete column exists with DEFAULT false
-- The column may have been added manually without a proper default,
-- causing new users to get NULL or TRUE instead of FALSE.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS walkthrough_complete boolean DEFAULT false;

-- Fix any existing rows that have NULL (treat as not completed)
UPDATE public.users
  SET walkthrough_complete = false
  WHERE walkthrough_complete IS NULL;

-- Ensure the default is set correctly going forward
ALTER TABLE public.users
  ALTER COLUMN walkthrough_complete SET DEFAULT false;
