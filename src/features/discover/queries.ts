import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { approximate, type LatLng } from "@/lib/geo";

import { CITIES, PAGE_SIZE, timeWindow, type Cursor, type Filters } from "./filters";

export type Center = LatLng & { label: string; source: "coords" | "city" | "home" | "default" };

/** Where "near" is: explicit coords → chosen city → your home area → Pune. */
export function resolveCenter(
  f: Filters,
  home: { latitude: number | null; longitude: number | null; areaName: string | null } | null,
): Center {
  if (f.lat !== undefined && f.lng !== undefined) {
    return {
      ...approximate({ latitude: f.lat, longitude: f.lng }),
      label: "your location",
      source: "coords",
    };
  }
  if (f.city) return { ...CITIES[f.city], label: CITIES[f.city].name, source: "city" };
  if (home?.latitude != null && home.longitude != null) {
    // Rounded: also keeps the cache key free of anyone's exact home.
    return {
      ...approximate({ latitude: home.latitude, longitude: home.longitude }),
      label: home.areaName ?? "home",
      source: "home",
    };
  }
  return { ...CITIES.pune, label: "Pune", source: "default" };
}

/** Only what the filters need — the cache key is built from these arguments. */
export type SearchArgs = Pick<Filters, "q" | "cat" | "r" | "when" | "level" | "open"> & {
  latitude: number;
  longitude: number;
  /** Hosts this viewer shouldn't see (blocks, either direction). Usually empty. */
  hideHostIds: string[];
};

export type DiscoverItem = {
  id: string;
  title: string;
  startsAt: Date;
  durationMinutes: number;
  maxPeople: number;
  going: number;
  pricePerPerson: number;
  coverImage: string | null;
  areaName: string;
  joinMode: "REQUEST" | "OPEN";
  skillLevel: string;
  status: "OPEN" | "FULL";
  categorySlug: string;
  categoryName: string;
  hostName: string;
  hostVerified: boolean;
  distanceM: number;
  /** Rounded (~1 km) — never the exact venue. */
  latitude: number;
  longitude: number;
};

function whereClause(a: SearchArgs) {
  const point = Prisma.sql`ST_SetSRID(ST_MakePoint(${a.longitude}, ${a.latitude}), 4326)::geography`;
  const { from, to } = timeWindow(a.when);
  const tokens = a.q
    .toLowerCase()
    .split(/[^a-z0-9-]+/)
    .filter((t) => t.length >= 2)
    .slice(0, 8);
  const conditions: Prisma.Sql[] = [
    Prisma.sql`a.status IN ('OPEN', 'FULL')`,
    Prisma.sql`h."suspendedAt" IS NULL`,
    Prisma.sql`a."hiddenAt" IS NULL`, // hidden by an admin (FR-8.3)
    Prisma.sql`a."startsAt" >= ${from}`,
    // ST_DWithin on a geography uses the GiST index and measures in metres.
    Prisma.sql`ST_DWithin(a.location, ${point}, ${a.r * 1000})`,
  ];
  if (to) conditions.push(Prisma.sql`a."startsAt" < ${to}`);
  if (a.hideHostIds.length)
    conditions.push(Prisma.sql`a."hostId" NOT IN (${Prisma.join(a.hideHostIds)})`);
  if (a.cat.length) conditions.push(Prisma.sql`c.slug IN (${Prisma.join(a.cat)})`);
  // "Beginner" also shows plans open to any level.
  if (a.level) conditions.push(Prisma.sql`a."skillLevel"::text IN (${a.level}, 'ANY')`);
  if (a.open) conditions.push(Prisma.sql`a.status = 'OPEN'`);
  if (a.q) {
    // FR-4.3: full-text over title + description (GIN index), or an exact tag match.
    conditions.push(Prisma.sql`(
      a."searchVector" @@ websearch_to_tsquery('english', ${a.q})
      OR EXISTS (SELECT 1 FROM "ActivityTag" t WHERE t."activityId" = a.id AND t.tag = ANY(${tokens}::text[]))
    )`);
  }
  return { point, where: Prisma.join(conditions, " AND ") };
}

const FROM = Prisma.sql`
  FROM "Activity" a
  JOIN "Category" c ON c.id = a."categoryId"
  JOIN "User" h ON h.id = a."hostId"`;

/** One page of results, nearest first. Cached per filter set; refreshed via updateTag("activities"). */
export async function searchActivities(args: SearchArgs, cursor: Cursor | null) {
  "use cache";
  cacheLife("minutes");
  cacheTag("activities");

  const { point, where } = whereClause(args);
  const distance = Prisma.sql`ST_Distance(a.location, ${point})`;
  const after = cursor
    ? Prisma.sql`AND (${distance}, a."startsAt", a.id) > (${cursor.d}, ${new Date(cursor.s)}, ${cursor.id})`
    : Prisma.empty;

  const rows = await db.$queryRaw<DiscoverItem[]>`
    SELECT a.id, a.title, a."startsAt", a."durationMinutes", a."maxPeople", a."pricePerPerson",
           a."coverImage", a."areaName", a."joinMode"::text AS "joinMode", a."skillLevel"::text AS "skillLevel",
           a.status::text AS status, c.slug AS "categorySlug", c.name AS "categoryName",
           h.name AS "hostName", (h."verifiedAt" IS NOT NULL) AS "hostVerified",
           (SELECT count(*)::int FROM "JoinRequest" j WHERE j."activityId" = a.id AND j.status = 'APPROVED') AS going,
           ${distance} AS "distanceM",
           round(a.latitude::numeric, 2)::float8 AS latitude,
           round(a.longitude::numeric, 2)::float8 AS longitude
    ${FROM}
    WHERE ${where} ${after}
    ORDER BY "distanceM", a."startsAt", a.id
    LIMIT ${PAGE_SIZE + 1}`;

  const hasMore = rows.length > PAGE_SIZE;
  const items = rows.slice(0, PAGE_SIZE);
  const last = items.at(-1);
  const nextCursor: Cursor | null =
    hasMore && last ? { d: last.distanceM, s: last.startsAt.toISOString(), id: last.id } : null;
  return { items, nextCursor };
}

export async function countActivities(args: SearchArgs) {
  "use cache";
  cacheLife("minutes");
  cacheTag("activities");
  const { where } = whereClause(args);
  const [row] = await db.$queryRaw<
    { n: number }[]
  >`SELECT count(*)::int AS n ${FROM} WHERE ${where}`;
  return row?.n ?? 0;
}

export type MapPin = Pick<
  DiscoverItem,
  | "id"
  | "title"
  | "startsAt"
  | "coverImage"
  | "categorySlug"
  | "areaName"
  | "latitude"
  | "longitude"
  | "distanceM"
  | "pricePerPerson"
>;

/** All matching plans for the map (capped), approximate positions only. */
export async function mapPins(args: SearchArgs) {
  "use cache";
  cacheLife("minutes");
  cacheTag("activities");
  const { point, where } = whereClause(args);
  return db.$queryRaw<MapPin[]>`
    SELECT a.id, a.title, a."startsAt", a."coverImage", c.slug AS "categorySlug", a."areaName", a."pricePerPerson",
           ST_Distance(a.location, ${point}) AS "distanceM",
           round(a.latitude::numeric, 2)::float8 AS latitude,
           round(a.longitude::numeric, 2)::float8 AS longitude
    ${FROM}
    WHERE ${where}
    ORDER BY "distanceM"
    LIMIT 300`;
}

export function toSearchArgs(f: Filters, center: Center, hideHostIds: string[] = []): SearchArgs {
  return {
    q: f.q,
    cat: f.cat,
    r: f.r,
    when: f.when,
    level: f.level,
    open: f.open,
    latitude: center.latitude,
    longitude: center.longitude,
    hideHostIds,
  };
}

/** The signed-in user's home area (private coordinates; only used to centre the search). */
export async function getHome(userId: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { homeLatitude: true, homeLongitude: true, homeAreaName: true },
  });
  return user
    ? { latitude: user.homeLatitude, longitude: user.homeLongitude, areaName: user.homeAreaName }
    : null;
}
