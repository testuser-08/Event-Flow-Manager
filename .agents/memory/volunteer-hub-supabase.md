---
name: Volunteer Hub Supabase setup
description: The Supabase schema is not auto-applied; the user must run supabase/setup.sql manually once in the Supabase SQL editor before the app works.
---

**Rule:** Tables (`volunteers`, `channels`, `messages`, `alerts`), RLS policies, storage bucket, and channel seeds all live in `supabase/setup.sql`. This file must be run once in the Supabase SQL editor before any API endpoints or auth flows work.

**Why:** Supabase JS client with service role cannot execute arbitrary DDL. The management API (separate token) is not configured. Schema creation is a one-time manual step via the dashboard SQL editor.

**How to apply:** Whenever the user reports "table not found" errors or after a fresh Supabase project is connected, direct them to:
1. Go to https://supabase.com/dashboard/project/hauihebqnjsjmxtzjdax/sql
2. Paste and run the full contents of `supabase/setup.sql`
3. In Auth → URL Configuration: set Site URL and add redirect URL
4. Restart API server after schema is applied
