import "server-only";

import { headers } from "next/headers";
import { connection } from "next/server";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";

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
