import { z } from "zod";

import { utcToIstParts, istToUtc } from "@/lib/time";

// Explore's state lives in the URL (BRD FR-4.6). Everything here is pure → unit-tested.

export const CITIES = {
  pune: { name: "Pune", latitude: 18.5204, longitude: 73.8567 },
  mumbai: { name: "Mumbai", latitude: 19.076, longitude: 72.8777 },
  sangli: { name: "Sangli", latitude: 16.8524, longitude: 74.5815 },
} as const;
export type CityKey = keyof typeof CITIES;

export const RADII = [1, 3, 5, 10, 25] as const;
export const WHENS = ["any", "today", "tomorrow", "weekend", "week"] as const;
export const LEVELS = ["BEGINNER", "INTERMEDIATE", "PRO"] as const;
export const PAGE_SIZE = 12;

const DEFAULTS = { r: 5, when: "any", view: "list" } as const;

const one = (v: unknown) => (Array.isArray(v) ? v[0] : v);

/** Lenient parsing: anything invalid silently falls back to its default. */
const filtersSchema = z.object({
  q: z.preprocess(one, z.string().trim().max(80).catch("")).default(""),
  cat: z
    .preprocess(
      (v) => (typeof one(v) === "string" ? (one(v) as string).split(",").filter(Boolean) : []),
      z
        .array(z.string().regex(/^[a-z-]{2,40}$/))
        .max(18)
        .catch([]),
    )
    .default([]),
  r: z
    .preprocess((v) => Number(one(v)), z.union(RADII.map((r) => z.literal(r))).catch(DEFAULTS.r))
    .default(DEFAULTS.r),
  when: z.preprocess(one, z.enum(WHENS).catch(DEFAULTS.when)).default(DEFAULTS.when),
  level: z.preprocess(one, z.enum(LEVELS).optional().catch(undefined)),
  open: z.preprocess((v) => one(v) === "1", z.boolean()).default(false),
  city: z.preprocess(
    one,
    z
      .enum(Object.keys(CITIES) as [CityKey, ...CityKey[]])
      .optional()
      .catch(undefined),
  ),
  lat: z.preprocess(
    (v) => (one(v) === undefined ? undefined : Number(one(v))),
    z.number().min(-90).max(90).optional().catch(undefined),
  ),
  lng: z.preprocess(
    (v) => (one(v) === undefined ? undefined : Number(one(v))),
    z.number().min(-180).max(180).optional().catch(undefined),
  ),
  view: z.preprocess(one, z.enum(["list", "map"]).catch(DEFAULTS.view)).default(DEFAULTS.view),
});

export type Filters = z.infer<typeof filtersSchema>;
export type RawSearchParams = Record<string, string | string[] | undefined>;

export function parseFilters(raw: RawSearchParams): Filters {
  return filtersSchema.parse(raw);
}

/** Filters → query string, leaving out defaults so URLs stay short and shareable. */
export function filtersToQuery(f: Partial<Filters>): string {
  const p = new URLSearchParams();
  if (f.q) p.set("q", f.q);
  if (f.cat?.length) p.set("cat", f.cat.join(","));
  if (f.r && f.r !== DEFAULTS.r) p.set("r", String(f.r));
  if (f.when && f.when !== DEFAULTS.when) p.set("when", f.when);
  if (f.level) p.set("level", f.level);
  if (f.open) p.set("open", "1");
  if (f.lat !== undefined && f.lng !== undefined) {
    // Only ever put rounded coordinates in a URL (they get shared).
    p.set("lat", f.lat.toFixed(2));
    p.set("lng", f.lng.toFixed(2));
  } else if (f.city) p.set("city", f.city);
  if (f.view && f.view !== DEFAULTS.view) p.set("view", f.view);
  const s = p.toString();
  return s ? `?${s}` : "";
}

/** [from, to) in UTC for a "when" choice, using IST calendar days. `to` null = no limit. */
export function timeWindow(
  when: Filters["when"],
  now: Date = new Date(),
): { from: Date; to: Date | null } {
  const today = utcToIstParts(now).date;
  const dayStart = (offset: number) => {
    const [y, m, d] = today.split("-").map(Number);
    const date = new Date(Date.UTC(y!, m! - 1, d! + offset)).toISOString().slice(0, 10);
    return istToUtc(date, "00:00");
  };
  switch (when) {
    case "today":
      return { from: now, to: dayStart(1) };
    case "tomorrow":
      return { from: dayStart(1), to: dayStart(2) };
    case "weekend": {
      // IST weekday: 0 = Sunday … 6 = Saturday.
      const weekday = new Date(`${today}T00:00:00Z`).getUTCDay();
      if (weekday === 0) return { from: now, to: dayStart(1) }; // it's Sunday: rest of today
      const toSaturday = 6 - weekday;
      const from = toSaturday === 0 ? now : dayStart(toSaturday);
      return { from, to: dayStart(toSaturday + 2) };
    }
    case "week":
      return { from: now, to: dayStart(8) };
    default:
      return { from: now, to: null };
  }
}

// ─── Cursor pagination ────────────────────────────────────────────────────
// Results are ordered by (distance, startsAt, id). The cursor is the last row's sort
// key, so "load more" continues exactly after it — no page numbers, no duplicates.

export type Cursor = { d: number; s: string; id: string };

export function encodeCursor(c: Cursor): string {
  return Buffer.from(JSON.stringify(c)).toString("base64url");
}

const cursorSchema = z.object({
  d: z.number().min(0),
  s: z.iso.datetime(),
  id: z.string().min(1).max(40),
});

export function decodeCursor(value: string | null | undefined): Cursor | null {
  if (!value) return null;
  try {
    const parsed = cursorSchema.safeParse(
      JSON.parse(Buffer.from(value, "base64url").toString("utf8")),
    );
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
