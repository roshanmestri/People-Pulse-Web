"use server";

import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/session";

import { getChatAccess, type ChatMessage } from "./queries";
import { chatState, messageSchema, MESSAGES_PER_MINUTE } from "./rules";

type SendResult = { ok: true; message: ChatMessage } | { ok: false; error: string };

export async function sendMessage(activityId: string, text: string): Promise<SendResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Please sign in again." };

  const body = messageSchema.safeParse(text);
  if (!body.success)
    return { ok: false, error: body.error.issues[0]?.message ?? "Invalid message" };

  const access = await getChatAccess(activityId, user.id);
  if (!access) return { ok: false, error: "Only the host and people who are in can chat." };
  const state = chatState(access.activity);
  if (state !== "open") {
    return {
      ok: false,
      error:
        state === "cancelled"
          ? "This plan was cancelled — the chat is read-only."
          : "This chat is archived.",
    };
  }

  const recent = await db.message.count({
    where: { senderId: user.id, createdAt: { gt: new Date(Date.now() - 60_000) } },
  });
  if (recent >= MESSAGES_PER_MINUTE)
    return { ok: false, error: "Slow down a little — try again in a minute." };

  const message = await db.message.create({
    data: { activityId, senderId: user.id, body: body.data },
    select: {
      id: true,
      body: true,
      createdAt: true,
      sender: { select: { id: true, name: true, image: true } },
    },
  });

  await notifyMembers(access, user.id, message.sender.name, body.data);
  return { ok: true, message: { ...message, createdAt: message.createdAt.toISOString() } };
}

/**
 * One grouped "new messages" alert per person per chat: if they already have an unread
 * one, bump its count/preview instead of piling up a notification per message.
 */
async function notifyMembers(
  access: NonNullable<Awaited<ReturnType<typeof getChatAccess>>>,
  senderId: string,
  senderName: string,
  text: string,
) {
  const recipients = access.memberIds.filter((id) => id !== senderId);
  const preview = text.length > 80 ? `${text.slice(0, 77)}…` : text;
  const existing = await db.notification.findMany({
    where: {
      userId: { in: recipients },
      type: "NEW_MESSAGE",
      readAt: null,
      payload: { path: ["activityId"], equals: access.activity.id },
    },
    select: { id: true, userId: true, payload: true },
  });
  const byUser = new Map(existing.map((n) => [n.userId, n]));
  await db.$transaction(
    recipients.map((userId) => {
      const current = byUser.get(userId);
      const payload = {
        activityId: access.activity.id,
        title: access.activity.title,
        actorName: senderName,
        preview,
        count: ((current?.payload as { count?: number } | undefined)?.count ?? 0) + 1,
      };
      return current
        ? db.notification.update({
            where: { id: current.id },
            data: { payload, createdAt: new Date() },
          })
        : db.notification.create({ data: { userId, type: "NEW_MESSAGE", payload } });
    }),
  );
}

/** Opening a chat clears its "new messages" alert. */
export async function markChatRead(activityId: string) {
  const user = await getSessionUser();
  if (!user) return;
  await db.notification.updateMany({
    where: {
      userId: user.id,
      type: "NEW_MESSAGE",
      readAt: null,
      payload: { path: ["activityId"], equals: activityId },
    },
    data: { readAt: new Date() },
  });
}
