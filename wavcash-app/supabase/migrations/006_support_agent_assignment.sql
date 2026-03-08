-- Add agent assignment columns to support_tickets
ALTER TABLE support_tickets
  ADD COLUMN assigned_to_telegram_id BIGINT,
  ADD COLUMN assigned_to_name TEXT;

-- Add pending_content to telegram_bot_state for held-reply confirmations
ALTER TABLE telegram_bot_state
  ADD COLUMN pending_content TEXT;
