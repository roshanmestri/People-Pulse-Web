import { CalendarDays, Languages, MapPin } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { VerifiedBadge } from "@/components/brand/verified-badge";
import { CategoryIcon } from "@/components/category-icon";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getPublicProfile } from "@/features/profile/queries";
import { hasBlocked } from "@/features/safety/queries";
import { BlockButton } from "@/features/safety/components/block-button";
import { ReportButton } from "@/features/safety/components/report-button";
import { categoryPhoto } from "@/lib/category-media";
import { getSessionUser } from "@/lib/session";
import { initials } from "@/lib/utils";

const DATE = new Intl.DateTimeFormat("en-IN", {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "Asia/Kolkata",
});
const MONTH = new Intl.DateTimeFormat("en-IN", {
  month: "long",
  year: "numeric",
  timeZone: "Asia/Kolkata",
});

// Server-rendered public page (BRD FR-2.4) with SEO metadata from the same cached query.
export async function generateMetadata({ params }: PageProps<"/u/[username]">): Promise<Metadata> {
  const { username } = await params;
  const profile = await getPublicProfile(username);
  if (!profile) return { title: "Profile not found" };
  return {
    title: profile.name,
    description:
      profile.bio ||
      `${profile.name} on Gathr${profile.homeAreaName ? ` · ${profile.homeAreaName}` : ""}`,
  };
}

export default function PublicProfilePage({ params }: PageProps<"/u/[username]">) {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 py-8 sm:px-8">
      <Suspense fallback={<div className="h-72 animate-pulse rounded-3xl bg-muted" />}>
        <Profile params={params} />
      </Suspense>
    </div>
  );
}

async function Profile({ params }: { params: PageProps<"/u/[username]">["params"] }) {
  const { username } = await params;
  const [profile, viewer] = await Promise.all([getPublicProfile(username), getSessionUser()]);
  if (!profile) notFound();
  // FR-8.2: people this user blocked can't see their profile.
  if (viewer && viewer.id !== profile.id && (await hasBlocked(profile.id, viewer.id))) notFound();

  return (
    <>
      <header className="flex flex-col gap-5 rounded-3xl border bg-card p-6 sm:flex-row sm:items-center sm:p-8">
        <Avatar className="size-24">
          {profile.image ? <AvatarImage src={profile.image} alt="" /> : null}
          <AvatarFallback className="bg-primary text-3xl font-extrabold text-primary-foreground">
            {initials(profile.name)}
          </AvatarFallback>
        </Avatar>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <h1 className="flex items-center gap-2 text-3xl font-extrabold tracking-[-0.04em] sm:text-4xl">
            {profile.name}
            {profile.verifiedAt ? <VerifiedBadge className="size-7" /> : null}
          </h1>
          {profile.bio ? (
            <p className="max-w-xl leading-relaxed text-muted-foreground">{profile.bio}</p>
          ) : null}
          <ul className="flex flex-wrap gap-x-5 gap-y-1.5 text-sm font-semibold text-muted-foreground">
            {profile.homeAreaName ? (
              <li className="flex items-center gap-1.5">
                <MapPin className="size-4" aria-hidden="true" /> {profile.homeAreaName}
              </li>
            ) : null}
            {profile.languages.length ? (
              <li className="flex items-center gap-1.5">
                <Languages className="size-4" aria-hidden="true" /> {profile.languages.join(", ")}
              </li>
            ) : null}
            <li className="flex items-center gap-1.5">
              <CalendarDays className="size-4" aria-hidden="true" /> Member since{" "}
              {MONTH.format(profile.createdAt)}
            </li>
          </ul>
        </div>
        <div className="flex gap-3 sm:flex-col sm:text-right">
          <div className="rounded-2xl bg-muted px-5 py-3">
            <strong className="block text-2xl font-extrabold">
              {profile._count.hostedActivities}
            </strong>
            <span className="text-xs font-bold text-muted-foreground">plans hosted</span>
          </div>
        </div>
      </header>
      {viewer && viewer.id !== profile.id ? (
        <div className="-mt-4 flex flex-wrap justify-end gap-2">
          <ReportButton
            targetType="USER"
            targetId={profile.id}
            what={profile.name.split(" ")[0] ?? profile.name}
            variant="button"
          />
          <BlockButton userId={profile.id} name={profile.name.split(" ")[0] ?? profile.name} />
        </div>
      ) : null}

      {profile.interests.length ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-extrabold tracking-[-0.03em]">Into</h2>
          <ul className="flex flex-wrap gap-2">
            {profile.interests.map(({ category }) => (
              <li
                key={category.slug}
                className="flex items-center gap-2 rounded-full border bg-card px-4 py-2 text-sm font-bold"
              >
                <CategoryIcon name={category.icon} className="size-4 text-brand-deep" />
                {category.name}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-extrabold tracking-[-0.03em]">Upcoming plans</h2>
        {profile.hostedActivities.length ? (
          <ul className="grid gap-4 sm:grid-cols-2">
            {profile.hostedActivities.map((activity) => {
              const photo = categoryPhoto(activity.category.slug);
              return (
                <li key={activity.id} className="flex gap-3 rounded-2xl border bg-card p-2.5">
                  <div className="relative size-20 shrink-0 overflow-hidden rounded-xl bg-muted">
                    {photo ? (
                      <Image src={photo} alt="" fill sizes="80px" className="object-cover" />
                    ) : null}
                  </div>
                  <div className="flex min-w-0 flex-col justify-center gap-1">
                    <strong className="truncate font-extrabold">{activity.title}</strong>
                    <span className="text-sm text-muted-foreground">
                      {DATE.format(activity.startsAt)} · {activity.areaName}
                    </span>
                    <span className="text-sm font-extrabold">
                      {activity.pricePerPerson ? `₹${activity.pricePerPerson}` : "Free"}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="rounded-2xl bg-muted p-5 text-sm text-muted-foreground">
            No upcoming plans right now.
          </p>
        )}
      </section>
    </>
  );
}
