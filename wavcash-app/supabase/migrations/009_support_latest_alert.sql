-- Track the most recent Telegram alert message ID per ticket so agents can
-- reply to the latest follow-up alert without needing the support_messages
-- telegram_alert_msg_id index (migration 007).
ALTER TABLE support_tickets
  ADD COLUMN latest_alert_msg_id BIGINT;
