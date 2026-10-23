import { describe, expect, it } from "vitest";

import { acceptsChanges, effectiveStatus } from "./status";

const startsAt = new Date("2026-10-24T13:30:00Z"); // 7 PM IST
const plan = { status: "OPEN" as const, startsAt, durationMinutes: 90 };
const at = (iso: string) => new Date(iso);

describe("effectiveStatus", () => {
  it("is the stored status before the start", () => {
    expect(effectiveStatus(plan, at("2026-10-24T10:00:00Z"))).toBe("OPEN");
    expect(effectiveStatus({ ...plan, status: "FULL" }, at("2026-10-24T10:00:00Z"))).toBe("FULL");
  });

  it("is ONGOING between start and end", () => {
    expect(effectiveStatus(plan, at("2026-10-24T14:00:00Z"))).toBe("ONGOING");
  });

  it("is COMPLETED once the duration has passed", () => {
    expect(effectiveStatus(plan, at("2026-10-24T15:00:00Z"))).toBe("COMPLETED");
  });

  it("never revives cancelled plans or publishes drafts", () => {
    expect(effectiveStatus({ ...plan, status: "CANCELLED" }, at("2026-10-24T14:00:00Z"))).toBe(
      "CANCELLED",
    );
    expect(effectiveStatus({ ...plan, status: "DRAFT" }, at("2026-10-24T15:00:00Z"))).toBe("DRAFT");
  });
});

describe("acceptsChanges", () => {
  it("only before the plan starts", () => {
    expect(acceptsChanges(plan, at("2026-10-24T13:29:00Z"))).toBe(true);
    expect(acceptsChanges(plan, at("2026-10-24T13:30:00Z"))).toBe(false);
    expect(acceptsChanges({ ...plan, status: "CANCELLED" }, at("2026-10-24T10:00:00Z"))).toBe(
      false,
    );
  });
});
