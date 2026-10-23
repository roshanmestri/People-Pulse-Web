import Link from "next/link";
import { Suspense } from "react";

import { Logo } from "@/components/brand/logo";
import { UserNav, UserNavFallback } from "@/components/layout/user-nav";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/explore", label: "Explore" },
  { href: "/plans", label: "My plans" },
  { href: "/chats", label: "Chats" },
];

/**
 * Server Component. `tone="overlay"` sits on top of a dark photo hero (landing page).
 * The signed-in part (<UserNav>) reads the session, so it streams in behind <Suspense>
 * while the rest of the header is part of the static shell.
 */
export function SiteHeader({ tone = "default" }: { tone?: "default" | "overlay" }) {
  const overlay = tone === "overlay";
  return (
    <header
      className={cn(
        "z-20 w-full",
        overlay
          ? "absolute inset-x-0 top-0"
          : "sticky top-0 border-b bg-background/90 backdrop-blur",
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-8">
        <Logo tone={overlay ? "light" : "default"} />
        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-full px-3.5 py-2 text-sm font-semibold transition-colors",
                overlay
                  ? "text-white/80 hover:text-white"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link
            href="/activities/new"
            className="hidden rounded-full bg-primary px-4 py-2.5 text-sm font-extrabold text-primary-foreground sm:inline-flex"
          >
            + Host a plan
          </Link>
          <Suspense fallback={<UserNavFallback overlay={overlay} />}>
            <UserNav overlay={overlay} />
          </Suspense>
        </div>
      </div>
    </header>
  );
}
