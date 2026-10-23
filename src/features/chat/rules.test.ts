import { describe, expect, it } from "vitest";

import { chatState, messageSchema } from "./rules";

const plan = { status: "OPEN", startsAt: new Date("2026-10-24T13:30:00Z"), durationMinutes: 90 };

describe("chatState (FR-6.4)", () => {
  it("is open before, during and up to 7 days after the plan", () => {
    expect(chatState(plan, new Date("2026-10-20T00:00:00Z"))).toBe("open");
    expect(chatState(plan, new Date("2026-10-31T14:59:00Z"))).toBe("open"); // ends 15:00 + 7 days
  });

  it("is archived (read-only) after the 7-day grace period", () => {
    expect(chatState(plan, new Date("2026-10-31T15:01:00Z"))).toBe("archived");
  });

  it("is read-only as soon as the plan is cancelled", () => {
    expect(chatState({ ...plan, status: "CANCELLED" }, new Date("2026-10-20T00:00:00Z"))).toBe(
      "cancelled",
    );
  });
});

describe("messageSchema", () => {
  it("trims and rejects empty messages", () => {
    expect(messageSchema.safeParse("   ").success).toBe(false);
    expect(messageSchema.parse("  On my way  ")).toBe("On my way");
  });

  it("rejects very long messages", () => {
    expect(messageSchema.safeParse("x".repeat(1001)).success).toBe(false);
  });
});
