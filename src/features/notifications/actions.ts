"use server";

import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/session";

// FR-7.2. Every update is scoped to the signed-in user's own rows.

export async function markNotificationRead(id: string) {
  const user = await getSessionUser();
  if (!user || typeof id !== "string") return;
  await db.notification.updateMany({
    where: { id, userId: user.id, readAt: null },
    data: { readAt: new Date() },
  });
}

export async function markAllNotificationsRead() {
  const user = await getSessionUser();
  if (!user) return;
  await db.notification.updateMany({
    where: { userId: user.id, readAt: null },
    data: { readAt: new Date() },
  });
}
