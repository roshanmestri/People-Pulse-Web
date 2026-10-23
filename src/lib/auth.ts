import "server-only";

import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { magicLink } from "better-auth/plugins";

import { db } from "@/lib/db";

const googleEnabled = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

export const auth = betterAuth({
  database: prismaAdapter(db, { provider: "postgresql" }),
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    updateAge: 60 * 60 * 24, // refresh the expiry at most once a day
  },
  // FR-1.3: users can delete their account; DB cascades remove their data.
  user: { deleteUser: { enabled: true } },
  socialProviders: googleEnabled
    ? {
        google: {
          clientId: process.env.GOOGLE_CLIENT_ID!,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        },
      }
    : {},
  // Built-in rate limiting (BRD §6: rate limit auth). Stricter for sign-in endpoints.
  rateLimit: {
    enabled: true,
    window: 60,
    max: 100,
    customRules: { "/sign-in/magic-link": { window: 60, max: 5 } },
  },
  plugins: [
    magicLink({
      expiresIn: 60 * 15,
      sendMagicLink: async ({ email, url }) => {
        // M2: no email provider yet — print the link in the dev server terminal.
        // TODO(email): send with Resend once an email provider is configured.
        console.log(`\n✉️  Magic link for ${email}\n   ${url}\n`);
      },
    }),
    // Lets Server Actions set auth cookies. Must be the last plugin.
    nextCookies(),
  ],
});

export const isGoogleEnabled = googleEnabled;
