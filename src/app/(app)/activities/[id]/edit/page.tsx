import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { ActivityForm } from "@/features/activity/components/activity-form";
import { CancelActivityButton } from "@/features/activity/components/cancel-activity-button";
import { getActivityForEdit } from "@/features/activity/queries";
import type { ActivityInput } from "@/features/activity/schemas";
import { getCategories, getMyProfile } from "@/features/profile/queries";
import { db } from "@/lib/db";
import { requireSessionUser } from "@/lib/session";
import { utcToIstParts } from "@/lib/time";

export const metadata: Metadata = { title: "Edit plan" };

export default function EditActivityPage({ params }: PageProps<"/activities/[id]/edit">) {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-8">
      <Suspense fallback={<div className="h-[900px] animate-pulse rounded-3xl bg-muted" />}>
        <EditForm params={params} />
      </Suspense>
    </div>
  );
}

async function EditForm({ params }: { params: PageProps<"/activities/[id]/edit">["params"] }) {
  const { id } = await params;
  const user = await requireSessionUser(`/activities/${id}/edit`);
  const [activity, categories, profile] = await Promise.all([
    getActivityForEdit(id, user.id),
    getCategories(),
    getMyProfile(user.id),
  ]);
  // Not found *or* not yours → same 404 (don't reveal that someone else's plan exists).
  if (!activity) notFound();

  const locked = ["ONGOING", "COMPLETED", "CANCELLED"].includes(activity.status);
  const { date, time } = utcToIstParts(activity.startsAt);
  const defaults: ActivityInput = {
    title: activity.title,
    categoryId: activity.categoryId,
    description: activity.description,
    date,
    time,
    durationMinutes: activity.durationMinutes,
    minPeople: activity.minPeople,
    maxPeople: activity.maxPeople,
    joinMode: activity.joinMode,
    skillLevel: activity.skillLevel,
    pricePerPerson: activity.pricePerPerson,
    priceNote: activity.priceNote ?? "",
    whatToBring: activity.whatToBring ?? "",
    preferenceNote: activity.preferenceNote ?? "",
    tags: activity.tags.map((t) => t.tag),
    venue: {
      venueName: activity.venueName,
      areaName: activity.areaName,
      latitude: activity.latitude,
      longitude: activity.longitude,
    },
    hideExactVenue: !activity.showExactVenue,
  };
  const toNotify = await db.joinRequest.count({
    where: { activityId: id, status: { in: ["APPROVED", "PENDING"] } },
  });

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <Link href={`/activities/${id}`} className="text-sm font-bold text-brand-deep">
            ← Back to plan
          </Link>
          <h1 className="text-4xl font-extrabold tracking-[-0.045em]">Edit plan</h1>
          {activity._count.joinRequests ? (
            <p className="text-muted-foreground">
              {activity._count.joinRequests} people are in. Changing the time or venue notifies
              them.
            </p>
          ) : null}
        </div>
        {!locked ? <CancelActivityButton activityId={id} peopleToNotify={toNotify} /> : null}
      </div>
      {locked ? (
        <p className="rounded-2xl bg-muted p-5 font-semibold">
          This plan is {activity.status.toLowerCase()} and can&apos;t be edited.
        </p>
      ) : (
        <ActivityForm
          categories={categories}
          defaultValues={defaults}
          fallbackCenter={{ latitude: activity.latitude, longitude: activity.longitude }}
          host={{ name: profile?.name ?? "", verified: Boolean(profile?.verifiedAt) }}
          existing={{ id, status: activity.status, coverImage: activity.coverImage }}
        />
      )}
    </>
  );
}
