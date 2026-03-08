-- WavCash Seed Data
-- DSP per-stream rates and CMO directory

-- ============================================================
-- DSP RATES (as of Q1 2025, industry estimates)
-- Sources:
--   Spotify global: Loud & Clear report (~$10K per 1M streams), TuneCore, Royalty Exchange
--   Spotify NG: BusinessDay Nigeria (~$400 per 1M local streams)
--   Apple Music: Apple Music for Artists official ($0.01 avg for individual paid plans)
--   Tidal: Royalty Exchange ($0.012-0.015 range)
--   YouTube/Amazon: Royalty Exchange, industry aggregates
--   Country rates: Derived from subscription price ratios where direct data unavailable
-- ============================================================

insert into public.dsp_rates (platform, country, rate_per_stream, effective_date, source) values
  -- Spotify (global avg ~$0.004, varies widely by market)
  ('spotify', null, 0.004000, '2025-01-01', 'industry_avg'),
  ('spotify', 'US', 0.004500, '2025-01-01', 'industry_avg'),
  ('spotify', 'GB', 0.003800, '2025-01-01', 'industry_avg'),
  ('spotify', 'NG', 0.000400, '2025-01-01', 'derived'),  -- ~$400 per 1M streams (BusinessDay NG)
  ('spotify', 'BR', 0.001500, '2025-01-01', 'derived'),   -- ~$3.50/mo sub, ~38% of US rate
  ('spotify', 'ZA', 0.001500, '2025-01-01', 'derived'),   -- ~$3.33/mo sub, similar to BR
  ('spotify', 'MX', 0.002000, '2025-01-01', 'derived'),   -- ~$4/mo sub
  ('spotify', 'KE', 0.000500, '2025-01-01', 'derived'),   -- Similar market to NG

  -- Apple Music (global avg ~$0.01, paid-only so less variance)
  ('apple_music', null, 0.010000, '2025-01-01', 'official'),  -- Apple's published avg
  ('apple_music', 'US', 0.010000, '2025-01-01', 'official'),
  ('apple_music', 'GB', 0.009000, '2025-01-01', 'industry_avg'),
  ('apple_music', 'NG', 0.004000, '2025-01-01', 'derived'),
  ('apple_music', 'BR', 0.006000, '2025-01-01', 'derived'),
  ('apple_music', 'ZA', 0.006000, '2025-01-01', 'derived'),
  ('apple_music', 'MX', 0.007000, '2025-01-01', 'derived'),
  ('apple_music', 'KE', 0.004000, '2025-01-01', 'derived'),

  -- YouTube Music (global avg ~$0.002, heavy ad-supported variance)
  ('youtube_music', null, 0.002000, '2025-01-01', 'industry_avg'),
  ('youtube_music', 'US', 0.003000, '2025-01-01', 'industry_avg'),
  ('youtube_music', 'NG', 0.000300, '2025-01-01', 'derived'),
  ('youtube_music', 'BR', 0.000800, '2025-01-01', 'derived'),
  ('youtube_music', 'ZA', 0.000800, '2025-01-01', 'derived'),
  ('youtube_music', 'MX', 0.001000, '2025-01-01', 'derived'),
  ('youtube_music', 'KE', 0.000300, '2025-01-01', 'derived'),

  -- Amazon Music (global avg ~$0.005)
  ('amazon_music', null, 0.005000, '2025-01-01', 'industry_avg'),
  ('amazon_music', 'US', 0.005000, '2025-01-01', 'industry_avg'),
  ('amazon_music', 'BR', 0.003000, '2025-01-01', 'derived'),
  ('amazon_music', 'MX', 0.003000, '2025-01-01', 'derived'),

  -- Tidal (global avg ~$0.013, premium positioning)
  ('tidal', null, 0.013000, '2025-01-01', 'industry_avg'),
  ('tidal', 'US', 0.013000, '2025-01-01', 'industry_avg'),

  -- Deezer (user-centric model, highly variable)
  ('deezer', null, 0.004000, '2025-01-01', 'industry_avg'),
  ('deezer', 'BR', 0.002000, '2025-01-01', 'derived'),
  ('deezer', 'NG', 0.001000, '2025-01-01', 'derived');

-- ============================================================
-- CMO DIRECTORY
-- Sources (as of Q1 2026):
--   Nigeria: NCC (Nigerian Copyright Commission), MCSN official, COSON official
--   Kenya: KECOBO licensing records (Oct/Nov 2025), PAVRISK official
--   South Africa: SAMRO, CAPASSO, SAMPRA official sites
--   Brazil: ECAD, ABRAMUS, UBC official sites, MBW
--   Ghana: GHAMRO official, Ghana Copyright Office
-- ============================================================

insert into public.cmo_directory (code, name, country, website, registration_url, submission_channel, royalty_types, required_documents, processing_time, notes) values
  -- ── Nigeria ──────────────────────────────────────────────────
  (
    'MCSN',
    'Musical Copyright Society of Nigeria',
    'NG',
    'https://www.mcsnnigeria.org',
    'https://www.mcsnnigeria.org/membership/registration/',
    'Online portal + email',
    '{"performance", "mechanical", "neighboring"}',
    '[
      {"type": "national_id", "label": "National ID (NIN or Passport)", "formats": ["pdf", "jpg", "png"]},
      {"type": "proof_of_ownership", "label": "Proof of Song Ownership (Copyright Certificate or Affidavit)", "formats": ["pdf"]},
      {"type": "discography", "label": "Complete Discography with ISRCs", "formats": ["pdf", "csv"]}
    ]',
    '4-8 weeks',
    'Nigeria''s only NCC-approved CMO (as of Jan 2025). Free membership. Covers performance, mechanical, and neighboring rights.'
  ),
  (
    'COSON',
    'Copyright Society of Nigeria',
    'NG',
    'https://www.cosonng.com',
    'https://www.cosonng.com',
    'Physical office + online inquiry',
    '{"performance", "mechanical"}',
    '[
      {"type": "national_id", "label": "National ID (NIN or Passport)", "formats": ["pdf", "jpg", "png"]},
      {"type": "proof_of_ownership", "label": "Proof of Song Ownership", "formats": ["pdf"]},
      {"type": "discography", "label": "Complete Discography with ISRCs", "formats": ["pdf", "csv"]}
    ]',
    '6-10 weeks',
    'License suspended by NCC since 2017 over governance disputes. Court order maintains status quo. Register with MCSN for guaranteed coverage.'
  ),
  -- ── Kenya ────────────────────────────────────────────────────
  (
    'PAVRISK',
    'Performing and Audio-Visual Rights Society of Kenya',
    'KE',
    'https://pavrisk.or.ke',
    'https://pavrisk.or.ke',
    'Online portal',
    '{"performance", "mechanical", "neighboring"}',
    '[
      {"type": "national_id", "label": "National ID or Passport", "formats": ["pdf", "jpg", "png"]},
      {"type": "proof_of_ownership", "label": "Proof of Authorship", "formats": ["pdf"]},
      {"type": "discography", "label": "List of Works with ISRCs", "formats": ["pdf", "csv"]}
    ]',
    '4-6 weeks',
    'Kenya''s primary KECOBO-licensed CMO (as of 2025). Covers composers, performers, and audiovisual rights. Formerly PRISK.'
  ),
  (
    'KAMP',
    'Kenya Association of Music Producers',
    'KE',
    'https://www.kamp.or.ke',
    'https://www.kampmember.or.ke',
    'Online portal',
    '{"neighboring"}',
    '[
      {"type": "national_id", "label": "National ID or Passport", "formats": ["pdf", "jpg", "png"]},
      {"type": "proof_of_ownership", "label": "Proof of Master Ownership or Label Agreement", "formats": ["pdf"]},
      {"type": "discography", "label": "Catalog with ISRCs", "formats": ["pdf", "csv"]}
    ]',
    '4-6 weeks',
    'KECOBO-licensed (Oct 2025). Handles neighboring rights for record labels and producers. Covers PSVs, new media platforms.'
  ),
  (
    'MCSK',
    'Music Copyright Society of Kenya',
    'KE',
    'https://mcsk.africa',
    'https://mcsk.africa',
    'Online portal',
    '{"performance", "mechanical"}',
    '[
      {"type": "national_id", "label": "National ID or Passport", "formats": ["pdf", "jpg", "png"]},
      {"type": "proof_of_ownership", "label": "Proof of Authorship (Notarized or Publisher Letter)", "formats": ["pdf"]},
      {"type": "discography", "label": "List of Works with ISRCs", "formats": ["pdf", "csv"]}
    ]',
    '4-6 weeks',
    'License denied by KECOBO (Feb 2026). Barred from collecting royalties pending court hearing July 2026. 16,000+ members. Register with PAVRISK instead for guaranteed coverage.'
  ),
  -- ── South Africa ─────────────────────────────────────────────
  (
    'SAMRO',
    'Southern African Music Rights Organisation',
    'ZA',
    'https://www.samro.org.za',
    'https://portal.samro.org.za',
    'Online portal',
    '{"performance"}',
    '[
      {"type": "national_id", "label": "South African ID or Passport", "formats": ["pdf", "jpg", "png"]},
      {"type": "proof_of_ownership", "label": "Proof of Authorship", "formats": ["pdf"]},
      {"type": "bank_details", "label": "Banking Details for Payouts", "formats": ["pdf"]}
    ]',
    '6-8 weeks',
    'Handles performance royalties in South Africa. For mechanical rights, register separately with CAPASSO.'
  ),
  (
    'CAPASSO',
    'Composers, Authors and Publishers Association',
    'ZA',
    'https://www.capasso.co.za',
    'https://www.capasso.co.za/register',
    'Online portal + physical',
    '{"mechanical"}',
    '[
      {"type": "national_id", "label": "South African ID or Passport", "formats": ["pdf", "jpg", "png"]},
      {"type": "proof_of_ownership", "label": "Publisher Agreement or Self-Declaration", "formats": ["pdf"]},
      {"type": "discography", "label": "Complete Work List with ISRCs/ISWCs", "formats": ["pdf", "csv"]}
    ]',
    '6-10 weeks',
    'Handles mechanical royalties in South Africa. Works alongside SAMRO for full coverage.'
  ),
  (
    'SAMPRA',
    'South African Music Performance Rights Association',
    'ZA',
    'https://www.sampra.org.za',
    'https://www.sampra.org.za/recording-artist-application/',
    'Online portal + SAMPRA mobile app',
    '{"neighboring"}',
    '[
      {"type": "national_id", "label": "South African ID or Passport", "formats": ["pdf", "jpg", "png"]},
      {"type": "proof_of_ownership", "label": "Proof of Recording (Release or Label Agreement)", "formats": ["pdf"]},
      {"type": "bank_details", "label": "Banking Details for Payouts", "formats": ["pdf"]}
    ]',
    '4-6 weeks',
    'Handles needletime/neighboring rights for recording artists, session musicians, producers, and backing vocalists. Free membership. Has a mobile app for tracking.'
  ),
  -- ── Brazil ───────────────────────────────────────────────────
  (
    'ECAD',
    'Escritorio Central de Arrecadacao e Distribuicao',
    'BR',
    'https://www4.ecad.org.br',
    'https://www4.ecad.org.br/associacoes/',
    'Via affiliated associations only',
    '{"performance", "mechanical"}',
    '[
      {"type": "national_id", "label": "CPF and RG (Brazilian ID)", "formats": ["pdf", "jpg", "png"]},
      {"type": "proof_of_ownership", "label": "Proof of Authorship (Registro na Biblioteca Nacional or equivalent)", "formats": ["pdf"]},
      {"type": "discography", "label": "List of Works with ISRCs", "formats": ["pdf", "csv"]}
    ]',
    '4-6 weeks',
    'Brazil''s central collection office. Must register through one of the affiliated associations (ABRAMUS, AMAR, SBACEM, SICAM, SOCINPRO, or UBC-BR). Collected BRL 1.83 billion in 2024.'
  ),
  (
    'ABRAMUS',
    'Associacao Brasileira de Musica e Artes',
    'BR',
    'https://www.abramus.org.br',
    'https://www.abramus.org.br',
    'Online portal',
    '{"performance", "neighboring"}',
    '[
      {"type": "national_id", "label": "CPF and RG (Brazilian ID)", "formats": ["pdf", "jpg", "png"]},
      {"type": "proof_of_ownership", "label": "Proof of Authorship or Recording", "formats": ["pdf"]},
      {"type": "discography", "label": "List of Works with ISRCs", "formats": ["pdf", "csv"]}
    ]',
    '4-6 weeks',
    'ECAD affiliate. Largest by membership (70,000+). Handles 80% of neighboring rights phonogram registrations. Best for recording artists and producers.'
  ),
  (
    'UBC-BR',
    'Uniao Brasileira de Compositores',
    'BR',
    'https://www.ubc.org.br',
    'https://www.ubc.org.br',
    'Online portal',
    '{"performance", "mechanical", "neighboring"}',
    '[
      {"type": "national_id", "label": "CPF and RG (Brazilian ID)", "formats": ["pdf", "jpg", "png"]},
      {"type": "proof_of_ownership", "label": "Proof of Authorship", "formats": ["pdf"]},
      {"type": "discography", "label": "List of Works with ISRCs/ISWCs", "formats": ["pdf", "csv"]}
    ]',
    '4-6 weeks',
    'ECAD affiliate. Largest by revenue share (~60%). Dedicated neighboring rights division (Sony, Warner). Best for songwriters and composers. Founded 1942.'
  ),
  -- ── Ghana ────────────────────────────────────────────────────
  (
    'GHAMRO',
    'Ghana Music Rights Organization',
    'GH',
    'https://ghamroonline.org',
    'https://ghamroonline.org/creators/',
    'Online portal + physical',
    '{"performance", "mechanical", "neighboring"}',
    '[
      {"type": "national_id", "label": "Ghana Card or Passport", "formats": ["pdf", "jpg", "png"]},
      {"type": "proof_of_ownership", "label": "Proof of Authorship or Publisher Agreement", "formats": ["pdf"]},
      {"type": "discography", "label": "Complete Catalog with ISRCs", "formats": ["pdf", "csv"]}
    ]',
    '4-8 weeks',
    'Ghana''s sole government-mandated CMO under Copyright Act 690. Covers composers, performers, and producers. 4,000+ members. Mobile Money payout supported.'
  );
