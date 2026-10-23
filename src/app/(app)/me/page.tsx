import { CheckCircle2, Circle } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { VerifiedBadge } from "@/components/brand/verified-badge";
import { AccountActions } from "@/features/profile/components/account-actions";
import { AvatarUpload } from "@/features/profile/components/avatar-upload";
import { ProfileForm } from "@/features/profile/components/profile-form";
import { toFormDefaults } from "@/features/profile/form-defaults";
import { getCategories, getMyProfile } from "@/features/profile/queries";
import { verificationChecklist } from "@/features/profile/verification";
import { requireSessionUser } from "@/lib/session";

export const metadata: Metadata = { title: "Your profile" };

export default function MePage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:px-8">
      <Suspense fallback={<div className="h-[600px] animate-pulse rounded-3xl bg-muted" />}>
        <MeContent />
      </Suspense>
    </div>
  );
}

async function MeContent() {
  const user = await requireSessionUser("/me");
  const [profile, categories] = await Promise.all([getMyProfile(user.id), getCategories()]);
  if (!profile) return null;

  const checklist = verificationChecklist({
    emailVerified: profile.emailVerified,
    name: profile.name,
    image: profile.image,
    bio: profile.bio,
    homeAreaName: profile.homeAreaName,
    interestCount: profile.interests.length,
    verificationRevokedAt: profile.verificationRevokedAt,
  });
  const done = checklist.filter((item) => item.done).length;

  return (
    <>
      <header className="flex flex-wrap items-center gap-4">
        <AvatarUpload name={profile.name || profile.email} image={profile.image} />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h1 className="flex items-center gap-2 text-3xl font-extrabold tracking-[-0.04em]">
            {profile.name || "Your profile"}
            {profile.verifiedAt ? <VerifiedBadge className="size-6" /> : null}
          </h1>
          <p className="text-sm text-muted-foreground">
            {profile.email}
            {profile.homeAreaName ? ` · ${profile.homeAreaName}` : ""}
          </p>
        </div>
        {profile.username ? (
          <Link
            href={`/u/${profile.username}`}
            className="basis-full rounded-full border px-4 py-2.5 text-center text-sm font-bold sm:basis-auto"
          >
            View public profile
          </Link>
        ) : null}
      </header>

      {profile.verificationRevokedAt ? (
        <p
          role="alert"
          className="rounded-2xl bg-destructive/10 p-4 text-sm font-semibold text-destructive"
        >
          Your verified badge was removed
          {profile.verificationRevokedReason ? `: ${profile.verificationRevokedReason}` : "."}{" "}
          Contact support if you think this is a mistake.
        </p>
      ) : profile.verifiedAt ? null : (
        <section className="flex flex-col gap-3 rounded-3xl bg-accent p-5 sm:p-6">
          <div className="flex items-center gap-2">
            <VerifiedBadge className="size-5" />
            <h2 className="font-extrabold">
              Get your verified badge · {done}/{checklist.length}
            </h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Verified hosts get more requests. Finish these and the badge appears automatically.
          </p>
          <ul className="grid gap-2 sm:grid-cols-2">
            {checklist.map((item) => (
              <li key={item.label} className="flex items-center gap-2 text-sm font-semibold">
                {item.done ? (
                  <CheckCircle2 className="size-5 text-brand-deep" aria-hidden="true" />
                ) : (
                  <Circle className="size-5 text-muted-foreground" aria-hidden="true" />
                )}
                <span className={item.done ? "text-muted-foreground line-through" : undefined}>
                  {item.label}
                </span>
                <span className="sr-only">{item.done ? "(done)" : "(to do)"}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <ProfileForm
        categories={categories}
        defaultValues={toFormDefaults(profile)}
        submitLabel="Save profile"
      />
      <AccountActions />
    </>
  );
}
