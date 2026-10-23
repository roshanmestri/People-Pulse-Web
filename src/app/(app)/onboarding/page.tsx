import type { Metadata } from "next";
import { Suspense } from "react";

import { ProfileForm } from "@/features/profile/components/profile-form";
import { toFormDefaults } from "@/features/profile/form-defaults";
import { getCategories, getMyProfile } from "@/features/profile/queries";
import { requireSessionUser } from "@/lib/session";

export const metadata: Metadata = { title: "Set up your profile" };

export default function OnboardingPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:px-8">
      <div className="flex flex-col gap-2">
        <span className="text-sm font-bold text-brand-deep">Welcome to Gathr</span>
        <h1 className="text-4xl leading-[1.05] font-extrabold tracking-[-0.045em]">
          Let&apos;s set you up
        </h1>
        <p className="text-muted-foreground">
          Takes a minute. Hosts see this when you ask to join their plan.
        </p>
      </div>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-3xl bg-muted" />}>
        <OnboardingForm />
      </Suspense>
    </div>
  );
}

async function OnboardingForm() {
  const user = await requireSessionUser("/onboarding");
  const [profile, categories] = await Promise.all([getMyProfile(user.id), getCategories()]);
  if (!profile) return null;
  return (
    <ProfileForm
      categories={categories}
      defaultValues={toFormDefaults(profile)}
      submitLabel="Finish & explore"
      redirectTo="/explore"
    />
  );
}
