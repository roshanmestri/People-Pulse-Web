"use server";

import { updateTag } from "next/cache";

import { ActivityStatus, NotificationType, type Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { processImage } from "@/lib/images";
import { getSessionUser } from "@/lib/session";
import { deleteImage, saveImage } from "@/lib/storage";
import { istToUtc } from "@/lib/time";

import { activitySchema, type ActivityActionResult, type ActivityInput } from "./schemas";

// Server Actions are public endpoints: every one re-checks the session, ownership and
// input (same Zod schema as the form) before touching the database.

type Intent = "publish" | "draft";

/** The form sends FormData: `data` (JSON of the fields), optional `cover` file, `removeCover`. */
function readForm(formData: FormData) {
  let raw: unknown = null;
  try {
    raw = JSON.parse(String(formData.get("data") ?? "null"));
  } catch {
    // fall through to schema error
  }
  const cover = formData.get("cover");
  return {
    parsed: activitySchema.safeParse(raw),
    cover: cover instanceof File && cover.size > 0 ? cover : null,
    removeCover: formData.get("removeCover") === "true",
  };
}

function invalid(error: {
  issues: { path: PropertyKey[]; message: string }[];
}): ActivityActionResult {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) fieldErrors[String(issue.path[0])] ??= issue.message;
  return { ok: false, error: "Please fix the highlighted fields.", fieldErrors };
}

async function storeCover(cover: File | null) {
  if (!cover) return { ok: true as const, url: null };
  const image = await processImage(cover, 1600);
  if (!image.ok) return image;
  return { ok: true as const, url: await saveImage("covers", image.data) };
}

function toActivityData(data: ActivityInput) {
  const venue = data.venue!; // schema guarantees a venue
  return {
    title: data.title,
    description: data.description,
    categoryId: data.categoryId,
    startsAt: istToUtc(data.date, data.time),
    durationMinutes: data.durationMinutes,
    minPeople: data.minPeople,
    maxPeople: data.maxPeople,
    joinMode: data.joinMode,
    skillLevel: data.skillLevel,
    pricePerPerson: data.pricePerPerson,
    priceNote: data.priceNote || null,
    whatToBring: data.whatToBring || null,
    preferenceNote: data.preferenceNote || null,
    venueName: venue.venueName,
    areaName: venue.areaName,
    latitude: venue.latitude,
    longitude: venue.longitude,
    showExactVenue: !data.hideExactVenue,
  };
}

async function hostUsername(userId: string) {
  const host = await db.user.findUnique({ where: { id: userId }, select: { username: true } });
  return host?.username ?? null;
}

export async function createActivity(
  formData: FormData,
  intent: Intent,
): Promise<ActivityActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Please sign in again." };

  const { parsed, cover } = readForm(formData);
  if (!parsed.success) return invalid(parsed.error);

  const category = await db.category.findFirst({
    where: { id: parsed.data.categoryId, isActive: true },
  });
  if (!category)
    return { ok: false, error: "Pick a category.", fieldErrors: { categoryId: "Pick a category" } };

  const stored = await storeCover(cover);
  if (!stored.ok) return { ok: false, error: stored.error, fieldErrors: { cover: stored.error } };

  const activity = await db.activity.create({
    data: {
      ...toActivityData(parsed.data),
      hostId: user.id,
      coverImage: stored.url,
      status: intent === "draft" ? ActivityStatus.DRAFT : ActivityStatus.OPEN,
      tags: { create: [...new Set(parsed.data.tags)].map((tag) => ({ tag })) },
    },
    select: { id: true },
  });

  updateTag("activities"); // Explore results
  const username = await hostUsername(user.id);
  if (username) updateTag(`user:${username}`);
  return { ok: true, id: activity.id };
}

export async function updateActivity(
  id: string,
  formData: FormData,
  intent: Intent,
): Promise<ActivityActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Please sign in again." };

  const existing = await db.activity.findUnique({
    where: { id },
    select: {
      hostId: true,
      title: true,
      status: true,
      startsAt: true,
      venueName: true,
      latitude: true,
      longitude: true,
      coverImage: true,
      joinRequests: { where: { status: "APPROVED" }, select: { userId: true } },
    },
  });
  if (!existing || existing.hostId !== user.id)
    return { ok: false, error: "You can only edit your own plans." };
  if (["ONGOING", "COMPLETED", "CANCELLED"].includes(existing.status)) {
    return { ok: false, error: "This plan can't be edited any more." };
  }

  const { parsed, cover, removeCover } = readForm(formData);
  if (!parsed.success) return invalid(parsed.error);

  const approved = existing.joinRequests.map((r) => r.userId);
  if (parsed.data.maxPeople < approved.length) {
    const message = `${approved.length} people are already in — spots can't go below that`;
    return { ok: false, error: message, fieldErrors: { maxPeople: message } };
  }

  const stored = await storeCover(cover);
  if (!stored.ok) return { ok: false, error: stored.error, fieldErrors: { cover: stored.error } };
  const coverImage = stored.url ?? (removeCover ? null : existing.coverImage);

  const data = toActivityData(parsed.data);
  let status = existing.status;
  if (status === "DRAFT" && intent === "publish") status = ActivityStatus.OPEN;
  if (status === "OPEN" || status === "FULL") {
    status = approved.length >= data.maxPeople ? ActivityStatus.FULL : ActivityStatus.OPEN;
  }

  // FR-3.2: tell approved members when the time or venue changes.
  const timeOrVenueChanged =
    data.startsAt.getTime() !== existing.startsAt.getTime() ||
    data.venueName !== existing.venueName ||
    data.latitude !== existing.latitude ||
    data.longitude !== existing.longitude;
  const notifications: Prisma.NotificationCreateManyInput[] =
    timeOrVenueChanged && existing.status !== "DRAFT"
      ? approved.map((userId) => ({
          userId,
          type: NotificationType.ACTIVITY_UPDATED,
          payload: { activityId: id, title: data.title, changed: "time-or-venue" },
        }))
      : [];

  await db.$transaction([
    db.activityTag.deleteMany({ where: { activityId: id } }),
    db.activity.update({
      where: { id },
      data: {
        ...data,
        status,
        coverImage,
        tags: { create: [...new Set(parsed.data.tags)].map((tag) => ({ tag })) },
      },
    }),
    db.notification.createMany({ data: notifications }),
  ]);

  if (coverImage !== existing.coverImage) await deleteImage(existing.coverImage);
  updateTag(`activity:${id}`);
  updateTag("activities"); // Explore results
  const username = await hostUsername(user.id);
  if (username) updateTag(`user:${username}`);
  return { ok: true, id };
}

/** FR-3.3: host cancels; everyone approved or waiting is notified. */
export async function cancelActivity(id: string): Promise<ActivityActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Please sign in again." };

  const activity = await db.activity.findUnique({
    where: { id },
    select: {
      hostId: true,
      title: true,
      status: true,
      joinRequests: {
        where: { status: { in: ["APPROVED", "PENDING"] } },
        select: { userId: true },
      },
    },
  });
  if (!activity || activity.hostId !== user.id)
    return { ok: false, error: "You can only cancel your own plans." };
  if (activity.status === "CANCELLED" || activity.status === "COMPLETED") {
    return { ok: false, error: "This plan is already over." };
  }

  await db.$transaction([
    db.activity.update({ where: { id }, data: { status: ActivityStatus.CANCELLED } }),
    db.notification.createMany({
      data: activity.joinRequests.map(({ userId }) => ({
        userId,
        type: NotificationType.ACTIVITY_CANCELLED,
        payload: { activityId: id, title: activity.title },
      })),
    }),
  ]);

  updateTag(`activity:${id}`);
  updateTag("activities"); // Explore results
  const username = await hostUsername(user.id);
  if (username) updateTag(`user:${username}`);
  return { ok: true, id };
}
