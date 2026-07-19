-- ============================================================
-- Volunteer Hub — Migration v5: First-login welcome flag
-- Run this in the Supabase SQL editor AFTER migration-v4.sql
-- https://supabase.com/dashboard/project/hauihebqnjsjmxtzjdax/sql/new
-- ============================================================

ALTER TABLE volunteers ADD COLUMN IF NOT EXISTS has_seen_welcome BOOLEAN NOT NULL DEFAULT FALSE;
