// Activity status as people should see it right now (BRD FR-3.4). The DB stores
// DRAFT / OPEN / FULL / CANCELLED; ONGOING and COMPLETED follow from the clock.

export type StoredStatus = "DRAFT" | "OPEN" | "FULL" | "ONGOING" | "COMPLETED" | "CANCELLED";

export function effectiveStatus(
  a: { status: StoredStatus; startsAt: Date; durationMinutes: number },
  now: Date = new Date(),
): StoredStatus {
  if (a.status === "DRAFT" || a.status === "CANCELLED" || a.status === "COMPLETED") return a.status;
  const end = a.startsAt.getTime() + a.durationMinutes * 60_000;
  if (now.getTime() >= end) return "COMPLETED";
  if (now.getTime() >= a.startsAt.getTime()) return "ONGOING";
  return a.status; // OPEN or FULL
}

/** Joining, leaving and approving only make sense before the plan starts. */
export function acceptsChanges(a: Parameters<typeof effectiveStatus>[0], now: Date = new Date()) {
  const s = effectiveStatus(a, now);
  return s === "OPEN" || s === "FULL";
}
