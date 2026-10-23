# Gathr — Learning Notes (plain language)

> Rule: every time we add a library or a concept, add a short "what / why / config" note here.
> Written for a React developer learning Next.js and full stack.

---

## 1. The big picture — how a request travels

```
Browser  →  Next.js server  →  Prisma  →  PostgreSQL
   ↑              |
   └── HTML + small JS ──┘
```

1. You open `/explore`.
2. Next.js runs the page **on the server**, asks Prisma for data, Prisma asks Postgres.
3. Server sends back ready HTML (fast first paint, good SEO) + only the JS needed for interactive bits.
4. When you click "Join", a **Server Action** runs on the server, writes to the DB, and the page refreshes its data.

In plain React (Vite) everything ran in the browser and you called a separate API. In Next.js the "API" can live right next to your component.

---

## 2. Next.js for a React developer

| React (Vite) habit            | Next.js App Router way                                                                            |
| ----------------------------- | ------------------------------------------------------------------------------------------------- |
| `react-router` routes in code | **Folders = routes.** `app/explore/page.tsx` → `/explore`                                         |
| `<Outlet />` layouts          | `layout.tsx` wraps all pages in that folder                                                       |
| `useEffect` + fetch for data  | `async` Server Component: `const data = await db.activity.findMany()`                             |
| Spinner state                 | `loading.tsx` file (automatic Suspense)                                                           |
| Error boundary                | `error.tsx` file                                                                                  |
| 404 page                      | `not-found.tsx`                                                                                   |
| Express/REST API              | **Server Actions** (functions with `"use server"`) or **Route Handlers** (`app/api/.../route.ts`) |
| `react-helmet`                | `export const metadata` or `generateMetadata()`                                                   |
| `.env` with `VITE_`           | `.env` — only vars starting `NEXT_PUBLIC_` reach the browser                                      |

### Key ideas

- **Server Component (default):** runs only on the server. Can read DB directly. Cannot use `useState`, `onClick`, browser APIs. Ships zero JS.
- **Client Component:** put `"use client"` at the top. Normal React with hooks and events. Use only where interaction is needed (map, forms, chat box).
- **Rule of thumb:** keep pages as Server Components, push `"use client"` down to the smallest leaf component.
- **Server Action:** an async function marked `"use server"`. You can pass it to a `<form action={...}>` or call it from a client component. It runs on the server — like a mini API endpoint without writing one. **Always validate input and check the user inside it** — anyone can call it.
- **Route Handler:** `app/api/xyz/route.ts` exporting `GET`, `POST`… Use for webhooks, polling endpoints, or anything an outside system calls.
- **Caching & revalidation:** Next can cache fetched data. After a mutation, call `revalidatePath('/explore')` or `revalidateTag('activities')` so users see fresh data.
- **Dynamic routes:** `app/activities/[id]/page.tsx` → `params.id`.
- **Route groups:** `(app)`, `(marketing)` folders organise code without changing the URL.
- **Middleware / proxy file:** runs before a request reaches a page — good for redirecting signed-out users.
- **searchParams:** filters like `?radius=5&cat=sports` are read on the server page, so filtered results are shareable links.
- **`next/image`, `next/font`, `next/link`:** optimised images, self-hosted fonts, prefetching links.

---

## 3. Config files — what each one does

| File                                   | What it is                                                                                                                                                 |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `package.json`                         | List of libraries + scripts (`dev`, `build`, `start`, `lint`)                                                                                              |
| `tsconfig.json`                        | TypeScript rules. Keep `"strict": true`. `paths` gives `@/` shortcut to `src/`                                                                             |
| `next.config.ts`                       | Next.js settings. Ours enables `cacheComponents` + `partialPrefetching` (Next 16 defaults) and wires the Tailwind loader for Turbopack                     |
| Tailwind CSS (v4)                      | No `tailwind.config` and no PostCSS file: Next 16 loads Tailwind via `@tailwindcss/turbopack` in `next.config.ts`; theme lives in `globals.css` (`@theme`) |
| `components.json`                      | shadcn/ui settings — where components get copied, style, alias paths                                                                                       |
| `eslint.config.mjs`                    | Lint rules (Next.js preset + TypeScript)                                                                                                                   |
| `.prettierrc.json` / `.prettierignore` | Formatting rules (double quotes, semicolons, width 100, Tailwind class sorting) / files Prettier skips                                                     |
| `.env`                                 | Secrets: `DATABASE_URL`, `AUTH_SECRET`, OAuth keys. **Never commit.** Keep a `.env.example`                                                                |
| `docker-compose.yml`                   | Starts Postgres (with PostGIS) on your machine in one command                                                                                              |
| `prisma7.config.ts`                    | Prisma 7 CLI config: where the schema/migrations live and the `DATABASE_URL` (loaded via `dotenv`)                                                         |
| `src/lib/db.ts`                        | The one shared Prisma client for the app                                                                                                                   |
| `src/generated/prisma/`                | Generated Prisma client (gitignored; rebuilt by `prisma generate` / `npm install`)                                                                         |
| `prisma/schema.prisma`                 | Your database tables written in Prisma language                                                                                                            |
| `prisma/migrations/`                   | History of DB changes as SQL — committed to git                                                                                                            |
| `prisma/seed.ts`                       | Script that fills the DB with sample data                                                                                                                  |
| `CLAUDE.md`                            | Instructions Claude Code reads every session                                                                                                               |
| `AGENTS.md`                            | Written by `next dev`: tells AI tools to read the Next.js docs bundled in `node_modules/next/dist/docs`                                                    |

---

## 4. Database — PostgreSQL + PostGIS

- **PostgreSQL:** a relational database. Data lives in tables with rows; tables link with foreign keys (an Activity belongs to a User).
- **Why Postgres:** reliable, free, transactions, JSON support, full-text search, and…
- **PostGIS:** an extension that adds geography types. Lets us ask _"activities within 5 km of me, nearest first"_ in one fast query using a spatial (GiST) index.
- **Transaction:** a group of DB steps that all succeed or all fail. We use it when approving a join request so two people can't grab the last spot at the same time.
- **Index:** like a book index — makes lookups fast. Add for columns you filter/sort on a lot.

`DATABASE_URL` format:

```
postgresql://USER:PASSWORD@HOST:PORT/DBNAME?schema=public
```

---

## 5. Prisma (ORM + visualizer)

- **ORM:** lets you write `db.activity.findMany({ where: { status: 'OPEN' } })` in TypeScript instead of raw SQL, with autocomplete and type errors if you get a field wrong.
- **`schema.prisma`:** three parts — `generator` (makes the TS client), `datasource` (which DB), `model`s (tables).
- **Commands:**
  - `npx prisma migrate dev --name xyz` → changes DB to match schema + saves a migration
  - `npx prisma generate` → rebuilds the typed client
  - `npx prisma studio` → opens a browser UI to view/edit tables (the "visualizer")
  - `npx prisma db seed` → runs the seed script
- **Geo columns:** Prisma can't read/write PostGIS types, so they're `Unsupported("geography(Point, 4326)")`. We store plain `latitude`/`longitude` floats (Prisma writes those) and Postgres **generates** the geography column from them. Radius queries use `db.$queryRaw`. Details in §10.
- **One client only:** create Prisma client once in `src/lib/db.ts` (reuse in dev to avoid "too many connections").

---

## 6. Backend language

The backend is **TypeScript running on Node.js**, inside Next.js (Server Actions + Route Handlers). Same language front and back, types shared everywhere. Real-time chat (Phase 2) may add a small separate Node server with Socket.IO.

---

## 7. Libraries — one-line notes

| Library                 | What it does                                              | Config notes                                                                               |
| ----------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| **Tailwind CSS**        | Utility classes for styling                               | Design tokens (colours, fonts) in global CSS                                               |
| **shadcn/ui**           | Copy-paste accessible components (built on Radix)         | `npx shadcn@latest add button` — code lands in `components/ui`, you own it                 |
| **Zod**                 | Describe the shape of data and validate it                | One schema used by the form AND the server action                                          |
| **React Hook Form**     | Fast forms with few re-renders                            | Use `zodResolver(schema)`                                                                  |
| **Better Auth**         | Sign-in (magic link + Google), DB sessions, rate limiting | `src/lib/auth.ts` (server), `src/lib/auth-client.ts` (browser), `/api/auth/[...all]` route |
| **TanStack Query**      | Fetch/cache data in Client Components                     | Only where needed (chat polling, infinite scroll)                                          |
| **react-leaflet**       | Map component                                             | Must be a Client Component; load with `dynamic(() => import(...), { ssr: false })`         |
| **date-fns**            | Date formatting/maths                                     | Keep times stored in UTC, show in local time                                               |
| **Vitest**              | Unit tests (fast, Vite-like)                              | Test pure logic: capacity rules, validators                                                |
| **Playwright**          | Browser end-to-end tests                                  | Test flows: sign in → create → join                                                        |
| **ESLint / Prettier**   | Catch bugs / auto-format                                  | Run on save + pre-commit                                                                   |
| **Husky + lint-staged** | Run lint before each commit                               | —                                                                                          |
| **Docker**              | Runs Postgres in a container                              | `docker compose up -d`                                                                     |

---

## 8. Glossary

- **SSR:** server builds the HTML per request.
- **SSG:** HTML built once at build time.
- **Streaming:** server sends page in chunks; slow parts show a fallback first.
- **Hydration:** browser attaches React to server HTML so buttons work.
- **Migration:** a versioned change to the DB structure.
- **Seed:** fake starter data.
- **Generated column:** a column Postgres computes from other columns on every insert/update (`GENERATED ALWAYS AS (...) STORED`). You can't write to it.
- **SRID 4326:** the ID for normal GPS latitude/longitude (WGS 84).
- **`geography` vs `geometry`:** `geography` measures in metres on the Earth's curve — what we want for "within 5 km".
- **tsvector / tsquery:** Postgres full-text search. A `tsvector` is the processed word list of a document; a `tsquery` is the search; `@@` means "matches".
- **Shadow database:** a throw-away DB `prisma migrate dev` creates to replay migrations and detect drift.
- **Drift:** the real DB differs from what your migrations + schema say it should be.
- **Env var:** a setting/secret outside the code.

## 9. M0 — what we set up and why

**Versions we got (latest stable on 2026-10-23):** Next.js 16.4 · React 19.3 · Tailwind 4 · Prisma 7.10 · Postgres 17.6 · PostGIS 3.5.3.

### Next.js scaffold (`create-next-app`)

- **What:** TypeScript (strict), App Router, `src/` folder, `@/` alias, ESLint, Tailwind.
- **Why:** like `npm create vite`, but routing + server rendering are built in. `src/app/page.tsx` _is_ the `/` route.
- **Cache Components (new in Next 16, on by default):** pages are prerendered into a static "shell" at build time. Anything that must run per request (DB reads, cookies) goes inside `<Suspense>`; for a DB query also call `await connection()` first so Next knows not to run it at build time. Want it cached instead? Use `"use cache"` + `cacheLife()`. Our home page shows this: `◐ (Partial Prerender)` in the build output = static shell + streamed DB part.
- **`LayoutProps<"/">` / `PageProps<"/x">`:** global types Next generates from your routes. `npm run type-check` runs `next typegen` first so `tsc` can see them.
- **React Compiler lint rules:** e.g. "don't build JSX inside try/catch" — compute the value first, then return JSX.

### shadcn/ui

- **What:** `npx shadcn@latest init` (Radix base, "Nova" preset = Lucide icons + Geist font). Added `button`, `card`, `badge`.
- **Why:** components are **copied into `src/components/ui/`** — you own and edit them; it's not an npm dependency you import.
- **Config:** `components.json` (paths/style), `src/lib/utils.ts` (`cn()` merges Tailwind classes), theme colours as CSS variables in `globals.css`.
- **Our theme:** warm off-white background + one teal accent (`--primary`). Dark values live under `.dark`.
- **Dark mode:** `next-themes` puts `class="dark"` on `<html>` (follows OS by default). It must be a Client Component, so it lives in `src/components/theme-provider.tsx` and wraps the app in `layout.tsx`. `suppressHydrationWarning` on `<html>` is expected — the class is set before React hydrates.
- **Fonts:** `next/font/google` downloads Geist at build time and self-hosts it (no layout shift, no Google request from users). The CSS variable is `--font-sans`.

### Prettier

- **What:** `prettier` + `prettier-plugin-tailwindcss` (sorts class names) + `eslint-config-prettier` (turns off ESLint rules that clash with formatting).
- **Use:** `npm run format` (fix) / `npm run format:check` (CI).

### Docker: Postgres + PostGIS

- **What:** one `db` service in `docker-compose.yml`, data in the `gathr_pgdata` volume (survives restarts), healthcheck with `pg_isready`.
- **Image:** `imresamu/postgis:17-3.5` — a multi-arch build of the official image. The official `postgis/postgis` is amd64-only, so it would run under emulation on an Apple Silicon Mac.
- **`docker/initdb/` is mounted over the image's init folder on purpose:** the image normally auto-installs 4 extensions, which made Prisma think the DB had "drifted" and demand a reset. Now the DB starts empty and **our migration** creates `postgis`.
- **Commands:** `docker compose up -d` (start) · `docker compose down` (stop) · `docker compose down -v` (stop **and wipe data**) · `docker exec -it gathr-db psql -U gathr gathr` (SQL shell).

### Prisma 7 (what changed vs older tutorials)

- **Config file:** `prisma7.config.ts` holds the DB URL (read from `.env` via `dotenv`). `schema.prisma` no longer has `url = env(...)`.
- **Generated client lives in our code:** `src/generated/prisma` (import from `@/generated/prisma/client`), gitignored.
- **Driver adapter:** the client talks to Postgres through `@prisma/adapter-pg` (the normal `pg` driver).
- **`migrate dev` no longer runs `generate`** — run `npm run db:generate` after schema changes (also runs on `npm install`).
- **Extensions:** `previewFeatures = ["postgresqlExtensions"]` + `extensions = [postgis]` in the datasource → migration `init_postgis` runs `CREATE EXTENSION postgis`.
- **`src/lib/db.ts`:** one client cached on `globalThis` in dev (hot reload would otherwise open a new pool per save). `import "server-only"` makes the build fail if a Client Component ever imports it, so DB code can't leak into the browser bundle.

### `.env` / `.env.example`

- `.env` = real values (gitignored). `.env.example` = committed template; copy it with `cp .env.example .env`.
- Only `NEXT_PUBLIC_*` variables reach the browser (like `VITE_*`). `DATABASE_URL` stays server-only.

### Scripts added

`type-check`, `format`, `format:check`, `db:up`, `db:migrate`, `db:generate`, `db:studio`, `postinstall` (runs `prisma generate`).

### Temporary health check

The home page shows "Database connected · PostGIS x.y" — proves browser → Next server → Prisma → Postgres. Remove when the real landing page arrives.

## 10. M1 — data layer

### The schema (`prisma/schema.prisma`)

- **Models:** `User`, `Account`, `Session`, `VerificationToken` (Auth.js adapter shape, ready for M2) · `Category`, `Interest` · `Activity`, `ActivityTag` · `JoinRequest` · `Message`, `Notification` · `Report`, `Block`.
- **Enums** = a fixed list of allowed values, enforced by the DB and typed in TS (`ActivityStatus`, `JoinRequestStatus`, `JoinMode`, `SkillLevel`, `NotificationType`, `Role`, `ReportTargetType`, `ReportStatus`).
- **Relations:** `hostId` + `@relation(...)` = a foreign key. `onDelete: Cascade` means deleting a user deletes their activities/requests/messages (account deletion, FR-1.3). Categories use `Restrict` — you can't delete one that activities still use.
- **`@@unique([activityId, userId])` on JoinRequest:** one request per person per activity, enforced by the DB, not just app code.
- **Composite primary keys** (`@@id([...])`) for pure link tables: `Interest`, `ActivityTag`, `Block`.
- **`minPeople`/`maxPeople` do not count the host.** "Spots left" = `maxPeople − approved requests`.
- **Privacy by design:** exact `latitude`/`longitude` live in the table, but every activity/user also has a human `areaName`/`homeAreaName`. Public queries (M4) select the area name + rounded coordinates, never raw ones.
- **`startsAt` is stored in UTC.** The seed plans times in IST (UTC+5:30) and converts; the UI will convert back.

### PostGIS + full-text with generated columns

Problem: Prisma can't write `geography`/`tsvector`, and a model with a _required_ `Unsupported` field loses `db.x.create()`.
Solution: let Postgres compute them.

```sql
"location" geography(Point, 4326) GENERATED ALWAYS AS (
  ST_SetSRID(ST_MakePoint("longitude", "latitude"), 4326)::geography   -- note: (lng, lat)!
) STORED
"searchVector" tsvector GENERATED ALWAYS AS (
  setweight(to_tsvector('english', title), 'A') || setweight(to_tsvector('english', description), 'B')
) STORED
```

- App code does a normal `db.activity.create({ data: { latitude, longitude, title, ... } })` and Postgres fills `location` and `searchVector`.
- Prisma only generates plain columns, so we created the migration with `prisma migrate dev --create-only`, **hand-edited the SQL**, then applied it.
- To stop Prisma reporting drift, the schema repeats each expression as `@default(dbgenerated("..."))` — copied exactly from `npx prisma db pull --print` (Postgres rewrites expressions into its own canonical form).
- **Indexes:** `@@index([location], type: Gist)` (spatial, for `ST_DWithin` radius search) and `@@index([searchVector], type: Gin)` (full-text). Plus B-trees on `(status, startsAt)`, `hostId`, `categoryId`, etc.

Example queries (we'll wrap these in typed functions in M4):

```sql
-- open activities within 5 km of Pune centre, nearest first (uses the GiST index)
SELECT title, ST_Distance(location, ST_MakePoint(73.8567, 18.5204)::geography) / 1000 AS km
FROM "Activity"
WHERE status = 'OPEN' AND ST_DWithin(location, ST_MakePoint(73.8567, 18.5204)::geography, 5000)
ORDER BY km;

-- full-text search (uses the GIN index); websearch_to_tsquery understands "quotes" and -minus
SELECT title FROM "Activity" WHERE "searchVector" @@ websearch_to_tsquery('english', 'clean-up');
```

### Migrations workflow

1. Edit `schema.prisma`.
2. `npx prisma migrate dev --name what_changed` → writes `prisma/migrations/<timestamp>_what_changed/migration.sql` and applies it. (Add `--create-only` to edit the SQL first.)
3. `npm run db:generate` → refresh the TS client (Prisma 7 no longer does this automatically).
4. Commit the migration folder. **Never edit a migration that's already applied/shared** — make a new one.

- `npx prisma migrate status` → are all migrations applied?
- `npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma` → "No difference detected" means no drift.
- `npx prisma migrate reset` wipes the dev DB and replays everything + seed. Prisma refuses to let an AI agent run it without your explicit OK.

### Seed (`prisma/seed.ts`)

- Run: `npm run db:seed` (= `prisma db seed`, which runs `tsx prisma/seed.ts` as set in `prisma7.config.ts`). `tsx` runs TypeScript files directly in Node.
- **What it creates:** 18 categories (upsert by slug), 22 users (8 Pune, 8 Mumbai, 6 Sangli) with interests and home areas, 50 activities (20 Pune, 20 Mumbai, 10 Sangli) on real locality coordinates ± ~650 m, plus ~245 join requests, ~210 chat messages and ~245 notifications.
- **Status mix:** mostly `OPEN`, plus `FULL` (exactly `maxPeople` approved), `ONGOING` (started 30 min before the seed ran), `COMPLETED`, `CANCELLED`, `DRAFT`. Dates are relative to when you run the seed, so re-seed to get fresh upcoming activities. (Statuses are static data — automatic status updates come in M5.)
- **Re-runnable:** seed users have `@seed.gathr.dev` emails; the script deletes them first and cascades take their data with them. Categories are upserted, so admin-added ones survive.
- **Deterministic:** a tiny seeded random generator (`mulberry32`) instead of Faker → same data every run, no extra dependency.
- **Own Prisma client:** the seed can't import `src/lib/db.ts` because of `import "server-only"` (it throws outside Next.js). Scripts create their own client with the same adapter.
- **Seed login:** none yet. Users have no password/OAuth account until M2.

### Look at the data

`npm run db:studio` → Prisma Studio in the browser. (`Unsupported` columns like `location` don't show there; use `docker exec -it gathr-db psql -U gathr gathr`.)

## 11. M2 — auth, profile and the v2 app shell

### Design → code

- The locked **v2 design** (BRD §14) lives in `globals.css` as tokens: `--primary` = orange `#ff5b22` (with dark text on it), `--brand-deep` (deep orange text), `--verified` (blue tick). Use them as Tailwind classes: `bg-primary`, `text-brand-deep`, `fill-verified`.
- Font: **Plus Jakarta Sans** via `next/font/google` → self-hosted, exposed as `--font-sans`.
- Photos live in `public/images/` (Unsplash, credits in `CREDITS.md`) and render with **`next/image`** (`<Image fill sizes=…>`): automatic resizing, modern formats, lazy loading. Use `priority` only for the above-the-fold hero.

### Route groups & layouts

```
src/app/
├─ (marketing)/page.tsx        → "/" landing (fully static)
├─ (app)/layout.tsx            → header + mobile tab bar for app pages
│  ├─ explore, plans, chats, activities/new   (placeholders for M3–M6)
│  ├─ onboarding/, me/, u/[username]/
├─ sign-in/page.tsx            → own split layout (photo + form)
└─ api/auth/[...all]/route.ts  → Better Auth
```

Folders in `(parentheses)` group routes and give them a shared layout **without** appearing in the URL — like nested `<Outlet>` layouts chosen by folder.

### Better Auth (what / why / config)

- **What:** handles sign-in, sessions and accounts. Chosen over Auth.js (still beta).
- **Server config** `src/lib/auth.ts`: Prisma adapter, 30-day DB sessions, **magic link** plugin, **Google** (turns on only when `GOOGLE_CLIENT_ID/SECRET` are set), built-in **rate limiting** (magic link: 5 requests/min per IP → you'll see `429` if you spam it), account deletion enabled, `nextCookies()` last so Server Actions can set cookies.
- **Route handler** `/api/auth/[...all]`: a catch-all URL (`[...all]` = every sub-path) that forwards to Better Auth — this _is_ the auth API.
- **Client** `src/lib/auth-client.ts`: `authClient.signIn.magicLink()`, `signIn.social()`, `signOut()`, `revokeSessions()`, `deleteUser()` for Client Components.
- **Dev email:** there's no email provider yet, so the magic link is printed in the `npm run dev` terminal (`✉️ Magic link for …`). Open it to sign in. To log in as seed data, use e.g. `aarav.kulkarni@seed.gathr.dev`.
- **Tables:** Better Auth needs `User` (with boolean `emailVerified`), `Session`, `Account`, `Verification`. The M2 migration reshaped them and was hand-edited to keep data (`emailVerified` date → boolean in place, `costNote` renamed to `priceNote`).

### Reading the session (Data Access Layer)

- `src/lib/session.ts` → `getSessionUser()` / `requireSessionUser()`. One place that answers "who is signed in?". Pages, Server Actions and Route Handlers all go through it.
- **Cache Components rule:** reading the session = reading request cookies = request-time data. It must happen **inside a component wrapped in `<Suspense>`** (e.g. `<MeContent>` inside `/me`), not at the top of a page or layout. The rest of the page stays a fast static shell (build output shows `◐ Partial Prerender`).
- Same rule for client hooks that read the URL, e.g. `usePathname()` on dynamic routes → the tab bar is wrapped in `<Suspense>` with a static fallback.

### Proxy (Next 16's new name for middleware)

- `src/proxy.ts` runs **before** `/me` and `/onboarding` load. It only checks that a session cookie exists and redirects to `/sign-in?next=…` if not — a fast, optimistic gate. The real check still happens in the page via `requireSessionUser()`.
- `safeNextPath()` only allows relative redirects (`/me`), never `//evil.com` (open-redirect protection).

### Your first Server Action — `saveProfile` (`src/features/profile/actions.ts`)

- A function in a `"use server"` file. The form calls it like a normal async function; Next turns it into a POST request for you — no `fetch('/api/…')`, no REST route.
- **Anyone can call it**, so it: checks the session → validates with the **same Zod schema** as the form (`profileSchema`) → checks the username is free → replaces interests + updates the profile in **one transaction** → recalculates the verified badge.
- Returns a typed result `{ ok: true } | { ok: false, error, fieldErrors }`; the form shows field errors inline and a toast.
- **`updateTag('user:<username>')`**: the public profile query is cached with `"use cache"` + `cacheTag(...)`; after saving we expire that tag so the next visit shows fresh data ("read your own writes").

### Forms: React Hook Form + Zod

- `useForm({ resolver: zodResolver(profileSchema) })` validates in the browser with the exact rules the server uses.
- Custom inputs (interest tiles, language chips, home-area picker) use `<Controller>` to plug into the form.

### Caching data: `"use cache"`

- `getCategories()` → `"use cache"` + `cacheLife("hours")`: shared by every request for hours.
- `getPublicProfile(username)` → `cacheLife("minutes")` + `cacheTag("user:…")` (see `updateTag` above). Its arguments are part of the cache key, so each username has its own entry.
- `getMyProfile()` is **not** cached — your own private data should always be fresh.

### Verified-host badge (BRD FR-2.5)

- Rules live in pure functions in `src/features/profile/verification.ts`: verified email + name + photo + bio + home area + ≥1 interest, and not revoked by an admin.
- `/me` shows a checklist ("5/6"). Photo upload arrives with image uploads in M3; Google sign-in fills the photo automatically.
- The seed marks ~2/3 of seed users as verified so the UI has examples.

### Home area (privacy)

- Search / "use my location" go through **Server Actions** that call OpenStreetMap **Nominatim** (free geocoding). Proxying through the server lets us send the required `User-Agent`, limits it to signed-in users, and the picker debounces typing (Nominatim allows ~1 request/second).
- We store the exact coordinates (private) but only ever show `homeAreaName` publicly. The public profile query doesn't even select email or coordinates.

### npm `overrides` (dependency fixes)

Two installs failed with `ERESOLVE` because of _optional_ peer dependencies deep in the tree. Fixed in `package.json` → `"overrides"`: pin `@babel/plugin-transform-runtime` to v7, and `"zod": "$zod"` (= "use our one Zod 4 everywhere"). Cleaner than `--legacy-peer-deps`, which hides real conflicts.

### How M2 was verified

Lint, types, format, production build; HTTP checks (proxy redirect, magic link → new user → `/onboarding`); and a scripted real-Chrome run: sign in → onboarding (interests, languages, live area search) → save → `/me` → public profile (no email leaked) → invalid username rejected → sign out → seed user on mobile with verified badge.

---

## 12. Progress log

- [x] M0 Setup (2026-10-23)
- [x] M1 Data layer (2026-10-23)
- [x] M2 Auth & profile (2026-10-23)
- [ ] M3 Create activity
- [ ] M4 Discover
- [ ] M5 Join flow
- [ ] M6 Chat & notifications
- [ ] M7 Safety
- [ ] M8 Quality
- [ ] M9 Deploy
