"use client";

import { useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  CalendarClock,
  CalendarX2,
  CheckCircle2,
  MessageCircle,
  PencilLine,
  UserPlus,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { markAllNotificationsRead, markNotificationRead } from "../actions";
import type { NotificationKind } from "../describe";

export type NotificationRow = {
  id: string;
  type: NotificationKind;
  text: string;
  href: string | null;
  unread: boolean;
  when: string;
};

const ICONS: Record<NotificationKind, LucideIcon> = {
  JOIN_REQUEST: UserPlus,
  REQUEST_APPROVED: CheckCircle2,
  REQUEST_REJECTED: XCircle,
  ACTIVITY_UPDATED: PencilLine,
  ACTIVITY_CANCELLED: CalendarX2,
  NEW_MESSAGE: MessageCircle,
  REMINDER: CalendarClock,
};

export function NotificationList({ rows }: { rows: NotificationRow[] }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [pending, startTransition] = useTransition();
  const refreshBell = () =>
    queryClient.invalidateQueries({ queryKey: ["notifications", "unread"] });

  function open(row: NotificationRow) {
    startTransition(async () => {
      if (row.unread) await markNotificationRead(row.id);
      await refreshBell();
      if (row.href) router.push(row.href);
      else router.refresh();
    });
  }

  if (!rows.length) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-3xl bg-muted px-6 py-16 text-center">
        <Bell className="size-8 text-muted-foreground" aria-hidden="true" />
        <p className="text-lg font-extrabold">You&apos;re all caught up</p>
        <p className="text-sm text-muted-foreground">
          Requests, approvals, chat messages and reminders show up here.
        </p>
      </div>
    );
  }

  const unread = rows.filter((r) => r.unread).length;
  return (
    <div className="flex flex-col gap-4">
      {unread ? (
        <Button
          variant="outline"
          disabled={pending}
          className="h-10 self-end rounded-full font-bold"
          onClick={() =>
            startTransition(async () => {
              await markAllNotificationsRead();
              await refreshBell();
              router.refresh();
            })
          }
        >
          Mark all as read ({unread})
        </Button>
      ) : null}
      <ul className="flex flex-col divide-y rounded-3xl border bg-card">
        {rows.map((row) => {
          const Icon = ICONS[row.type] ?? Bell;
          return (
            <li key={row.id}>
              <button
                type="button"
                onClick={() => open(row)}
                className={cn(
                  "flex w-full items-start gap-3.5 p-4 text-left hover:bg-muted/60",
                  row.unread && "bg-accent/50",
                )}
              >
                <span
                  className={cn(
                    "grid size-10 shrink-0 place-items-center rounded-full",
                    row.unread ? "bg-primary text-primary-foreground" : "bg-muted",
                  )}
                >
                  <Icon className="size-[18px]" aria-hidden="true" />
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span
                    className={cn(
                      "text-[15px] leading-snug",
                      row.unread ? "font-bold" : "text-foreground/80",
                    )}
                  >
                    {row.text}
                  </span>
                  <span className="text-xs text-muted-foreground">{row.when}</span>
                </span>
                {row.unread ? (
                  <span
                    className="mt-1.5 size-2.5 shrink-0 rounded-full bg-primary"
                    aria-label="Unread"
                  />
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
