-- Ensure all columns from initial schema exist on cmo_registrations.
-- The table may have been created without some columns depending on
-- which migrations actually ran in production.

ALTER TABLE cmo_registrations ADD COLUMN IF NOT EXISTS selected_track_ids uuid[] DEFAULT '{}';
ALTER TABLE cmo_registrations ADD COLUMN IF NOT EXISTS documents jsonb DEFAULT '[]';
ALTER TABLE cmo_registrations ADD COLUMN IF NOT EXISTS personal_info jsonb DEFAULT '{}';
ALTER TABLE cmo_registrations ADD COLUMN IF NOT EXISTS submission_date date;
ALTER TABLE cmo_registrations ADD COLUMN IF NOT EXISTS rejection_reason text;
ALTER TABLE cmo_registrations ADD COLUMN IF NOT EXISTS notes text;

-- New: track wizard step position for save-and-resume.
ALTER TABLE cmo_registrations ADD COLUMN IF NOT EXISTS current_step text DEFAULT 'info';
