import { magicLinkClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

// Browser-side auth helpers for Client Components (sign in / sign out buttons).
export const authClient = createAuthClient({
  plugins: [magicLinkClient()],
});
