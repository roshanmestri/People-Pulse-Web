"use server";

import { updateTag } from "next/cache";
import { z } from "zod";

import { ReportStatus, type ReportTargetType } from "@/generated/prisma/client";
import { nextVerifiedAt } from "@/features/profile/verification";
import { db } from "@/lib/db";
import { getAdminUser } from "@/lib/session";

// Admin-only Server Actions (FR-8.3). Every action re-checks the caller is an admin —
// hiding the buttons from non-admins is not security, this check is.

type Result = { ok: true } | { ok: false; error: string };
const denied: Result = { ok: false, error: "Admins only." };
const id = z.string().min(1).max(40);

async function resolveAll(targetType: ReportTargetType, targetId: string, status: ReportStatus) {
  await db.report.updateMany({
    where: { targetType, targetId, status: ReportStatus.OPEN },
    data: { status, resolvedAt: new Date() },
  });
}

export async function dismissReport(reportId: string): Promise<Result> {
  if (!(await getAdminUser()) || !id.safeParse(reportId).success) return denied;
  await db.report.update({
    where: { id: reportId },
    data: { status: ReportStatus.DISMISSED, resolvedAt: new Date() },
  });
  return { ok: true };
}

// ─── Content ────────────────────────────────────────────────────────────

export async function setActivityHidden(activityId: string, hidden: boolean): Promise<Result> {
  if (!(await getAdminUser()) || !id.safeParse(activityId).success) return denied;
  const activity = await db.activity.update({
    where: { id: activityId },
    data: { hiddenAt: hidden ? new Date() : null },
    select: { host: { select: { username: true } } },
  });
  if (hidden) await resolveAll("ACTIVITY", activityId, ReportStatus.ACTIONED);
  updateTag(`activity:${activityId}`);
  updateTag("activities");
  if (activity.host.username) updateTag(`user:${activity.host.username}`);
  return { ok: true };
}

export async function setMessageHidden(messageId: string, hidden: boolean): Promise<Result> {
  if (!(await getAdminUser()) || !id.safeParse(messageId).success) return denied;
  await db.message.update({
    where: { id: messageId },
    data: { hiddenAt: hidden ? new Date() : null },
  });
  if (hidden) await resolveAll("MESSAGE", messageId, ReportStatus.ACTIONED);
  return { ok: true };
}

// ─── Users ──────────────────────────────────────────────────────────────

/** Suspend: sign them out everywhere; the auth hook refuses new sessions. */
export async function setUserSuspended(userId: string, suspended: boolean): Promise<Result> {
  const admin = await getAdminUser();
  if (!admin || !id.safeParse(userId).success) return denied;
  if (userId === admin.id) return { ok: false, error: "You can't suspend yourself." };
  const target = await db.user.findUnique({
    where: { id: userId },
    select: { role: true, username: true },
  });
  if (!target) return { ok: false, error: "User not found." };
  if (target.role === "ADMIN") return { ok: false, error: "Admins can't be suspended here." };

  await db.$transaction([
    db.user.update({ where: { id: userId }, data: { suspendedAt: suspended ? new Date() : null } }),
    ...(suspended ? [db.session.deleteMany({ where: { userId } })] : []),
  ]);
  if (suspended) await resolveAll("USER", userId, ReportStatus.ACTIONED);
  updateTag("activities"); // their plans leave / return to Explore
  if (target.username) updateTag(`user:${target.username}`);
  return { ok: true };
}

/** FR-2.5: revoke (with a reason the user sees) or restore the verified badge. */
export async function setBadgeRevoked(
  userId: string,
  revoked: boolean,
  reason?: string,
): Promise<Result> {
  if (!(await getAdminUser()) || !id.safeParse(userId).success) return denied;
  const why = z
    .string()
    .trim()
    .max(200)
    .safeParse(reason ?? "");
  if (!why.success) return { ok: false, error: "Keep the reason under 200 characters." };

  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      username: true,
      name: true,
      image: true,
      bio: true,
      homeAreaName: true,
      emailVerified: true,
      verifiedAt: true,
      _count: { select: { interests: true } },
    },
  });
  if (!user) return { ok: false, error: "User not found." };

  if (revoked) {
    await db.user.update({
      where: { id: userId },
      data: {
        verificationRevokedAt: new Date(),
        verificationRevokedReason: why.data || null,
        verifiedAt: null,
      },
    });
  } else {
    const verifiedAt = nextVerifiedAt(
      {
        emailVerified: user.emailVerified,
        name: user.name,
        image: user.image,
        bio: user.bio,
        homeAreaName: user.homeAreaName,
        interestCount: user._count.interests,
        verificationRevokedAt: null,
      },
      user.verifiedAt,
    );
    await db.user.update({
      where: { id: userId },
      data: { verificationRevokedAt: null, verificationRevokedReason: null, verifiedAt },
    });
  }
  if (user.username) updateTag(`user:${user.username}`);
  updateTag("activities");
  return { ok: true };
}

// ─── Categories ─────────────────────────────────────────────────────────

const categorySchema = z.object({
  name: z.string().trim().min(2).max(40),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z][a-z-]{1,38}[a-z]$/, "Lower-case letters and dashes, e.g. board-games"),
  icon: z
    .string()
    .trim()
    .regex(/^[A-Z][A-Za-z]{1,30}$/, "A lucide icon name, e.g. Puzzle"),
});

export async function createCategory(input: z.infer<typeof categorySchema>): Promise<Result> {
  if (!(await getAdminUser())) return denied;
  const parsed = categorySchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid category" };
  if (await db.category.count({ where: { slug: parsed.data.slug } })) {
    return { ok: false, error: "That slug already exists." };
  }
  const last = await db.category.aggregate({ _max: { sortOrder: true } });
  await db.category.create({ data: { ...parsed.data, sortOrder: (last._max.sortOrder ?? 0) + 1 } });
  updateTag("categories");
  return { ok: true };
}

export async function setCategoryActive(categoryId: string, active: boolean): Promise<Result> {
  if (!(await getAdminUser()) || !id.safeParse(categoryId).success) return denied;
  await db.category.update({ where: { id: categoryId }, data: { isActive: active } });
  updateTag("categories");
  return { ok: true };
}
