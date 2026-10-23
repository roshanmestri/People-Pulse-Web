import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";

import { expect, test } from "./support/fixtures";
import { approve } from "./support/state";

// WCAG 2.1 AA (BRD §6). Fails on serious/critical issues; minor ones are printed.
async function scan(page: Page, url: string) {
  await page.goto(url);
  await page.waitForLoadState("networkidle");
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .exclude(".leaflet-container") // third-party map tiles; the map has a text alternative nearby
    .analyze();
  const blocking = results.violations.filter(
    (v) => v.impact === "serious" || v.impact === "critical",
  );
  for (const v of results.violations) {
    console.log(
      `[${v.impact}] ${url} — ${v.id}: ${v.help} (${v.nodes.length}) e.g. ${v.nodes[0]?.target.join(" ")}`,
    );
  }
  expect(
    blocking.map((v) => `${v.id}: ${v.help}`),
    url,
  ).toEqual([]);
}

test.describe("accessibility", () => {
  test("public pages", async ({ page, plans }) => {
    for (const url of ["/", "/explore", "/sign-in", `/activities/${plans.requestPlanId}`])
      await scan(page, url);
  });

  test("member pages", async ({ as, plans }) => {
    await approve("member", plans.requestPlanId);
    const page = await as("member");
    for (const url of [
      "/me",
      "/plans",
      "/notifications",
      "/chats",
      `/activities/${plans.requestPlanId}/chat`,
    ]) {
      await scan(page, url);
    }
  });

  test("host and admin pages", async ({ as, plans }) => {
    const host = await as("host");
    for (const url of [`/activities/${plans.requestPlanId}/manage`, "/activities/new"])
      await scan(host, url);
    await scan(await as("admin"), "/admin");
  });
});
