import "server-only";

import { headers } from "next/headers";
import { connection } from "next/server";
import { notFound, redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * Data Access Layer for "who is signed in". Reads the request, so call it from a
 * component inside <Suspense>, a Server Action or a Route Handler — never at the
 * top of a layout.
 */
export async function getSessionUser() {
  // Mark this as request-time work before Better Auth reads the clock (session expiry);
  // otherwise Next's prerender check flags `new Date()` as an unstable value.
  await connection();
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user ?? null;
}

/** Like getSessionUser, but sends signed-out visitors to /sign-in. */
export async function requireSessionUser(next?: string) {
  const user = await getSessionUser();
  if (!user) redirect(next ? `/sign-in?next=${encodeURIComponent(next)}` : "/sign-in");
  return user;
}

/** Admin-only pages and actions (FR-8.3). Non-admins get a plain 404 — nothing to discover. */
export async function requireAdmin() {
  const user = await requireSessionUser("/admin");
  const row = await db.user.findUnique({ where: { id: user.id }, select: { role: true } });
  if (row?.role !== "ADMIN") notFound();
  return user;
}

/** Same check for Server Actions (no redirects): null unless the caller is an admin. */
export async function getAdminUser() {
  const user = await getSessionUser();
  if (!user) return null;
  const row = await db.user.findUnique({ where: { id: user.id }, select: { role: true } });
  return row?.role === "ADMIN" ? user : null;
}
