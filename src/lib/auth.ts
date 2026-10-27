import "server-only";

import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { magicLink } from "better-auth/plugins";

import { db } from "@/lib/db";
import { isEmailEnabled, magicLinkEmail, sendEmail } from "@/lib/email";

const googleEnabled = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

export const auth = betterAuth({
  database: prismaAdapter(db, { provider: "postgresql" }),
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    updateAge: 60 * 60 * 24, // refresh the expiry at most once a day
  },
  // FR-1.3: users can delete their account; DB cascades remove their data.
  user: { deleteUser: { enabled: true } },
  // FR-8.3: suspended users can't start new sessions (suspending also deletes existing ones).
  databaseHooks: {
    session: {
      create: {
        before: async (session) => {
          const user = await db.user.findUnique({
            where: { id: session.userId },
            select: { suspendedAt: true },
          });
          return user?.suspendedAt ? false : undefined;
        },
      },
    },
  },
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
    // Count requests in Postgres (RateLimit table), not in memory: on Vercel each function
    // instance has its own memory, so in-memory counts would reset and never add up.
    storage: "database",
  },
  plugins: [
    magicLink({
      expiresIn: 60 * 15,
      // Sent with Resend; in development without RESEND_API_KEY it's printed in the terminal.
      sendMagicLink: async ({ email, url }) => sendEmail(magicLinkEmail(email, url)),
    }),
    // Lets Server Actions set auth cookies. Must be the last plugin.
    nextCookies(),
  ],
});

export const isGoogleEnabled = googleEnabled;
/** Email sign-in needs a real email sender in production (development prints the link). */
export const isMagicLinkEnabled = isEmailEnabled;
