-- User satisfaction rating (1–5) submitted after ticket is closed
ALTER TABLE support_tickets
  ADD COLUMN rating SMALLINT CHECK (rating >= 1 AND rating <= 5);
