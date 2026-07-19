# Customer Support Summit — Volunteer Hub

Real-time ops coordination app for the SAP Customer Support Summit. Volunteers log in with their `@sap.com` email and access workstream channels, the event agenda, breakout sessions, and (for admins) a management panel.

**Stack:** React + Vite (frontend) · Express.js (API) · Supabase (database + auth + realtime) · pnpm workspaces

---

## Running locally on your laptop

### 1. Install the required software

You need **Node.js 20 or later** and **pnpm 9 or later**.

- Download Node.js: https://nodejs.org/en/download (choose the "LTS" version)
- After installing Node, open a terminal and install pnpm:
  ```
  npm install -g pnpm
  ```
- Verify both are installed:
  ```
  node --version   # should print v20.x.x or higher
  pnpm --version   # should print 9.x.x or higher
  ```

### 2. Get the code

```
git clone https://github.com/YOUR-USERNAME/YOUR-REPO-NAME.git
cd YOUR-REPO-NAME
```

### 3. Install dependencies

From the root of the project, run:

```
pnpm install
```

This installs everything for all packages in the monorepo at once.

### 4. Set up your environment variables

Copy the example file and fill in your values:

```
cp .env.example .env
```

Open `.env` in any text editor and fill in the real values. Here is what each one means:

| Variable | Where to find it | Notes |
|---|---|---|
| `SUPABASE_URL` | Supabase dashboard → Settings → API → Project URL | Same value for both `SUPABASE_URL` and `VITE_SUPABASE_URL` |
| `VITE_SUPABASE_URL` | Same as above | Needed by the frontend at build time |
| `SUPABASE_ANON_KEY` | Supabase dashboard → Settings → API → `anon public` key | Same value for both anon key variables |
| `VITE_SUPABASE_ANON_KEY` | Same as above | Needed by the frontend at build time |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase dashboard → Settings → API → `service_role` key | **Keep this secret — server side only** |
| `SESSION_SECRET` | Any long random string | Generate one: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` |
| `ALLOWED_EMAIL_DOMAIN` | — | Set to `sap.com` (or your domain) |
| `PORT` | — | `5000` is fine for local dev |
| `BASE_PATH` | — | Set to `/` |

Your completed `.env` should look like:

```env
SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...
SESSION_SECRET=a1b2c3d4e5f6...long random string...
ALLOWED_EMAIL_DOMAIN=sap.com
PORT=5000
BASE_PATH=/
```

### 5. Set up the database

The first time you run the app, you need to create the database tables. Open the [Supabase SQL editor](https://supabase.com/dashboard) for your project and run these files **in order**:

1. `supabase/setup.sql` — base schema
2. `supabase/migration-v2.sql` — JWT auth
3. `supabase/migration-v3.sql` — avatar support
4. `supabase/migration-v4.sql` — agenda and breakout sessions
5. `supabase/migration-v5.sql` — first-login welcome flag

### 6. Start the app

You need two terminals running at the same time:

**Terminal 1 — API server:**
```
pnpm --filter @workspace/api-server run dev
```

**Terminal 2 — Frontend:**
```
pnpm --filter @workspace/volunteer-hub run dev
```

Then open your browser to: **http://localhost:5000**

Log in with a `@sap.com` email address. The first account to log in is automatically made an admin.

---

## Deploying to Vercel (free)

This project is configured to deploy the frontend as a static site and the API as a Vercel serverless function — both on Vercel's free Hobby tier.

### Environment variables to add in Vercel

Go to your Vercel project → **Settings → Environment Variables** and add:

| Variable | Value | Environments |
|---|---|---|
| `VITE_SUPABASE_URL` | your Supabase project URL | Production, Preview, Development |
| `VITE_SUPABASE_ANON_KEY` | your Supabase anon key | Production, Preview, Development |
| `SUPABASE_URL` | your Supabase project URL | Production, Preview, Development |
| `SUPABASE_ANON_KEY` | your Supabase anon key | Production, Preview, Development |
| `SUPABASE_SERVICE_ROLE_KEY` | your Supabase service role key | Production, Preview, Development |
| `SESSION_SECRET` | any long random string | Production, Preview, Development |
| `ALLOWED_EMAIL_DOMAIN` | `sap.com` | Production, Preview, Development |

> `BASE_PATH` is already set to `/` in `vercel.json` — you don't need to add it manually.

### After deploying

Once Vercel gives you a live URL (e.g. `https://your-app.vercel.app`), go to your Supabase project → **Authentication → URL Configuration** and add that URL to:
- **Site URL**
- **Redirect URLs**

---

## Project structure

```
├── artifacts/
│   ├── volunteer-hub/      # React + Vite frontend
│   ├── api-server/         # Express.js API
│   └── volunteer-mobile/   # Expo React Native mobile app (optional)
├── lib/
│   ├── api-zod/            # Shared Zod schemas + OpenAPI spec
│   ├── api-client-react/   # Auto-generated React Query hooks
│   └── db/                 # Drizzle ORM schema
├── supabase/               # SQL migration files
├── api/
│   └── handler.ts          # Vercel serverless entry point
└── vercel.json             # Vercel deployment config
```

---

## Admin access

The first volunteer to log in is automatically granted admin access. Admins can:
- Manage the volunteer roster
- Post to any channel (not just their workstream)
- Edit agenda items and breakout sessions
- View and dismiss active alerts
