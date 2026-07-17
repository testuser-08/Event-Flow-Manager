# Volunteer Hub

Real-time event coordination tool for ~200 volunteers at a corporate customer summit. Replaces WhatsApp group chaos with a single, structured, fast tool — per-workstream channels, urgency-tagged messages, photo uploads, emergency alert button, and an admin dashboard.

## Run & Operate

- `pnpm --filter @workspace/volunteer-hub run dev` — run the frontend (port 18818, preview at `/`)
- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080, at `/api`)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks from OpenAPI spec

## Stack

- **Frontend**: React + Vite (artifacts/volunteer-hub), Supabase JS client for auth/realtime/storage
- **Backend**: Express 5 (artifacts/api-server), Supabase service role for admin operations
- **Auth/DB/Realtime**: Supabase (hauihebqnjsjmxtzjdax.supabase.co)
- **Hosting**: Replit (dev), Vercel (recommended for production)
- pnpm workspaces, Node.js 24, TypeScript 5.9
- API codegen: Orval (from OpenAPI spec in lib/api-spec/openapi.yaml)

## First-time setup — REQUIRED

**Run `supabase/setup.sql` once in the Supabase SQL editor:**
https://supabase.com/dashboard/project/hauihebqnjsjmxtzjdax/sql

This creates all tables (volunteers, channels, messages, alerts), RLS policies,
the message-photos storage bucket, and seeds the six workstream channels.

**Also configure in Supabase Dashboard → Authentication → URL Configuration:**
- Site URL: your app's deployed URL (e.g. https://your-app.vercel.app)
- Redirect URLs: same URL (magic link emails redirect here after click)

## Where things live

- `artifacts/volunteer-hub/src/` — React frontend
  - `src/pages/login.tsx` — magic link auth page
  - `src/pages/channels.tsx` — channel list (volunteer view)
  - `src/pages/channel.tsx` — real-time chat per channel
  - `src/pages/admin/` — admin dashboard and roster
  - `src/contexts/AuthContext.tsx` — session + volunteer state
  - `src/lib/supabase.ts` — Supabase anon client
- `artifacts/api-server/src/routes/` — Express routes
  - `admin-setup.ts` — POST /api/admin/setup (seeds channels)
  - `admin-roster.ts` — GET/POST /api/admin/roster, PATCH/DELETE /api/admin/volunteers/:id
  - `channels-summary.ts` — GET /api/channels/summary (admin dashboard)
  - `alerts-active.ts` — GET /api/alerts/active (admin dashboard)
- `supabase/setup.sql` — one-time schema migration
- `lib/api-spec/openapi.yaml` — API contract source of truth

## Channels (pre-seeded)

- All Hands (announcements — admin post only)
- Content Operations Team
- Public Relations
- Registrations
- Track Managers
- Misc On Ground

## Secrets required

- `SUPABASE_SERVICE_ROLE_KEY` — Supabase service role key (for API server admin ops)

## Environment variables (shared)

- `SUPABASE_URL` / `VITE_SUPABASE_URL` — Supabase project URL
- `SUPABASE_ANON_KEY` / `VITE_SUPABASE_ANON_KEY` — Supabase anon/public key
- `ALLOWED_EMAIL_DOMAIN` — email domain restriction (default: sap.com)

## Architecture decisions

- Supabase client used directly from frontend for auth, realtime, and chat CRUD — no Express round-trip needed for the hot path
- Express API server handles admin-only operations requiring service role key (CSV upload, volunteer management, dashboard aggregates)
- RLS policies on all tables; service role bypasses them for admin ops
- Email domain restriction enforced at app level (before signInWithOtp) and at CSV upload time
- Channels are not self-serve — volunteers are pre-loaded via roster CSV

## User preferences

_Populate as you build._

## Gotchas

- Run supabase/setup.sql BEFORE testing auth (magic links will succeed but app will error without tables)
- Set Supabase Auth site URL to your deployed URL before inviting volunteers (magic link redirect will fail)
- After uploading roster CSV, volunteers must use the same email address to log in — Supabase auth is email-based
- The `volunteer-hub` frontend workflow must be restarted after `VITE_*` env var changes
