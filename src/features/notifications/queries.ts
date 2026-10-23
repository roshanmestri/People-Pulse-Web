import "server-only";

import { NotificationType } from "@/generated/prisma/client";
import { db } from "@/lib/db";

export const REMINDER_LEAD_MINUTES = 120;

export function unreadCount(userId: string) {
  return db.notification.count({ where: { userId, readAt: null } });
}

export function listNotifications(userId: string, limit = 50) {
  return db.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: { id: true, type: true, payload: true, readAt: true, createdAt: true },
  });
}

/**
 * FR-7.1 reminders, 2 hours before start. Phase 1 has no background scheduler, so we
 * create them lazily whenever the person loads the app (header bell). At most one per
 * plan per person. M9 can move this to a scheduled job (and add email/push).
 */
export async function ensureReminders(userId: string, now: Date = new Date()) {
  const soon = await db.activity.findMany({
    where: {
      status: { in: ["OPEN", "FULL"] },
      startsAt: { gt: now, lte: new Date(now.getTime() + REMINDER_LEAD_MINUTES * 60_000) },
      OR: [{ hostId: userId }, { joinRequests: { some: { userId, status: "APPROVED" } } }],
    },
    select: { id: true, title: true, startsAt: true },
  });
  if (!soon.length) return;

  // The header and the page can both call this in the same instant. A per-user advisory
  // lock makes "check, then insert" atomic, so two callers can't both create a reminder.
  await db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`reminders:${userId}`}))`;
    const already = await tx.notification.findMany({
      where: {
        userId,
        type: NotificationType.REMINDER,
        OR: soon.map((a) => ({ payload: { path: ["activityId"], equals: a.id } })),
      },
      select: { payload: true },
    });
    const done = new Set(already.map((n) => (n.payload as { activityId?: string }).activityId));
    const missing = soon.filter((a) => !done.has(a.id));
    if (missing.length) {
      await tx.notification.createMany({
        data: missing.map((a) => ({
          userId,
          type: NotificationType.REMINDER,
          payload: { activityId: a.id, title: a.title, startsAt: a.startsAt.toISOString() },
        })),
      });
    }
  });
}
