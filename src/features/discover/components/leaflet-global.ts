import L from "leaflet";

// leaflet.markercluster is an older plugin that extends a *global* `L`. With ES modules
// Leaflet isn't global, so expose it before the plugin is imported (imports run in order).
(globalThis as unknown as { L: typeof L }).L = L;
