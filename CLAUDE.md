# CLAUDE.md — Gathr

## Project

Gathr: location-based app to find nearby people for offline activities. Full requirements are in `BRD.md` — read it before starting any milestone.

## About me

Frontend engineer, 4 years React/TypeScript, **new to Next.js and backend**. I'm building this to learn every layer. Explain Next.js-specific decisions briefly by comparing to plain React.

## Stack

Next.js (App Router, latest stable) · TypeScript strict · Tailwind CSS + shadcn/ui · PostgreSQL + PostGIS (Docker) · Prisma · Better Auth · Zod · React Hook Form · TanStack Query (only where needed) · react-leaflet · Vitest · Playwright.

## How to work with me

1. Work **one milestone at a time** (see BRD §11). Show a short plan first, then build.
2. Prefer Server Components; add `"use client"` only on leaf components that need interactivity.
3. Every Server Action / Route Handler: validate with Zod, check auth & ownership, return typed results.
4. Capacity/join logic must use DB transactions.
5. Never expose exact coordinates in public responses.
6. Feature-based folders: `src/features/<feature>/{actions,queries,schemas,components}`.
7. After adding any library, config file or new concept, **update `notes.md`** with a short plain-language "what / why / config" entry, and tick the progress log.
8. Use conventional commit messages. Suggest the commit after each milestone.
9. Design: follow BRD §14 ("v2 — photo-led, sporty"): real photos, white UI, near-black ink, one orange accent `#FF5B22`, Plus Jakarta Sans, light + dark mode. Prototypes: https://claude.ai/artifact/P3Depp7cK2ttJmCyhRzxa6

## Commands

- `npm run dev` — start app
- `docker compose up -d` — start Postgres
- `npx prisma migrate dev` / `npx prisma studio` / `npx prisma db seed`
- `npm run lint`, `npm test`, `npx playwright test`
