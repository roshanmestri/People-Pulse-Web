import "server-only";

import { db } from "@/lib/db";

export function countPending(activityId: string) {
  return db.joinRequest.count({ where: { activityId, status: "PENDING" } });
}

/** Everything the host's manage page needs (null unless `hostId` owns the plan). */
export async function getManageData(activityId: string, hostId: string) {
  const activity = await db.activity.findUnique({
    where: { id: activityId },
    select: {
      id: true,
      title: true,
      hostId: true,
      status: true,
      startsAt: true,
      durationMinutes: true,
      maxPeople: true,
      joinMode: true,
      venueName: true,
      areaName: true,
      pricePerPerson: true,
      coverImage: true,
      category: { select: { slug: true } },
    },
  });
  if (!activity || activity.hostId !== hostId) return null;

  const requests = await db.joinRequest.findMany({
    where: { activityId, status: { in: ["PENDING", "APPROVED"] } },
    orderBy: [{ status: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      status: true,
      message: true,
      createdAt: true,
      user: {
        select: {
          name: true,
          username: true,
          image: true,
          homeAreaName: true,
          verifiedAt: true,
          createdAt: true,
          _count: {
            select: {
              hostedActivities: { where: { status: { not: "DRAFT" } } },
              joinRequests: { where: { status: "APPROVED" } },
            },
          },
        },
      },
    },
  });
  return { activity, requests };
}

const planSelect = {
  id: true,
  title: true,
  status: true,
  startsAt: true,
  durationMinutes: true,
  maxPeople: true,
  areaName: true,
  coverImage: true,
  category: { select: { slug: true } },
  _count: { select: { joinRequests: { where: { status: "APPROVED" as const } } } },
} as const;

/** The "My plans" tab: what I host, what I'm in, what I'm waiting on, and the past. */
export async function getMyPlans(userId: string, now: Date) {
  const [hosting, requests] = await Promise.all([
    db.activity.findMany({
      where: { hostId: userId },
      orderBy: { startsAt: "asc" },
      select: {
        ...planSelect,
        hostId: true,
        joinRequests: { where: { status: "PENDING" }, select: { id: true } },
      },
    }),
    db.joinRequest.findMany({
      where: { userId, status: { in: ["PENDING", "APPROVED"] } },
      orderBy: { activity: { startsAt: "asc" } },
      select: { status: true, activity: { select: planSelect } },
    }),
  ]);

  const ended = (a: { startsAt: Date; durationMinutes: number; status: string }) =>
    a.status === "CANCELLED" || a.startsAt.getTime() + a.durationMinutes * 60_000 <= now.getTime();

  return {
    hosting: hosting.filter((a) => !ended(a)),
    going: requests
      .filter((r) => r.status === "APPROVED" && !ended(r.activity))
      .map((r) => r.activity),
    waiting: requests
      .filter((r) => r.status === "PENDING" && !ended(r.activity))
      .map((r) => r.activity),
    past: [
      ...hosting.filter(ended).map((a) => ({ ...a, role: "Hosted" as const })),
      ...requests
        .filter((r) => r.status === "APPROVED" && ended(r.activity))
        .map((r) => ({ ...r.activity, role: "Went" as const })),
    ]
      .sort((a, b) => b.startsAt.getTime() - a.startsAt.getTime())
      .slice(0, 20),
  };
}
