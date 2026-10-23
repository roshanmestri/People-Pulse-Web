"use client";

import { useQuery } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";

/** Header bell. Starts with the server's count, then re-checks every 30 s and on focus. */
export function NotificationBell({
  initialCount,
  overlay,
}: {
  initialCount: number;
  overlay: boolean;
}) {
  const { data } = useQuery({
    queryKey: ["notifications", "unread"],
    queryFn: async () => {
      const res = await fetch("/api/notifications/unread");
      if (!res.ok) return { count: 0 };
      return (await res.json()) as { count: number };
    },
    initialData: { count: initialCount },
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });
  const count = data.count;
  return (
    <Link
      href="/notifications"
      aria-label={count ? `Notifications, ${count} unread` : "Notifications"}
      className={cn(
        "relative grid size-10 place-items-center rounded-full border",
        overlay ? "border-white/30 bg-white/10 text-white" : "bg-background",
      )}
    >
      <Bell className="size-[18px]" aria-hidden="true" />
      {count ? (
        <span className="absolute -top-1 -right-1 grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[11px] font-extrabold text-primary-foreground ring-2 ring-background">
          {count > 99 ? "99+" : count}
        </span>
      ) : null}
    </Link>
  );
}
