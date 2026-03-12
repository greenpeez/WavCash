-- Publisher statement support: extend royalty_statements and statement_lines
-- to handle publisher CSVs (AMRA, etc.) alongside existing distributor CSVs.

-- Add statement_type to distinguish distributor vs publisher uploads
ALTER TABLE royalty_statements ADD COLUMN IF NOT EXISTS statement_type text
  DEFAULT 'distributor' CHECK (statement_type IN ('distributor', 'publisher'));

-- Add publisher-specific fields to statement_lines
ALTER TABLE statement_lines ADD COLUMN IF NOT EXISTS income_type text;
ALTER TABLE statement_lines ADD COLUMN IF NOT EXISTS source_name text;
ALTER TABLE statement_lines ADD COLUMN IF NOT EXISTS iswc text;
ALTER TABLE statement_lines ADD COLUMN IF NOT EXISTS share_received numeric(5,2);
ALTER TABLE statement_lines ADD COLUMN IF NOT EXISTS gross_earnings numeric(12,4);

-- Indexes for publisher line queries and general performance
CREATE INDEX IF NOT EXISTS idx_statement_lines_iswc ON statement_lines(iswc);
CREATE INDEX IF NOT EXISTS idx_statement_lines_income_type ON statement_lines(income_type);
CREATE INDEX IF NOT EXISTS idx_statement_lines_statement_id ON statement_lines(statement_id);
