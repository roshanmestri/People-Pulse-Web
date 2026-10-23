import { resetData } from "./global-setup";
import { closeDb, sql, USERS } from "./support/db";

/** Leave the database as we found it (the e2e users stay, their data goes). */
export default async function globalTeardown() {
  const users = await sql<{ id: string }>(`SELECT id FROM "User" WHERE email = ANY($1)`, [
    Object.values(USERS).map((u) => u.email),
  ]);
  await resetData(users.map((u) => u.id));
  await closeDb();
}
