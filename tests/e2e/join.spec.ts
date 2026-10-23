import { VENUE } from "./support/db";
import { expect, test } from "./support/fixtures";
import { requestStatus, userId } from "./support/state";
import { sql } from "./support/db";

test("request → host approves → member is in and sees the venue → leaves", async ({
  as,
  plans,
}) => {
  // Start clean: other specs may have put the member into this plan.
  await sql(`DELETE FROM "JoinRequest" WHERE "activityId" = $1 AND "userId" = $2`, [
    plans.requestPlanId,
    await userId("member"),
  ]);
  const member = await as("member");
  await member.goto(`/activities/${plans.requestPlanId}`);
  await expect(member.getByText(VENUE.venueName)).toHaveCount(0); // hidden until approved
  await member.getByRole("button", { name: "I'm in — request spot" }).click();
  await expect(member.getByText("Meeting new people?")).toBeVisible(); // safety tips (FR-8.5)
  await member.getByRole("textbox", { name: /Message to/ }).fill("Count me in!");
  await member.getByRole("button", { name: "Send request" }).click();
  await expect(member.getByRole("status").getByText("Request sent")).toBeVisible();
  expect(await requestStatus("member", plans.requestPlanId)).toBe("PENDING");

  const host = await as("host");
  await host.goto(`/activities/${plans.requestPlanId}/manage`);
  const card = host.locator("li", { hasText: "Manu Member" });
  await expect(card.getByText("Count me in!")).toBeVisible();
  await card.getByRole("button", { name: "Approve" }).click();
  await expect(host.getByText("Manu is in!")).toBeVisible();

  await member.reload();
  await expect(member.getByRole("status").getByText("You're in!")).toBeVisible();
  await expect(member.getByText(VENUE.venueName).first()).toBeVisible();

  await member.getByRole("button", { name: /Leave plan/ }).click();
  await expect(member.getByText("You left the plan")).toBeVisible();
  expect(await requestStatus("member", plans.requestPlanId)).toBe("LEFT");
});

test("open plans join instantly", async ({ as, plans }) => {
  const page = await as("member");
  await page.goto(`/activities/${plans.openPlanId}`);
  await page.getByRole("button", { name: "I'm in — join now" }).click();
  await page.getByRole("button", { name: "Confirm & join" }).click();
  await expect(page.getByRole("status").getByText("You're in!")).toBeVisible();
  expect(await requestStatus("member", plans.openPlanId)).toBe("APPROVED");
});
