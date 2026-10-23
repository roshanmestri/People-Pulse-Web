import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import { db } from "@/lib/db";

/**
 * Everything the detail page shows, cached per activity and refreshed by the
 * create/update/cancel actions via updateTag(`activity:<id>`).
 *
 * ⚠️ Includes the exact venue coordinates. They stay on the server: the page passes
 * them to the browser only when canSeeExactVenue() allows it.
 */
export async function getActivity(id: string) {
  "use cache";
  cacheLife("minutes");
  cacheTag(`activity:${id}`);
  return db.activity.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      description: true,
      startsAt: true,
      durationMinutes: true,
      minPeople: true,
      maxPeople: true,
      joinMode: true,
      skillLevel: true,
      status: true,
      pricePerPerson: true,
      priceNote: true,
      whatToBring: true,
      preferenceNote: true,
      coverImage: true,
      venueName: true,
      areaName: true,
      latitude: true,
      longitude: true,
      showExactVenue: true,
      hiddenAt: true,
      hostId: true,
      category: { select: { name: true, slug: true, icon: true } },
      tags: { select: { tag: true } },
      host: {
        select: {
          name: true,
          username: true,
          image: true,
          verifiedAt: true,
          _count: { select: { hostedActivities: { where: { status: { not: "DRAFT" } } } } },
        },
      },
      joinRequests: {
        where: { status: "APPROVED" },
        orderBy: { decidedAt: "asc" },
        select: { userId: true, user: { select: { name: true, username: true, image: true } } },
      },
    },
  });
}

export type ActivityDetail = NonNullable<Awaited<ReturnType<typeof getActivity>>>;

/** The host's own copy for the edit form (null if not found or not theirs). */
export async function getActivityForEdit(id: string, userId: string) {
  const activity = await db.activity.findUnique({
    where: { id },
    include: {
      tags: { select: { tag: true } },
      _count: { select: { joinRequests: { where: { status: "APPROVED" } } } },
    },
  });
  return activity && activity.hostId === userId ? activity : null;
}

/** The viewer's own request for this plan (not cached — it's personal). */
export async function getViewerRequest(activityId: string, userId: string) {
  return db.joinRequest.findUnique({
    where: { activityId_userId: { activityId, userId } },
    select: { status: true },
  });
}
