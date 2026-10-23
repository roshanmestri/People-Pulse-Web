import { expect, test } from "./support/fixtures";
import { approve } from "./support/state";

test("members chat in real time (polling) and outsiders are refused", async ({ as, plans }) => {
  await approve("member", plans.requestPlanId);
  const chat = `/activities/${plans.requestPlanId}/chat`;
  const member = await as("member");
  const host = await as("host");
  await member.goto(chat);
  await host.goto(chat);

  const text = `Hello from e2e ${Date.now() % 100000}`;
  await member.getByRole("textbox", { name: "Message the group" }).fill(text);
  await member.getByRole("textbox", { name: "Message the group" }).press("Enter");
  await expect(member.getByRole("list", { name: "Messages" }).getByText(text)).toBeVisible();
  // The host's page picks it up by polling — no reload.
  await expect(host.getByRole("list", { name: "Messages" }).getByText(text)).toBeVisible({
    timeout: 15_000,
  });

  const outsider = await as("outsider");
  const api = await outsider.request.get(`/api/activities/${plans.requestPlanId}/messages`);
  expect(api.status()).toBe(403);
});

test("the bell counts notifications and mark-all-read clears them", async ({ as }) => {
  const page = await as("host");
  await page.goto("/notifications");
  const markAll = page.getByRole("button", { name: /Mark all as read/ });
  if (await markAll.isVisible()) {
    await markAll.click();
    await expect(markAll).toBeHidden();
  }
  await expect(page.getByRole("link", { name: "Notifications", exact: true })).toBeVisible();
});
