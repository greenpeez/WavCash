-- 010: Notifications table for in-app notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    text NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type       text NOT NULL CHECK (type IN (
    'payout_received', 'split_signed', 'all_signed', 'agreement_live'
  )),
  title      text NOT NULL,
  body       text NOT NULL,
  read       boolean DEFAULT false,
  metadata   jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications(user_id) WHERE NOT read;

-- Disable RLS (using service role for all operations, consistent with migration 003)
ALTER TABLE public.notifications DISABLE ROW LEVEL SECURITY;
