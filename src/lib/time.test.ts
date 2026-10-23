import { describe, expect, it } from "vitest";

import { formatDuration, istToUtc, tomorrowInIst, utcToIstParts } from "./time";

describe("IST ↔ UTC", () => {
  it("converts an IST wall-clock time to UTC (IST = UTC+5:30)", () => {
    expect(istToUtc("2026-10-26", "19:00").toISOString()).toBe("2026-10-26T13:30:00.000Z");
  });

  it("handles times that fall on the previous UTC day", () => {
    expect(istToUtc("2026-10-26", "02:00").toISOString()).toBe("2026-10-25T20:30:00.000Z");
  });

  it("round-trips back to the same IST date and time", () => {
    expect(utcToIstParts(istToUtc("2026-12-31", "23:45"))).toEqual({
      date: "2026-12-31",
      time: "23:45",
    });
  });

  it("knows tomorrow in IST even late at night UTC", () => {
    // 20:00 UTC on the 23rd is already 01:30 on the 24th in India → tomorrow is the 25th.
    expect(tomorrowInIst(new Date("2026-10-23T20:00:00Z"))).toBe("2026-10-25");
  });
});

describe("formatDuration", () => {
  it.each([
    [30, "30 min"],
    [60, "1 h"],
    [90, "1h 30m"],
    [240, "4 h"],
  ])("%i minutes → %s", (minutes, label) => {
    expect(formatDuration(minutes)).toBe(label);
  });
});
