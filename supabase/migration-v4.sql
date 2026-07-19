-- ============================================================
-- Volunteer Hub — Migration v4: Event Schedule (Agenda + Breakouts)
-- Run this in the Supabase SQL editor AFTER migration-v2.sql
-- https://supabase.com/dashboard/project/hauihebqnjsjmxtzjdax/sql
-- ============================================================

-- ── Agenda Items ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agenda_items (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  sort_order   INTEGER     NOT NULL DEFAULT 0,
  start_time   TEXT        NOT NULL, -- "HH:MM" 24-hr
  end_time     TEXT        NOT NULL,
  label        TEXT        NOT NULL,
  title        TEXT        NOT NULL,
  location     TEXT        NOT NULL DEFAULT '',
  is_breakout  BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE agenda_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "agenda_items_read_all" ON agenda_items FOR SELECT USING (true);

-- ── Breakout Tracks ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS breakout_tracks (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  slug         TEXT        UNIQUE NOT NULL,
  sort_order   INTEGER     NOT NULL DEFAULT 0,
  name         TEXT        NOT NULL,
  location     TEXT        NOT NULL DEFAULT '',
  color        TEXT        NOT NULL DEFAULT 'bg-blue-600',
  text_color   TEXT        NOT NULL DEFAULT 'text-blue-600 dark:text-blue-400',
  border_color TEXT        NOT NULL DEFAULT 'border-blue-600 dark:border-blue-400',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE breakout_tracks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "breakout_tracks_read_all" ON breakout_tracks FOR SELECT USING (true);

-- ── Breakout Sessions ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS breakout_sessions (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id   UUID        NOT NULL REFERENCES breakout_tracks(id) ON DELETE CASCADE,
  sort_order INTEGER     NOT NULL DEFAULT 0,
  zone       TEXT,
  title      TEXT        NOT NULL,
  start_time TEXT        NOT NULL,
  end_time   TEXT        NOT NULL,
  time_label TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE breakout_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "breakout_sessions_read_all" ON breakout_sessions FOR SELECT USING (true);

-- ── Seed Agenda Items ─────────────────────────────────────────────────────────
INSERT INTO agenda_items (sort_order, start_time, end_time, label, title, location, is_breakout) VALUES
  (1,  '08:30', '09:20', '08:30 AM – 09:20 AM', 'Registrations and Refreshments', 'Outside BLR05 Audimax', FALSE),
  (2,  '09:30', '09:45', '09:30 AM – 09:45 AM', 'Welcome Note by Stefan', 'BLR05 Audimax', FALSE),
  (3,  '09:45', '10:05', '09:45 AM – 10:05 AM', 'Customer Success Story', 'BLR05 Audimax', FALSE),
  (4,  '10:05', '10:40', '10:05 AM – 10:40 AM', 'Keynote: Rewiring Support for the Autonomous Enterprise', 'BLR05 Audimax', FALSE),
  (5,  '10:40', '10:50', '10:40 AM – 10:50 AM', 'Support Accreditation Launch', 'BLR05 Audimax', FALSE),
  (6,  '10:50', '11:20', '10:50 AM – 11:20 AM', 'Networking Break', 'Café Lounge and Hive', FALSE),
  (7,  '11:20', '12:00', '11:20 AM – 12:00 PM', 'Executive Panel Discussion: AI at the Center, Humans at the Core', 'BLR05 Audimax', FALSE),
  (8,  '12:00', '13:30', '12:00 PM – 01:30 PM', 'Lunch', 'BLR02 Indoor Cafeteria and BLR05 Canopy', FALSE),
  (9,  '13:30', '16:00', '01:30 PM – 04:00 PM', 'Breakout Session', 'Various zones across BLR05 (and BLR03 for MCC Walkthrough)', TRUE),
  (10, '16:00', '17:00', '04:00 PM – 05:00 PM', 'Guest Speaker Session – Meet Kenny Sebastian!', 'BLR05 Audimax', FALSE),
  (11, '17:00', '17:10', '05:00 PM – 05:10 PM', 'Thank You Note', 'BLR05 Audimax', FALSE),
  (12, '17:10', '17:45', '05:10 PM – 05:45 PM', 'High-Tea', 'BLR05 Canopy', FALSE),
  (13, '18:30', '21:30', '06:30 PM – 09:30 PM', 'Dinner (exclusive, at Oasis Brewery)', 'Oasis Brewery', FALSE)
ON CONFLICT DO NOTHING;

-- ── Seed Breakout Tracks ──────────────────────────────────────────────────────
INSERT INTO breakout_tracks (slug, sort_order, name, location, color, text_color, border_color) VALUES
  ('demopods',             1, 'Demopods',                    'BLR05 Experience Center',              'bg-blue-600',    'text-blue-600 dark:text-blue-400',    'border-blue-600 dark:border-blue-400'),
  ('demo-pods-ec',         2, 'Demo Pods (Experience Center)','BLR05 Experience Center',             'bg-cyan-600',    'text-cyan-600 dark:text-cyan-400',    'border-cyan-600 dark:border-cyan-400'),
  ('tech-talk',            3, 'Tech Talk',                   'Hive Space / Experience Center Tech Talk Zone 1', 'bg-violet-600', 'text-violet-600 dark:text-violet-400', 'border-violet-600 dark:border-violet-400'),
  ('design-thinking',      4, 'Design Thinking Zones',       'BLR05 First Floor Flexi Rooms',        'bg-emerald-600', 'text-emerald-600 dark:text-emerald-400','border-emerald-600 dark:border-emerald-400'),
  ('mcc-walkthrough',      5, 'MCC Walkthrough',             'BLR03 2B, 1st Floor MCC Room',         'bg-orange-500',  'text-orange-500 dark:text-orange-400', 'border-orange-500 dark:border-orange-400'),
  ('ask-expert',           6, 'Ask an Expert Corner',        'BLR05 Experience Center',              'bg-rose-600',    'text-rose-600 dark:text-rose-400',    'border-rose-600 dark:border-rose-400'),
  ('support-accreditation',7, 'Support Accreditation Zone',  'BLR05 Audimax',                        'bg-amber-500',   'text-amber-500 dark:text-amber-400',  'border-amber-500 dark:border-amber-400')
ON CONFLICT (slug) DO NOTHING;

-- ── Seed Breakout Sessions ────────────────────────────────────────────────────
-- Demopods sessions (slug: demopods)
INSERT INTO breakout_sessions (track_id, sort_order, zone, title, start_time, end_time, time_label)
SELECT t.id, s.sort_order, s.zone, s.title, s.start_time, s.end_time, s.time_label
FROM breakout_tracks t, (VALUES
  (1,  'Zone 1 (AI)', 'Joule in SAP for Me', '13:30', '14:00', '1:30 PM – 2:00 PM'),
  (2,  'Zone 2', 'Accenture: AI Agents Powering the Future of Customer Support', '13:30', '14:00', '1:30 PM – 2:00 PM'),
  (3,  'Zone 3', 'NTT: Work Smarter with Joule AI', '13:30', '14:00', '1:30 PM – 2:00 PM'),
  (4,  'Zone 4 (AI)', 'People Intelligence in Business Data Cloud (BDC)', '13:30', '14:00', '1:30 PM – 2:00 PM'),
  (5,  'Zone 5', 'Unlocking the New People Profile Experience', '13:30', '14:00', '1:30 PM – 2:00 PM'),
  (6,  'Zone 6', 'Cash Management in SAP S/4HANA Private Cloud: A Practical Migration Journey', '13:30', '14:00', '1:30 PM – 2:00 PM'),
  (7,  'Zone 1', 'Financial Consistency Analysis Agent', '14:00', '14:30', '2:00 PM – 2:30 PM'),
  (8,  'Zone 2', 'Accenture: ARIA – Adaptive & Responsive Intelligence for Autonomous Supply Chain', '14:00', '14:30', '2:00 PM – 2:30 PM'),
  (9,  'Zone 3', 'NTT: Work Smarter with Joule AI', '14:00', '14:30', '2:00 PM – 2:30 PM'),
  (10, 'Zone 4', 'Unlocking AI in SAP for Me for Procurement Customers: Joule, Generative AI & Business Insights', '14:00', '14:30', '2:00 PM – 2:30 PM'),
  (11, 'Zone 5', 'Getting started with Smartrecruiters', '14:00', '14:30', '2:00 PM – 2:30 PM'),
  (12, 'Zone 6', 'Introducing MDCA: The New Standard in Master Data Consistency', '14:00', '14:30', '2:00 PM – 2:30 PM'),
  (13, 'Zone 1', 'Discovering SAP Joule for Consultants', '14:30', '15:00', '2:30 PM – 3:00 PM'),
  (14, 'Zone 2', 'Centralizing SAP Business AI Feature Lifecycle Across SAP Cloud Solutions Using SAP CBC', '14:30', '15:00', '2:30 PM – 3:00 PM'),
  (15, 'Zone 3', 'SAP Concur: New Control Center Dashboard & AI generated Travel Policy Rules', '14:30', '15:00', '2:30 PM – 3:00 PM'),
  (16, 'Zone 4', 'Autonomous Selling: A Preview of SAP Sales Cloud V2''s AI Agents (H2 2026)', '14:30', '15:00', '2:30 PM – 3:00 PM'),
  (17, 'Zone 5', 'Planning Collaboration in NextGen', '14:30', '15:00', '2:30 PM – 3:00 PM'),
  (18, 'Zone 6', 'SAP Integration Suite: Common Design Pitfalls Leading to Out-of-Memory Issues and Failures', '14:30', '15:00', '2:30 PM – 3:00 PM'),
  (19, 'Zone 1', 'Joule In Procurement', '15:00', '15:30', '3:00 PM – 3:30 PM'),
  (20, 'Zone 2', 'Invisible Support, Visible Outcomes', '15:00', '15:30', '3:00 PM – 3:30 PM'),
  (21, 'Zone 3', 'E-Invoicing for Concur Expense', '15:00', '15:30', '3:00 PM – 3:30 PM'),
  (22, 'Zone 4', 'Support Supercharged – Driving Excellence with Tosca Automation', '15:00', '15:30', '3:00 PM – 3:30 PM'),
  (23, 'Zone 5', 'Data-Driven Advisory for RISE with SAP Customers', '15:00', '15:30', '3:00 PM – 3:30 PM'),
  (24, 'Zone 6', 'SAP Cloud Connector: Bridging Onpremise to Cloud', '15:00', '15:30', '3:00 PM – 3:30 PM'),
  (25, 'Zone 1', 'GenAI-Driven Extensibility in SAP S/4HANA Public Cloud: Empowering Developers with Joule', '15:30', '16:00', '3:30 PM – 4:00 PM'),
  (26, 'Zone 2', 'AI-Powered Intelligent Case Triaging – Accelerating Escalation Decisions', '15:30', '16:00', '3:30 PM – 4:00 PM'),
  (27, 'Zone 3', 'SAP Concur: Lifecycle of an expense report', '15:30', '16:00', '3:30 PM – 4:00 PM'),
  (28, 'Zone 4', 'SAP Intelligent Agriculture', '15:30', '16:00', '3:30 PM – 4:00 PM'),
  (29, 'Zone 5', 'AI Driven SAP MCC Support Tools', '15:30', '16:00', '3:30 PM – 4:00 PM'),
  (30, 'Zone 6', 'Impact of Client Authentication EKU Deprecation on SAP Integration Suite', '15:30', '16:00', '3:30 PM – 4:00 PM')
) AS s(sort_order, zone, title, start_time, end_time, time_label)
WHERE t.slug = 'demopods';

-- Demo Pods (Experience Center)
INSERT INTO breakout_sessions (track_id, sort_order, zone, title, start_time, end_time, time_label)
SELECT t.id, s.sort_order, s.zone, s.title, s.start_time, s.end_time, s.time_label
FROM breakout_tracks t, (VALUES
  (1, 'Zone 1', 'Private Cloud',       '13:30', '14:30', '1:30 PM – 2:30 PM'),
  (2, 'Zone 2', 'SuccessFactors',      '13:30', '14:30', '1:30 PM – 2:30 PM'),
  (3, 'Zone 3', 'Ariba/Procurement',   '13:30', '14:30', '1:30 PM – 2:30 PM'),
  (4, 'Zone 1', 'Public Cloud',        '14:30', '16:00', '2:30 PM – 4:00 PM'),
  (5, 'Zone 2', 'BTP',                 '14:30', '16:00', '2:30 PM – 4:00 PM'),
  (6, 'Zone 3', 'Concur',              '14:30', '16:00', '2:30 PM – 4:00 PM'),
  (7, 'Zone 4', 'I&CX',                '14:30', '16:00', '2:30 PM – 4:00 PM')
) AS s(sort_order, zone, title, start_time, end_time, time_label)
WHERE t.slug = 'demo-pods-ec';

-- Tech Talk
INSERT INTO breakout_sessions (track_id, sort_order, zone, title, start_time, end_time, time_label)
SELECT t.id, s.sort_order, s.zone, s.title, s.start_time, s.end_time, s.time_label
FROM breakout_tracks t, (VALUES
  (1,  'Hive Space',               'Navigating Legal Change with SAP: RCM, Roadmaps & More', '13:30', '14:00', '1:30 PM – 2:00 PM'),
  (2,  'Experience Center Zone 1', 'New Concur Travel', '13:30', '14:00', '1:30 PM – 2:00 PM'),
  (3,  'Hive Space',               'The Intelligent Support Experience: Powered by Joule and Real-Time Expert Engagement', '14:00', '14:30', '2:00 PM – 2:30 PM'),
  (4,  'Experience Center Zone 1', 'Business Network: Country/Region-Specific Tax Invoicing Process in NextGen', '14:00', '14:30', '2:00 PM – 2:30 PM'),
  (5,  'Hive Space',               'Joule Agentic AI for SuccessFactors BizX', '14:30', '15:00', '2:30 PM – 3:00 PM'),
  (6,  'Experience Center Zone 1', 'Forward Deployed Engineering (FDE)', '14:30', '15:00', '2:30 PM – 3:00 PM'),
  (7,  'Hive Space',               'Understanding Joule: Architecture, Authorization Flow, and Interaction Patterns', '15:00', '15:30', '3:00 PM – 3:30 PM'),
  (8,  'Experience Center Zone 1', 'From Reactive Support to Proactive Service with SAP', '15:00', '15:30', '3:00 PM – 3:30 PM'),
  (9,  'Hive Space',               'Foundational Support Services in Enterprise Support and SAP Cloud ALM', '15:30', '16:00', '3:30 PM – 4:00 PM'),
  (10, 'Experience Center Zone 1', 'SAP Business Suite – Case study with H2R', '15:30', '16:00', '3:30 PM – 4:00 PM')
) AS s(sort_order, zone, title, start_time, end_time, time_label)
WHERE t.slug = 'tech-talk';

-- Design Thinking Zones
INSERT INTO breakout_sessions (track_id, sort_order, zone, title, start_time, end_time, time_label)
SELECT t.id, s.sort_order, s.zone, s.title, s.start_time, s.end_time, s.time_label
FROM breakout_tracks t, (VALUES
  (1, 'Zone 2', 'Future of Support Arena',     '13:30', '14:30', '1:30 PM – 2:30 PM'),
  (2, 'Zone 1', 'SAP for Me Arena Session 1',  '14:30', '15:00', '2:30 PM – 3:00 PM'),
  (3, 'Zone 1', 'SAP for Me Arena Session 2',  '15:30', '16:00', '3:30 PM – 4:00 PM')
) AS s(sort_order, zone, title, start_time, end_time, time_label)
WHERE t.slug = 'design-thinking';

-- MCC Walkthrough
INSERT INTO breakout_sessions (track_id, sort_order, zone, title, start_time, end_time, time_label)
SELECT t.id, s.sort_order, s.zone, s.title, s.start_time, s.end_time, s.time_label
FROM breakout_tracks t, (VALUES
  (1, NULL, 'MCC Walkthrough', '13:30', '14:10', '1:30 PM – 2:10 PM'),
  (2, NULL, 'MCC Walkthrough', '14:20', '15:00', '2:20 PM – 3:00 PM'),
  (3, NULL, 'MCC Walkthrough', '15:00', '15:40', '3:00 PM – 3:40 PM')
) AS s(sort_order, zone, title, start_time, end_time, time_label)
WHERE t.slug = 'mcc-walkthrough';

-- Ask an Expert Corner
INSERT INTO breakout_sessions (track_id, sort_order, zone, title, start_time, end_time, time_label)
SELECT t.id, s.sort_order, s.zone, s.title, s.start_time, s.end_time, s.time_label
FROM breakout_tracks t, (VALUES
  (1, 'Zone 1', 'Public Cloud',       '13:30', '14:30', '1:30 PM – 2:30 PM'),
  (2, 'Zone 2', 'BTP',                '13:30', '14:30', '1:30 PM – 2:30 PM'),
  (3, 'Zone 3', 'Concur',             '13:30', '14:30', '1:30 PM – 2:30 PM'),
  (4, 'Zone 4', 'I&CX',               '13:30', '14:30', '1:30 PM – 2:30 PM'),
  (5, 'Zone 1', 'Private Cloud',      '14:30', '15:30', '2:30 PM – 3:30 PM'),
  (6, 'Zone 2', 'SuccessFactors',     '14:30', '15:30', '2:30 PM – 3:30 PM'),
  (7, 'Zone 3', 'Ariba/Procurement',  '14:30', '15:30', '2:30 PM – 3:30 PM')
) AS s(sort_order, zone, title, start_time, end_time, time_label)
WHERE t.slug = 'ask-expert';

-- Support Accreditation Zone
INSERT INTO breakout_sessions (track_id, sort_order, zone, title, start_time, end_time, time_label)
SELECT t.id, s.sort_order, s.zone, s.title, s.start_time, s.end_time, s.time_label
FROM breakout_tracks t, (VALUES
  (1, NULL, 'Give-away', '14:00', '14:30', '2:00 PM – 2:30 PM'),
  (2, NULL, 'Give-away', '15:00', '15:30', '3:00 PM – 3:30 PM')
) AS s(sort_order, zone, title, start_time, end_time, time_label)
WHERE t.slug = 'support-accreditation';
