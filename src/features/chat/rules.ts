import { z } from "zod";

// Chat rules (BRD FR-6). Pure → unit-tested.

/** Chats stay writable this long after a plan ends, then become read-only (FR-6.4). */
export const CHAT_GRACE_DAYS = 7;
export const MAX_MESSAGE_LENGTH = 1000;
/** Per-sender flood limit (BRD §6: rate-limit chat). */
export const MESSAGES_PER_MINUTE = 20;

export const messageSchema = z
  .string()
  .trim()
  .min(1, "Type a message")
  .max(MAX_MESSAGE_LENGTH, `Keep it under ${MAX_MESSAGE_LENGTH} characters`);

export type ChatState = "open" | "cancelled" | "archived";

export function chatState(
  a: { status: string; startsAt: Date; durationMinutes: number },
  now: Date = new Date(),
): ChatState {
  if (a.status === "CANCELLED") return "cancelled";
  const end = a.startsAt.getTime() + a.durationMinutes * 60_000;
  return now.getTime() > end + CHAT_GRACE_DAYS * 24 * 60 * 60_000 ? "archived" : "open";
}
