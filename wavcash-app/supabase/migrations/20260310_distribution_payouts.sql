-- Per-contributor payout records from on-chain distribution events.
-- Each row represents one PaymentReleased or TokenPaymentReleased event
-- decoded from a distribution transaction receipt.

CREATE TABLE IF NOT EXISTS distribution_payouts (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  distribution_id  uuid NOT NULL REFERENCES distributions ON DELETE CASCADE,
  wallet_address   text NOT NULL,
  token_type       text NOT NULL,        -- 'native', 'usdc', 'eurc'
  amount           text NOT NULL,        -- raw wei/units as string (full precision)
  amount_decimal   numeric(24,8),        -- human-readable (18 decimals AVAX, 6 decimals tokens)
  tx_hash          text NOT NULL,
  created_at       timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_distribution_payouts_dist ON distribution_payouts(distribution_id);
CREATE INDEX IF NOT EXISTS idx_distribution_payouts_wallet ON distribution_payouts(wallet_address);
ALTER TABLE distribution_payouts ENABLE ROW LEVEL SECURITY;

-- RLS policies: server-side inserts use service role (bypasses RLS).
-- Users can read their own payouts by wallet address.
CREATE POLICY "Users can read own payouts"
  ON distribution_payouts FOR SELECT
  USING (
    wallet_address IN (
      SELECT lower(wallet_address) FROM users WHERE id = auth.uid()::text
    )
  );

-- Contributors on a split can read all payouts for that split's distributions
CREATE POLICY "Split contributors can read split payouts"
  ON distribution_payouts FOR SELECT
  USING (
    distribution_id IN (
      SELECT d.id FROM distributions d
      JOIN split_contributors sc ON sc.split_id = d.split_id
      WHERE sc.user_id = auth.uid()::text
    )
  );
