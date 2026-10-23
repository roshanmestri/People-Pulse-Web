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
- **Geo columns:** Prisma doesn't fully understand PostGIS types, so we mark them `Unsupported("geography(Point,4326)")` and use `db.$queryRaw` for the radius query.
- **One client only:** create Prisma client once in `src/lib/db.ts` (reuse in dev to avoid "too many connections").

---

## 6. Backend language

The backend is **TypeScript running on Node.js**, inside Next.js (Server Actions + Route Handlers). Same language front and back, types shared everywhere. Real-time chat (Phase 2) may add a small separate Node server with Socket.IO.

---

## 7. Libraries — one-line notes

| Library                   | What it does                                      | Config notes                                                                       |
| ------------------------- | ------------------------------------------------- | ---------------------------------------------------------------------------------- |
| **Tailwind CSS**          | Utility classes for styling                       | Design tokens (colours, fonts) in global CSS                                       |
| **shadcn/ui**             | Copy-paste accessible components (built on Radix) | `npx shadcn@latest add button` — code lands in `components/ui`, you own it         |
| **Zod**                   | Describe the shape of data and validate it        | One schema used by the form AND the server action                                  |
| **React Hook Form**       | Fast forms with few re-renders                    | Use `zodResolver(schema)`                                                          |
| **Auth.js / Better Auth** | Login, sessions, Google OAuth                     | Needs `AUTH_SECRET`, provider keys, Prisma adapter tables                          |
| **TanStack Query**        | Fetch/cache data in Client Components             | Only where needed (chat polling, infinite scroll)                                  |
| **react-leaflet**         | Map component                                     | Must be a Client Component; load with `dynamic(() => import(...), { ssr: false })` |
| **date-fns**              | Date formatting/maths                             | Keep times stored in UTC, show in local time                                       |
| **Vitest**                | Unit tests (fast, Vite-like)                      | Test pure logic: capacity rules, validators                                        |
| **Playwright**            | Browser end-to-end tests                          | Test flows: sign in → create → join                                                |
| **ESLint / Prettier**     | Catch bugs / auto-format                          | Run on save + pre-commit                                                           |
| **Husky + lint-staged**   | Run lint before each commit                       | —                                                                                  |
| **Docker**                | Runs Postgres in a container                      | `docker compose up -d`                                                             |

---

## 8. Glossary

- **SSR:** server builds the HTML per request.
- **SSG:** HTML built once at build time.
- **Streaming:** server sends page in chunks; slow parts show a fallback first.
- **Hydration:** browser attaches React to server HTML so buttons work.
- **Migration:** a versioned change to the DB structure.
- **Seed:** fake starter data.
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

## 10. Progress log

- [x] M0 Setup (2026-10-23)
- [ ] M1 Data layer
- [ ] M2 Auth & profile
- [ ] M3 Create activity
- [ ] M4 Discover
- [ ] M5 Join flow
- [ ] M6 Chat & notifications
- [ ] M7 Safety
- [ ] M8 Quality
- [ ] M9 Deploy
