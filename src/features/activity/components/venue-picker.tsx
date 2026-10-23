"use client";

import { MapPin, Search } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";

import { LazyPinMap } from "@/components/map/lazy-pin-map";
import { Input } from "@/components/ui/input";
import { reversePlace, searchPlaces, type GeoPlace } from "@/features/geo/actions";
import type { LatLng } from "@/lib/geo";

import type { ActivityInput } from "../schemas";

type Venue = NonNullable<ActivityInput["venue"]>;
type Props = {
  value: Venue | null;
  onChange: (venue: Venue | null) => void;
  fallbackCenter: LatLng;
};

export function VenuePicker({ value, onChange, fallbackCenter }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeoPlace[]>([]);
  const [searching, startSearch] = useTransition();
  const [locating, startLocate] = useTransition();
  const reverseTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Debounced search — Nominatim allows ~1 request/second.
  useEffect(() => {
    if (query.trim().length < 3) return;
    const id = setTimeout(
      () => startSearch(async () => setResults(await searchPlaces(query))),
      600,
    );
    return () => clearTimeout(id);
  }, [query]);

  function pick(place: GeoPlace) {
    onChange({
      venueName: place.name,
      areaName: place.areaName,
      latitude: place.latitude,
      longitude: place.longitude,
    });
    setResults([]);
    setQuery("");
  }

  // Moving the pin keeps the venue name but re-names the locality (debounced).
  function move(point: LatLng) {
    const next: Venue = value
      ? { ...value, ...point }
      : { venueName: "", areaName: "Locating…", ...point };
    onChange(next);
    clearTimeout(reverseTimer.current);
    reverseTimer.current = setTimeout(() => {
      startLocate(async () => {
        const place = await reversePlace(point.latitude, point.longitude);
        // On failure clear the area so validation asks for another spot (never save "Locating…").
        onChange(
          place
            ? { ...next, areaName: place.areaName, venueName: next.venueName || place.name }
            : { ...next, areaName: "" },
        );
      });
    }, 700);
  }

  return (
    <div className="flex flex-col gap-3">
      <label className="flex h-12 items-center gap-2.5 rounded-xl border px-4">
        <Search className="size-4 text-muted-foreground" aria-hidden="true" />
        <span className="sr-only">Search for the venue</span>
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (e.target.value.trim().length < 3) setResults([]);
          }}
          placeholder="Search a ground, café, park…"
          className="flex-1 bg-transparent outline-none"
        />
        {searching ? <span className="text-xs text-muted-foreground">Searching…</span> : null}
      </label>

      {results.length ? (
        <ul
          aria-label="Matching places"
          className="flex flex-col overflow-hidden rounded-xl border"
        >
          {results.map((place) => (
            <li key={`${place.name}|${place.latitude}`}>
              <button
                type="button"
                onClick={() => pick(place)}
                className="flex w-full items-start gap-2 px-4 py-3 text-left hover:bg-muted"
              >
                <MapPin className="mt-0.5 size-4 shrink-0 text-brand-deep" aria-hidden="true" />
                <span>
                  <span className="block font-bold">{place.name}</span>
                  <span className="text-sm text-muted-foreground">{place.areaName}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="relative h-64 overflow-hidden rounded-2xl border">
        <LazyPinMap center={value ?? fallbackCenter} mode="pin" onMove={move} />
        {!value ? (
          <span className="pointer-events-none absolute inset-x-3 top-3 z-[400] rounded-xl bg-background/95 px-3 py-2 text-center text-sm font-semibold">
            Search above, or tap the map to drop the pin
          </span>
        ) : null}
      </div>

      {value ? (
        <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <label className="flex flex-col gap-1.5 text-sm font-bold">
            Venue name
            <Input
              value={value.venueName}
              onChange={(e) => onChange({ ...value, venueName: e.target.value })}
              placeholder="e.g. Kothrud Sports Complex, Court 3"
              className="h-11 rounded-xl font-medium"
            />
          </label>
          <span
            className="flex items-center gap-1.5 pb-2.5 text-sm font-semibold text-muted-foreground"
            aria-live="polite"
          >
            <MapPin className="size-4" aria-hidden="true" />
            {locating ? "Finding area…" : value.areaName}
          </span>
        </div>
      ) : null}
    </div>
  );
}
