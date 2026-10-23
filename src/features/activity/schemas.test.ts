import { describe, expect, it } from "vitest";

import { tomorrowInIst } from "@/lib/time";

import { activitySchema, type ActivityInput } from "./schemas";

const valid = (): ActivityInput => ({
  title: "Doubles badminton",
  categoryId: "cat_1",
  description: "Need one more for doubles, friendly game.",
  date: tomorrowInIst(),
  time: "19:00",
  durationMinutes: 90,
  minPeople: 1,
  maxPeople: 3,
  joinMode: "REQUEST",
  skillLevel: "INTERMEDIATE",
  pricePerPerson: 120,
  priceNote: "",
  whatToBring: "",
  preferenceNote: "",
  tags: ["Badminton", "doubles"],
  venue: {
    venueName: "Kothrud Sports Complex",
    areaName: "Kothrud, Pune",
    latitude: 18.5,
    longitude: 73.8,
  },
  hideExactVenue: true,
});

const errorPaths = (input: unknown) => {
  const result = activitySchema.safeParse(input);
  return result.success ? [] : result.error.issues.map((i) => i.path.join("."));
};

describe("activitySchema", () => {
  it("accepts a valid plan and normalises tags to lower case", () => {
    const result = activitySchema.safeParse(valid());
    expect(result.success).toBe(true);
    expect(result.data?.tags).toEqual(["badminton", "doubles"]);
  });

  it("rejects plans in the past (FR-3.1)", () => {
    expect(errorPaths({ ...valid(), date: "2020-01-01" })).toContain("time");
  });

  it("rejects min people above the number of spots", () => {
    expect(errorPaths({ ...valid(), minPeople: 5, maxPeople: 3 })).toContain("minPeople");
  });

  it("requires a venue", () => {
    expect(errorPaths({ ...valid(), venue: null })).toContain("venue");
  });

  it.each([-1, 10_001, 12.5])("rejects price %s", (price) => {
    expect(errorPaths({ ...valid(), pricePerPerson: price })).toContain("pricePerPerson");
  });

  it("allows at most 5 tags", () => {
    expect(errorPaths({ ...valid(), tags: ["a1", "b2", "c3", "d4", "e5", "f6"] })).toContain(
      "tags",
    );
  });
});
