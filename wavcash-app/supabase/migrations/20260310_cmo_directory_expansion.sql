-- Extend cmo_directory with global CMO support fields
ALTER TABLE cmo_directory ADD COLUMN IF NOT EXISTS region text;
ALTER TABLE cmo_directory ADD COLUMN IF NOT EXISTS self_registration boolean DEFAULT true;
ALTER TABLE cmo_directory ADD COLUMN IF NOT EXISTS registration_cost text;
ALTER TABLE cmo_directory ADD COLUMN IF NOT EXISTS royalty_category text;
ALTER TABLE cmo_directory ADD COLUMN IF NOT EXISTS accepts_international boolean DEFAULT false;
ALTER TABLE cmo_directory ADD COLUMN IF NOT EXISTS publisher_registration boolean DEFAULT false;
ALTER TABLE cmo_directory ADD COLUMN IF NOT EXISTS display_order integer DEFAULT 0;

-- Ensure cmo_registrations has the cmo_code column (may be missing if table
-- was created outside the initial schema migration)
ALTER TABLE cmo_registrations ADD COLUMN IF NOT EXISTS cmo_code text;

-- Unique constraint to prevent duplicate registrations
CREATE UNIQUE INDEX IF NOT EXISTS idx_cmo_registrations_user_cmo
  ON cmo_registrations(user_id, cmo_code);

-- Seed: Africa
INSERT INTO cmo_directory (code, name, country, website, registration_url, submission_channel, royalty_types, required_documents, processing_time, notes, region, self_registration, registration_cost, royalty_category, accepts_international, publisher_registration, display_order)
VALUES
  ('mcsn', 'MCSN', 'NG', 'https://mfrb.gov.ng', 'https://mfrb.gov.ng', 'portal', '{performance}', '[]', '2-4 weeks', 'Mechanical Copyright Society Nigeria. Collects mechanical reproduction royalties.', 'africa', true, 'free', 'performance', false, false, 10),
  ('coson', 'COSON', 'NG', 'https://www.cosonng.com', 'https://www.cosonng.com/registration', 'portal', '{performance}', '[{"type":"id","label":"Valid ID (passport or national ID)","formats":["pdf","jpg","png"]},{"type":"catalog","label":"Track listing with ISRCs","formats":["pdf","csv"]}]', '2-4 weeks', 'Copyright Society of Nigeria. PRO for performance royalties.', 'africa', true, 'free', 'performance', false, false, 11),
  ('samro', 'SAMRO', 'ZA', 'https://www.samro.org.za', 'https://www.samro.org.za/node/1401', 'portal', '{performance}', '[{"type":"id","label":"Valid ID","formats":["pdf","jpg","png"]},{"type":"catalog","label":"Work notification forms","formats":["pdf"]}]', '4-8 weeks', 'South African Music Rights Organisation. PRO for performance royalties.', 'africa', true, 'varies', 'performance', false, false, 12),
  ('capasso', 'CAPASSO', 'ZA', 'https://www.capasso.co.za', 'https://www.capasso.co.za/become-a-member', 'portal', '{mechanical}', '[{"type":"id","label":"Valid ID","formats":["pdf","jpg","png"]},{"type":"catalog","label":"Track listing with ISRCs","formats":["pdf","csv"]}]', '4-8 weeks', 'Composers, Authors and Publishers Association of South Africa. Mechanical royalties.', 'africa', true, 'varies', 'mechanical', false, false, 13),
  ('sampra', 'SAMPRA', 'ZA', 'https://www.sampra.org.za', 'https://www.sampra.org.za/registration', 'portal', '{neighboring_rights}', '[{"type":"id","label":"Valid ID","formats":["pdf","jpg","png"]},{"type":"catalog","label":"Track listing with ISRCs","formats":["pdf","csv"]}]', '4-8 weeks', 'South African Music Performance Rights Association. Neighboring rights for performers.', 'africa', true, 'varies', 'neighboring_rights', false, false, 14),
  ('ghamro', 'GHAMRO', 'GH', 'https://www.ghamro.org', 'https://www.ghamro.org', 'email', '{performance}', '[{"type":"id","label":"Valid ID","formats":["pdf","jpg","png"]},{"type":"catalog","label":"Track listing","formats":["pdf","csv"]}]', '4-8 weeks', 'Ghana Music Rights Organisation. PRO for performance royalties in Ghana.', 'africa', true, 'varies', 'performance', false, false, 15)
ON CONFLICT (code) DO UPDATE SET
  region = EXCLUDED.region,
  self_registration = EXCLUDED.self_registration,
  registration_cost = EXCLUDED.registration_cost,
  royalty_category = EXCLUDED.royalty_category,
  accepts_international = EXCLUDED.accepts_international,
  publisher_registration = EXCLUDED.publisher_registration,
  display_order = EXCLUDED.display_order,
  website = EXCLUDED.website,
  registration_url = EXCLUDED.registration_url,
  submission_channel = EXCLUDED.submission_channel,
  royalty_types = EXCLUDED.royalty_types,
  required_documents = EXCLUDED.required_documents,
  processing_time = EXCLUDED.processing_time,
  notes = EXCLUDED.notes;

-- Seed: Latin America
INSERT INTO cmo_directory (code, name, country, website, registration_url, submission_channel, royalty_types, required_documents, processing_time, notes, region, self_registration, registration_cost, royalty_category, accepts_international, publisher_registration, display_order)
VALUES
  ('ecad', 'ECAD', 'BR', 'https://www.ecad.org.br', 'https://www.ecad.org.br', 'portal', '{performance}', '[{"type":"id","label":"CPF and valid ID","formats":["pdf","jpg","png"]},{"type":"catalog","label":"Track listing","formats":["pdf","csv"]}]', '4-8 weeks', 'Central Collection and Distribution Office. Umbrella for Brazilian PROs.', 'latam', true, 'varies', 'performance', false, false, 20),
  ('ubc', 'UBC', 'BR', 'https://www.ubc.org.br', 'https://www.ubc.org.br/filiacao', 'portal', '{performance}', '[{"type":"id","label":"CPF and valid ID","formats":["pdf","jpg","png"]},{"type":"catalog","label":"Track listing","formats":["pdf","csv"]}]', '4-8 weeks', 'Brazilian Union of Composers. PRO affiliate under ECAD.', 'latam', true, 'varies', 'performance', false, false, 21),
  ('abramus', 'ABRAMUS', 'BR', 'https://www.abramus.org.br', 'https://www.abramus.org.br', 'portal', '{performance}', '[{"type":"id","label":"CPF and valid ID","formats":["pdf","jpg","png"]},{"type":"catalog","label":"Track listing","formats":["pdf","csv"]}]', '4-8 weeks', 'Brazilian Music Association. PRO affiliate under ECAD.', 'latam', true, 'varies', 'performance', false, false, 22),
  ('sacm', 'SACM', 'MX', 'https://www.sacm.org.mx', 'https://www.sacm.org.mx', 'portal', '{performance}', '[{"type":"id","label":"INE or passport","formats":["pdf","jpg","png"]},{"type":"catalog","label":"Track listing with ISRCs","formats":["pdf","csv"]}]', '4-8 weeks', 'Society of Authors and Composers of Mexico. PRO for performance royalties.', 'latam', true, 'varies', 'performance', false, false, 23)
ON CONFLICT (code) DO UPDATE SET
  region = EXCLUDED.region,
  self_registration = EXCLUDED.self_registration,
  registration_cost = EXCLUDED.registration_cost,
  royalty_category = EXCLUDED.royalty_category,
  accepts_international = EXCLUDED.accepts_international,
  publisher_registration = EXCLUDED.publisher_registration,
  display_order = EXCLUDED.display_order,
  website = EXCLUDED.website,
  registration_url = EXCLUDED.registration_url,
  submission_channel = EXCLUDED.submission_channel,
  royalty_types = EXCLUDED.royalty_types,
  required_documents = EXCLUDED.required_documents,
  processing_time = EXCLUDED.processing_time,
  notes = EXCLUDED.notes;

-- Seed: North America
INSERT INTO cmo_directory (code, name, country, website, registration_url, submission_channel, royalty_types, required_documents, processing_time, notes, region, self_registration, registration_cost, royalty_category, accepts_international, publisher_registration, display_order)
VALUES
  ('ascap', 'ASCAP', 'US', 'https://www.ascap.com', 'https://www.ascap.com/help/career-development/How-To-Join', 'portal', '{performance}', '[{"type":"id","label":"Government-issued ID","formats":["pdf","jpg","png"]},{"type":"catalog","label":"Work registration form","formats":["pdf"]}]', '2-4 weeks', 'American Society of Composers, Authors and Publishers. Writer membership is free. Publisher membership available for self-published songwriters.', 'north_america', true, 'free', 'performance', false, true, 1),
  ('bmi', 'BMI', 'US', 'https://www.bmi.com', 'https://www.bmi.com/join', 'portal', '{performance}', '[{"type":"id","label":"Government-issued ID","formats":["pdf","jpg","png"]},{"type":"catalog","label":"Work registration form","formats":["pdf"]}]', '2-4 weeks', 'Broadcast Music, Inc. Writer membership is free. Publisher registration requires a $150 one-time fee.', 'north_america', true, '$150 one-time (publisher)', 'performance', false, true, 2),
  ('mlc', 'The MLC', 'US', 'https://www.themlc.com', 'https://www.themlc.com/register', 'portal', '{mechanical}', '[{"type":"id","label":"Government-issued ID or SSN/EIN","formats":["pdf"]},{"type":"catalog","label":"Musical work data (song titles, ISWCs, ISRCs)","formats":["pdf","csv"]}]', '2-6 weeks', 'The Mechanical Licensing Collective. Collects and distributes digital audio mechanical royalties from streaming services in the US. Registration is free and open to songwriters worldwide.', 'north_america', true, 'free', 'mechanical', true, false, 3),
  ('soundexchange', 'SoundExchange', 'US', 'https://www.soundexchange.com', 'https://www.soundexchange.com/artist-registration/', 'portal', '{digital_performance}', '[{"type":"id","label":"Government-issued ID","formats":["pdf","jpg","png"]},{"type":"catalog","label":"Track listing with ISRCs","formats":["pdf","csv"]}]', '2-4 weeks', 'Collects digital performance royalties from non-interactive streaming (Pandora, SiriusXM, internet radio) and webcasting. Registration is free and open to artists worldwide. Featured artists receive 45%, non-featured artists receive 5% via AFM/SAG-AFTRA fund, sound recording copyright owners receive 50%.', 'north_america', true, 'free', 'digital_performance', true, false, 4),
  ('socan', 'SOCAN', 'CA', 'https://www.socan.com', 'https://www.socan.com/join-socan/', 'portal', '{performance}', '[{"type":"id","label":"Government-issued ID","formats":["pdf","jpg","png"]},{"type":"catalog","label":"Work registration form","formats":["pdf"]}]', '2-4 weeks', 'Society of Composers, Authors and Music Publishers of Canada. PRO for performance royalties in Canada.', 'north_america', true, 'free', 'performance', false, false, 5),
  ('cmrra', 'CMRRA', 'CA', 'https://www.cmrra.ca', 'https://www.cmrra.ca', 'portal', '{mechanical}', '[{"type":"id","label":"Publisher or songwriter ID","formats":["pdf"]},{"type":"catalog","label":"Musical work data","formats":["pdf","csv"]}]', '4-8 weeks', 'Canadian Musical Reproduction Rights Agency. Collects mechanical royalties in Canada.', 'north_america', true, 'free', 'mechanical', false, false, 6)
ON CONFLICT (code) DO UPDATE SET
  region = EXCLUDED.region,
  self_registration = EXCLUDED.self_registration,
  registration_cost = EXCLUDED.registration_cost,
  royalty_category = EXCLUDED.royalty_category,
  accepts_international = EXCLUDED.accepts_international,
  publisher_registration = EXCLUDED.publisher_registration,
  display_order = EXCLUDED.display_order,
  website = EXCLUDED.website,
  registration_url = EXCLUDED.registration_url,
  submission_channel = EXCLUDED.submission_channel,
  royalty_types = EXCLUDED.royalty_types,
  required_documents = EXCLUDED.required_documents,
  processing_time = EXCLUDED.processing_time,
  notes = EXCLUDED.notes;

-- Seed: Europe / UK
INSERT INTO cmo_directory (code, name, country, website, registration_url, submission_channel, royalty_types, required_documents, processing_time, notes, region, self_registration, registration_cost, royalty_category, accepts_international, publisher_registration, display_order)
VALUES
  ('prs', 'PRS for Music', 'GB', 'https://www.prsformusic.com', 'https://www.prsformusic.com/join', 'portal', '{performance,mechanical}', '[{"type":"id","label":"Passport or driving licence","formats":["pdf","jpg","png"]},{"type":"catalog","label":"Work notification forms","formats":["pdf"]}]', '4-8 weeks', 'UK performing right society. Collects performance and mechanical royalties for writers and publishers in the UK. One-time joining fee.', 'europe', true, '£100 one-time', 'performance', false, false, 30),
  ('ppl', 'PPL', 'GB', 'https://www.ppluk.com', 'https://www.ppluk.com/join/', 'portal', '{neighboring_rights}', '[{"type":"id","label":"Government-issued ID","formats":["pdf","jpg","png"]},{"type":"catalog","label":"Track listing with ISRCs","formats":["pdf","csv"]}]', '4-8 weeks', 'PPL collects neighboring rights royalties from UK radio, TV, and public performance for performers and recording rights holders. Accepts registrations from performers worldwide. Registration is free.', 'europe', true, 'free', 'neighboring_rights', true, false, 31),
  ('sacem', 'SACEM', 'FR', 'https://www.sacem.fr', 'https://www.sacem.fr/en/join-sacem', 'portal', '{performance,mechanical}', '[{"type":"id","label":"Valid ID","formats":["pdf","jpg","png"]},{"type":"catalog","label":"Work registration forms","formats":["pdf"]}]', '4-8 weeks', 'French society for authors, composers and music publishers. Collects performance and mechanical royalties in France.', 'europe', true, 'varies', 'performance', false, false, 32),
  ('gema', 'GEMA', 'DE', 'https://www.gema.de', 'https://www.gema.de/en/music-creators/become-a-member', 'portal', '{performance,mechanical}', '[{"type":"id","label":"Valid ID","formats":["pdf","jpg","png"]},{"type":"catalog","label":"Work notification forms","formats":["pdf"]}]', '4-8 weeks', 'German performance rights organisation. Collects performance and mechanical royalties in Germany.', 'europe', true, 'varies', 'performance', false, false, 33)
ON CONFLICT (code) DO UPDATE SET
  region = EXCLUDED.region,
  self_registration = EXCLUDED.self_registration,
  registration_cost = EXCLUDED.registration_cost,
  royalty_category = EXCLUDED.royalty_category,
  accepts_international = EXCLUDED.accepts_international,
  publisher_registration = EXCLUDED.publisher_registration,
  display_order = EXCLUDED.display_order,
  website = EXCLUDED.website,
  registration_url = EXCLUDED.registration_url,
  submission_channel = EXCLUDED.submission_channel,
  royalty_types = EXCLUDED.royalty_types,
  required_documents = EXCLUDED.required_documents,
  processing_time = EXCLUDED.processing_time,
  notes = EXCLUDED.notes;
