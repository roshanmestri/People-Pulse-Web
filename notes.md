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

## 12. M3 — hosting a plan

### Routes

| Route                   | What                   | Rendering                                                           |
| ----------------------- | ---------------------- | ------------------------------------------------------------------- |
| `/activities/new`       | Host form              | Protected (proxy + `requireSessionUser`)                            |
| `/activities/[id]`      | Detail page            | Public, server-rendered, SEO metadata + link-preview image          |
| `/activities/[id]/edit` | Edit + cancel          | Host only — anyone else gets a 404 (doesn't reveal the plan exists) |
| `/uploads/[...path]`    | Serves uploaded images | Route Handler                                                       |

### Feature folder `src/features/activity/`

`schemas.ts` (Zod, shared by form + server) · `actions.ts` (create / update / cancel Server Actions) · `queries.ts` (cached reads) · `components/` (form, venue picker, cancel button). Same shape as `features/profile`.

### Rules enforced on the server (BRD FR-3)

- Must start ≥15 min in the future; min people ≤ spots; price 0–₹10,000 whole rupees; ≤5 tags (lower-cased).
- Only the host can edit/cancel. Spots can't drop below the number already approved.
- Status: Publish → `OPEN`, Save draft → `DRAFT` (only the host can see drafts). Editing keeps `OPEN`/`FULL` in sync with approved count. Ongoing/completed/cancelled plans are locked.
- Changing **time or venue** writes `ACTIVITY_UPDATED` notifications for approved members (only if something actually changed). **Cancel** writes `ACTIVITY_CANCELLED` for approved + pending people. The bell UI that shows them is M6.

### Time zones

Forms speak **IST**, the DB stores **UTC** — `src/lib/time.ts` (`istToUtc`, `utcToIstParts`, formatters with `timeZone: "Asia/Kolkata"`). Display always formats in IST, so a server in another country still shows the right time.

### Venue privacy (`src/lib/geo.ts`)

- `canSeeExactVenue()`: host ✔, approved member ✔, everyone else only if the host chose "show exact venue".
- Others get `approximate()` coordinates (rounded to 2 decimals ≈ 1 km) and an 800 m circle, never the venue name.
- The decision happens **on the server**: the cached query holds exact coordinates, but the page passes only the allowed ones to the client map. Verified in the browser: a signed-out visitor's HTML contains no exact coordinates or venue name. Link previews (Open Graph) use the area name only.

### Maps — Leaflet + OpenStreetMap

- `src/components/map/pin-map.tsx` is a Client Component (Leaflet needs `window`). `lazy-pin-map.tsx` loads it with **`next/dynamic(..., { ssr: false })`** — the "client-only island": the page is server-rendered, only the map runs in the browser.
- Custom SVG pin via `L.divIcon` (Leaflet's default PNG markers break with bundlers).
- The map wrapper uses Tailwind `isolate` (a new CSS stacking context) so Leaflet's z-indexes (400–1000) can't paint over the sticky header.
- Venue search / reverse lookup reuse the Nominatim Server Actions, now shared in `src/features/geo/actions.ts`. Dragging or tapping the pin re-names the locality.

### Image uploads

- A Server Action can take a **`FormData`** containing a `File` — no separate upload API. The host form sends `data` (JSON of the fields) + `cover`; `/me` sends `photo`.
- `src/lib/images.ts` (`sharp`): only JPG/PNG/WebP under 5 MB, auto-rotate, resize (covers 1600 px wide; avatars 512 px square crop), re-encode to WebP — which also **strips EXIF metadata** like the GPS location a phone photo was taken at.
- `src/lib/storage.ts`: saves to `.data/uploads/` (gitignored) with random UUID names, served by the `/uploads/[...path]` Route Handler with long cache headers. The file-name check blocks path tricks like `../../.env`. **At deploy (M9) we swap this one file for a cloud store** (Vercel has no permanent disk).
- No cover → the category photo is used. Profile photo upload on `/me` (tap the avatar) completes the verified-badge checklist.

### Cache Components lessons from M3

- **Reading the clock** (`new Date()`, `Date.now()`) during prerender is flagged as an "unstable value". Fix used: `await connection()` at the top of `getSessionUser()` marks it as request-time work before Better Auth checks session expiry.
- The **React Compiler lint rule** `react-hooks/purity` also blocks `Date.now()` directly in a component body → moved into a helper (`tomorrowInIst()`).
- `updateTag("activity:<id>")` after create/update/cancel so the cached detail page shows changes immediately.

### next/image in Next 16

`priority` is **deprecated**. For the main above-the-fold image use `loading="eager"` + `fetchPriority="high"`; plain `loading="eager"` for other visible-on-load images (first row of category tiles, the form preview).

### Zod gotcha

`z.nullable().refine((v) => v !== null)` — an arrow function that returns `v !== null` is a **type guard**, and Zod 4 narrows the output type with it. The form's input type (venue can be null) then differs from the output type and React Hook Form's resolver types clash. Use `refine((v) => Boolean(v), …)` to validate without narrowing.

### Tests — Vitest

- `npm test` (once) / `npm run test:watch`. Config: `vitest.config.mts` (`.mts` = ES module config; `@/` alias).
- 31 unit tests for pure logic: IST↔UTC, coordinate rounding + who sees the venue, activity schema rules (past dates, min ≤ max, price, tags), verified-badge rules. Tests sit next to the code: `geo.ts` ↔ `geo.test.ts`.

### How M3 was verified

Lint, types, format, unit tests, production build, and a scripted real-Chrome run: empty form shows errors → host creates a plan (venue search, tap-to-move pin, ₹100, tag, cover upload) → published as `OPEN` with correct DB values → signed-out mobile view shows only the approximate area (no exact coordinates or venue name in the HTML) → stranger can't open `/edit` → editing a seed plan's time notified its 4 members → cancel → new user's photo upload turns on the verified badge.

## 13. M4 — Discover (Explore)

### The URL is the state (BRD FR-4.6)

`/explore?q=badminton&cat=sports-fitness&r=10&when=weekend&level=BEGINNER&open=1&city=mumbai&view=map`

- In plain React you'd keep filters in `useState`/a store and fetch in `useEffect`. Here every control calls `router.push('/explore?…')`; the **Server Component page re-renders** with the new `searchParams`. Links are shareable, Back/Forward work, and the first paint already has results.
- `src/features/discover/filters.ts` (pure, unit-tested): `parseFilters()` is lenient — junk like `?r=7&when=yesterday` silently falls back to defaults instead of erroring. `filtersToQuery()` writes the URL back, leaving out defaults and only ever writing **rounded** coordinates.
- `useTransition()` around `router.push` gives a `pending` flag → the thin orange progress bar.
- A list with its own `useState` must be **remounted** when the search changes: `<ResultsList key={query} …>` (otherwise it keeps the old pages).

### Where "near" is (`resolveCenter`)

explicit `lat/lng` ("use my location", rounded) → chosen `city` (Pune/Mumbai/Sangli) → your **home area** (rounded) → Pune. Rounding also keeps exact homes out of cache keys and URLs.

### The PostGIS query (`src/features/discover/queries.ts`)

```sql
WHERE a.status IN ('OPEN','FULL') AND a."startsAt" >= :from [AND < :to]
  AND ST_DWithin(a.location, :point, :radius_m)          -- GiST index, metres
  [AND c.slug IN (…)] [AND skill IN (:level,'ANY')] [AND a.status='OPEN']
  [AND (a."searchVector" @@ websearch_to_tsquery('english', :q) OR tag = ANY(:words))]
ORDER BY ST_Distance(a.location, :point), a."startsAt", a.id
```

- Built with **`Prisma.sql` / `Prisma.join` / `Prisma.empty`** — tagged templates that keep every value a **parameter** (`$1`, `$2`…), so user input can't inject SQL even though it's raw SQL.
- Enum columns compared to parameters need a cast (`a."skillLevel"::text IN (…)`).
- Only `round(latitude, 2)` / `round(longitude, 2)` are selected — exact venues never leave the database on Explore. (Browser test checked the map page HTML for all 14 plans: none leaked.)
- "Time windows" (`today`, `weekend`, `week`) are IST calendar days converted to UTC (`timeWindow()`).

### Cursor pagination ("Load more")

- Results are ordered by `(distance, startsAt, id)`. The cursor is the last row's values, base64-encoded; the next page is `WHERE (distance, startsAt, id) > (cursor)` — a **row comparison** in SQL. Unlike `OFFSET`, nothing shifts or duplicates when new plans appear.
- First page is server-rendered; "Load more" calls the `loadMoreActivities` **Server Action**, which re-parses the filters (never trusts the client) and returns the next page to append.
- Decoding is validated with Zod, so a tampered cursor just returns nothing.

### Caching search results

`searchActivities`, `countActivities` and `mapPins` use `"use cache"` + `cacheLife("minutes")` + `cacheTag("activities")`. Each filter combination is its own cache entry (the arguments are the key). The M3 create/update/cancel actions call `updateTag("activities")`, so a new or edited plan shows up immediately — the browser test edits a title and finds it in search right after.

### The map

- `leaflet.markercluster` groups nearby pins into numbered orange bubbles (FR-4.4); pins are round photos (CSS classes `.gathr-pin` / `.gathr-cluster` in `globals.css`). Clicking a pin shows a preview card linking to the plan.
- **Gotcha:** the plugin is old-style and extends a _global_ `L`. With ES modules Leaflet isn't global → `ReferenceError: L is not defined`. Fix: `leaflet-global.ts` sets `globalThis.L` and is imported **before** the plugin (imports run in order).
- Loaded with `next/dynamic({ ssr: false })` like the M3 map.

### CSS gotcha found by the browser test

The filter panel overlaps the photo header with a negative margin. The header is `position: relative`, the panel wasn't — and **positioned elements paint above non-positioned later siblings**, so the header silently swallowed clicks on the radius pills. Fix: give the panel `relative z-10`.

### Mobile

Filter pills are one horizontally swipeable row on phones (`overflow-x-auto`, `shrink-0`, `whitespace-nowrap`) and wrap on wider screens, so results/map are visible without scrolling. A floating **Map / List** button sits above the tab bar.

### How M4 was verified

Unit tests (filter parsing, URL round-trip, IST weekend windows incl. Sunday, cursor tamper-proofing) → counts for 9 filter combinations cross-checked against direct SQL → real-Chrome run: radius/category/search update the URL, Back works, clear filters, load more 12→14 with no duplicates, map pins + clusters, no exact coordinates, signed-in user centred on their home ("Near Baner, Pune"), edited plan appears in search immediately, mobile list + map.

## 14. M5 — join flow

### States (BRD FR-5.5)

```
(none) ──request──▶ PENDING ──approve──▶ APPROVED ──leave──▶ LEFT
   ▲                  │ ├─decline─▶ REJECTED         └─remove─▶ REMOVED
   │                  │ └─withdraw─▶ WITHDRAWN
   └── may ask again after WITHDRAWN / LEFT (not after REJECTED / REMOVED)
Open plans: (none) ──join──▶ APPROVED instantly (still capacity-checked)
```

The plan's own status follows automatically: **OPEN ↔ FULL** from the approved count; **ONGOING / COMPLETED** from the clock (`effectiveStatus()` in `src/lib/status.ts`) — nobody can join, leave or be approved once a plan has started.

### Transactions + row lock = no overbooking (FR-5.4)

`src/features/join/core.ts`. Every operation is one **interactive transaction** (`db.$transaction(async (tx) => { … })`) that starts with

```sql
SELECT … FROM "Activity" WHERE id = $1 FOR UPDATE
```

`FOR UPDATE` locks that one row until the transaction ends. If two people grab the last spot at the same instant, the second transaction **waits** for the first, then counts again, sees the plan is full and is refused.

- Host approvals re-read the request _after_ taking the lock (another tab may have just decided it).
- Proven by `src/features/join/core.db.test.ts` (`npm run test:db`, needs Docker): 10 people race for 3 spots → exactly 3 get in, both for instant-join and for 10 simultaneous host approvals. **With the `FOR UPDATE` removed, the same test lets all 10 in** — that's the bug the lock prevents.
- `core.ts` has no `server-only` import so the test can call it directly; the Server Actions in `actions.ts` are thin wrappers (session → Zod → core → `updateTag`).

### Other rules

- Host can't join their own plan; people the host **blocked** can't request (FR-8.2, ready for M7).
- **Rate limit:** max 10 join requests per user per hour (BRD §6).
- Each change writes a `Notification` row (new request / joined, approved, declined, removed) — the bell UI comes in M6.
- `updateTag("activity:<id>")` + `updateTag("activities")` after every change so the detail page and Explore's "spots left" are fresh.

### UI

- **Join card** (`JoinPanel`): signed out → "Sign in to join"; host → "Manage requests · N waiting" + Edit; join flow shows **safety tips** first (FR-8.5) and an optional message; then "Request sent · Withdraw", "You're in! · Leave", "Full", "declined", "started/over". After an action, `router.refresh()` re-renders the server page (spots, who's in, exact venue).
- **Manage requests** (`/activities/[id]/manage`, host only): seat bar, waiting count, status; request cards with profile, verified tick, "joined N · hosted N", message, Approve/Decline (Approve disabled when full); Going list with Remove.
- **My plans** (`/plans`): Hosting (with going/waiting counts → manage page), Going, Waiting for approval, Past.

### Bug found while building: big photos → 500

Server Actions accept at most **1 MB** request bodies by default, so a normal phone photo as a cover failed with `Body exceeded 1 MB limit` before our code ran. Fixes:

- `next.config.ts` → `experimental.serverActions.bodySizeLimit: "6mb"` (5 MB image cap + form overhead).
- `src/lib/image-rules.ts`: the same size/type check runs **in the browser** (instant message) and on the server.
- Forms catch unexpected action failures and show a toast instead of failing silently.
- Lesson: test uploads with **realistic** files — the M3 test used a 49 KB photo and missed it.

### Vitest projects

`npm test` = fast pure tests (`*.test.ts`); `npm run test:db` = database tests (`*.db.test.ts`, separate config `vitest.db.config.mts`, Docker must be running).

## 15. M6 — chat & notifications

### Group chat (FR-6)

- **Who:** host + approved members only (`getChatAccess`). Everyone else gets a 404 page / 403 from the API — checked on every request, never trusted from the client.
- **Page:** `/activities/[id]/chat` — v2 chat design: plan header, pinned **exact venue** (members only), messages with avatars, day separators, "Host" label, quick replies, Enter to send / Shift+Enter for a new line.
- **Sending:** `sendMessage` Server Action → session → membership → Zod (1–1000 chars) → open? → rate limit (20/min) → insert → notify the others.
- **Read-only:** cancelled plans immediately; otherwise **7 days after the plan ends** (`chatState()` in `features/chat/rules.ts`, unit-tested).

### Polling with TanStack Query (FR-6.3 Phase 1)

In plain React you'd write `useEffect` + `setInterval` + `fetch` + loading/error state + cleanup. TanStack Query does that:

```ts
useQuery({
  queryKey: ["chat", id],
  queryFn: fetchMessages,
  initialData: serverMessages,
  refetchInterval: 4000,
});
```

- `initialData` = the messages the **server already rendered**, so there's no loading flash.
- It pauses while the tab is in the background and retries on errors.
- The data comes from a **Route Handler** (`GET /api/activities/[id]/messages`) — a plain JSON endpoint, good for polling. (Server Actions are for _changing_ things; Route Handlers for things called by URL.)
- **Optimistic send** with `useMutation`: `onMutate` adds a temporary "Sending…" bubble straight into the query cache, `onSuccess` swaps in the real message, `onError` rolls back and shows a toast.
- `QueryProvider` (root layout) creates one `QueryClient` per browser tab via `useState`.
- Phase 2 (BRD): replace polling with WebSockets for typing indicators/read receipts.

### Notifications (FR-7)

- Rows have been written since M3/M5 (requests, approvals, edits, cancellations); M6 adds **NEW_MESSAGE** and **REMINDER** and the UI.
- `describeNotification(type, payload)` (pure, unit-tested) turns a row into a sentence + link (hosts → manage page, chat alerts → chat, others → the plan).
- **Bell** in the header: server-rendered count, then TanStack Query re-checks `/api/notifications/unread` every 30 s and on window focus. `/notifications` lists them; tapping one marks it read and opens the link; **Mark all as read** (FR-7.2). Updates are always scoped to `userId` — you can only mark your own.
- **Grouped chat alerts:** one unread "new messages" alert per chat per person (count + latest preview) instead of one per message. Opening the chat — or simply having it open, since polling counts as "looking" — marks it read.
- **Reminders 2 h before start:** no background scheduler yet, so `ensureReminders()` creates them **lazily** when you load the app (header / bell poll), at most one per plan. M9 can move this to a scheduled job and add email/push.

### Race condition found by the browser test: duplicate reminders

The header bell and the notifications page both ran "is there a reminder? no → create one" at the same moment, so two identical reminders appeared 6 ms apart. Same family of bug as overbooking (M5), different fix: there's no single row to `FOR UPDATE`, so `ensureReminders` takes a **Postgres advisory lock** keyed on the user (`pg_advisory_xact_lock(hashtext('reminders:<userId>'))`) inside a transaction. Concurrent callers for the same user now queue up; the second one sees the reminder already exists. Re-tested by hammering the page with simultaneous loads → still exactly 1 reminder per plan.

### Querying JSON columns in Prisma

Notification `payload` is JSON. Filter inside it with `payload: { path: ["activityId"], equals: id }` (Postgres JSON path), e.g. "unread chat alerts for this plan".

## 16. M7 — safety & moderation

### Report (FR-8.1)

`ReportButton` (dialog) on plans, profiles and other people's chat messages → `reportContent` Server Action: Zod (`features/safety/schemas.ts`), target must exist, can't report yourself, one open report per target per person, max 10/day. Reports go to the admin queue; the reported person isn't told who.

### Block (FR-8.2)

`BlockButton` on profiles (explains exactly what happens) → `blockUser`:

- **Both directions hidden:** `hiddenUserIds(viewer)` = people who blocked you + people you blocked. Explore adds `a."hostId" NOT IN (…)` (the list is part of the cache key — empty for nearly everyone, so cache entries stay shared). Plan pages and profiles return a plain **404** (nothing to discover). Their chat messages are filtered out for you.
- **Removed from your plans:** `evictFromHostPlans` (join core) marks their pending/approved requests `REMOVED` under the same row lock as M5, so spots free up correctly; they also can't request again (`BLOCKED`).
- Unblock from **/me → Blocked people**.

### Admin (FR-8.3) — `/admin`

- **Roles:** `User.role = ADMIN`. `npm run make-admin -- you@example.com` promotes (or creates) an admin; the account menu then shows "Admin · moderation".
- **Every** admin page calls `requireAdmin()` and **every** admin Server Action calls `getAdminUser()`. Non-admins get a 404. Hiding buttons is UX, the server check is the security.
- **Reports:** open/resolved queue with a preview of the target and how many open reports it has → Dismiss, **Hide plan / Hide message** (`hiddenAt`, new migration), or **Suspend** the user/host/sender. Acting resolves all open reports on that target.
- **Users:** search; **Suspend** = set `suspendedAt` + delete their sessions (signed out everywhere) + a **Better Auth `databaseHooks.session.create.before`** that returns `false` for suspended users, so they can't sign back in. Their plans leave Explore. **Revoke/restore verified badge** with a reason the user sees on `/me` (FR-2.5).
- **Categories:** add (name, slug, lucide icon) and hide/show. `updateTag("categories")` refreshes the cached list everywhere.
- **Pattern — pre-bound Server Actions:** the server page passes `setUserSuspended.bind(null, user.id, true)` to a generic client `ActionButton`. The browser just calls it; the ID is baked in on the server.
- **Pattern — GET search form:** `/admin/users` uses a plain `<form action="/admin/users">` so the search lands in the URL (`?q=`) with zero client JS.

### Profanity filter (FR-8.4)

`src/lib/profanity.ts`: lower-cases, undoes leetspeak (`sh1t`), collapses stretched letters (`fuuuck`) and matches **whole words** from a small English + Hindi/Marathi list — so "Scunthorpe", "assessment", "Shitake", "Dickens" are fine (unit-tested). Added as a Zod `refine` on plan titles/descriptions and profile names/bios, so the form shows the message instantly and the server enforces the same rule.

### Smaller bits

- **After a schema change, restart `npm run dev`.** `src/lib/db.ts` keeps one Prisma client on `globalThis` across hot reloads (to avoid opening a new connection pool on every save) — so a running dev server keeps the _old_ client and fails with errors like `Unknown field hiddenAt`. Restarting picks up the newly generated client.

- Sign-in page explains failed links (`?error=link`): expired/used link or suspended account.
- `scripts/` run with `tsx` as CommonJS → no top-level `await`; wrap in `main()` (same as the seed).
- shadcn CLI asked to overwrite `button.tsx` when adding `dialog`; answered "no" — never let a generator silently replace files you own.

## 17. M8 — quality

### Playwright: tests that drive a real browser

**What:** `@playwright/test` opens Chrome, clicks through the app like a person, and checks what's on screen. Vitest tests functions; Playwright tests whole flows across pages, server and database.
**Run:** `npm run test:e2e` (report: `npm run test:e2e:report`). If `npm run dev` is already running, it reuses it; otherwise it starts one.
**Config (`playwright.config.ts`):** tests in `tests/e2e`, real Chrome (`channel: "chrome"`), `workers: 1` because all tests share one database, plus `globalSetup` / `globalTeardown`.

- **Global setup** (`tests/e2e/global-setup.ts`) runs once before all tests:
  - upserts 4 fixed accounts (`host / member / outsider / admin @e2e.gathr.test`)
  - wipes whatever they made last time
  - creates two fresh plans (one "request to join", one "open")
  - signs each account in once through the **real magic link**, reading the token from the `Verification` table
  - saves the cookies with `storageState`
- **Saved sessions are reused** while they're still valid in the DB, so re-runs send no magic links and don't hit the 5/min rate limit. The files live in `tests/e2e/.state/` (git-ignored, because they're live session cookies).
- **Fixtures** (`support/fixtures.ts`): `as("member")` gives a page already signed in as that user, so one test can use two people at once (host approves, member sees "You're in").
- **The DB is checked directly with `pg`, not the app's Prisma client.** A test shouldn't trust the code it's testing. Also, Playwright loads tests as CommonJS, and our generated Prisma client is an ES module.
- **Specs:**
  - `auth`: magic link, onboarding, protected pages
  - `explore`: search, filters in the URL, no exact coordinates
  - `host`: create, edit, cancel
  - `join`: request → approve, open join, full plan
  - `chat`: members only
  - `safety`: report → admin hides; block/unblock
  - `a11y`
- **Gotchas:**
  - ESLint's React `rules-of-hooks` thinks Playwright's fixture callback `use(...)` is React's `use` hook, so the parameter is named `provide`.
  - Tests that change shared data must undo or reset it first (the join test deletes the member's old request).

### Accessibility checks: axe-core

**What:** `@axe-core/playwright` scans the rendered page for WCAG problems (contrast, missing labels, wrong list markup…). `a11y.spec.ts` scans 12 key pages, signed in and signed out, and fails on **serious/critical** issues.
**Found and fixed:** in the chat, the auto-scroll anchor `<div>` sat inside the `<ol>`. A list may only contain `<li>`, and screen readers get confused otherwise, so the anchor now sits outside the list.

### Error, 404 and loading screens (Next.js file conventions)

In plain React you'd write an `<ErrorBoundary>` and a `<Suspense>` yourself. In the App Router, **special file names** do it for you, per folder:

| File                   | What it is                                                                                                                                                                                     |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `(app)/loading.tsx`    | Wrapped around the page as a `<Suspense fallback>` automatically. Shows a skeleton the moment you click a link, before the server responds.                                                    |
| `(app)/error.tsx`      | An error boundary around the page (must be `"use client"`). It receives the `error` and `retry()`, which re-renders the segment. The header stays, because the layout is outside the boundary. |
| `app/global-error.tsx` | Last resort if the **root layout** itself crashes. It replaces the whole document, so it renders its own `<html>` and `<body>`.                                                                |
| `app/not-found.tsx`    | The 404 page, for unknown URLs and every `notFound()` call (hidden or blocked plans, admin pages for non-admins).                                                                              |

In production, the browser never sees the real error message, only a `digest` ID that matches the server log.

### Lighthouse

**What:** Chrome's audit tool. It loads a page as a **slow phone** (simulated 4G network, 4× slower CPU) and scores Performance, Accessibility, Best practices and SEO from 0 to 100.
**Always measure the production build:** `npm run build && npx next start -p 3100`. Dev mode is unminified and compiles on demand, so it scores badly no matter what.
**Run:** `CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" npx lighthouse@12 http://localhost:3100/explore --chrome-flags="--headless=new" --view`. Or open Chrome DevTools → Lighthouse tab.

- **Take the median of 3 runs, after a warm-up request.** The first run after `next start` scored 85 just from cold start; the next three scored 92.
- **LCP (Largest Contentful Paint)** is the metric that moved. It measures when the biggest thing on screen, usually the hero photo, appears.
  - The page's main image should be `loading="eager"` + `fetchPriority="high"`. This replaces `priority`, which is deprecated in Next 16.
  - On Explore, the biggest image is the **first result card**, not the small header photo. It was being fetched at "Low" priority, so the first card now gets `priority`. Explore went from 78 to 90.
- **Shell gotcha:** in zsh, `for p in $LIST` does **not** split a string on spaces (bash does). Use an array, `LIST=(a b c)`.
- **"Missing meta description" on plan pages is a false alarm.** Next 16 **streams metadata**: for normal browsers, `<title>`/`<meta>` arrive with the streamed page instead of making the whole response wait for the DB. Link-preview bots (WhatsApp, Slack, Facebook…) get it in `<head>` as usual, and Googlebot runs JS. Lighthouse 12's user agent counts as a normal browser, so it doesn't see it.
- Scores are recorded in `README.md`.

## 18. M9 — deploy (part A: getting the code ready)

Big picture (with diagrams): `docs/shipping-gathr.pdf`. Choices: **Vercel** (app), **Neon** (Postgres + PostGIS), **Vercel Blob** (photos), **Resend** (email, optional).

### What changes from laptop to cloud

| Laptop                         | Production                     | Where in code                                              |
| ------------------------------ | ------------------------------ | ---------------------------------------------------------- |
| Docker Postgres                | Neon                           | nothing, just `DATABASE_URL`                               |
| `.data/uploads` folder         | Vercel Blob                    | `src/lib/storage.ts` (switches on `BLOB_STORE_ID`)         |
| Magic link printed in terminal | Email via Resend               | `src/lib/email.ts` (switches on `RESEND_API_KEY`)          |
| `.env`                         | Vercel → Environment Variables | nothing                                                    |

Each switch is "is the key set?", so local development works with no accounts at all.

### Vercel Blob (`@vercel/blob`)

**What:** a cloud folder for files. `put("covers/<uuid>.webp", data, { access: "public" })` returns a public `https://….public.blob.vercel-storage.com/…` URL, and `del(url)` removes the file.
**Why:** Vercel functions have no permanent disk. A file written there disappears when that function instance stops.
**Config:** set automatically when you connect a Blob store to the Vercel project. Newer stores set `BLOB_STORE_ID` and authenticate with Vercel's OIDC token (a short-lived login Vercel hands each function, so there's no long-lived secret to leak); older stores set `BLOB_READ_WRITE_TOKEN`. The code accepts either. The store must be created with **Public** access, because the app shows photos by plain URL; a Private store rejects `access: "public"` uploads, and you can't switch a store's access later. `next.config.ts` → `images.remotePatterns` lets `next/image` optimise images from that host.

### The 4.5 MB upload limit → shrink photos in the browser

Vercel rejects request bodies over **4.5 MB**, and phone photos are often 5–12 MB. `src/lib/shrink-image.ts` (browser only) does the following:

1. Draws a big photo onto a `<canvas>`, at most 2400 px wide.
2. Exports it as a JPEG of about 1–2 MB.
3. Uploads that smaller file. The server still re-checks it (max 4 MB) and re-encodes it with sharp.

Tested with a 12 MB, 6000×4000 photo, which was stored as a 36 KB avatar. Bonus: much faster on mobile data.

### Email with Resend (no SDK)

`sendEmail()` is one `fetch` POST to `https://api.resend.com/emails` with `Authorization: Bearer RESEND_API_KEY`.

- **Domain catch:** until you verify a domain you own, Resend's test sender `onboarding@resend.dev` can only deliver to **your own** Resend account email.
- **No email configured in production?** The sign-in page hides the email form (`isMagicLinkEnabled`), and Google sign-in carries on.

### `instrumentation.ts`: code that runs when the server starts

`register()` runs once per server instance, before any request. Plain React has nothing like it, because there's no server.

- We use it to validate env variables with Zod (`src/lib/env.ts`). A missing or short `BETTER_AUTH_SECRET`, or a missing Blob token on Vercel, stops the server with a clear list, instead of random 500s later.
- Tested: `BETTER_AUTH_SECRET=short VERCEL=1 next start` printed both problems.
- `env.ts` does **not** import `server-only`. That marker only works inside the React server bundle, and `instrumentation.ts` loads outside it.

### Rate limiting must be shared

Better Auth counted sign-in attempts **in memory**. On Vercel, many function instances run at once, each with its own memory, so "5 magic links per minute" would quietly become "5 per instance".

- **Fix:** `rateLimit.storage: "database"` + a `RateLimit` table (migration `auth_rate_limit`). Better Auth expects `key` (unique), `count` and `lastRequest` (BigInt, ms).
- **After the schema change, the running dev server's sign-in returned 500** (stale Prisma client, see M7 notes). Restarting `npm run dev` fixed it.

### Neon: pooled vs direct connection

- **Pooled** (`DATABASE_URL`, host contains `-pooler`): goes through PgBouncer, which shares a few real connections among many function instances. The app uses this.
- **Direct** (`DATABASE_URL_UNPOOLED`): `prisma migrate` needs it, because it takes a session-level lock that poolers don't support. `prisma7.config.ts` prefers it when set. Neon's Vercel integration sets both.

### Deploy-time database steps

- `vercel.json` → `"buildCommand": "prisma migrate deploy && next build"`. Every deploy first applies new migrations (never generates or resets), then builds.
- **Preview deployments run that build too.** Without Neon's integration (which gives each preview its own database branch), previews would migrate the production database.
- Production seed: `npx prisma db seed -- --categories-only` gives you the 18 categories and no fake demo users.

### CI: GitHub Actions (`.github/workflows/ci.yml`)

**What:** on every push to `main` and every pull request, GitHub starts a fresh Ubuntu machine. It then:

1. starts a throwaway PostGIS container (a `services:` entry, using the same image as `docker-compose.yml`)
2. runs `npm ci`, migrations and the seed
3. runs lint, type-check, unit tests, DB tests and the build
4. runs the Playwright suite against `npm start` (production build), using the preinstalled Chrome

A failing step marks the commit with a red ✗. The Playwright report is uploaded when tests fail.

- Secrets in that file are fake, test-only values; real ones live only in Vercel.
- Playwright config: `process.env.CI` switches to `npm start`, 1 retry, and never reuses a server.
- **Rate-limit math:** a fresh CI run signs in 4 users in global setup, plus 1 in `auth.spec`. That's exactly 5 magic links, the per-minute limit.
- **First CI run failed, and it was a real bug.** In a production build with no Resend key:
  - the sign-in page hid the email form
  - the magic-link request threw "Email is not configured"

  Locally, the browser tests reuse saved sessions, so they never requested a link. CI starts from nothing.
  - **Fix:** `EMAIL_LOG_ONLY=true` (set in `ci.yml` and Playwright's `webServer.env`) prints emails in a production build. `env.ts` refuses it on Vercel.
  - **Reproduce CI locally:** `rm -rf tests/e2e/.state && EMAIL_LOG_ONLY=true npm run build && CI=true npx playwright test` (stop `npm run dev` first, since CI mode needs port 3000).

- **Build-time vs runtime env:** parts of pages are prerendered during `next build`, so they see the env variables from **build** time. On Vercel, changing an env variable takes effect only after a **redeploy**.
- **Reading CI results:** the repo's **Actions** tab, then the run, then the red step. Full logs need you signed in to GitHub.

### Going live: what actually happened (M9, part B)

- **Live at https://gathr-meetup.vercel.app.** `people-pulse-web.vercel.app` belonged to someone else, so we added our own name under Settings → Domains.
- **Preview URLs are private.** URLs like `…-git-main-….vercel.app` and per-deploy URLs sit behind a Vercel login (Deployment Protection). Only the domain you add is public, and it's the only one Google and `BETTER_AUTH_URL` should point at.
- **New Vercel Blob stores have no `BLOB_READ_WRITE_TOKEN`.** They set `BLOB_STORE_ID`, and the SDK logs in with Vercel's short-lived OIDC token. The store must be created **Public** (see the Vercel Blob section above).
- **Integration-managed variables are locked.** `DATABASE_URL` from the Neon integration can't be edited in Vercel. After resetting the Neon password, the live site kept the old one and auth returned 500 (`prisma.rateLimit` failed first). Fix: disconnect the store from the project, connect it again, then redeploy.
- **Never commit real secrets.** `.env.example` is public (names and blank values only); real values go in `.env` (gitignored) and in Vercel. A database URL contains the password, so if one is ever pasted somewhere, reset that password.
- **Google OAuth:**
  - Add the live origin and `…/api/auth/callback/google` to the OAuth client.
  - "Publish app" needs a homepage and a privacy URL, which is why `/privacy` exists.
  - Basic scopes (name, email, photo) work without Google's review. Brand verification only adds the name and logo to the consent screen, and needs a domain you own.

### Link previews, app icon, share button (public launch polish)

**What:** "metadata files": special filenames in `app/` that Next turns into `<head>` tags. Plain React has no equivalent; you'd hand-write `<meta>`/`<link>` tags or use a library.

| File | Becomes |
| --- | --- |
| `app/opengraph-image.tsx` | site-wide `og:image`: the card WhatsApp/X/Slack show for a shared link |
| `app/(app)/activities/[id]/opengraph-image.tsx` | per-plan card (photo, category, title, day/time, **area only**). It overrides the site one for that route. |
| `app/icon.svg`, `app/favicon.ico`, `app/apple-icon.png` | tab icon and iPhone home-screen icon (generated from the logo's pin mark) |
| `app/manifest.ts` | `/manifest.webmanifest`: name, icons, colours, `start_url` for "Add to Home Screen" |

- `ImageResponse` (from `next/og`) renders JSX to a PNG. It only supports flexbox CSS and TTF/OTF fonts, so Plus Jakarta Sans lives in `src/assets/fonts/*.ttf` (SIL Open Font License). It also can't read WebP, so `src/lib/og.tsx` converts photos with sharp first.
- **Size matters:** a photo card as PNG was 842 KB, and WhatsApp skips previews much over ~300 KB. `asJpeg()` re-encodes to JPEG, giving 63–82 KB.
- The `og:image` URL is made absolute using `metadataBase` (from `SITE_URL`), so `SITE_URL` must be the live domain.
- **Share button** (`features/activity/components/share-button.tsx`): uses the Web Share API (`navigator.share`). On phones it opens the system share sheet; elsewhere it copies the link. Its text is public, so it uses the area, never the venue.
- **Honesty pass:** the hero badge now says "New · starting in…", and an empty Explore with no filters says "Be the first near X — host the first plan" instead of "Nothing matches yet". The new `/about` and `/terms` pages are linked from a shared `SiteFooter`.

---

## 19. Progress log

- [x] M0 Setup (2026-10-23)
- [x] M1 Data layer (2026-10-23)
- [x] M2 Auth & profile (2026-10-23)
- [x] M3 Create activity (2026-10-23)
- [x] M4 Discover (2026-10-23)
- [x] M5 Join flow (2026-10-23)
- [x] M6 Chat & notifications (2026-10-23)
- [x] M7 Safety (2026-10-23)
- [x] M8 Quality (2026-10-27)
- [x] M9 Deploy (2026-10-28) — live at https://gathr-meetup.vercel.app

Postgres
PostGIS
prisma
docker
neon
supabase
