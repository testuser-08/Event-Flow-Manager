-- Migration v3 — Profile avatars
-- Run in Supabase Dashboard → SQL Editor:
-- https://supabase.com/dashboard/project/hauihebqnjsjmxtzjdax/sql/new

ALTER TABLE volunteers ADD COLUMN IF NOT EXISTS avatar_url TEXT;
