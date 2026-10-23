"use server";

import { updateTag } from "next/cache";

import { db } from "@/lib/db";
import { processImage } from "@/lib/images";
import { getSessionUser } from "@/lib/session";
import { deleteImage, saveImage } from "@/lib/storage";

import { profileSchema, type ActionResult, type ProfileInput } from "./schemas";
import { nextVerifiedAt } from "./verification";

/**
 * Server Action: anyone can call this endpoint, so it re-validates input with the
 * same Zod schema the form uses and only ever updates the signed-in user's row.
 */
export async function saveProfile(input: ProfileInput): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Please sign in again." };

  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] ??= issue.message;
    return { ok: false, error: "Please fix the highlighted fields.", fieldErrors };
  }
  const data = parsed.data;

  const taken = await db.user.findFirst({
    where: { username: data.username, NOT: { id: user.id } },
    select: { id: true },
  });
  if (taken)
    return {
      ok: false,
      error: "That username is taken.",
      fieldErrors: { username: "That username is taken" },
    };

  const validCategories = await db.category.count({
    where: { id: { in: data.interestIds }, isActive: true },
  });
  if (validCategories !== data.interestIds.length)
    return { ok: false, error: "Unknown interest selected." };

  const current = await db.user.findUniqueOrThrow({
    where: { id: user.id },
    select: {
      username: true,
      image: true,
      emailVerified: true,
      verifiedAt: true,
      verificationRevokedAt: true,
    },
  });

  const verifiedAt = nextVerifiedAt(
    {
      emailVerified: current.emailVerified,
      name: data.name,
      image: current.image,
      bio: data.bio,
      homeAreaName: data.home?.areaName ?? null,
      interestCount: data.interestIds.length,
      verificationRevokedAt: current.verificationRevokedAt,
    },
    current.verifiedAt,
  );

  // One transaction: profile fields + the interests list are replaced together.
  await db.$transaction([
    db.interest.deleteMany({ where: { userId: user.id } }),
    db.interest.createMany({
      data: data.interestIds.map((categoryId) => ({ userId: user.id, categoryId })),
    }),
    db.user.update({
      where: { id: user.id },
      data: {
        name: data.name,
        username: data.username,
        bio: data.bio || null,
        ageRange: data.ageRange,
        languages: data.languages,
        homeAreaName: data.home?.areaName ?? null,
        homeLatitude: data.home?.latitude ?? null,
        homeLongitude: data.home?.longitude ?? null,
        verifiedAt,
      },
    }),
  ]);

  updateTag(`user:${data.username}`);
  if (current.username && current.username !== data.username) updateTag(`user:${current.username}`);
  return { ok: true };
}

/** Profile photo upload (FormData with `photo`). Re-checks the verified badge afterwards. */
export async function uploadAvatar(formData: FormData): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Please sign in again." };
  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0)
    return { ok: false, error: "Choose a photo first." };

  const image = await processImage(file, 512, { square: true });
  if (!image.ok) return { ok: false, error: image.error };
  const url = await saveImage("avatars", image.data);

  const current = await db.user.findUniqueOrThrow({
    where: { id: user.id },
    select: {
      image: true,
      name: true,
      bio: true,
      username: true,
      homeAreaName: true,
      emailVerified: true,
      verifiedAt: true,
      verificationRevokedAt: true,
      _count: { select: { interests: true } },
    },
  });
  const verifiedAt = nextVerifiedAt(
    {
      emailVerified: current.emailVerified,
      name: current.name,
      image: url,
      bio: current.bio,
      homeAreaName: current.homeAreaName,
      interestCount: current._count.interests,
      verificationRevokedAt: current.verificationRevokedAt,
    },
    current.verifiedAt,
  );
  await db.user.update({ where: { id: user.id }, data: { image: url, verifiedAt } });
  await deleteImage(current.image); // only removes files we stored (not Google photos)

  if (current.username) updateTag(`user:${current.username}`);
  return { ok: true };
}
