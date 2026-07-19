---
name: Volunteer Hub Supabase setup
description: DB setup, migration history, and auth architecture for the Volunteer Hub event app.
---

## Initial setup
- Run `supabase/setup.sql` once in the Supabase SQL editor to create tables, channels, RLS policies, and storage bucket.
- Tables not auto-created — manual step required.

## Migration v2 (custom JWT auth swap)
- Run `supabase/migration-v2.sql` after setup.sql.
- What it does:
  - Drops FK constraints on `messages` and `alerts` to `auth.users` (we now store volunteer UUIDs there instead)
  - Renames `volunteers.workstream TEXT` → `volunteers.workstreams TEXT[]` (supports multiple workstreams per person)
  - Updates RLS to allow anon reads on channels, messages, alerts, volunteers (needed for Supabase Realtime without a Supabase Auth session)
  - Updates storage policy to allow anon photo uploads to `message-photos`

## Auth architecture (post-migration)
- **No Supabase Auth** — OTP/magic-link removed entirely.
- Login: `POST /api/auth/login` — checks email against volunteers table, returns signed JWT.
- JWT signed with `SESSION_SECRET` Replit secret, stored in `localStorage` as `vhub_token`, 24h expiry.
- JWT payload: `{ volunteerId, email, name, workstreams: string[], isAdmin }`
- `GET /api/auth/me` — validates JWT + re-checks email is still on roster (evicts removed users on next page load).
- Frontend: `setAuthTokenGetter(() => localStorage.getItem('vhub_token'))` is called in AuthProvider so all Orval-generated hooks automatically send `Authorization: Bearer <token>`.
- All DB writes (messages, alerts) route through the API server (service role bypasses RLS).
- Supabase anon client is still used in the frontend for Realtime subscriptions (read-only, no auth).

## Key schema notes
- `volunteers.auth_user_id` column left nullable and unused after migration — do not drop it.
- `volunteers.workstreams TEXT[]` supports multiple workstream rows per person in the CSV.
- Generated OpenAPI Volunteer type still has `workstream: string | null` (singular) — not regenerated; roster page casts to `any` to handle the array at runtime.
- `messages.user_id` and `alerts.user_id` now store `volunteer.id` (UUID) after FK drop.
