import { describe, expect, it } from "vitest";

import { describeNotification } from "./describe";

const base = { activityId: "a1", title: "Doubles badminton", actorName: "Aarav Kulkarni" };

describe("describeNotification", () => {
  it("sends hosts to the manage page for requests", () => {
    expect(describeNotification("JOIN_REQUEST", base)).toEqual({
      text: "Aarav asked to join “Doubles badminton”",
      href: "/activities/a1/manage",
    });
    expect(describeNotification("JOIN_REQUEST", { ...base, joined: true }).text).toBe(
      "Aarav joined “Doubles badminton”",
    );
  });

  it("sends chat alerts to the chat, with a grouped count", () => {
    expect(
      describeNotification("NEW_MESSAGE", { ...base, preview: "On my way", count: 3 }),
    ).toEqual({
      text: "Aarav in “Doubles badminton”: On my way (+2 more)",
      href: "/activities/a1/chat",
    });
  });

  it("distinguishes declined from removed", () => {
    expect(describeNotification("REQUEST_REJECTED", base).text).toContain("wasn't accepted");
    expect(describeNotification("REQUEST_REJECTED", { ...base, removed: true }).text).toContain(
      "removed",
    );
  });

  it("copes with a missing or odd payload", () => {
    expect(describeNotification("ACTIVITY_CANCELLED", null)).toEqual({
      text: "a plan was cancelled by the host",
      href: null,
    });
  });
});
