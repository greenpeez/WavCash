-- Enable RLS on all tables
-- Since we use the service role key server-side (which bypasses RLS),
-- enabling RLS with NO policies for the anon role means the anon key
-- gets zero access by default — a safety net against accidental client-side usage.

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE artists ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE split_contributors ENABLE ROW LEVEL SECURITY;
ALTER TABLE split_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE oracle_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE royalty_statements ENABLE ROW LEVEL SECURITY;
ALTER TABLE statement_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE distributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE cmo_directory ENABLE ROW LEVEL SECURITY;
ALTER TABLE calibrated_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE dsp_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE attestations ENABLE ROW LEVEL SECURITY;
ALTER TABLE cmo_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE sniffer_results ENABLE ROW LEVEL SECURITY;

-- No policies are created intentionally.
-- The anon key will get zero access (RLS defaults to deny).
-- The service role key bypasses RLS entirely.
