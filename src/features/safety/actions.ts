"use server";

import { updateTag } from "next/cache";

import { evictFromHostPlans } from "@/features/join/core";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/session";

import { REPORTS_PER_DAY, reportSchema, type ReportInput } from "./schemas";

type Result = { ok: true } | { ok: false; error: string };

/** FR-8.1 — report a user, plan or message. */
export async function reportContent(input: ReportInput): Promise<Result> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Please sign in to report." };
  const parsed = reportSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid report" };
  const { targetType, targetId, reason, details } = parsed.data;

  // The target must exist (and you can't report yourself).
  const exists =
    targetType === "USER"
      ? targetId !== user.id && (await db.user.count({ where: { id: targetId } })) > 0
      : targetType === "ACTIVITY"
        ? (await db.activity.count({ where: { id: targetId } })) > 0
        : (await db.message.count({ where: { id: targetId } })) > 0;
  if (!exists) return { ok: false, error: "That can't be reported." };

  const [duplicate, today] = await Promise.all([
    db.report.count({ where: { reporterId: user.id, targetType, targetId, status: "OPEN" } }),
    db.report.count({
      where: { reporterId: user.id, createdAt: { gt: new Date(Date.now() - 24 * 60 * 60_000) } },
    }),
  ]);
  if (duplicate)
    return { ok: false, error: "You've already reported this — our team will review it." };
  if (today >= REPORTS_PER_DAY)
    return { ok: false, error: "You've sent a lot of reports today. Try again tomorrow." };

  await db.report.create({
    data: { reporterId: user.id, targetType, targetId, reason, details: details || null },
  });
  return { ok: true };
}

/** FR-8.2 — block a user: hide each other's plans, and remove them from your upcoming plans. */
export async function blockUser(userId: string): Promise<Result> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Please sign in." };
  if (typeof userId !== "string" || userId === user.id)
    return { ok: false, error: "You can't block yourself." };
  if (!(await db.user.count({ where: { id: userId } })))
    return { ok: false, error: "User not found." };

  await db.block.upsert({
    where: { blockerId_blockedId: { blockerId: user.id, blockedId: userId } },
    create: { blockerId: user.id, blockedId: userId },
    update: {},
  });
  const changed = await evictFromHostPlans(db, { hostId: user.id, userId });
  for (const id of changed) updateTag(`activity:${id}`);
  updateTag("activities");
  return { ok: true };
}

export async function unblockUser(userId: string): Promise<Result> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Please sign in." };
  await db.block.deleteMany({ where: { blockerId: user.id, blockedId: String(userId) } });
  updateTag("activities");
  return { ok: true };
}
