import { List, Map as MapIcon } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";

import { ExploreFilters } from "@/features/discover/components/explore-filters";
import { ExploreMap } from "@/features/discover/components/explore-map";
import { ResultsList } from "@/features/discover/components/results-list";
import { encodeCursor, filtersToQuery, parseFilters, RADII } from "@/features/discover/filters";
import {
  countActivities,
  getHome,
  mapPins,
  resolveCenter,
  searchActivities,
  toSearchArgs,
} from "@/features/discover/queries";
import { getCategories } from "@/features/profile/queries";
import { getSessionUser } from "@/lib/session";

export const metadata: Metadata = {
  title: "Explore",
  description: "Find football, badminton, treks, jams and more happening near you.",
};

export default function ExplorePage({ searchParams }: PageProps<"/explore">) {
  return (
    <>
      {/* Static shell: prerendered and instant. */}
      <section className="relative isolate overflow-hidden bg-[#0a0a0c]">
        <Image
          src="/images/hero-football.jpg"
          alt=""
          fill
          loading="eager"
          fetchPriority="high"
          sizes="100vw"
          className="-z-10 object-cover object-[60%_50%] opacity-80"
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-black/90 via-black/60 to-black/20" />
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 pt-7 pb-20 sm:px-8 sm:pt-14 sm:pb-24">
          <h1 className="text-4xl leading-none font-extrabold tracking-[-0.045em] text-white sm:text-6xl">
            Find your game.
          </h1>
          <p className="hidden max-w-lg text-white/80 sm:block">
            Plans near you, nearest first. Tap one to see who&apos;s in.
          </p>
        </div>
      </section>

      {/* Everything that depends on the URL or the session streams in. */}
      <Suspense fallback={<ExploreSkeleton />}>
        <ExploreResults searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function ExploreResults({
  searchParams,
}: {
  searchParams: PageProps<"/explore">["searchParams"];
}) {
  const filters = parseFilters(await searchParams);
  const user = await getSessionUser();
  const home = user ? await getHome(user.id) : null;
  const center = resolveCenter(filters, home);
  const args = toSearchArgs(filters, center);
  const showMap = filters.view === "map";

  const [page, total, categories, pins] = await Promise.all([
    searchActivities(args, null),
    countActivities(args),
    getCategories(),
    showMap ? mapPins(args) : Promise.resolve(null),
  ]);
  const query = filtersToQuery(filters);
  const widerRadius = RADII.find((r) => r > filters.r);

  return (
    <div className="relative z-10 mx-auto -mt-16 flex w-full max-w-7xl flex-col gap-8 px-4 pb-16 sm:px-8">
      <ExploreFilters
        filters={filters}
        centerLabel={center.label}
        hasHome={home?.latitude != null}
        categories={categories.map(({ slug, name, icon }) => ({ slug, name, icon }))}
      />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-extrabold tracking-[-0.035em] sm:text-3xl">
            {total} {total === 1 ? "plan" : "plans"} within {filters.r} km
          </h2>
          <p className="text-sm text-muted-foreground">
            Near {center.label} · nearest first
            {center.source === "default"
              ? " · set your home area in your profile to search near you"
              : ""}
          </p>
        </div>
        <Link
          href={`/explore${filtersToQuery({ ...filters, view: showMap ? "list" : "map" })}`}
          scroll={false}
          className="hidden items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-bold md:flex"
        >
          {showMap ? (
            <List className="size-4" aria-hidden="true" />
          ) : (
            <MapIcon className="size-4" aria-hidden="true" />
          )}
          {showMap ? "Hide map" : "Show map"}
        </Link>
      </div>

      {total === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-3xl bg-muted px-6 py-16 text-center">
          <p className="text-xl font-extrabold">Nothing matches yet</p>
          <p className="max-w-md text-muted-foreground">
            Try a wider radius or fewer filters — or host the plan yourself.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {widerRadius ? (
              <Link
                href={`/explore${filtersToQuery({ ...filters, r: widerRadius })}`}
                className="rounded-full bg-foreground px-4 py-2.5 text-sm font-bold text-background"
              >
                Search {widerRadius} km
              </Link>
            ) : null}
            <Link
              href="/explore"
              className="rounded-full border bg-background px-4 py-2.5 text-sm font-bold"
            >
              Clear filters
            </Link>
            <Link
              href="/activities/new"
              className="rounded-full bg-primary px-4 py-2.5 text-sm font-extrabold text-primary-foreground"
            >
              Host a plan
            </Link>
          </div>
        </div>
      ) : (
        <div className={showMap ? "grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]" : ""}>
          {showMap && pins ? (
            <div className="order-first h-[60vh] lg:sticky lg:top-20 lg:order-last lg:h-[calc(100dvh-7rem)]">
              <ExploreMap pins={pins} center={center} radiusKm={filters.r} />
            </div>
          ) : null}
          <ResultsList
            // A new search → fresh list state (otherwise useState would keep old pages).
            key={query}
            initialItems={page.items}
            initialCursor={page.nextCursor ? encodeCursor(page.nextCursor) : null}
            query={query}
            compact={showMap}
          />
        </div>
      )}

      {/* Mobile: floating list/map switch above the tab bar */}
      <Link
        href={`/explore${filtersToQuery({ ...filters, view: showMap ? "list" : "map" })}`}
        scroll={false}
        className="fixed bottom-24 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full bg-foreground px-5 py-3 text-sm font-bold text-background shadow-xl md:hidden"
      >
        {showMap ? (
          <List className="size-4" aria-hidden="true" />
        ) : (
          <MapIcon className="size-4" aria-hidden="true" />
        )}
        {showMap ? "List" : "Map"}
      </Link>
    </div>
  );
}

function ExploreSkeleton() {
  return (
    <div
      className="relative z-10 mx-auto -mt-16 flex w-full max-w-7xl flex-col gap-8 px-4 pb-16 sm:px-8"
      aria-busy="true"
    >
      <div className="h-16 rounded-3xl bg-card shadow ring-1 ring-border" />
      <div className="flex gap-4">
        {Array.from({ length: 7 }, (_, i) => (
          <div key={i} className="size-[68px] shrink-0 animate-pulse rounded-full bg-muted" />
        ))}
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="aspect-[4/3] animate-pulse rounded-[20px] bg-muted" />
        ))}
      </div>
    </div>
  );
}
