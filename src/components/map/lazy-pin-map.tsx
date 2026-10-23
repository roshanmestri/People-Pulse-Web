"use client";

import dynamic from "next/dynamic";

import type { PinMapProps } from "./pin-map";

// Leaflet needs `window`, so it can't render on the server. `ssr: false` loads it only in
// the browser — the page around it is still server-rendered. (Must be called from a
// Client Component, which is why this tiny wrapper exists.)
const PinMap = dynamic(() => import("./pin-map"), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-muted" aria-hidden="true" />,
});

export function LazyPinMap(props: PinMapProps) {
  // `isolate` = new stacking context, so Leaflet's internal z-indexes (400–1000)
  // can't paint over the sticky header or dropdown menus.
  return (
    <div className="isolate h-full w-full">
      <PinMap {...props} />
    </div>
  );
}
