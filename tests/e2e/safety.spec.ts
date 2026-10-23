import { sql } from "./support/db";
import { expect, test } from "./support/fixtures";

test("report → admin hides the plan → it's gone for everyone else", async ({ as, page, plans }) => {
  const outsider = await as("outsider");
  await outsider.goto(`/activities/${plans.openPlanId}`);
  await outsider.getByRole("button", { name: "Report", exact: true }).click();
  await outsider.getByLabel("Spam or advertising").click();
  await outsider.getByRole("button", { name: "Send report" }).click();
  await expect(outsider.getByText("our team will review it")).toBeVisible();

  const admin = await as("admin");
  await admin.goto("/admin");
  const card = admin.locator("li", { hasText: plans.openPlanTitle }).first();
  admin.once("dialog", (d) => d.accept());
  await card.getByRole("button", { name: "Hide plan" }).click();
  await expect(admin.getByText("Plan hidden")).toBeVisible();

  await page.goto(`/activities/${plans.openPlanId}`);
  await expect(page.getByText(/could not be found/i)).toBeVisible();
  await admin.goto(`/activities/${plans.openPlanId}`);
  await expect(admin.getByRole("heading", { name: plans.openPlanTitle })).toBeVisible();

  await sql(`UPDATE "Activity" SET "hiddenAt" = NULL WHERE id = $1`, [plans.openPlanId]);
});

test("blocking hides the host's plans; unblock from /me", async ({ as, plans }) => {
  const outsider = await as("outsider");
  await outsider.goto("/u/e2e.host");
  await outsider.getByRole("button", { name: "Block" }).click();
  await outsider.getByRole("button", { name: /Block Hema/ }).click();
  await expect(outsider).toHaveURL(/\/explore/);

  await outsider.goto(`/activities/${plans.requestPlanId}`);
  await expect(outsider.getByText(/could not be found/i)).toBeVisible();

  await outsider.goto("/me");
  await outsider.getByRole("button", { name: "Unblock" }).click();
  await expect(outsider.getByText("Hema is unblocked")).toBeVisible();
});
