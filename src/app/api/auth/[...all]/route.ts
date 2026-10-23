import { toNextJsHandler } from "better-auth/next-js";

import { auth } from "@/lib/auth";

// Catch-all Route Handler: every /api/auth/* request (sign-in, callbacks, sign-out…) goes to Better Auth.
export const { GET, POST } = toNextJsHandler(auth);
