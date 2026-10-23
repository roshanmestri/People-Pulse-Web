import type { Metadata } from "next";
import { Suspense } from "react";

import { describeNotification, type NotificationKind } from "@/features/notifications/describe";
import {
  NotificationList,
  type NotificationRow,
} from "@/features/notifications/components/notification-list";
import { ensureReminders, listNotifications } from "@/features/notifications/queries";
import { requireSessionUser } from "@/lib/session";
import { formatDay, formatTime } from "@/lib/time";

export const metadata: Metadata = { title: "Notifications" };

export default function NotificationsPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:px-8">
      <h1 className="text-4xl font-extrabold tracking-[-0.045em]">Notifications</h1>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-3xl bg-muted" />}>
        <Notifications />
      </Suspense>
    </div>
  );
}

async function Notifications() {
  const user = await requireSessionUser("/notifications");
  await ensureReminders(user.id);
  const rows: NotificationRow[] = (await listNotifications(user.id)).map((n) => ({
    id: n.id,
    type: n.type as NotificationKind,
    ...describeNotification(n.type as NotificationKind, n.payload),
    unread: !n.readAt,
    when: `${formatDay(n.createdAt)} · ${formatTime(n.createdAt)}`,
  }));
  return <NotificationList rows={rows} />;
}
