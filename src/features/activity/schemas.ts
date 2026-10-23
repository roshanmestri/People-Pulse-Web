import { z } from "zod";

import { istToUtc } from "@/lib/time";
import { containsProfanity, PROFANITY_MESSAGE } from "@/lib/profanity";

export const DURATIONS = [30, 60, 90, 120, 180, 240, 360, 480] as const;
export const SKILL_LEVELS = ["ANY", "BEGINNER", "INTERMEDIATE", "PRO"] as const;
export const JOIN_MODES = ["REQUEST", "OPEN"] as const;
export const MAX_PRICE = 10_000;
/** Plans must start at least this far in the future (FR-3.1). */
export const MIN_LEAD_MINUTES = 15;

export const venueSchema = z.object({
  venueName: z.string().trim().min(2, "Name the venue").max(100),
  areaName: z.string().trim().min(2).max(80),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

/** One schema for the host form (browser) and the Server Actions (server). */
export const activitySchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(4, "Give it a short title")
      .max(80, "Keep it under 80 characters")
      .refine((v) => !containsProfanity(v), PROFANITY_MESSAGE),
    categoryId: z.string().min(1, "Pick a category"),
    description: z
      .string()
      .trim()
      .min(10, "Add a sentence or two")
      .max(2000, "Keep it under 2000 characters")
      .refine((v) => !containsProfanity(v), PROFANITY_MESSAGE),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date"),
    time: z.string().regex(/^\d{2}:\d{2}$/, "Pick a start time"),
    durationMinutes: z.number().int().min(15).max(720),
    minPeople: z.number().int().min(1).max(50),
    maxPeople: z.number().int().min(1, "At least 1 spot").max(50, "At most 50 spots"),
    joinMode: z.enum(JOIN_MODES),
    skillLevel: z.enum(SKILL_LEVELS),
    pricePerPerson: z
      .number({ error: "Enter a price" })
      .int("Whole rupees only")
      .min(0)
      .max(MAX_PRICE, `At most ₹${MAX_PRICE}`),
    priceNote: z.string().trim().max(80),
    whatToBring: z.string().trim().max(200),
    preferenceNote: z.string().trim().max(120),
    tags: z
      .array(
        z
          .string()
          .trim()
          .toLowerCase()
          .regex(/^[a-z0-9-]{2,24}$/, "Tags: 2–24 letters, numbers or dashes"),
      )
      .max(5, "Up to 5 tags"),
    // Boolean(), not a `v !== null` type guard: a guard would narrow the output type and
    // make the form's input and output types differ.
    venue: venueSchema.nullable().refine((v) => Boolean(v), "Pick the venue on the map"),
    hideExactVenue: z.boolean(),
  })
  .superRefine((data, ctx) => {
    if (data.minPeople > data.maxPeople) {
      ctx.addIssue({
        code: "custom",
        path: ["minPeople"],
        message: "Can't be more than the spots",
      });
    }
    const startsAt = istToUtc(data.date, data.time);
    if (startsAt.getTime() < Date.now() + MIN_LEAD_MINUTES * 60_000) {
      ctx.addIssue({
        code: "custom",
        path: ["time"],
        message: "Pick a time at least 15 minutes from now",
      });
    }
  });

export type ActivityInput = z.infer<typeof activitySchema>;

export type ActivityActionResult =
  | { ok: true; id: string }
  | { ok: false; error: string; fieldErrors?: Partial<Record<string, string>> };
