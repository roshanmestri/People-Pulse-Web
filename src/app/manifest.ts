import type { MetadataRoute } from "next";

// File convention: served as /manifest.webmanifest and linked from every page. It's what
// phones read for "Add to Home Screen": the name, icon, colours, and that Gathr opens
// full-screen (no browser bar) at Explore.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Gathr — Find your people, nearby",
    short_name: "Gathr",
    description: "Find people nearby for football, treks, badminton, jams and more.",
    start_url: "/explore",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
