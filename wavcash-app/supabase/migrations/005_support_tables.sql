-- Support tickets table
CREATE TABLE support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',              -- open | in_progress | resolved | archived
  has_wavcash_account BOOLEAN,
  wavcash_id TEXT,
  initial_message TEXT,                             -- first thing user typed (triggers ticket creation)
  request_detail TEXT,                              -- detailed request entered at step 4
  session_id TEXT NOT NULL,                         -- anonymous session identifier (stored in localStorage)
  user_privy_id TEXT,                               -- set if user is logged in via Privy
  telegram_notification_msg_id BIGINT,              -- Telegram message ID — admin replies to this to respond
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

-- Support messages (full transcript)
CREATE TABLE support_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  sender TEXT NOT NULL,  -- 'user' | 'agent' | 'system'
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Telegram bot state — only used for delete confirmations
CREATE TABLE telegram_bot_state (
  telegram_user_id BIGINT PRIMARY KEY,
  action TEXT NOT NULL,           -- 'awaiting_delete_confirm'
  ticket_id UUID REFERENCES support_tickets(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL
);

-- Indexes
CREATE INDEX idx_support_tickets_status ON support_tickets(status);
CREATE INDEX idx_support_tickets_session ON support_tickets(session_id);
CREATE INDEX idx_support_tickets_tg_msg ON support_tickets(telegram_notification_msg_id);
CREATE INDEX idx_support_messages_ticket ON support_messages(ticket_id, created_at);

-- Auto-incrementing ticket number sequence
CREATE SEQUENCE IF NOT EXISTS support_ticket_seq START 1;

-- Trigger: auto-generate ticket number on insert
CREATE OR REPLACE FUNCTION generate_ticket_number() RETURNS TRIGGER AS $$
BEGIN
  NEW.ticket_number := 'TKT-' || LPAD(nextval('support_ticket_seq')::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_ticket_number
  BEFORE INSERT ON support_tickets
  FOR EACH ROW EXECUTE FUNCTION generate_ticket_number();

-- Trigger: auto-update updated_at
CREATE OR REPLACE FUNCTION update_support_ticket_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_support_tickets_updated_at
  BEFORE UPDATE ON support_tickets
  FOR EACH ROW EXECUTE FUNCTION update_support_ticket_updated_at();

-- RLS: only service role can access (all ops are server-side)
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE telegram_bot_state ENABLE ROW LEVEL SECURITY;
