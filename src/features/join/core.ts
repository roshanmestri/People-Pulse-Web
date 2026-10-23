import {
  JoinRequestStatus,
  NotificationType,
  type Prisma,
  type PrismaClient,
} from "@/generated/prisma/client";
import { acceptsChanges, type StoredStatus } from "@/lib/status";

// Join-flow rules (BRD FR-5). Every operation runs in ONE transaction that first locks the
// activity row (SELECT … FOR UPDATE). Two people racing for the last spot are handled one
// after the other: the second sees the updated count and is refused — no overbooking.
//
// No "server-only" import here on purpose: the concurrency test calls these directly.

type Tx = Prisma.TransactionClient;

export type JoinFailure =
  | "NOT_FOUND"
  | "IS_HOST"
  | "NOT_HOST"
  | "CLOSED"
  | "FULL"
  | "ALREADY"
  | "DECLINED"
  | "BLOCKED"
  | "RATE_LIMITED"
  | "BAD_STATE";

export type JoinResult =
  | { ok: true; activityId: string; status: JoinRequestStatus }
  | { ok: false; code: JoinFailure; error: string };

const fail = (code: JoinFailure, error: string): JoinResult => ({ ok: false, code, error });

/** Max join requests per user per hour (BRD §6: rate-limit join requests). */
export const JOIN_RATE_LIMIT = 10;

type LockedActivity = {
  id: string;
  hostId: string;
  title: string;
  status: StoredStatus;
  maxPeople: number;
  joinMode: "REQUEST" | "OPEN";
  startsAt: Date;
  durationMinutes: number;
};

async function lockActivity(tx: Tx, id: string): Promise<LockedActivity | null> {
  const rows = await tx.$queryRaw<LockedActivity[]>`
    SELECT id, "hostId", title, status::text AS status, "maxPeople", "joinMode"::text AS "joinMode",
           "startsAt", "durationMinutes"
    FROM "Activity" WHERE id = ${id}
    FOR UPDATE`;
  return rows[0] ?? null;
}

const approvedCount = (tx: Tx, activityId: string) =>
  tx.joinRequest.count({ where: { activityId, status: JoinRequestStatus.APPROVED } });

/** Keep OPEN ↔ FULL in step with the number of approved people. */
async function syncCapacity(tx: Tx, a: LockedActivity) {
  if (a.status !== "OPEN" && a.status !== "FULL") return;
  const next = (await approvedCount(tx, a.id)) >= a.maxPeople ? "FULL" : "OPEN";
  if (next !== a.status) await tx.activity.update({ where: { id: a.id }, data: { status: next } });
}

async function userName(tx: Tx, id: string) {
  return (await tx.user.findUnique({ where: { id }, select: { name: true } }))?.name ?? "Someone";
}

// ─── Member actions ──────────────────────────────────────────────────────

export async function requestToJoin(
  client: PrismaClient,
  input: { activityId: string; userId: string; message: string | null; now?: Date },
): Promise<JoinResult> {
  const now = input.now ?? new Date();
  return client.$transaction(async (tx) => {
    const recent = await tx.joinRequest.count({
      where: { userId: input.userId, createdAt: { gt: new Date(now.getTime() - 60 * 60_000) } },
    });
    if (recent >= JOIN_RATE_LIMIT)
      return fail("RATE_LIMITED", "You've sent a lot of requests — try again in an hour.");

    const a = await lockActivity(tx, input.activityId);
    if (!a || a.status === "DRAFT") return fail("NOT_FOUND", "This plan doesn't exist.");
    if (a.hostId === input.userId) return fail("IS_HOST", "You're hosting this plan.");
    if (!acceptsChanges(a, now))
      return fail("CLOSED", "This plan has already started, ended or been cancelled.");

    // FR-8.2: people the host blocked can't request to join.
    const blocked = await tx.block.findUnique({
      where: { blockerId_blockedId: { blockerId: a.hostId, blockedId: input.userId } },
    });
    if (blocked) return fail("BLOCKED", "You can't join this plan.");

    const existing = await tx.joinRequest.findUnique({
      where: { activityId_userId: { activityId: a.id, userId: input.userId } },
    });
    if (existing?.status === "PENDING") return fail("ALREADY", "You've already asked to join.");
    if (existing?.status === "APPROVED") return fail("ALREADY", "You're already in.");
    if (existing?.status === "REJECTED" || existing?.status === "REMOVED") {
      return fail("DECLINED", "The host didn't accept a request for this plan.");
    }
    // WITHDRAWN / LEFT (or no request yet) may ask again.

    const isOpen = a.joinMode === "OPEN";
    if ((await approvedCount(tx, a.id)) >= a.maxPeople) return fail("FULL", "This plan is full.");

    const status = isOpen ? JoinRequestStatus.APPROVED : JoinRequestStatus.PENDING;
    const data = { status, message: input.message, createdAt: now, decidedAt: isOpen ? now : null };
    await tx.joinRequest.upsert({
      where: { activityId_userId: { activityId: a.id, userId: input.userId } },
      create: { activityId: a.id, userId: input.userId, ...data },
      update: data,
    });
    await tx.notification.create({
      data: {
        userId: a.hostId,
        type: NotificationType.JOIN_REQUEST,
        payload: {
          activityId: a.id,
          title: a.title,
          actorName: await userName(tx, input.userId),
          joined: isOpen,
        },
      },
    });
    if (isOpen) await syncCapacity(tx, a);
    return { ok: true, activityId: a.id, status };
  });
}

export async function withdrawRequest(
  client: PrismaClient,
  input: { activityId: string; userId: string },
) {
  return memberTransition(client, input, "PENDING", JoinRequestStatus.WITHDRAWN);
}

export async function leaveActivity(
  client: PrismaClient,
  input: { activityId: string; userId: string; now?: Date },
) {
  return memberTransition(client, input, "APPROVED", JoinRequestStatus.LEFT);
}

async function memberTransition(
  client: PrismaClient,
  input: { activityId: string; userId: string; now?: Date },
  from: JoinRequestStatus,
  to: JoinRequestStatus,
): Promise<JoinResult> {
  return client.$transaction(async (tx) => {
    const a = await lockActivity(tx, input.activityId);
    if (!a) return fail("NOT_FOUND", "This plan doesn't exist.");
    if (!acceptsChanges(a, input.now ?? new Date()))
      return fail("CLOSED", "This plan has already started or ended.");
    const req = await tx.joinRequest.findUnique({
      where: { activityId_userId: { activityId: a.id, userId: input.userId } },
    });
    if (req?.status !== from) return fail("BAD_STATE", "Nothing to change — refresh the page.");
    await tx.joinRequest.update({ where: { id: req.id }, data: { status: to } });
    if (from === "APPROVED") await syncCapacity(tx, a); // a spot opened up
    return { ok: true, activityId: a.id, status: to };
  });
}

// ─── Host actions ────────────────────────────────────────────────────────

export async function decideRequest(
  client: PrismaClient,
  input: { requestId: string; hostId: string; decision: "approve" | "reject"; now?: Date },
): Promise<JoinResult> {
  const now = input.now ?? new Date();
  return client.$transaction(async (tx) => {
    const ref = await tx.joinRequest.findUnique({
      where: { id: input.requestId },
      select: { activityId: true },
    });
    if (!ref) return fail("NOT_FOUND", "That request no longer exists.");
    const a = await lockActivity(tx, ref.activityId);
    if (!a || a.hostId !== input.hostId) return fail("NOT_HOST", "Only the host can do that.");
    if (!acceptsChanges(a, now))
      return fail("CLOSED", "This plan has already started, ended or been cancelled.");

    // Re-read after taking the lock: another tab may have just decided it.
    const req = await tx.joinRequest.findUniqueOrThrow({ where: { id: input.requestId } });
    if (req.status !== "PENDING") return fail("BAD_STATE", "Already handled.");

    if (input.decision === "approve" && (await approvedCount(tx, a.id)) >= a.maxPeople) {
      return fail("FULL", "You're full — remove someone or add spots first.");
    }
    const status =
      input.decision === "approve" ? JoinRequestStatus.APPROVED : JoinRequestStatus.REJECTED;
    await tx.joinRequest.update({ where: { id: req.id }, data: { status, decidedAt: now } });
    await tx.notification.create({
      data: {
        userId: req.userId,
        type:
          status === "APPROVED"
            ? NotificationType.REQUEST_APPROVED
            : NotificationType.REQUEST_REJECTED,
        payload: { activityId: a.id, title: a.title, actorName: await userName(tx, a.hostId) },
      },
    });
    if (status === "APPROVED") await syncCapacity(tx, a);
    return { ok: true, activityId: a.id, status };
  });
}

export async function removeMember(
  client: PrismaClient,
  input: { requestId: string; hostId: string; now?: Date },
): Promise<JoinResult> {
  return client.$transaction(async (tx) => {
    const ref = await tx.joinRequest.findUnique({
      where: { id: input.requestId },
      select: { activityId: true },
    });
    if (!ref) return fail("NOT_FOUND", "That member no longer exists.");
    const a = await lockActivity(tx, ref.activityId);
    if (!a || a.hostId !== input.hostId) return fail("NOT_HOST", "Only the host can do that.");
    if (!acceptsChanges(a, input.now ?? new Date()))
      return fail("CLOSED", "This plan has already started or ended.");
    const req = await tx.joinRequest.findUniqueOrThrow({ where: { id: input.requestId } });
    if (req.status !== "APPROVED") return fail("BAD_STATE", "They're not in this plan.");
    await tx.joinRequest.update({
      where: { id: req.id },
      data: { status: JoinRequestStatus.REMOVED, decidedAt: new Date() },
    });
    await tx.notification.create({
      data: {
        userId: req.userId,
        type: NotificationType.REQUEST_REJECTED,
        payload: { activityId: a.id, title: a.title, removed: true },
      },
    });
    await syncCapacity(tx, a);
    return { ok: true, activityId: a.id, status: JoinRequestStatus.REMOVED };
  });
}

// ─── Blocking (FR-8.2) ───────────────────────────────────────────────────

/**
 * Quietly take `userId` out of every upcoming plan hosted by `hostId` (pending or in).
 * Each plan is changed under its row lock, so freed spots are counted correctly.
 * Returns the ids of plans that changed.
 */
export async function evictFromHostPlans(
  client: PrismaClient,
  input: { hostId: string; userId: string; now?: Date },
): Promise<string[]> {
  const now = input.now ?? new Date();
  const requests = await client.joinRequest.findMany({
    where: {
      userId: input.userId,
      status: { in: ["PENDING", "APPROVED"] },
      activity: { hostId: input.hostId },
    },
    select: { id: true, activityId: true },
  });
  const changed: string[] = [];
  for (const r of requests) {
    await client.$transaction(async (tx) => {
      const a = await lockActivity(tx, r.activityId);
      if (!a || !acceptsChanges(a, now)) return;
      const req = await tx.joinRequest.findUnique({ where: { id: r.id } });
      if (req?.status !== "PENDING" && req?.status !== "APPROVED") return;
      await tx.joinRequest.update({
        where: { id: r.id },
        data: { status: JoinRequestStatus.REMOVED, decidedAt: now },
      });
      if (req.status === "APPROVED") await syncCapacity(tx, a);
      changed.push(a.id);
    });
  }
  return changed;
}
