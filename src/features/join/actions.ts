"use server";

import { updateTag } from "next/cache";
import { z } from "zod";

import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/session";

import * as core from "./core";

// Thin Server Action wrappers: identify the caller from the session (never from input),
// validate input, run the transactional core, then refresh cached pages.

type ActionResult = { ok: true } | { ok: false; error: string };

const id = z.string().min(1).max(40);
const message = z.string().trim().max(280).nullable();

function done(result: core.JoinResult): ActionResult {
  if (!result.ok) return { ok: false, error: result.error };
  updateTag(`activity:${result.activityId}`); // detail page: spots + who's in
  updateTag("activities"); // Explore cards: spots left / FULL
  return { ok: true };
}

export async function joinActivity(activityId: string, note: string | null): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Please sign in first." };
  const input = z
    .object({ activityId: id, message })
    .safeParse({ activityId, message: note || null });
  if (!input.success) return { ok: false, error: "Keep your message under 280 characters." };
  return done(await core.requestToJoin(db, { ...input.data, userId: user.id }));
}

export async function withdrawFromActivity(activityId: string): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user || !id.safeParse(activityId).success)
    return { ok: false, error: "Please sign in first." };
  return done(await core.withdrawRequest(db, { activityId, userId: user.id }));
}

export async function leaveActivity(activityId: string): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user || !id.safeParse(activityId).success)
    return { ok: false, error: "Please sign in first." };
  return done(await core.leaveActivity(db, { activityId, userId: user.id }));
}

export async function decideJoinRequest(
  requestId: string,
  decision: "approve" | "reject",
): Promise<ActionResult> {
  const user = await getSessionUser();
  const input = z
    .object({ requestId: id, decision: z.enum(["approve", "reject"]) })
    .safeParse({ requestId, decision });
  if (!user || !input.success) return { ok: false, error: "Please sign in first." };
  return done(await core.decideRequest(db, { ...input.data, hostId: user.id }));
}

export async function removeFromActivity(requestId: string): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user || !id.safeParse(requestId).success)
    return { ok: false, error: "Please sign in first." };
  return done(await core.removeMember(db, { requestId, hostId: user.id }));
}
