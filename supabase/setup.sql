-- ============================================================
-- Volunteer Hub — Supabase setup SQL
-- Run this ONCE in the Supabase SQL editor (Dashboard → SQL Editor → New query)
-- https://supabase.com/dashboard/project/hauihebqnjsjmxtzjdax/sql
-- ============================================================

-- Volunteers table
CREATE TABLE IF NOT EXISTS volunteers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  workstream TEXT,
  is_admin BOOLEAN NOT NULL DEFAULT FALSE,
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Channels table
CREATE TABLE IF NOT EXISTS channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  is_announcements BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_name TEXT NOT NULL,
  content TEXT NOT NULL,
  urgency TEXT NOT NULL DEFAULT 'info' CHECK (urgency IN ('info', 'issue', 'urgent')),
  is_resolved BOOLEAN NOT NULL DEFAULT FALSE,
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,
  photo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Alerts table
CREATE TABLE IF NOT EXISTS alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  channel_name TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_name TEXT NOT NULL,
  note TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'acknowledged', 'resolved')),
  acknowledged_by UUID REFERENCES auth.users(id),
  acknowledged_by_name TEXT,
  acknowledged_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Enable Row Level Security
-- ============================================================
ALTER TABLE volunteers ENABLE ROW LEVEL SECURITY;
ALTER TABLE channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS Policies
-- ============================================================

-- Channels: all authenticated users can read
CREATE POLICY "channels_read" ON channels
  FOR SELECT TO authenticated USING (true);

-- Messages: authenticated users can read/insert/update
CREATE POLICY "messages_read" ON messages
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "messages_insert" ON messages
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "messages_update" ON messages
  FOR UPDATE TO authenticated
  USING (true) WITH CHECK (true);

-- Alerts: authenticated users can read/insert, update their own or admins
CREATE POLICY "alerts_read" ON alerts
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "alerts_insert" ON alerts
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "alerts_update" ON alerts
  FOR UPDATE TO authenticated
  USING (true) WITH CHECK (true);

-- Volunteers: service role manages; authenticated can read their own record
CREATE POLICY "volunteers_service_all" ON volunteers
  FOR ALL TO service_role USING (true);

CREATE POLICY "volunteers_read_own" ON volunteers
  FOR SELECT TO authenticated
  USING (auth_user_id = auth.uid());

-- ============================================================
-- Storage bucket for message photos
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
  VALUES ('message-photos', 'message-photos', true)
  ON CONFLICT (id) DO NOTHING;

CREATE POLICY "photos_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'message-photos');

CREATE POLICY "photos_read" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'message-photos');

-- ============================================================
-- Seed channels
-- ============================================================
-- Remove any channels not in the final list
DELETE FROM channels WHERE slug NOT IN (
  'admin','pr','sherpa','registration-desk','feedback',
  'support-acc','content-specialist','track-managers',
  'tshirt-distribution','sap-for-me'
);

INSERT INTO channels (name, slug, is_announcements) VALUES
  ('Admin', 'admin', false),
  ('PR', 'pr', false),
  ('Sherpa', 'sherpa', false),
  ('Registration Desk', 'registration-desk', false),
  ('Feedback', 'feedback', false),
  ('Support Acc', 'support-acc', false),
  ('Content Specialist', 'content-specialist', false),
  ('Track Managers', 'track-managers', false),
  ('Tshirt Distribution', 'tshirt-distribution', false),
  ('SAP for me', 'sap-for-me', false)
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, is_announcements = EXCLUDED.is_announcements;

-- ============================================================
-- Enable Realtime for messages and alerts
-- (run this too, in the SQL editor)
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE alerts;

-- ============================================================
-- IMPORTANT: In Supabase Dashboard → Authentication → URL Configuration:
-- Set "Site URL" to your app's URL (e.g. https://your-app.replit.app)
-- Add the same URL to "Redirect URLs" allowlist
-- ============================================================
