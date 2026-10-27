// Next.js calls register() once when a server instance starts, before it handles requests.
// (Plain React has no equivalent: there's no server to start.)
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { checkEnv } = await import("@/lib/env");
    checkEnv();
  }
}
