-- ============================================================
-- Volunteer Hub — Migration v2
-- Run this in the Supabase SQL editor AFTER setup.sql
-- https://supabase.com/dashboard/project/hauihebqnjsjmxtzjdax/sql
-- ============================================================

-- 1. Drop FK constraints to auth.users so we can use volunteer IDs instead
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_user_id_fkey;
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_resolved_by_fkey;
ALTER TABLE alerts  DROP CONSTRAINT IF EXISTS alerts_user_id_fkey;
ALTER TABLE alerts  DROP CONSTRAINT IF EXISTS alerts_acknowledged_by_fkey;
ALTER TABLE alerts  DROP CONSTRAINT IF EXISTS alerts_resolved_by_fkey;

-- 2. Change volunteers.workstream (TEXT) → workstreams (TEXT[])
ALTER TABLE volunteers ADD COLUMN IF NOT EXISTS workstreams TEXT[] DEFAULT '{}';
UPDATE volunteers
  SET workstreams = ARRAY[workstream]
  WHERE workstream IS NOT NULL AND workstream <> '';
ALTER TABLE volunteers DROP COLUMN IF EXISTS workstream;

-- 3. Open up RLS so anon users can read (needed for Supabase Realtime
--    without a Supabase Auth session)
DROP POLICY IF EXISTS "channels_read"      ON channels;
DROP POLICY IF EXISTS "messages_read"      ON messages;
DROP POLICY IF EXISTS "messages_insert"    ON messages;
DROP POLICY IF EXISTS "messages_update"    ON messages;
DROP POLICY IF EXISTS "alerts_read"        ON alerts;
DROP POLICY IF EXISTS "alerts_insert"      ON alerts;
DROP POLICY IF EXISTS "alerts_update"      ON alerts;
DROP POLICY IF EXISTS "volunteers_read_own" ON volunteers;

-- Allow anon + authenticated reads for realtime subscriptions
CREATE POLICY "channels_read_all"   ON channels   FOR SELECT USING (true);
CREATE POLICY "messages_read_all"   ON messages   FOR SELECT USING (true);
CREATE POLICY "alerts_read_all"     ON alerts     FOR SELECT USING (true);
CREATE POLICY "volunteers_read_all" ON volunteers  FOR SELECT USING (true);

-- All writes go through API server (service role), so no INSERT/UPDATE
-- policies are needed for anon/authenticated — service role bypasses RLS.

-- 4. Allow anon photo uploads (storage policy)
DROP POLICY IF EXISTS "photos_upload" ON storage.objects;
CREATE POLICY "photos_upload_all" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'message-photos');

-- Done. The app now uses custom JWT auth; Supabase Auth is no longer used.
