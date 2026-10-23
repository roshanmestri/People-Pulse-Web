"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useMemo, useState } from "react";

import { categoryPhoto } from "@/lib/category-media";
import type { LatLng } from "@/lib/geo";
import { formatDay, formatTime } from "@/lib/time";

import type { MapPin } from "../queries";
import { formatDistance } from "./activity-card";

// Leaflet + markercluster touch `window` → browser-only island.
const ClusterMap = dynamic(() => import("./cluster-map"), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-muted" aria-hidden="true" />,
});

type Props = { pins: MapPin[]; center: LatLng; radiusKm: number };

export function ExploreMap({ pins, center, radiusKm }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(pins[0]?.id ?? null);
  const onSelect = useCallback((id: string) => setSelectedId(id), []);
  const mapPins = useMemo(
    () =>
      pins.map((p) => ({
        id: p.id,
        title: p.title,
        latitude: p.latitude,
        longitude: p.longitude,
        photo: p.coverImage ?? categoryPhoto(p.categorySlug) ?? "/images/hero-football.jpg",
      })),
    [pins],
  );
  const selected = pins.find((p) => p.id === selectedId) ?? null;

  return (
    <div className="relative isolate h-full w-full overflow-hidden rounded-3xl border">
      <ClusterMap
        center={center}
        radiusKm={radiusKm}
        pins={mapPins}
        selectedId={selectedId}
        onSelect={onSelect}
      />
      <span className="pointer-events-none absolute top-3 right-3 z-[500] rounded-full bg-background/95 px-3 py-1.5 text-xs font-bold shadow">
        {pins.length} {pins.length === 1 ? "plan" : "plans"} · approximate areas
      </span>
      {selected ? (
        <Link
          href={`/activities/${selected.id}`}
          className="absolute inset-x-3 bottom-3 z-[500] flex items-center gap-3 rounded-2xl bg-background p-2.5 shadow-[0_16px_40px_rgb(15_15_16/0.22)] sm:right-auto sm:w-80"
        >
          <span className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-muted">
            <Image
              src={
                selected.coverImage ??
                categoryPhoto(selected.categorySlug) ??
                "/images/hero-football.jpg"
              }
              alt=""
              fill
              sizes="64px"
              className="object-cover"
            />
          </span>
          <span className="flex min-w-0 flex-col gap-0.5">
            <strong className="truncate font-extrabold">{selected.title}</strong>
            <span className="text-sm text-muted-foreground">
              {formatDay(selected.startsAt)} · {formatTime(selected.startsAt)} ·{" "}
              {formatDistance(selected.distanceM)}
            </span>
            <span className="text-sm font-extrabold">
              {selected.pricePerPerson ? `₹${selected.pricePerPerson}` : "Free"} ·{" "}
              {selected.areaName}
            </span>
          </span>
        </Link>
      ) : null}
    </div>
  );
}
