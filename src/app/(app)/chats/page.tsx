import type { Metadata } from "next";

import { ComingSoon } from "@/components/coming-soon";

export const metadata: Metadata = { title: "Chats" };

export default function Page() {
  return (
    <ComingSoon
      title="Chats"
      milestone="M6"
      body="Group chats for every plan you're in."
      image="/images/jam.jpg"
    />
  );
}
