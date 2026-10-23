import { describe, expect, it } from "vitest";

import { decodeCursor, encodeCursor, filtersToQuery, parseFilters, timeWindow } from "./filters";

describe("parseFilters", () => {
  it("uses defaults for an empty URL", () => {
    expect(parseFilters({})).toMatchObject({
      q: "",
      cat: [],
      r: 5,
      when: "any",
      open: false,
      view: "list",
    });
  });

  it("reads valid values", () => {
    const f = parseFilters({
      q: " badminton ",
      cat: "sports-fitness,music",
      r: "10",
      when: "weekend",
      level: "BEGINNER",
      open: "1",
      city: "mumbai",
      view: "map",
    });
    expect(f).toMatchObject({
      q: "badminton",
      cat: ["sports-fitness", "music"],
      r: 10,
      when: "weekend",
      level: "BEGINNER",
      open: true,
      city: "mumbai",
      view: "map",
    });
  });

  it("falls back to defaults on junk instead of throwing", () => {
    const f = parseFilters({
      r: "7",
      when: "yesterday",
      level: "god",
      city: "atlantis",
      lat: "999",
      cat: "DROP TABLE",
    });
    expect(f).toMatchObject({
      r: 5,
      when: "any",
      level: undefined,
      city: undefined,
      lat: undefined,
      cat: [],
    });
  });
});

describe("filtersToQuery", () => {
  it("omits defaults and rounds coordinates", () => {
    expect(
      filtersToQuery({ r: 5, when: "any", view: "list", lat: 18.507412, lng: 73.807744 }),
    ).toBe("?lat=18.51&lng=73.81");
  });

  it("round-trips through parseFilters", () => {
    const query = filtersToQuery({
      q: "jam",
      cat: ["music"],
      r: 3,
      when: "today",
      open: true,
      city: "sangli",
    });
    const back = parseFilters(Object.fromEntries(new URLSearchParams(query)));
    expect(back).toMatchObject({
      q: "jam",
      cat: ["music"],
      r: 3,
      when: "today",
      open: true,
      city: "sangli",
    });
  });
});

describe("timeWindow (IST days)", () => {
  // Friday 23 Oct 2026, 10:00 IST = 04:30 UTC
  const fri = new Date("2026-10-23T04:30:00Z");

  it("today = now until IST midnight", () => {
    const w = timeWindow("today", fri);
    expect(w.from).toBe(fri);
    expect(w.to?.toISOString()).toBe("2026-10-23T18:30:00.000Z"); // 24 Oct 00:00 IST
  });

  it("weekend = Saturday 00:00 to Monday 00:00 IST", () => {
    const w = timeWindow("weekend", fri);
    expect(w.from.toISOString()).toBe("2026-10-23T18:30:00.000Z"); // Sat 24 Oct 00:00 IST
    expect(w.to?.toISOString()).toBe("2026-10-25T18:30:00.000Z"); // Mon 26 Oct 00:00 IST
  });

  it("weekend on a Sunday = rest of today", () => {
    const sunday = new Date("2026-10-25T06:00:00Z"); // Sun 11:30 IST
    expect(timeWindow("weekend", sunday).to?.toISOString()).toBe("2026-10-25T18:30:00.000Z");
  });

  it("any has no upper limit", () => {
    expect(timeWindow("any", fri).to).toBeNull();
  });
});

describe("cursor", () => {
  it("round-trips", () => {
    const c = { d: 1234.5, s: "2026-10-24T13:30:00.000Z", id: "cmabc123" };
    expect(decodeCursor(encodeCursor(c))).toEqual(c);
  });

  it("rejects tampered or garbage cursors", () => {
    expect(decodeCursor("not-base64-json")).toBeNull();
    expect(decodeCursor(Buffer.from('{"d":-1,"s":"x","id":""}').toString("base64url"))).toBeNull();
  });
});
