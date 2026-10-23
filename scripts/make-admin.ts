/**
 * Make someone an admin (creates the account if it doesn't exist yet).
 *   npm run make-admin -- you@example.com
 * Then sign in with that email; "Admin · moderation" appears in the account menu.
 */
import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client";

const email = process.argv[2]?.trim().toLowerCase();
if (!email || !email.includes("@")) {
  console.error("Usage: npm run make-admin -- you@example.com");
  process.exit(1);
}

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

// Wrapped in main(): scripts run as CommonJS here, which has no top-level await.
async function main() {
  const user = await db.user.upsert({
    where: { email },
    update: { role: "ADMIN" },
    create: { email, name: "Gathr Admin", emailVerified: true, role: "ADMIN" },
    select: { email: true, role: true },
  });
  console.log(`✓ ${user.email} is now ${user.role}`);
  await db.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
