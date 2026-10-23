import type { Metadata } from "next";
import { Suspense } from "react";

import { ActivityForm } from "@/features/activity/components/activity-form";
import type { ActivityInput } from "@/features/activity/schemas";
import { getCategories, getMyProfile } from "@/features/profile/queries";
import { requireSessionUser } from "@/lib/session";
import { tomorrowInIst } from "@/lib/time";

export const metadata: Metadata = { title: "Host a plan" };

const PUNE = { latitude: 18.5204, longitude: 73.8567 };

export default function NewActivityPage() {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-8">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-4xl font-extrabold tracking-[-0.045em]">Host a plan</h1>
        <p className="text-muted-foreground">
          Takes under a minute. You can edit everything later.
        </p>
      </div>
      <Suspense fallback={<div className="h-[900px] animate-pulse rounded-3xl bg-muted" />}>
        <NewActivityForm />
      </Suspense>
    </div>
  );
}

async function NewActivityForm() {
  const user = await requireSessionUser("/activities/new");
  const [profile, categories] = await Promise.all([getMyProfile(user.id), getCategories()]);

  // Default: tomorrow at 7 PM IST.
  const tomorrow = tomorrowInIst();
  const defaults: ActivityInput = {
    title: "",
    categoryId: profile?.interests[0]?.categoryId ?? "",
    description: "",
    date: tomorrow,
    time: "19:00",
    durationMinutes: 90,
    minPeople: 1,
    maxPeople: 4,
    joinMode: "REQUEST",
    skillLevel: "ANY",
    pricePerPerson: 0,
    priceNote: "",
    whatToBring: "",
    preferenceNote: "",
    tags: [],
    venue: null,
    hideExactVenue: true,
  };

  return (
    <ActivityForm
      categories={categories}
      defaultValues={defaults}
      fallbackCenter={
        profile?.homeLatitude != null && profile.homeLongitude != null
          ? { latitude: profile.homeLatitude, longitude: profile.homeLongitude }
          : PUNE
      }
      host={{ name: profile?.name ?? "", verified: Boolean(profile?.verifiedAt) }}
    />
  );
}
