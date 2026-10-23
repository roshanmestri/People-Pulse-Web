import { Suspense } from "react";

import { MobileTabBar, TabBarView } from "@/components/layout/mobile-tab-bar";
import { SiteHeader } from "@/components/layout/site-header";

// Shared shell for the signed-in app area. The route group "(app)" doesn't appear in URLs.
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <SiteHeader />
      <main className="flex flex-1 flex-col pb-24 md:pb-0">{children}</main>
      <Suspense fallback={<TabBarView activePath={null} />}>
        <MobileTabBar />
      </Suspense>
    </>
  );
}
