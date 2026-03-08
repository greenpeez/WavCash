-- 014: Enrich users table with missing + new profile columns
-- Fixes columns from migration 001 that are missing in the live DB,
-- and adds email/phone (cached from Privy), legal_name, avatar_url.

-- Fix: columns defined in 001 but absent from live DB
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS spotify_connected boolean DEFAULT false;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS spotify_artist_id text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS genre_tags text[] DEFAULT '{}';

-- New: persist email + phone locally (source of truth stays in Privy, this is a cache)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS phone text;

-- New: profile extras
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS legal_name text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS avatar_url text;
