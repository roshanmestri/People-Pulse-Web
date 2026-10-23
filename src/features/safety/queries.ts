import "server-only";

import { db } from "@/lib/db";

/**
 * People whose content this viewer shouldn't see, in either direction (FR-8.2):
 * those who blocked the viewer and those the viewer blocked. Sorted so it makes a
 * stable cache key (empty for almost everyone → shared cache entries).
 */
export async function hiddenUserIds(viewerId: string | null): Promise<string[]> {
  if (!viewerId) return [];
  const rows = await db.block.findMany({
    where: { OR: [{ blockerId: viewerId }, { blockedId: viewerId }] },
    select: { blockerId: true, blockedId: true },
  });
  const ids = new Set(rows.map((r) => (r.blockerId === viewerId ? r.blockedId : r.blockerId)));
  return [...ids].sort();
}

export async function isBlockedEitherWay(a: string, b: string) {
  const count = await db.block.count({
    where: {
      OR: [
        { blockerId: a, blockedId: b },
        { blockerId: b, blockedId: a },
      ],
    },
  });
  return count > 0;
}

export async function hasBlocked(blockerId: string, blockedId: string) {
  return (await db.block.count({ where: { blockerId, blockedId } })) > 0;
}

export function listBlocked(userId: string) {
  return db.block.findMany({
    where: { blockerId: userId },
    orderBy: { createdAt: "desc" },
    select: { blocked: { select: { id: true, name: true, username: true, image: true } } },
  });
}

export async function isAdmin(userId: string | null | undefined) {
  if (!userId) return false;
  const row = await db.user.findUnique({ where: { id: userId }, select: { role: true } });
  return row?.role === "ADMIN";
}
