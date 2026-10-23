import { expect, test } from "./support/fixtures";

test("rude titles are rejected (FR-8.4)", async ({ as }) => {
  const page = await as("host");
  await page.goto("/activities/new");
  await page.locator(".leaflet-container").waitFor(); // hydrated
  await page.getByLabel("Title").fill("This fuuuck1ng game");
  await page.getByRole("button", { name: "Publish plan" }).click();
  await expect(page.getByText("Please keep it friendly").first()).toBeVisible();
});

test("host creates, edits and cancels a plan", async ({ as }) => {
  test.slow(); // venue naming calls OpenStreetMap
  const page = await as("host");
  await page.goto("/activities/new");
  await page.locator(".leaflet-container").waitFor();
  await page.getByRole("radio", { name: "Sports & Fitness" }).click();
  const title = `E2E hosted plan ${Date.now().toString(36)}`;
  await page.getByLabel("Title").fill(title);
  await page.getByLabel("Description").fill("Created by the end-to-end suite.");
  await page.locator(".leaflet-container").click({ position: { x: 220, y: 120 } });
  await expect(page.getByText("Finding area…")).toBeHidden({ timeout: 20_000 });
  await page.getByLabel("Venue name").fill("E2E Court");
  await page.getByRole("button", { name: "₹100" }).click();
  await page.getByRole("button", { name: "Publish plan" }).click();
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  const url = page.url();

  await page.goto(`${url}/edit`);
  await page.locator(".leaflet-container").waitFor();
  await page.getByLabel("Start time (IST)").fill("20:15");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText(/8:15 pm/i).first()).toBeVisible();

  await page.goto(`${url}/edit`);
  await page.getByRole("button", { name: "Cancel this plan" }).click();
  await page.getByRole("button", { name: "Yes, cancel plan" }).click();
  await expect(page.getByText("Cancelled by the host").first()).toBeVisible();
});
