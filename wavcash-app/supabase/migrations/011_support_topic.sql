-- Store the Telegram forum topic (message thread) ID on a ticket so
-- the full transcript can be posted there and replies in the topic are
-- routed back to the ticket automatically.
ALTER TABLE support_tickets ADD COLUMN telegram_topic_id BIGINT;
