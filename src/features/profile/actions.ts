"use server";

import { updateTag } from "next/cache";

import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/session";

import { profileSchema, type ActionResult, type HomeArea, type ProfileInput } from "./schemas";
import { nextVerifiedAt } from "./verification";

/**
 * Server Action: anyone can call this endpoint, so it re-validates input with the
 * same Zod schema the form uses and only ever updates the signed-in user's row.
 */
export async function saveProfile(input: ProfileInput): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Please sign in again." };

  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] ??= issue.message;
    return { ok: false, error: "Please fix the highlighted fields.", fieldErrors };
  }
  const data = parsed.data;

  const taken = await db.user.findFirst({
    where: { username: data.username, NOT: { id: user.id } },
    select: { id: true },
  });
  if (taken)
    return {
      ok: false,
      error: "That username is taken.",
      fieldErrors: { username: "That username is taken" },
    };

  const validCategories = await db.category.count({
    where: { id: { in: data.interestIds }, isActive: true },
  });
  if (validCategories !== data.interestIds.length)
    return { ok: false, error: "Unknown interest selected." };

  const current = await db.user.findUniqueOrThrow({
    where: { id: user.id },
    select: {
      username: true,
      image: true,
      emailVerified: true,
      verifiedAt: true,
      verificationRevokedAt: true,
    },
  });

  const verifiedAt = nextVerifiedAt(
    {
      emailVerified: current.emailVerified,
      name: data.name,
      image: current.image,
      bio: data.bio,
      homeAreaName: data.home?.areaName ?? null,
      interestCount: data.interestIds.length,
      verificationRevokedAt: current.verificationRevokedAt,
    },
    current.verifiedAt,
  );

  // One transaction: profile fields + the interests list are replaced together.
  await db.$transaction([
    db.interest.deleteMany({ where: { userId: user.id } }),
    db.interest.createMany({
      data: data.interestIds.map((categoryId) => ({ userId: user.id, categoryId })),
    }),
    db.user.update({
      where: { id: user.id },
      data: {
        name: data.name,
        username: data.username,
        bio: data.bio || null,
        ageRange: data.ageRange,
        languages: data.languages,
        homeAreaName: data.home?.areaName ?? null,
        homeLatitude: data.home?.latitude ?? null,
        homeLongitude: data.home?.longitude ?? null,
        verifiedAt,
      },
    }),
  ]);

  updateTag(`user:${data.username}`);
  if (current.username && current.username !== data.username) updateTag(`user:${current.username}`);
  return { ok: true };
}

// ─── Home area lookup (OpenStreetMap Nominatim) ─────────────────────────────
// Proxied through the server so we can send the required identifying User-Agent
// and only signed-in users can use it. Nominatim's policy: max ~1 request/second.

const NOMINATIM = "https://nominatim.openstreetmap.org";
const NOMINATIM_HEADERS = {
  "User-Agent": "Gathr/0.1 (community activities app; development)",
  "Accept-Language": "en",
};

type NominatimPlace = {
  lat: string;
  lon: string;
  address?: Record<string, string | undefined>;
};

function toHomeArea(place: NominatimPlace): HomeArea | null {
  const a = place.address ?? {};
  const local = a.suburb ?? a.neighbourhood ?? a.city_district ?? a.quarter ?? a.village ?? a.town;
  const city = a.city ?? a.town ?? a.state_district ?? a.county;
  const areaName = [local, city]
    .filter((part, i, all) => part && all.indexOf(part) === i)
    .join(", ");
  if (!areaName) return null;
  return { areaName, latitude: Number(place.lat), longitude: Number(place.lon) };
}

export async function searchHomeAreas(query: string): Promise<HomeArea[]> {
  if (!(await getSessionUser())) return [];
  const q = query.trim().slice(0, 100);
  if (q.length < 3) return [];
  const url = `${NOMINATIM}/search?format=jsonv2&addressdetails=1&limit=6&countrycodes=in&q=${encodeURIComponent(q)}`;
  const res = await fetch(url, { headers: NOMINATIM_HEADERS });
  if (!res.ok) return [];
  const places = (await res.json()) as NominatimPlace[];
  const seen = new Set<string>();
  return places
    .map(toHomeArea)
    .filter(
      (area): area is HomeArea =>
        area !== null && !seen.has(area.areaName) && Boolean(seen.add(area.areaName)),
    );
}

export async function reverseHomeArea(
  latitude: number,
  longitude: number,
): Promise<HomeArea | null> {
  if (!(await getSessionUser())) return null;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  const url = `${NOMINATIM}/reverse?format=jsonv2&addressdetails=1&zoom=14&lat=${latitude}&lon=${longitude}`;
  const res = await fetch(url, { headers: NOMINATIM_HEADERS });
  if (!res.ok) return null;
  const area = toHomeArea((await res.json()) as NominatimPlace);
  // Store the user's real coordinates (private), but show only the area name.
  return area ? { ...area, latitude, longitude } : null;
}
