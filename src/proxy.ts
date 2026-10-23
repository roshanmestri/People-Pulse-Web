import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

// Runs before matching requests. This is only an optimistic check (is there a
// session cookie?) to redirect quickly; pages and Server Actions still verify
// the session for real via src/lib/session.ts.
export function proxy(request: NextRequest) {
  if (!getSessionCookie(request)) {
    const signIn = new URL("/sign-in", request.url);
    signIn.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(signIn);
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/me/:path*",
    "/onboarding/:path*",
    "/plans/:path*",
    "/activities/new",
    "/activities/:id/edit",
    "/activities/:id/manage",
  ],
};
