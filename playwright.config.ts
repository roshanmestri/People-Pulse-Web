import { defineConfig, devices } from "@playwright/test";

// End-to-end tests (npm run test:e2e). Needs Docker (Postgres) running.
// Uses your installed Google Chrome (channel "chrome") — no browser download.
// Starts `npm run dev` automatically, or reuses one already running on :3000.
// In CI (GitHub Actions sets CI=true) it runs the production build instead: `npm start`.
export default defineConfig({
  testDir: "tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  globalTeardown: "./tests/e2e/global-teardown.ts",
  fullyParallel: false,
  workers: 1, // tests share one set of fixture data
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: [["list"], ["html", { open: "never", outputFolder: "tests/e2e/.report" }]],
  outputDir: "tests/e2e/.results",
  use: {
    baseURL: "http://localhost:3000",
    channel: "chrome",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chrome", use: { ...devices["Desktop Chrome"], channel: "chrome" } }],
  webServer: {
    command: process.env.CI ? "npm start" : "npm run dev",
    // A production build has no email sender in tests; print magic links instead (src/lib/email.ts).
    env: { EMAIL_LOG_ONLY: "true" },
    url: "http://localhost:3000/sign-in",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
