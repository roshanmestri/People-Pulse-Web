"use client";

import { Compass, CalendarDays, MessageCircle, Plus, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const TABS = [
  { href: "/explore", label: "Explore", icon: Compass },
  { href: "/plans", label: "Plans", icon: CalendarDays },
  { href: "/activities/new", label: "Host", icon: Plus, primary: true },
  { href: "/chats", label: "Chats", icon: MessageCircle },
  { href: "/me", label: "You", icon: UserRound },
];

// Client Component only because it needs usePathname() to highlight the active tab.
// usePathname() is request data on dynamic routes, so the layout wraps this in <Suspense>
// with <TabBarView activePath={null} /> as the static fallback.
export function MobileTabBar() {
  return <TabBarView activePath={usePathname()} />;
}

export function TabBarView({ activePath }: { activePath: string | null }) {
  return (
    <nav
      aria-label="Tabs"
      className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 items-center border-t bg-background px-2 pt-2 pb-[max(env(safe-area-inset-bottom),12px)] md:hidden"
    >
      {TABS.map(({ href, label, icon: Icon, primary }) => {
        const active =
          activePath !== null && (activePath === href || activePath.startsWith(`${href}/`));
        if (primary) {
          return (
            <Link
              key={href}
              href={href}
              aria-label="Host a plan"
              className="grid place-items-center"
            >
              <span className="grid size-[52px] place-items-center rounded-[18px] bg-primary shadow-[0_8px_20px_rgb(255_91_34/0.4)]">
                <Icon
                  className="size-6 text-primary-foreground"
                  strokeWidth={2.8}
                  aria-hidden="true"
                />
              </span>
            </Link>
          );
        }
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex flex-col items-center gap-0.5 py-1.5 text-[11px]",
              active ? "font-extrabold text-foreground" : "font-semibold text-muted-foreground",
            )}
          >
            <Icon className="size-[22px]" strokeWidth={active ? 2.4 : 2} aria-hidden="true" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
