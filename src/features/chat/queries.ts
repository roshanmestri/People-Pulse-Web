import "server-only";

import { db } from "@/lib/db";

/** Who's in the chat: the host + approved members (FR-6.1). Null if not found / no access. */
export async function getChatAccess(activityId: string, userId: string) {
  const activity = await db.activity.findUnique({
    where: { id: activityId },
    select: {
      id: true,
      title: true,
      status: true,
      startsAt: true,
      durationMinutes: true,
      venueName: true,
      areaName: true,
      coverImage: true,
      hostId: true,
      category: { select: { slug: true } },
      joinRequests: { where: { status: "APPROVED" }, select: { userId: true } },
    },
  });
  if (!activity || activity.status === "DRAFT") return null;
  const memberIds = [activity.hostId, ...activity.joinRequests.map((r) => r.userId)];
  if (!memberIds.includes(userId)) return null;
  return { activity, memberIds };
}

export type ChatMessage = {
  id: string;
  body: string;
  createdAt: string; // ISO — the same shape whether server-rendered or fetched as JSON
  sender: { id: string; name: string; image: string | null };
};

/** The latest messages, oldest first. Polling just refetches this window (small chats). */
export async function listMessages(activityId: string, limit = 100): Promise<ChatMessage[]> {
  const rows = await db.message.findMany({
    where: { activityId },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit,
    select: {
      id: true,
      body: true,
      createdAt: true,
      sender: { select: { id: true, name: true, image: true } },
    },
  });
  return rows.reverse().map((m) => ({ ...m, createdAt: m.createdAt.toISOString() }));
}

/** The Chats tab: every plan I host or am approved for, with its latest message. */
export async function listMyChats(userId: string) {
  const activities = await db.activity.findMany({
    where: {
      status: { not: "DRAFT" },
      OR: [{ hostId: userId }, { joinRequests: { some: { userId, status: "APPROVED" } } }],
    },
    orderBy: { startsAt: "asc" },
    select: {
      id: true,
      title: true,
      status: true,
      startsAt: true,
      durationMinutes: true,
      coverImage: true,
      category: { select: { slug: true } },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { body: true, createdAt: true, sender: { select: { name: true } } },
      },
    },
  });
  const unread = await db.notification.findMany({
    where: { userId, type: "NEW_MESSAGE", readAt: null },
    select: { payload: true },
  });
  const unreadIds = new Set(unread.map((n) => (n.payload as { activityId?: string })?.activityId));
  return activities.map((a) => ({ ...a, unread: unreadIds.has(a.id) }));
}
