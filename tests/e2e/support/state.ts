import { newId, sql, USERS, type Role } from "./db";

export async function userId(role: Role) {
  const [row] = await sql<{ id: string }>(`SELECT id FROM "User" WHERE email = $1`, [
    USERS[role].email,
  ]);
  return row!.id;
}

/** Put `role` straight into a plan as an approved member (for tests that need it). */
export async function approve(role: Role, activityId: string) {
  await sql(
    `INSERT INTO "JoinRequest" (id, "activityId", "userId", status, "decidedAt", "updatedAt")
     VALUES ($1, $2, $3, 'APPROVED', now(), now())
     ON CONFLICT ("activityId", "userId") DO UPDATE SET status = 'APPROVED', "decidedAt" = now()`,
    [newId(), activityId, await userId(role)],
  );
}

export async function requestStatus(role: Role, activityId: string) {
  const [row] = await sql<{ status: string }>(
    `SELECT status FROM "JoinRequest" WHERE "activityId" = $1 AND "userId" = $2`,
    [activityId, await userId(role)],
  );
  return row?.status ?? null;
}
