import { describe, expect, it } from "vitest";

import { containsProfanity } from "./profanity";

describe("containsProfanity (FR-8.4)", () => {
  it.each([
    "what the fuck",
    "SHIT happens",
    "sh1t",
    "fuuuuck this",
    "b!tch",
    "you chutiya",
    "Bhenchod",
  ])("flags %j", (text) => expect(containsProfanity(text)).toBe(true));

  it.each([
    "Doubles badminton — need 1 more",
    "Scunthorpe United fan meetup", // contains "cunt" inside a word
    "Class assessment study group", // contains "ass"
    "Shitake mushroom cooking class",
    "Dickens book club",
    "Sunrise trek to Sinhagad",
  ])("allows %j", (text) => expect(containsProfanity(text)).toBe(false));
});
