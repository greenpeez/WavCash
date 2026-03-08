-- Migration: Replace Supabase Auth with Privy (fully idempotent)

-- ============================================================
-- 1. Drop ALL RLS policies dynamically
-- ============================================================

DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);
  END LOOP;
END;
$$;

-- ============================================================
-- 2. Disable RLS on all tables
-- ============================================================

ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.artists DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracks DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.oracle_snapshots DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.royalty_statements DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.statement_lines DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.splits DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.split_contributors DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.cmo_registrations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.sniffer_results DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.dsp_rates DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.cmo_directory DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.attestations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.calibrated_rates DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_observations DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- 3. Drop ALL foreign keys referencing users
-- ============================================================

ALTER TABLE public.artists DROP CONSTRAINT IF EXISTS artists_user_id_fkey;
ALTER TABLE public.royalty_statements DROP CONSTRAINT IF EXISTS royalty_statements_user_id_fkey;
ALTER TABLE public.splits DROP CONSTRAINT IF EXISTS splits_created_by_fkey;
ALTER TABLE public.splits DROP CONSTRAINT IF EXISTS splits_creator_id_fkey;
ALTER TABLE public.split_contributors DROP CONSTRAINT IF EXISTS split_contributors_user_id_fkey;
ALTER TABLE public.cmo_registrations DROP CONSTRAINT IF EXISTS cmo_registrations_user_id_fkey;

-- ============================================================
-- 4. Drop FK from users.id -> auth.users(id), change PK to text
-- ============================================================

ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_id_fkey;
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_pkey CASCADE;
ALTER TABLE public.users ALTER COLUMN id TYPE text USING id::text;
ALTER TABLE public.users ADD PRIMARY KEY (id);

-- ============================================================
-- 5. Add wallet_address column
-- ============================================================

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS wallet_address text;

-- ============================================================
-- 6. Update WavCash ID format to WC-XXX-XXX-XXX
-- ============================================================

DROP TRIGGER IF EXISTS set_wavcash_id ON public.users;
DROP FUNCTION IF EXISTS public.generate_wavcash_id() CASCADE;

CREATE FUNCTION public.generate_wavcash_id()
RETURNS trigger AS $$
DECLARE
  new_id text;
  exists_already boolean;
BEGIN
  LOOP
    new_id := 'WC-' || upper(substr(md5(random()::text), 1, 3))
           || '-' || upper(substr(md5(random()::text), 1, 3))
           || '-' || upper(substr(md5(random()::text), 1, 3));
    SELECT EXISTS(SELECT 1 FROM public.users WHERE wavcash_id = new_id) INTO exists_already;
    EXIT WHEN NOT exists_already;
  END LOOP;
  new.wavcash_id := new_id;
  RETURN new;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_wavcash_id
  BEFORE INSERT ON public.users
  FOR EACH ROW
  WHEN (new.wavcash_id IS NULL)
  EXECUTE FUNCTION public.generate_wavcash_id();

-- ============================================================
-- 7. Convert FK columns to text and re-add constraints
-- ============================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='artists' AND column_name='user_id' AND data_type='uuid') THEN
    ALTER TABLE public.artists ALTER COLUMN user_id TYPE text USING user_id::text;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='royalty_statements' AND column_name='user_id' AND data_type='uuid') THEN
    ALTER TABLE public.royalty_statements ALTER COLUMN user_id TYPE text USING user_id::text;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='splits' AND column_name='created_by' AND data_type='uuid') THEN
    ALTER TABLE public.splits ALTER COLUMN created_by TYPE text USING created_by::text;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='split_contributors' AND column_name='user_id' AND data_type='uuid') THEN
    ALTER TABLE public.split_contributors ALTER COLUMN user_id TYPE text USING user_id::text;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='cmo_registrations' AND column_name='user_id' AND data_type='uuid') THEN
    ALTER TABLE public.cmo_registrations ALTER COLUMN user_id TYPE text USING user_id::text;
  END IF;
END;
$$;

ALTER TABLE public.artists ADD CONSTRAINT artists_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.royalty_statements ADD CONSTRAINT royalty_statements_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.splits ADD CONSTRAINT splits_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.split_contributors ADD CONSTRAINT split_contributors_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.cmo_registrations ADD CONSTRAINT cmo_registrations_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
