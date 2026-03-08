-- Lifecycle events for the split activity timeline.
-- Tracks onchain events: deployment, each signature, activation, voiding.
CREATE TABLE IF NOT EXISTS public.split_events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  split_id    uuid NOT NULL REFERENCES public.splits ON DELETE CASCADE,
  event_type  text NOT NULL CHECK (event_type IN ('deployed', 'signed', 'activated', 'voided')),
  tx_hash     text,
  data        jsonb DEFAULT '{}',
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_split_events_split ON public.split_events(split_id, created_at);

ALTER TABLE public.split_events DISABLE ROW LEVEL SECURITY;

-- Slot assignment for each contributor (maps to contract slot index).
ALTER TABLE public.split_contributors ADD COLUMN IF NOT EXISTS slot_index integer;
