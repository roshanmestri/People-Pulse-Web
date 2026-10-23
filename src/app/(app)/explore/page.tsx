import type { Metadata } from "next";

import { ComingSoon } from "@/components/coming-soon";

export const metadata: Metadata = { title: "Explore" };

export default function Page() {
  return (
    <ComingSoon
      title="Explore"
      milestone="M4"
      body="Nearby plans on a list and a map, with filters for sport, time and distance."
      image="/images/hero-football.jpg"
    />
  );
}
