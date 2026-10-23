"use client";

import { Crosshair, Lock, MapPin, Search } from "lucide-react";
import { useEffect, useState, useTransition } from "react";

import { reverseHomeArea, searchHomeAreas } from "../actions";
import type { HomeArea } from "../schemas";

type Props = { value: HomeArea | null; onChange: (value: HomeArea | null) => void };

export function HomeAreaPicker({ value, onChange }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<HomeArea[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Debounce typing so we stay within Nominatim's ~1 request/second policy.
  useEffect(() => {
    if (query.trim().length < 3) return;
    const id = setTimeout(() => {
      startTransition(async () => setResults(await searchHomeAreas(query)));
    }, 600);
    return () => clearTimeout(id);
  }, [query]);

  function useMyLocation() {
    if (!navigator.geolocation) return setStatus("Location isn't available in this browser.");
    setStatus("Finding you…");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) =>
        startTransition(async () => {
          const area = await reverseHomeArea(coords.latitude, coords.longitude);
          if (area) {
            onChange(area);
            setStatus(null);
          } else setStatus("Couldn't name that spot — try searching instead.");
        }),
      () => setStatus("Location permission was denied — search for your area instead."),
      { enableHighAccuracy: false, timeout: 10_000 },
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {value ? (
        <div className="flex items-center gap-3 rounded-2xl border-2 border-primary bg-accent p-3">
          <MapPin className="size-5 text-brand-deep" aria-hidden="true" />
          <span className="flex-1 font-bold">{value.areaName}</span>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-sm font-bold underline"
          >
            Change
          </button>
        </div>
      ) : (
        <>
          <button
            type="button"
            onClick={useMyLocation}
            className="flex h-12 items-center gap-2.5 rounded-xl border px-4 font-bold text-brand-deep"
          >
            <Crosshair className="size-5" aria-hidden="true" /> Use my current location
          </button>
          <label className="flex h-12 items-center gap-2.5 rounded-xl bg-muted px-4">
            <Search className="size-4 text-muted-foreground" aria-hidden="true" />
            <span className="sr-only">Search your area</span>
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                if (e.target.value.trim().length < 3) setResults([]);
              }}
              placeholder="Search your area, e.g. Kothrud"
              className="flex-1 bg-transparent outline-none"
            />
          </label>
          {pending ? <p className="text-sm text-muted-foreground">Searching…</p> : null}
          {results.length ? (
            <ul
              className="flex flex-col overflow-hidden rounded-xl border"
              aria-label="Matching areas"
            >
              {results.map((area) => (
                <li key={area.areaName}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(area);
                      setResults([]);
                      setQuery("");
                    }}
                    className="flex w-full items-center gap-2 px-4 py-3 text-left font-semibold hover:bg-muted"
                  >
                    <MapPin className="size-4 text-muted-foreground" aria-hidden="true" />{" "}
                    {area.areaName}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </>
      )}
      {status ? (
        <p className="text-sm font-semibold text-muted-foreground" role="status">
          {status}
        </p>
      ) : null}
      <p className="flex items-start gap-2 text-[13px] leading-snug text-muted-foreground">
        <Lock className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
        Only the area name is shown on your profile — never your exact location.
      </p>
    </div>
  );
}
