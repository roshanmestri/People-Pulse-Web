import { expect, test } from "./support/fixtures";
import { E2E_DOMAIN, latestMagicToken } from "./support/db";

test("landing page", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Find your people.");
});

test("private pages send signed-out visitors to sign in", async ({ page }) => {
  await page.goto("/me");
  await expect(page).toHaveURL(/\/sign-in\?next=%2Fme/);
});

test("a new person signs in with a magic link and lands on onboarding", async ({ page }) => {
  const email = `new${Date.now()}@new.${E2E_DOMAIN}`;
  await page.goto("/sign-in");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByRole("button", { name: "Email me a sign-in link" }).click();
  await expect(page.getByText("Check your inbox")).toBeVisible();
  const token = await latestMagicToken(email);
  await page.goto(
    `/api/auth/magic-link/verify?token=${token}&callbackURL=%2Fexplore&newUserCallbackURL=%2Fonboarding`,
  );
  await expect(page).toHaveURL(/\/onboarding/);
  await expect(page.getByRole("heading", { name: "Let's set you up" })).toBeVisible();
});
