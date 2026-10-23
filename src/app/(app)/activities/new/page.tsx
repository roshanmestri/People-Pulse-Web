import type { Metadata } from "next";

import { ComingSoon } from "@/components/coming-soon";

export const metadata: Metadata = { title: "Host a plan" };

export default function Page() {
  return (
    <ComingSoon
      title="Host a plan"
      milestone="M3"
      body="Post what, where and when — with a map pin, spots and price per person."
      image="/images/run.jpg"
    />
  );
}
