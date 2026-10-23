import { expect, test } from "./support/fixtures";
import { VENUE } from "./support/db";

test("filters live in the URL and Back works", async ({ page }) => {
  await page.goto("/explore");
  await page.getByRole("radio", { name: "25 km" }).click();
  await expect(page).toHaveURL(/r=25/);
  await page.getByRole("button", { name: "Sports & Fitness" }).click();
  await expect(page).toHaveURL(/cat=sports-fitness/);
  await page.goBack();
  await expect(page).not.toHaveURL(/cat=/);
});

test("search finds a plan by its title", async ({ page, plans }) => {
  const word = plans.requestPlanTitle.split(" ").pop()!;
  await page.goto(`/explore?r=25&q=${word}`);
  await expect(page.getByRole("link", { name: new RegExp(plans.requestPlanTitle) })).toBeVisible();
});

test("map view shows pins but never exact coordinates", async ({ page }) => {
  await page.goto("/explore?r=25&view=map");
  await expect(page.locator(".gathr-pin, .gathr-cluster").first()).toBeVisible();
  const html = await page.content();
  expect(html).not.toContain(String(VENUE.latitude));
  expect(html).not.toContain(String(VENUE.longitude));
});
