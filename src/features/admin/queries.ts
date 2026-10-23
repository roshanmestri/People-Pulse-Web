import "server-only";

import type { ReportStatus } from "@/generated/prisma/client";
import { db } from "@/lib/db";

export type ReportTarget =
  | {
      kind: "USER";
      id: string;
      label: string;
      href: string | null;
      extra: string;
      suspended: boolean;
    }
  | {
      kind: "ACTIVITY";
      id: string;
      label: string;
      href: string;
      extra: string;
      hidden: boolean;
      hostId: string;
    }
  | {
      kind: "MESSAGE";
      id: string;
      label: string;
      href: string;
      extra: string;
      hidden: boolean;
      senderId: string;
    }
  | { kind: "GONE"; id: string; label: string; href: null; extra: string };

/** The moderation queue (FR-8.3), with a preview of what each report points at. */
export async function listReports(status: ReportStatus | "RESOLVED") {
  const reports = await db.report.findMany({
    where:
      status === "RESOLVED"
        ? { status: { in: ["REVIEWED", "ACTIONED", "DISMISSED"] } }
        : { status },
    orderBy: { createdAt: status === "OPEN" ? "asc" : "desc" },
    take: 100,
    select: {
      id: true,
      targetType: true,
      targetId: true,
      reason: true,
      details: true,
      status: true,
      createdAt: true,
      resolvedAt: true,
      reporter: { select: { name: true, username: true } },
    },
  });

  const ids = (type: string) => reports.filter((r) => r.targetType === type).map((r) => r.targetId);
  const [users, activities, messages, counts] = await Promise.all([
    db.user.findMany({
      where: { id: { in: ids("USER") } },
      select: { id: true, name: true, username: true, email: true, suspendedAt: true },
    }),
    db.activity.findMany({
      where: { id: { in: ids("ACTIVITY") } },
      select: {
        id: true,
        title: true,
        hiddenAt: true,
        hostId: true,
        host: { select: { name: true } },
      },
    }),
    db.message.findMany({
      where: { id: { in: ids("MESSAGE") } },
      select: {
        id: true,
        body: true,
        hiddenAt: true,
        activityId: true,
        sender: { select: { id: true, name: true } },
      },
    }),
    // How many open reports each target has (repeat reports = stronger signal).
    db.report.groupBy({ by: ["targetType", "targetId"], where: { status: "OPEN" }, _count: true }),
  ]);
  const countOf = (type: string, id: string) =>
    counts.find((c) => c.targetType === type && c.targetId === id)?._count ?? 0;

  return reports.map((r) => {
    let target: ReportTarget = {
      kind: "GONE",
      id: r.targetId,
      label: "Deleted",
      href: null,
      extra: "",
    };
    if (r.targetType === "USER") {
      const u = users.find((x) => x.id === r.targetId);
      if (u)
        target = {
          kind: "USER",
          id: u.id,
          label: u.name,
          href: u.username ? `/u/${u.username}` : null,
          extra: u.email,
          suspended: Boolean(u.suspendedAt),
        };
    } else if (r.targetType === "ACTIVITY") {
      const a = activities.find((x) => x.id === r.targetId);
      if (a)
        target = {
          kind: "ACTIVITY",
          id: a.id,
          label: a.title,
          href: `/activities/${a.id}`,
          extra: `Hosted by ${a.host.name}`,
          hidden: Boolean(a.hiddenAt),
          hostId: a.hostId,
        };
    } else {
      const m = messages.find((x) => x.id === r.targetId);
      if (m)
        target = {
          kind: "MESSAGE",
          id: m.id,
          label: `“${m.body}”`,
          href: `/activities/${m.activityId}/chat`,
          extra: `Sent by ${m.sender.name}`,
          hidden: Boolean(m.hiddenAt),
          senderId: m.sender.id,
        };
    }
    return { ...r, target, openReports: countOf(r.targetType, r.targetId) };
  });
}

export function searchUsers(q: string) {
  const term = q.trim();
  return db.user.findMany({
    where: term
      ? {
          OR: [
            { name: { contains: term, mode: "insensitive" } },
            { email: { contains: term, mode: "insensitive" } },
            { username: { contains: term, mode: "insensitive" } },
          ],
        }
      : {
          OR: [
            { suspendedAt: { not: null } },
            { verificationRevokedAt: { not: null } },
            { role: "ADMIN" },
          ],
        },
    orderBy: { createdAt: "desc" },
    take: 30,
    select: {
      id: true,
      name: true,
      email: true,
      username: true,
      role: true,
      suspendedAt: true,
      verifiedAt: true,
      verificationRevokedAt: true,
      verificationRevokedReason: true,
      createdAt: true,
      _count: { select: { hostedActivities: true } },
    },
  });
}

export function listAllCategories() {
  return db.category.findMany({
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      slug: true,
      name: true,
      icon: true,
      isActive: true,
      _count: { select: { activities: true } },
    },
  });
}
