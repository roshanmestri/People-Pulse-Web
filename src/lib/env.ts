import { z } from "zod";

/**
 * Checks environment variables once when the server starts (src/instrumentation.ts), so a
 * missing secret fails loudly with a clear message instead of as random 500s later.
 */
const schema = z.object({
  DATABASE_URL: z.url("DATABASE_URL must be a postgresql:// connection string"),
  BETTER_AUTH_SECRET: z
    .string()
    .min(32, "BETTER_AUTH_SECRET must be at least 32 characters (openssl rand -base64 32)"),
  BETTER_AUTH_URL: z.url(
    "BETTER_AUTH_URL must be the app's public URL, e.g. https://gathr.vercel.app",
  ),
});

export function checkEnv() {
  const result = schema.safeParse(process.env);
  const problems = result.success
    ? []
    : result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);

  // On Vercel there is no permanent disk, so uploads must go to Vercel Blob.
  if (process.env.VERCEL && !process.env.BLOB_READ_WRITE_TOKEN)
    problems.push(
      "BLOB_READ_WRITE_TOKEN: required on Vercel (connect a Blob store to the project)",
    );

  if (problems.length)
    throw new Error(`Invalid environment variables:\n  - ${problems.join("\n  - ")}`);

  const google = process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET;
  if (process.env.NODE_ENV === "production" && !process.env.RESEND_API_KEY && !google)
    console.warn(
      "⚠️  No sign-in method: set RESEND_API_KEY (email) and/or GOOGLE_CLIENT_ID/SECRET.",
    );
}
