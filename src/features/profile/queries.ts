import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import { db } from "@/lib/db";

/** Categories change rarely → cache across requests for hours. */
export async function getCategories() {
  "use cache";
  cacheLife("hours");
  cacheTag("categories");
  return db.category.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    select: { id: true, slug: true, name: true, icon: true },
  });
}

/** The signed-in user's own profile (private fields included). Not cached: always fresh. */
export async function getMyProfile(userId: string) {
  return db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      emailVerified: true,
      image: true,
      username: true,
      bio: true,
      ageRange: true,
      languages: true,
      homeAreaName: true,
      homeLatitude: true,
      homeLongitude: true,
      verifiedAt: true,
      verificationRevokedAt: true,
      verificationRevokedReason: true,
      interests: { select: { categoryId: true } },
    },
  });
}

/**
 * Public profile (BRD FR-2.4). Only public fields — never email or coordinates.
 * Cached per username; the profile Server Action calls updateTag(`user:${username}`).
 */
export async function getPublicProfile(username: string) {
  "use cache";
  cacheLife("minutes");
  cacheTag(`user:${username}`);
  const user = await db.user.findUnique({
    where: { username },
    select: {
      id: true,
      name: true,
      username: true,
      image: true,
      bio: true,
      languages: true,
      homeAreaName: true,
      verifiedAt: true,
      createdAt: true,
      suspendedAt: true,
      interests: { select: { category: { select: { name: true, slug: true, icon: true } } } },
      _count: { select: { hostedActivities: { where: { status: { not: "DRAFT" } } } } },
      hostedActivities: {
        where: { status: { in: ["OPEN", "FULL"] }, hiddenAt: null },
        orderBy: { startsAt: "asc" },
        take: 4,
        select: {
          id: true,
          title: true,
          startsAt: true,
          areaName: true,
          pricePerPerson: true,
          category: { select: { name: true, slug: true } },
        },
      },
    },
  });
  if (!user || user.suspendedAt) return null;
  return user;
}
