"use server";

import { getSessionUser } from "@/lib/session";

// OpenStreetMap Nominatim lookups (free geocoding), proxied through the server so we
// can send the required identifying User-Agent and only signed-in users can use it.
// Nominatim's usage policy: max ~1 request/second — callers debounce typing.

export type GeoPlace = {
  /** Short place name, e.g. "Kothrud Sports Complex" (falls back to the area). */
  name: string;
  /** Public locality label, e.g. "Kothrud, Pune". */
  areaName: string;
  latitude: number;
  longitude: number;
};

const NOMINATIM = "https://nominatim.openstreetmap.org";
const HEADERS = {
  "User-Agent": "Gathr/0.1 (community activities app; development)",
  "Accept-Language": "en",
};

type NominatimPlace = {
  lat: string;
  lon: string;
  name?: string;
  address?: Record<string, string | undefined>;
};

function toPlace(place: NominatimPlace): GeoPlace | null {
  const a = place.address ?? {};
  const local = a.suburb ?? a.neighbourhood ?? a.city_district ?? a.quarter ?? a.village ?? a.town;
  const city = a.city ?? a.town ?? a.state_district ?? a.county;
  const areaName = [local, city]
    .filter((part, i, all) => part && all.indexOf(part) === i)
    .join(", ");
  if (!areaName) return null;
  return {
    name: place.name || areaName,
    areaName,
    latitude: Number(place.lat),
    longitude: Number(place.lon),
  };
}

export async function searchPlaces(query: string): Promise<GeoPlace[]> {
  if (!(await getSessionUser())) return [];
  const q = query.trim().slice(0, 100);
  if (q.length < 3) return [];
  const url = `${NOMINATIM}/search?format=jsonv2&addressdetails=1&limit=6&countrycodes=in&q=${encodeURIComponent(q)}`;
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) return [];
  const seen = new Set<string>();
  return ((await res.json()) as NominatimPlace[]).map(toPlace).filter((p): p is GeoPlace => {
    if (!p) return false;
    const key = `${p.name}|${p.areaName}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Name the locality at a point. Keeps the caller's exact coordinates (they stay private). */
export async function reversePlace(latitude: number, longitude: number): Promise<GeoPlace | null> {
  if (!(await getSessionUser())) return null;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  const url = `${NOMINATIM}/reverse?format=jsonv2&addressdetails=1&zoom=16&lat=${latitude}&lon=${longitude}`;
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) return null;
  const place = toPlace((await res.json()) as NominatimPlace);
  return place ? { ...place, latitude, longitude } : null;
}
