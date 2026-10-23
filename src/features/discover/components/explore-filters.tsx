"use client";

import { Check, ChevronDown, Crosshair, Home, MapPin, Search, X } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { CategoryIcon } from "@/components/category-icon";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { categoryPhoto } from "@/lib/category-media";
import { cn } from "@/lib/utils";

import { CITIES, filtersToQuery, LEVELS, RADII, type CityKey, type Filters } from "../filters";

type Category = { slug: string; name: string; icon: string };

type Props = {
  filters: Filters;
  centerLabel: string;
  hasHome: boolean;
  categories: Category[];
};

const WHEN_LABELS: [Filters["when"], string][] = [
  ["any", "Anytime"],
  ["today", "Today"],
  ["tomorrow", "Tomorrow"],
  ["weekend", "This weekend"],
  ["week", "Next 7 days"],
];
const LEVEL_LABELS: Record<(typeof LEVELS)[number], string> = {
  BEGINNER: "Beginner friendly",
  INTERMEDIATE: "Intermediate",
  PRO: "Pro",
};

/**
 * Every control just changes the URL. The server page re-renders with the new
 * searchParams — no client-side fetching or global state needed.
 */
export function ExploreFilters({ filters, centerLabel, hasHome, categories }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [locating, setLocating] = useState(false);

  function go(change: Partial<Filters>) {
    const next = { ...filters, ...change };
    startTransition(() => router.push(`/explore${filtersToQuery(next)}`, { scroll: false }));
  }

  function setLocation(change: { city?: CityKey; lat?: number; lng?: number }) {
    go({ city: change.city, lat: change.lat, lng: change.lng });
  }

  function useMyLocation() {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLocating(false);
        setLocation({ lat: coords.latitude, lng: coords.longitude });
      },
      () => setLocating(false),
      { timeout: 10_000 },
    );
  }

  const activeCount =
    filters.cat.length +
    (filters.when !== "any" ? 1 : 0) +
    (filters.level ? 1 : 0) +
    (filters.open ? 1 : 0) +
    (filters.q ? 1 : 0);

  return (
    <div className="flex flex-col gap-5">
      {/* Progress bar while the server renders the new results */}
      <div
        aria-hidden="true"
        className={cn(
          "fixed inset-x-0 top-0 z-50 h-0.5 origin-left bg-primary transition-transform duration-700",
          pending ? "scale-x-75" : "scale-x-0",
        )}
      />

      {/* Search + where */}
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          go({ q: String(new FormData(e.currentTarget).get("q") ?? "").trim() });
        }}
        className="flex flex-wrap items-stretch gap-2 rounded-3xl bg-card p-2 shadow-[0_20px_50px_rgb(0_0_0/0.18)] ring-1 ring-border"
      >
        <label className="flex min-w-0 flex-[1_1_260px] items-center gap-2.5 px-3">
          <Search className="size-5 shrink-0" aria-hidden="true" />
          <span className="sr-only">Search plans</span>
          <input
            name="q"
            defaultValue={filters.q}
            key={filters.q}
            placeholder="Football, badminton, trek…"
            className="h-12 min-w-0 flex-1 bg-transparent text-[15px] font-medium outline-none"
          />
          {filters.q ? (
            <button type="button" aria-label="Clear search" onClick={() => go({ q: "" })}>
              <X className="size-4 text-muted-foreground" aria-hidden="true" />
            </button>
          ) : null}
        </label>
        <DropdownMenu>
          <DropdownMenuTrigger className="flex h-12 items-center gap-2 rounded-2xl px-4 text-sm font-bold hover:bg-muted">
            <MapPin className="size-4 text-brand-deep" aria-hidden="true" />
            <span className="max-w-40 truncate">Near {centerLabel}</span>
            <ChevronDown className="size-4" aria-hidden="true" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {hasHome ? (
              <DropdownMenuItem onSelect={() => setLocation({})}>
                <Home aria-hidden="true" /> My home area
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuItem onSelect={useMyLocation}>
              <Crosshair aria-hidden="true" />{" "}
              {locating ? "Finding you…" : "Use my current location"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {(Object.keys(CITIES) as CityKey[]).map((key) => (
              <DropdownMenuItem key={key} onSelect={() => setLocation({ city: key })}>
                <MapPin aria-hidden="true" /> {CITIES[key].name}
                {filters.city === key ? <Check className="ml-auto" aria-hidden="true" /> : null}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <button
          type="submit"
          className="h-12 rounded-2xl bg-primary px-6 font-extrabold text-primary-foreground"
        >
          Search
        </button>
      </form>

      {/* Category circles */}
      <div
        role="group"
        aria-label="Categories"
        className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0"
      >
        <CategoryCircle
          label="For you"
          selected={!filters.cat.length}
          onClick={() => go({ cat: [] })}
          photo="/images/hero-football.jpg"
        />
        {categories.map((c) => {
          const selected = filters.cat.includes(c.slug);
          return (
            <CategoryCircle
              key={c.slug}
              label={c.name}
              selected={selected}
              photo={categoryPhoto(c.slug)}
              icon={c.icon}
              onClick={() =>
                go({
                  cat: selected
                    ? filters.cat.filter((s) => s !== c.slug)
                    : [...filters.cat, c.slug],
                })
              }
            />
          );
        })}
      </div>

      {/* When / distance / extras — one swipeable row on phones, wraps on wider screens */}
      <div className="-mx-4 flex items-center gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
        <div
          role="radiogroup"
          aria-label="When"
          className="flex shrink-0 gap-1 rounded-full bg-muted p-1"
        >
          {WHEN_LABELS.map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={filters.when === value}
              onClick={() => go({ when: value })}
              className={cn(
                "h-9 rounded-full px-3.5 text-sm whitespace-nowrap",
                filters.when === value
                  ? "bg-background font-extrabold shadow-sm"
                  : "font-semibold text-muted-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <div
          role="radiogroup"
          aria-label="Distance"
          className="flex shrink-0 gap-1 rounded-full bg-muted p-1"
        >
          {RADII.map((r) => (
            <button
              key={r}
              type="button"
              role="radio"
              aria-checked={filters.r === r}
              onClick={() => go({ r })}
              className={cn(
                "h-9 rounded-full px-3 text-sm whitespace-nowrap",
                filters.r === r
                  ? "bg-background font-extrabold shadow-sm"
                  : "font-semibold text-muted-foreground",
              )}
            >
              {r} km
            </button>
          ))}
        </div>
        <Toggle on={filters.open} onClick={() => go({ open: !filters.open })}>
          Spots available
        </Toggle>
        {LEVELS.map((level) => (
          <Toggle
            key={level}
            on={filters.level === level}
            onClick={() => go({ level: filters.level === level ? undefined : level })}
          >
            {LEVEL_LABELS[level]}
          </Toggle>
        ))}
        {activeCount ? (
          <button
            type="button"
            onClick={() => go({ q: "", cat: [], when: "any", level: undefined, open: false })}
            className="h-9 shrink-0 px-2 text-sm font-bold whitespace-nowrap text-brand-deep underline"
          >
            Clear filters ({activeCount})
          </button>
        ) : null}
      </div>
    </div>
  );
}

function Toggle({
  on,
  onClick,
  children,
}: {
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cn(
        "h-10 shrink-0 rounded-full border px-3.5 text-sm whitespace-nowrap",
        on ? "border-foreground bg-foreground font-extrabold text-background" : "font-semibold",
      )}
    >
      {children}
    </button>
  );
}

function CategoryCircle({
  label,
  selected,
  onClick,
  photo,
  icon,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
  photo: string | null;
  icon?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className="flex w-[76px] shrink-0 flex-col items-center gap-1.5"
    >
      <span
        className={cn(
          "relative grid size-[68px] place-items-center overflow-hidden rounded-full border-[2.5px] p-0.5",
          selected ? "border-primary" : "border-border",
        )}
      >
        {photo ? (
          <Image
            src={photo}
            alt=""
            width={64}
            height={64}
            className="size-full rounded-full object-cover"
          />
        ) : (
          <span className="grid size-full place-items-center rounded-full bg-accent">
            <CategoryIcon name={icon ?? "Sparkles"} className="size-6 text-brand-deep" />
          </span>
        )}
      </span>
      <span
        className={cn(
          "line-clamp-2 text-center text-xs leading-tight",
          selected ? "font-extrabold" : "font-semibold text-muted-foreground",
        )}
      >
        {label}
      </span>
    </button>
  );
}
