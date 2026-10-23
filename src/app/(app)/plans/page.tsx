import type { Metadata } from "next";

import { ComingSoon } from "@/components/coming-soon";

export const metadata: Metadata = { title: "My plans" };

export default function Page() {
  return (
    <ComingSoon
      title="My plans"
      milestone="M5"
      body="Everything you're hosting or have joined, with request status."
      image="/images/badminton.jpg"
    />
  );
}
