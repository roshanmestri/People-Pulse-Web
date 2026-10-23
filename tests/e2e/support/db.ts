import "dotenv/config";

import { randomUUID } from "node:crypto";

import { Pool } from "pg";

/**
 * Direct SQL for fixtures and assertions. Deliberately NOT the app's Prisma client:
 * tests should check the database independently (and Playwright loads test files as
 * CommonJS, while the generated Prisma client is an ES module).
 */
// Opened lazily: global setup and teardown run in the same process, each closing it after.
let pool: Pool | null = null;

export async function sql<T = Record<string, unknown>>(text: string, values: unknown[] = []) {
  pool ??= new Pool({ connectionString: process.env.DATABASE_URL, max: 4 });
  return (await pool.query(text, values)).rows as T[];
}
export async function closeDb() {
  await pool?.end();
  pool = null;
}
export const newId = () => `e2e${randomUUID().replace(/-/g, "")}`;

export const E2E_DOMAIN = "e2e.gathr.test";
export const STATE_DIR = "tests/e2e/.state";

export const USERS = {
  host: { email: `host@${E2E_DOMAIN}`, name: "Hema Host", username: "e2e.host" },
  member: { email: `member@${E2E_DOMAIN}`, name: "Manu Member", username: "e2e.member" },
  outsider: { email: `outsider@${E2E_DOMAIN}`, name: "Omar Outsider", username: "e2e.outsider" },
  admin: { email: `admin@${E2E_DOMAIN}`, name: "Ada Admin", username: "e2e.admin" },
} as const;
export type Role = keyof typeof USERS;

/** Kothrud, Pune — plans are placed here so they show up near the default centre. */
export const VENUE = {
  latitude: 18.5074,
  longitude: 73.8077,
  venueName: "E2E Sports Ground, Court 2",
  areaName: "Kothrud, Pune",
};

export type Fixtures = {
  requestPlanId: string;
  openPlanId: string;
  requestPlanTitle: string;
  openPlanTitle: string;
};

/** Magic-link token for the latest sign-in request of `email` (stored as "magic-link:<token>"). */
export async function latestMagicToken(email: string) {
  const [row] = await sql<{ token: string }>(
    `SELECT replace(identifier, 'magic-link:', '') AS token FROM "Verification"
     WHERE value LIKE '%' || $1 || '%' ORDER BY "createdAt" DESC LIMIT 1`,
    [email],
  );
  return row?.token ?? null;
}
