-- Store Telegram alert message ID on support_messages so agents can
-- reply to user follow-up alerts (not just the original notification).
ALTER TABLE support_messages
  ADD COLUMN telegram_alert_msg_id BIGINT;

CREATE INDEX idx_support_messages_tg_alert
  ON support_messages(telegram_alert_msg_id)
  WHERE telegram_alert_msg_id IS NOT NULL;
