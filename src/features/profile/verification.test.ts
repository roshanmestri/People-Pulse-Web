import { describe, expect, it } from "vitest";

import { isEligibleForBadge, nextVerifiedAt, type VerificationFacts } from "./verification";

const complete: VerificationFacts = {
  emailVerified: true,
  name: "Riya",
  image: "/uploads/avatars/x.webp",
  bio: "Weekend footballer",
  homeAreaName: "Kothrud, Pune",
  interestCount: 2,
  verificationRevokedAt: null,
};

describe("verified-host badge (FR-2.5)", () => {
  it("is earned with a verified email and a complete profile", () => {
    expect(isEligibleForBadge(complete)).toBe(true);
  });

  it.each([
    ["no photo", { image: null }],
    ["no bio", { bio: "  " }],
    ["no home area", { homeAreaName: null }],
    ["no interests", { interestCount: 0 }],
    ["unverified email", { emailVerified: false }],
  ])("is not earned with %s", (_label, change) => {
    expect(isEligibleForBadge({ ...complete, ...change })).toBe(false);
  });

  it("stays off after an admin revokes it", () => {
    expect(isEligibleForBadge({ ...complete, verificationRevokedAt: new Date() })).toBe(false);
  });

  it("keeps the original verifiedAt date while still eligible", () => {
    const first = new Date("2026-01-01T00:00:00Z");
    expect(nextVerifiedAt(complete, first)).toBe(first);
  });

  it("clears verifiedAt when the profile becomes incomplete", () => {
    expect(nextVerifiedAt({ ...complete, bio: "" }, new Date())).toBeNull();
  });
});
