# Gathr — Business Requirements Document (BRD)

> **Tagline:** Find your people, nearby.
> **Version:** 1.0 · **Owner:** <your name> · **Status:** Draft for build

---

## 1. Purpose & Vision

Gathr is a location-based web app that helps people find others nearby who want to do the same offline activity: play a sport, jam on music, run a workshop, clean a park, help someone in need.

A **Host** posts an *Activity* (what, where, when, how many people). **Members** nearby discover it on a list or map, send a join request, get accepted, and chat with the group.

**Social goal:** turn "I wish someone near me was up for this" into a real meetup, and make community and volunteering activities easy to organize.

**Engineering goal (personal):** build a production-grade full-stack app end to end with Next.js (App Router), TypeScript, PostgreSQL and Prisma, and understand every layer from schema to deployment.

---

## 2. Activity Categories

| # | Category | Examples |
|---|----------|----------|
| 1 | Sports & Fitness | Cricket, football, badminton, running, cycling, yoga, gym buddy |
| 2 | Music | Jam sessions, band practice, singing, open mic |
| 3 | Dance | Group practice, classes, flash mobs |
| 4 | Events & Concerts | Going together to a concert, play, match screening |
| 5 | Workshops | Art, pottery, photography, coding, cooking |
| 6 | Learning & Tuition | Peer tutoring, exam study groups, language exchange |
| 7 | Tutorials & Tech Talks | Live demos, hackathons, dev meetups |
| 8 | Podcasts & Content | Co-hosts, guests, recording sessions |
| 9 | Communication & Speaking | Public speaking, debate, English-speaking clubs |
| 10 | Civic & National Interest | Awareness drives, voter awareness, tree plantation, Independence/Republic Day events |
| 11 | Helping Hands | Elder care visits, blood donation, food distribution, shifting help |
| 12 | Cleanliness Drives | Beach, lake, park, street clean-ups |
| 13 | Outdoors & Travel | Treks, hikes, day trips, bird watching |
| 14 | Games & Hobbies | Board games, chess, gaming, book club, reading circles |
| 15 | Food & Social | Food walks, potlucks, café meetups |
| 16 | Pets & Animals | Dog walks, stray feeding, shelter volunteering |
| 17 | Wellness | Meditation, mental-health support circles, walking groups |
| 18 | Other | Anything else (host adds a custom tag) |

Categories are stored in the database (not hard-coded) so admins can add new ones.

---

## 3. Users & Roles

| Role | Description |
|------|-------------|
| **Guest** | Not signed in. Can browse public activities in an area (approximate location only). |
| **Member** | Signed-in user. Can join, chat, and host activities. |
| **Host** | A Member who created a specific activity. Approves/rejects requests for it. |
| **Admin** | Moderates reports, manages categories, can suspend users. |

---

## 4. Scope

### 4.1 In scope (MVP — Phase 1)
1. Authentication (email + Google)
2. Profile with interests and home area
3. Create / edit / cancel an activity
4. Discover activities by location (radius), category, date, and text search
5. List view and map view
6. Join requests (send, approve, reject, withdraw)
7. Group chat per activity (accepted members only)
8. In-app notifications
9. Report & block
10. Price per person shown on activities (informational, no payments)
11. Verified-host badge (basic: verified email + complete profile; admin can revoke)

### 4.2 Phase 2
- Real-time chat via WebSockets, typing indicators, read receipts
- Recurring activities (e.g. "every Sunday 7 AM")
- Ratings / "attended" confirmation and trust score (see FR-9) — host star rating shown on cards and profiles
- Stronger host verification: phone OTP, optional government-ID check
- Email + web push notifications
- Saved searches ("notify me when a badminton game is posted within 3 km")

### 4.3 Out of scope (for now)
- Payments / paid events
- Native mobile apps (the web app must be responsive and installable as a PWA later)
- 1:1 DMs between strangers who are not in a shared activity (safety)

---

## 5. Functional Requirements

### FR-1 Authentication & Accounts
- FR-1.1 Sign up / sign in with email (magic link or password) and Google OAuth.
- FR-1.2 Sessions persist securely (HTTP-only cookies).
- FR-1.3 Users can sign out from all devices and delete their account (data removed or anonymized).

### FR-2 Profile
- FR-2.1 Name, avatar, short bio, age range (optional), languages spoken.
- FR-2.2 Select interests from categories (used for recommendations).
- FR-2.3 Set a home area via search or "use my location". **Only the area (locality/city) is ever shown publicly**, never exact coordinates.
- FR-2.4 Public profile page shows: name, avatar, bio, interests, activities hosted, member since, verified badge (if any).
- FR-2.5 **Verified host badge (MVP):** shown when the user has a verified email address and a complete profile (name, photo, bio, home area, ≥1 interest). It is recalculated when the profile changes; an admin can revoke it (e.g. after upheld reports) and the user then sees why. Phase 2 adds phone OTP and optional ID verification.

### FR-3 Create Activity (Host)
Required fields:
- Title, category, description
- **People required** (min/max participants)
- **Date & start time**, **duration** (time the host wants to spend)
- **Venue**: name + map pin (exact address revealed only to accepted members — host's choice)
- **Join mode**: *Request to join* (host approves) or *Open* (auto-accept until full)

Optional fields:
- Skill level (beginner / intermediate / pro / any)
- Gender/age preference (optional, displayed, not enforced)
- What to bring
- **Price per person** in ₹ (0 = free), plus an optional short price note (e.g. "court fee, split at venue", "pay as you eat"). Informational only — Gathr does not take payments (see §4.3).
- Cover image
- Tags

Rules:
- FR-3.1 Activity cannot be scheduled in the past.
- FR-3.2 Host can edit details; accepted members are notified of changes to time or venue.
- FR-3.3 Host can cancel; all members are notified.
- FR-3.4 Status lifecycle: `DRAFT → OPEN → FULL → ONGOING → COMPLETED` or `CANCELLED`. Status updates automatically from capacity and time.

### FR-4 Discover & Search
- FR-4.1 Default feed: activities near the user's location, sorted by distance and start time.
- FR-4.2 Filters: radius (1 / 3 / 5 / 10 / 25 km), category (multi-select), date range (today, this weekend, custom), skill level, spots available only.
- FR-4.3 Full-text search on title, description and tags.
- FR-4.4 Map view with clustered pins; clicking a pin opens an activity preview card.
- FR-4.5 Activity detail page: all info, host card, spots left, distance, join button, share link.
- FR-4.6 Results are paginated (cursor-based) and filters are reflected in the URL (shareable, back-button friendly).

### FR-5 Join Requests
- FR-5.1 Member sends a request with an optional short message.
- FR-5.2 Host sees pending requests with requester profile and can approve/reject.
- FR-5.3 Member can withdraw a request or leave an activity.
- FR-5.4 Capacity is enforced at the database level (no overbooking under concurrent requests).
- FR-5.5 Request states: `PENDING → APPROVED | REJECTED | WITHDRAWN`, and `APPROVED → LEFT | REMOVED`.

### FR-6 Chat
- FR-6.1 Each activity has a group chat visible to host + approved members only.
- FR-6.2 Text messages, with timestamps and sender avatars.
- FR-6.3 Phase 1: messages refresh via polling/revalidation. Phase 2: real-time via WebSockets.
- FR-6.4 Chat becomes read-only 7 days after the activity completes.

### FR-7 Notifications
- FR-7.1 In-app notification bell for: new request (host), request approved/rejected, activity updated/cancelled, new chat message, reminder 2 hours before start.
- FR-7.2 Mark as read / mark all as read.

### FR-8 Safety & Moderation
- FR-8.1 Report a user, activity, or message with a reason.
- FR-8.2 Block a user (they can't see your activities or request to join them).
- FR-8.3 Admin dashboard: review reports, hide content, suspend users, manage categories.
- FR-8.4 Basic content filtering on titles/descriptions (profanity list).
- FR-8.5 Safety tips shown before joining activities with strangers.

### FR-9 Ratings (Phase 2)
- FR-9.1 After an activity is `COMPLETED`, the host marks who attended; attendees can then rate the host (1–5 stars, optional short comment) within 7 days.
- FR-9.2 A host's rating is the average of their ratings; it is shown (★ 4.8 · 23 ratings) only once they have at least 3. Before that, cards show "New host" or "N hosted".
- FR-9.3 One rating per attendee per activity; ratings can be reported like messages.

---

## 6. Non-Functional Requirements

| Area | Requirement |
|------|-------------|
| **Performance** | LCP < 2.5s on 4G, INP < 200ms, CLS < 0.1. Server Components by default; ship minimal client JS. Nearby search query < 200ms for 100k activities. |
| **Responsiveness** | Mobile-first; works from 360px width upward. |
| **Accessibility** | WCAG 2.1 AA: keyboard navigation, focus states, labels, colour contrast. |
| **Security** | Input validation on server (Zod) for every mutation; authorization checks on every server action/route; rate limiting on auth, join requests and chat; no exact coordinates leaked in API responses; OWASP Top 10 awareness. |
| **Privacy** | Location stored as coordinates but only approximated (e.g. rounded/geohash) in public responses. Account deletion supported. |
| **Reliability** | DB transactions for capacity-sensitive operations; graceful error and loading states. |
| **Observability** | Structured server logs; error tracking (e.g. Sentry) in Phase 2. |
| **SEO** | Public activity pages server-rendered with proper metadata and Open Graph images. |
| **Code quality** | TypeScript strict mode, ESLint, Prettier, conventional commits, tests for core logic. |

---

## 7. Tech Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Framework | **Next.js (App Router, latest stable)** + **TypeScript** | Full-stack React: SSR, Server Components, Server Actions, routing |
| Backend | Next.js **Server Actions** + **Route Handlers** (TypeScript / Node.js runtime) | One codebase, typed end to end |
| Database | **PostgreSQL** + **PostGIS** extension | Relational data + fast geo/radius queries |
| ORM | **Prisma** (+ Prisma Studio as DB visualizer) | Typed queries, migrations |
| Auth | **Better Auth** (chosen 2026-10-23) | Email + Google sign-in, DB sessions, Prisma adapter, built-in rate limiting |
| Validation | **Zod** | Shared schemas for forms and server |
| Forms | **React Hook Form** + Zod resolver | Performant forms |
| Styling | **Tailwind CSS** + **shadcn/ui** | Minimal, accessible components you own |
| Client data (where needed) | **TanStack Query** | Polling chat, infinite lists |
| Maps | **Leaflet / react-leaflet** + OpenStreetMap tiles | Free, no API key to start |
| Geocoding | Nominatim (OSM) to start | Free address ↔ coordinates |
| Images | Cloudinary or UploadThing | Avatar and cover uploads |
| Real-time (Phase 2) | Socket.IO server or a managed service (Pusher/Ably) | Live chat |
| Local infra | **Docker Compose** (Postgres + PostGIS) | Same DB everywhere |
| Testing | **Vitest** + React Testing Library, **Playwright** for E2E | Unit + flows |
| Tooling | ESLint, Prettier, Husky + lint-staged | Consistency |
| Deployment (later) | Vercel (app) + Neon / Supabase / Railway (Postgres) | Simple CI/CD |

---

## 8. High-Level Data Model

```
User (id, name, email, emailVerified, image, bio, homeLocation[geo], homeAreaName, role,
      verifiedAt, verificationRevokedAt, createdAt)
Interest (userId, categoryId)                      -- many-to-many
Category (id, slug, name, icon, isActive)
Activity (id, hostId, categoryId, title, description,
          startsAt, durationMinutes, minPeople, maxPeople,
          joinMode[REQUEST|OPEN], skillLevel, venueName,
          location[geo], areaName, showExactVenue, coverImage,
          pricePerPerson, priceNote, status, createdAt, updatedAt)
ActivityTag (activityId, tag)
JoinRequest (id, activityId, userId, message, status, createdAt, decidedAt)
            -- unique (activityId, userId)
Message (id, activityId, senderId, body, createdAt)
Notification (id, userId, type, payload[json], readAt, createdAt)
Report (id, reporterId, targetType, targetId, reason, status, createdAt)
Block (blockerId, blockedId)
Rating (id, activityId, raterId, rateeId, score, comment, createdAt)   -- Phase 2
       -- unique (activityId, raterId, rateeId)
Account / Session / Verification                   -- Better Auth tables
```
Indexes: GiST index on `Activity.location`, B-tree on `(status, startsAt)`, full-text (tsvector) on title + description.

---

## 9. Key Pages / Routes

| Route | Purpose | Rendering |
|-------|---------|-----------|
| `/` | Landing page | Static |
| `/explore` | Nearby feed + filters + map toggle | Server Component + client filters |
| `/activities/new` | Create activity form | Client form + Server Action |
| `/activities/[id]` | Activity detail | Server-rendered, SEO metadata |
| `/activities/[id]/manage` | Host: requests & edits | Protected |
| `/activities/[id]/chat` | Group chat | Protected, client |
| `/me` / `/me/activities` | My profile, hosted & joined activities | Protected |
| `/u/[username]` | Public profile | Server-rendered |
| `/notifications` | Notification list | Protected |
| `/admin` | Moderation | Admin only |
| `/sign-in` | Auth | — |

---

## 10. Suggested Project Structure

```
gathr/
├─ prisma/                 schema.prisma, migrations, seed.ts
├─ src/
│  ├─ app/                 routes (App Router), layouts, loading/error files
│  │  ├─ (marketing)/      landing
│  │  ├─ (app)/            explore, activities, me, notifications
│  │  ├─ admin/
│  │  └─ api/              route handlers (auth, webhooks, chat polling)
│  ├─ components/          ui/ (shadcn), shared components
│  ├─ features/            activity/, join-request/, chat/, profile/ (actions, queries, schemas, components)
│  ├─ lib/                 db.ts (Prisma client), auth.ts, geo.ts, utils.ts
│  └─ types/
├─ tests/                  unit + e2e
├─ docker-compose.yml
├─ notes.md                plain-language learning notes
├─ BRD.md
└─ CLAUDE.md               instructions for the AI assistant
```

---

## 11. Build Milestones

| # | Milestone | Done when |
|---|-----------|-----------|
| M0 | Setup | Next.js + TS + Tailwind + shadcn + ESLint/Prettier; Docker Postgres+PostGIS running; Prisma connected |
| M1 | Data layer | Prisma schema + migrations + seed data (categories, 50 fake activities around Pune/Sangli/Mumbai) |
| M2 | Auth & profile | App shell in the v2 design; sign in/out (Better Auth); profile edit, interests, home area; verified-host badge |
| M3 | Create activity | Form with validation (incl. price per person), map pin picker, Server Action, detail page |
| M4 | Discover | Radius query (PostGIS), filters in URL, search, pagination, map view |
| M5 | Join flow | Request/approve/reject with transaction-safe capacity |
| M6 | Chat & notifications | Group chat (polling), notification bell |
| M7 | Safety | Report, block, admin dashboard |
| M8 | Quality | Tests, accessibility pass, Lighthouse ≥ 90, error/loading states |
| M9 | Deploy | Vercel + hosted Postgres, env vars, CI (GitHub Actions) |
| P2 | Ratings & trust | Attendance marking, host ratings (FR-9), phone/ID verification |

---

## 12. Success Metrics (product)
- Time to post an activity < 60 seconds
- % of activities that get at least one approved member
- Request → approval rate
- Weekly active hosts
- Reports per 1,000 activities (should stay low)

---

## 13. Portfolio Showcase Points
What this project should demonstrate to a hiring panel:
- Next.js App Router mastery: Server vs Client Components, Server Actions, caching/revalidation, streaming with `loading.tsx`, metadata API
- Geo-spatial queries with PostGIS
- Concurrency-safe business logic (capacity with transactions)
- Auth + role-based authorization
- Clean feature-based architecture, typed end to end (Prisma → Zod → UI)
- Performance & accessibility numbers documented in the README

---

## 14. Design Direction (locked 2026-10-23)
**"v2 — photo-led, sporty"** — prototypes: https://claude.ai/artifact/P3Depp7cK2ttJmCyhRzxa6 (v2 rows).
- Real photography leads: full-bleed photo heroes with a dark scrim, photo on every activity card, round photo category chips.
- White UI, near-black ink `#0F0F10`, one energetic accent **orange `#FF5B22`** (with dark text on it), deep orange `#B23A0E` for small accent text; verified tick blue `#1D7BF2`.
- Typeface: **Plus Jakarta Sans** (700–800 for headings, tight letter-spacing).
- Cards answer at a glance: when, how far, spots left, price, who's going, who hosts.
- Mobile-first: bottom tab bar with a central "+ Host" action, primary actions pinned to the bottom.
- Light mode first; dark mode follows the same tokens.
