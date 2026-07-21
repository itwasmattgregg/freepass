# FreePass

A **free** platform for studios and class discovery. Find classes nearby on a map, search and filter by type and schedule, and sign up for free trials. Built for studios—no fees. Built with Next.js and Supabase.

## Features

- **Map discovery** — See studios and classes on a map; pan and zoom to find what’s nearby.
- **Search and filter** — Search by name/description/address; filter by class type, “Free trial only,” and day of week.
- **Studio owner auth** — Magic-link login (no password). Owners manage profile and schedule while signed in.
- **Smooth listing flow** — Address → Find on map (geocode) → duplicate checks → create.
- **Duplicate prevention** — Blocks/warns when another studio is already listed at the same normalized address or within ~80m.
- **One trial per email per studio** — Enforced in the database; rate-limited to reduce abuse.
- **Trial notifications** — Optional email to the studio via Resend when someone claims a trial.
- **Coming later** — Class registration and paying the studio through the app, still free for studios.

## Setup

### 1. Supabase project

1. Create a project at [supabase.com](https://supabase.com).
2. Run `supabase/schema.sql` in the SQL Editor (fresh installs), **or** apply migrations in order under `supabase/migrations/` if upgrading.
3. In **Authentication → URL configuration**, add redirect URLs:
   - `http://localhost:3000/auth/callback`
   - `https://your-domain.com/auth/callback`

### 2. Environment variables

```bash
cp .env.local.example .env.local
```

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable key (`sb_publishable_…`); legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY` also works |
| `SUPABASE_SECRET_KEY` | Server-only secret (`sb_secret_…`); legacy `SUPABASE_SERVICE_ROLE_KEY` also works |
| `NEXT_PUBLIC_APP_URL` | Site origin for auth redirects and emails |
| `RESEND_API_KEY` | Optional; enables trial signup emails |
| `EMAIL_FROM` | Optional From address for Resend |

### 3. Run the app

Requires **Node.js 20+**.

```bash
npm install --legacy-peer-deps
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Usage

- **Discover** — Map + sidebar; no account required.
- **List your studio** — Sign in with magic link → enter details → **Find on map** → create (duplicate warnings if address/nearby match).
- **Manage** — Edit profile, add/remove classes while signed in. Legacy `?key=` manage links can claim ownership once after login.
- **Trial signup** — One email per studio; studio contact email is notified when configured.

## Tech stack

- **Next.js** (App Router), **TypeScript**, **Tailwind CSS**
- **Supabase** — Postgres, Auth, RLS (public read; mutations via service role after auth checks)
- **Leaflet** + **OpenStreetMap** / Nominatim — Map + geocoding
- **Resend** — Optional transactional email

## Security model

- `management_key` is not readable by anon/authenticated clients.
- Studio/class writes go through server actions using the **service role**, after verifying the signed-in owner.
- Trial inserts are rate-limited and unique on `(studio_id, lower(email))`.

## Roadmap

- Class registration and payments to the studio through the app, with no platform fee for studios.
- Richer owner dashboard (multi-studio list, trial inbox UI).
