# FreePass

A **free** platform for studios and class discovery. Find classes nearby on a map, search and filter by type and schedule, and sign up for free trials. Built for studios—no fees. Built with Next.js and SQLite.

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

### 1. Environment variables

```bash
cp .env.local.example .env.local
```

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_APP_URL` | Site origin for auth redirects and emails |
| `DATABASE_PATH` | Optional path to the SQLite file (defaults to `./data/freepass.db`) |
| `RESEND_API_KEY` | Optional; enables magic-link + trial signup emails |
| `EMAIL_FROM` | Optional From address for Resend |

Without `RESEND_API_KEY`, magic-link URLs are printed to the server console so local login still works.

The SQLite schema is created automatically on first boot. See `db/schema.sql` for a readable reference.

### 2. Run the app

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
- **SQLite** (`better-sqlite3`) — local file database for studios, auth sessions, and rate limits
- **Leaflet** + **OpenStreetMap** / Nominatim — Map + geocoding
- **Resend** — Optional transactional email (magic links + trial notices)

## Security model

- `management_key` is only used server-side for legacy claim links.
- Studio/class writes go through server actions after verifying the signed-in owner session.
- Trial inserts are rate-limited and unique on `(studio_id, email)`.
- Session cookies are httpOnly; magic-link and session tokens are stored hashed.

## Roadmap

- Class registration and payments to the studio through the app, with no platform fee for studios.
- Richer owner dashboard (multi-studio list, trial inbox UI).
- Dedicated hosted database when traffic warrants it.
