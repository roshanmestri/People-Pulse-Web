import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

import { chromium, type FullConfig } from "@playwright/test";

import {
  closeDb,
  E2E_DOMAIN,
  latestMagicToken,
  newId,
  sql,
  STATE_DIR,
  USERS,
  VENUE,
  type Fixtures,
  type Role,
} from "./support/db";

/**
 * Creates the e2e users (kept between runs) and fresh plans, then signs each user in
 * ONCE and saves the session (storageState). Saved sessions are reused while still
 * valid, so repeated runs don't hit the magic-link rate limit (5/min).
 */
export default async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0]!.use.baseURL!;
  mkdirSync(STATE_DIR, { recursive: true });

  const [category] = await sql<{ id: string }>(
    `SELECT id FROM "Category" WHERE slug = 'sports-fitness'`,
  );
  if (!category) throw new Error("Seed data missing — run `npm run db:seed` first.");

  const ids = {} as Record<Role, string>;
  for (const [role, u] of Object.entries(USERS) as [Role, (typeof USERS)[Role]][]) {
    const [user] = await sql<{ id: string }>(
      `INSERT INTO "User" (id, email, name, username, "emailVerified", bio, "homeAreaName", "homeLatitude",
                           "homeLongitude", role, "updatedAt")
       VALUES ($1, $2, $3, $4, true, 'End-to-end test account', $5, $6, $7, $8::"Role", now())
       ON CONFLICT (email) DO UPDATE
         SET "suspendedAt" = NULL, "verificationRevokedAt" = NULL, role = EXCLUDED.role
       RETURNING id`,
      [
        newId(),
        u.email,
        u.name,
        u.username,
        VENUE.areaName,
        VENUE.latitude,
        VENUE.longitude,
        role === "admin" ? "ADMIN" : "MEMBER",
      ],
    );
    ids[role] = user!.id;
    await sql(
      `INSERT INTO "Interest" ("userId", "categoryId") VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [user!.id, category.id],
    );
  }

  await resetData(Object.values(ids));

  // Fresh plans for this run (unique titles so searches find exactly these).
  const run = Date.now().toString(36);
  const inTwoDays = new Date(Date.now() + 2 * 24 * 60 * 60_000);
  const plan = async (title: string, joinMode: "REQUEST" | "OPEN") => {
    const id = newId();
    await sql(
      `INSERT INTO "Activity" (id, "hostId", "categoryId", title, description, "startsAt", "durationMinutes",
         "minPeople", "maxPeople", "joinMode", "skillLevel", status, "pricePerPerson", "venueName", latitude,
         longitude, "areaName", "showExactVenue", "updatedAt")
       VALUES ($1, $2, $3, $4, 'A plan created by the end-to-end test suite.', $5, 90, 1, 2, $6::"JoinMode",
         'ANY', 'OPEN', 120, $7, $8, $9, $10, false, now())`,
      [
        id,
        ids.host,
        category.id,
        title,
        inTwoDays,
        joinMode,
        VENUE.venueName,
        VENUE.latitude,
        VENUE.longitude,
        VENUE.areaName,
      ],
    );
    return { id, title };
  };
  const requestPlan = await plan(`E2E doubles badminton ${run}`, "REQUEST");
  const openPlan = await plan(`E2E evening run ${run}`, "OPEN");
  const fixtures: Fixtures = {
    requestPlanId: requestPlan.id,
    requestPlanTitle: requestPlan.title,
    openPlanId: openPlan.id,
    openPlanTitle: openPlan.title,
  };
  writeFileSync(`${STATE_DIR}/fixtures.json`, JSON.stringify(fixtures, null, 2));

  // Sign in each role once; reuse saved sessions while they're valid.
  const browser = await chromium.launch({ channel: "chrome" });
  for (const role of Object.keys(USERS) as Role[]) {
    const file = `${STATE_DIR}/${role}.json`;
    if (existsSync(file) && (await sessionStillValid(file, ids[role]))) continue;
    const context = await browser.newContext({ baseURL });
    const page = await context.newPage();
    const res = await page.request.post("/api/auth/sign-in/magic-link", {
      data: { email: USERS[role].email, callbackURL: "/plans" },
      headers: { Origin: baseURL },
    });
    if (!res.ok())
      throw new Error(
        `magic link for ${role} failed: ${res.status()} (rate limited? wait a minute)`,
      );
    const token = await latestMagicToken(USERS[role].email);
    await page.goto(`/api/auth/magic-link/verify?token=${token}&callbackURL=%2Fplans`);
    await page.waitForURL("**/plans");
    await context.storageState({ path: file });
    await context.close();
  }
  await browser.close();
  await closeDb();
}

/** Wipe everything the e2e users made, but keep the users (and their sessions). */
export async function resetData(userIds: string[]) {
  await sql(`DELETE FROM "Report" WHERE "reporterId" = ANY($1) OR "targetId" = ANY($1)`, [userIds]);
  await sql(`DELETE FROM "Block" WHERE "blockerId" = ANY($1) OR "blockedId" = ANY($1)`, [userIds]);
  await sql(`DELETE FROM "Notification" WHERE "userId" = ANY($1)`, [userIds]);
  await sql(`DELETE FROM "Activity" WHERE "hostId" = ANY($1)`, [userIds]); // cascades requests + messages
  await sql(`DELETE FROM "JoinRequest" WHERE "userId" = ANY($1)`, [userIds]);
  await sql(`DELETE FROM "Message" WHERE "senderId" = ANY($1)`, [userIds]);
  // Throwaway users created by individual tests (e.g. onboarding).
  await sql(`DELETE FROM "User" WHERE email LIKE $1`, [`%@new.${E2E_DOMAIN}`]);
}

async function sessionStillValid(file: string, userId: string) {
  const state = JSON.parse(readFileSync(file, "utf8")) as {
    cookies: { name: string; value: string }[];
  };
  const cookie = state.cookies.find((c) => c.name.endsWith("better-auth.session_token"));
  if (!cookie) return false;
  const token = decodeURIComponent(cookie.value).split(".")[0];
  const [session] = await sql<{ userId: string; expiresAt: Date }>(
    `SELECT "userId", "expiresAt" FROM "Session" WHERE token = $1`,
    [token],
  );
  return session?.userId === userId && session.expiresAt > new Date(Date.now() + 60 * 60_000);
}
