# Gathr

Find people nearby for offline plans: football at 9, a trek at sunrise, a jam on Saturday. Hosts post a plan, people nearby join in two taps, and a group chat opens with the exact venue.

**Live:** https://gathr-meetup.vercel.app

Requirements: [`BRD.md`](BRD.md) · Learning notes (what each library or concept is and why): [`notes.md`](notes.md)

## Stack

Next.js 16 (App Router, Cache Components) · React 19 · TypeScript (strict) · Tailwind CSS 4 + shadcn/ui · PostgreSQL 17 + PostGIS (Docker) · Prisma 7 · Better Auth (magic link, optional Google) · Zod · React Hook Form · TanStack Query · react-leaflet · Vitest · Playwright + axe-core

## Getting started

You need **Node 20+**, **Docker** and **Google Chrome** (for the browser tests).

```bash
npm install                 # also generates the Prisma client
cp .env.example .env        # then set BETTER_AUTH_SECRET (openssl rand -base64 32)
docker compose up -d        # Postgres + PostGIS on :5432
npx prisma migrate deploy   # create the tables
npm run db:seed             # categories + demo plans around Pune
npm run dev                 # http://localhost:3000
```

**Signing in locally:** there's no email service in development, so the magic link is printed in the terminal running `npm run dev`. Open it in the same browser. Google sign-in turns on when `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set.

**Admin access:** `npm run make-admin -- you@example.com`, then use **Admin · moderation** in the account menu.

## Scripts

| Command                                        | What it does                                     |
| ---------------------------------------------- | ------------------------------------------------ |
| `npm run dev`                                  | Dev server on :3000                              |
| `npm run build` / `npm start`                  | Production build / serve it                      |
| `npm run lint` · `type-check`                  | ESLint · TypeScript                              |
| `npm test`                                     | Unit tests (Vitest)                              |
| `npm run test:db`                              | Database tests (join transactions and capacity)  |
| `npm run test:e2e`                             | Browser tests + accessibility scans (Playwright) |
| `npm run test:e2e:report`                      | Open the last Playwright report                  |
| `npm run db:migrate` · `db:studio` · `db:seed` | Prisma migrate (dev) · DB browser · seed         |

The Playwright suite uses its own `@e2e.gathr.test` accounts and cleans up after itself. If a dev server is already running, it reuses it.

## Project layout

```
src/
  app/            routes (App Router). (marketing) = landing page, (app) = signed-in area
  features/       one folder per feature: actions · queries · schemas · components
                  activity · discover · join · chat · notifications · safety · admin · profile · auth · geo
  components/     shared UI (shadcn/ui, layout, brand)
  lib/            auth, db, session, geo, images, storage, time helpers
prisma/           schema, migrations, seed
tests/e2e/        Playwright specs, global setup, fixtures
```

## Quality

### Lighthouse (M8)

Lighthouse 12, default mobile profile (simulated slow 4G, 4× CPU throttling). Measured against the production build on 2026-10-27; each score is the median of 3 runs after a warm-up request.

| Page                      | Performance | Accessibility | Best practices | SEO |
| ------------------------- | :---------: | :-----------: | :------------: | :-: |
| `/` (landing)             |     92      |      100      |      100       | 100 |
| `/explore`                |     90      |      100      |      100       | 100 |
| `/activities/[id]` (plan) |     92      |      100      |       96       | 91  |
| `/sign-in`                |     96      |      100      |      100       | 100 |

Cumulative layout shift is 0 on every page, and total blocking time is ≤ 40 ms.

The plan page loses a few points for two reasons. Both are known and accepted:

- **Best practices 96:** the map uses OpenStreetMap's standard tiles, which aren't high-DPI.
- **SEO 91:** Next 16 streams page metadata to regular browsers. Link-preview bots (WhatsApp, Slack…) still get the description in `<head>`, but Lighthouse's user agent doesn't, so it reports it missing.

To reproduce:

```bash
npm run build && npx next start -p 3100
CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  npx lighthouse@12 http://localhost:3100/explore --chrome-flags="--headless=new" --view
```

### Tests

- **Unit:** 69 tests covering validation schemas, the profanity filter, geo and venue-privacy rules, time, Explore filters and plan status.
- **Database:** join capacity under concurrent requests (no overbooking).
- **Browser:** 17 end-to-end flows (sign-in, explore, host, join, chat, report/block/admin).
- **Accessibility:** axe scans of 15 key pages with zero serious or critical issues.
- **CI:** GitHub Actions runs lint, type-check, unit, database and browser tests on every push (`.github/workflows/ci.yml`).

## Deployment

| Piece                     | Service                    | Notes                                                                                                                  |
| ------------------------- | -------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| App (pages + server code) | Vercel                     | Every push to `main` deploys. The build runs `prisma migrate deploy && next build` (`vercel.json`).                    |
| Database                  | Neon (Postgres + PostGIS)  | Connected through the Vercel integration, which sets `DATABASE_URL` (pooled) and `DATABASE_URL_UNPOOLED` (migrations). |
| Photos                    | Vercel Blob (public store) | Connected through the integration, which sets `BLOB_STORE_ID`. Login uses Vercel OIDC, so there's no long-lived token. |
| Sign-in                   | Google OAuth               | `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`. Redirect URI: `https://gathr-meetup.vercel.app/api/auth/callback/google`  |

Also set `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` and `SITE_URL` (the live URL) in Vercel. `src/lib/env.ts` checks all of these at startup and names anything missing in the logs. One-off production tasks:

```sh
DATABASE_URL="<neon direct url>" npx tsx prisma/seed.ts --categories-only   # 18 categories, no demo data
DATABASE_URL="<neon direct url>" npm run make-admin -- you@example.com
```

## Privacy note

Explore and its map never get exact coordinates, only the area name and an approximate location. On a plan page, the exact venue and pin go only to the host and approved members, unless the host chose to show the venue publicly (for example, an open run at a well-known park). The check is `canSeeExactVenue` in `src/lib/geo.ts`, and approximate coordinates are computed on the server, so hidden coordinates never reach the browser.
