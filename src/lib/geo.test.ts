import { describe, expect, it } from "vitest";

import { approximate, canSeeExactVenue } from "./geo";

describe("approximate", () => {
  it("rounds coordinates to ~1 km cells", () => {
    expect(approximate({ latitude: 18.507412, longitude: 73.807744 })).toEqual({
      latitude: 18.51,
      longitude: 73.81,
    });
  });

  it("gives nearby venues the same public point", () => {
    const a = approximate({ latitude: 18.5071, longitude: 73.8081 });
    const b = approximate({ latitude: 18.5078, longitude: 73.8099 });
    expect(a).toEqual(b);
  });
});

describe("canSeeExactVenue", () => {
  const base = { hostId: "host", viewerIsApprovedMember: false, showExactVenue: false };

  it("always shows the host their own venue", () => {
    expect(canSeeExactVenue({ ...base, viewerId: "host" })).toBe(true);
  });

  it("shows approved members the venue", () => {
    expect(canSeeExactVenue({ ...base, viewerId: "member", viewerIsApprovedMember: true })).toBe(
      true,
    );
  });

  it("hides a private venue from signed-out visitors and strangers", () => {
    expect(canSeeExactVenue({ ...base, viewerId: null })).toBe(false);
    expect(canSeeExactVenue({ ...base, viewerId: "stranger" })).toBe(false);
  });

  it("shows a public venue to everyone", () => {
    expect(canSeeExactVenue({ ...base, viewerId: null, showExactVenue: true })).toBe(true);
  });
});
