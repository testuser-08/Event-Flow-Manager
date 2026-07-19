-- Migration v6: voice notes support
-- Run this in your Supabase SQL editor

ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS voice_note_url text;
