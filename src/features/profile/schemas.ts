import { z } from "zod";

export const AGE_RANGES = ["18-24", "25-34", "35-44", "45-54", "55+"] as const;
export const LANGUAGES = [
  "Marathi",
  "Hindi",
  "English",
  "Gujarati",
  "Kannada",
  "Tamil",
  "Telugu",
  "Bengali",
  "Urdu",
  "Malayalam",
] as const;

export const homeAreaSchema = z.object({
  areaName: z.string().trim().min(2).max(80),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

/** One schema for the form (client) and the Server Action (server). */
export const profileSchema = z.object({
  name: z.string().trim().min(2, "Add your name").max(60),
  username: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, "At least 3 characters")
    .max(24, "At most 24 characters")
    .regex(/^[a-z0-9._]+$/, "Letters, numbers, dots and underscores only"),
  bio: z.string().trim().max(280, "Keep it under 280 characters"),
  ageRange: z.enum(AGE_RANGES).nullable(),
  languages: z.array(z.enum(LANGUAGES)).max(8),
  interestIds: z.array(z.string().min(1)).min(1, "Pick at least one interest").max(10),
  home: homeAreaSchema.nullable(),
});

export type ProfileInput = z.infer<typeof profileSchema>;
export type HomeArea = z.infer<typeof homeAreaSchema>;

export type ActionResult =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Partial<Record<keyof ProfileInput, string>> };
