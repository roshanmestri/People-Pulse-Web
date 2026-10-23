import { CalendarDays, Lock, MapPin, Share2, ShoppingBag, Wallet } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { VerifiedBadge } from "@/components/brand/verified-badge";
import { LazyPinMap } from "@/components/map/lazy-pin-map";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getActivity, getViewerRequest, type ActivityDetail } from "@/features/activity/queries";
import { JoinPanel, type ViewerState } from "@/features/join/components/join-panel";
import { countPending } from "@/features/join/queries";
import { categoryPhoto } from "@/lib/category-media";
import { approximate, canSeeExactVenue } from "@/lib/geo";
import { isAdmin, isBlockedEitherWay } from "@/features/safety/queries";
import { ReportButton } from "@/features/safety/components/report-button";
import { getSessionUser } from "@/lib/session";
import { effectiveStatus } from "@/lib/status";
import { formatDuration, formatLongDay, formatTime } from "@/lib/time";
import { cn, initials } from "@/lib/utils";

const SKILL: Record<string, string> = {
  ANY: "All levels",
  BEGINNER: "Beginner",
  INTERMEDIATE: "Intermediate",
  PRO: "Pro",
};
const STATUS: Record<string, string> = {
  DRAFT: "Draft — only you can see this",
  FULL: "Full",
  ONGOING: "Happening now",
  COMPLETED: "This plan is over",
  CANCELLED: "Cancelled by the host",
};

const coverOf = (a: ActivityDetail) =>
  a.coverImage ?? categoryPhoto(a.category.slug) ?? "/images/hero-football.jpg";

// SEO (BRD §6): server-rendered metadata + link-preview image. Area name only — never the venue.
export async function generateMetadata({
  params,
}: PageProps<"/activities/[id]">): Promise<Metadata> {
  const { id } = await params;
  const activity = await getActivity(id);
  if (!activity || activity.status === "DRAFT") return { title: "Plan not found" };
  const description = `${formatLongDay(activity.startsAt)}, ${formatTime(activity.startsAt)} · ${activity.areaName}. ${activity.description.slice(0, 120)}`;
  return {
    title: activity.title,
    description,
    openGraph: { title: activity.title, description, images: [{ url: coverOf(activity) }] },
  };
}

export default function ActivityPage({ params }: PageProps<"/activities/[id]">) {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col px-4 py-6 sm:px-8">
      <Suspense fallback={<div className="h-[700px] animate-pulse rounded-3xl bg-muted" />}>
        <ActivityContent params={params} />
      </Suspense>
    </div>
  );
}

async function ActivityContent({ params }: { params: PageProps<"/activities/[id]">["params"] }) {
  const { id } = await params;
  const [activity, viewer] = await Promise.all([getActivity(id), getSessionUser()]);
  if (!activity) notFound();

  const isHost = viewer?.id === activity.hostId;
  if (activity.status === "DRAFT" && !isHost) notFound();
  // Moderation (FR-8.3) and blocking (FR-8.2): the page simply doesn't exist for them.
  if (activity.hiddenAt && !(await isAdmin(viewer?.id))) notFound();
  if (viewer && !isHost && (await isBlockedEitherWay(viewer.id, activity.hostId))) notFound();

  const request = viewer && !isHost ? await getViewerRequest(id, viewer.id) : null;
  const approvedMember = request?.status === "APPROVED";
  const viewerState: ViewerState = !viewer ? "anon" : isHost ? "host" : (request?.status ?? "none");
  const pendingCount = isHost ? await countPending(id) : 0;
  // Time-aware status (FR-3.4): "Happening now" / "over" come from the clock.
  const phase = effectiveStatus(activity);
  const exact = canSeeExactVenue({
    viewerId: viewer?.id ?? null,
    hostId: activity.hostId,
    viewerIsApprovedMember: approvedMember,
    showExactVenue: activity.showExactVenue,
  });
  // Only these coordinates ever reach the browser.
  const mapCenter = exact
    ? { latitude: activity.latitude, longitude: activity.longitude }
    : approximate({ latitude: activity.latitude, longitude: activity.longitude });

  const going = activity.joinRequests.length;
  const spotsLeft = Math.max(activity.maxPeople - going, 0);
  const endsAt = new Date(activity.startsAt.getTime() + activity.durationMinutes * 60_000);
  const price = activity.pricePerPerson ? `₹${activity.pricePerPerson}` : "Free";

  return (
    <article className="flex flex-col gap-8">
      <div className="relative aspect-[16/9] max-h-[460px] w-full overflow-hidden rounded-[28px] bg-muted sm:aspect-[21/9]">
        <Image
          src={coverOf(activity)}
          alt=""
          fill
          loading="eager"
          fetchPriority="high"
          sizes="(min-width: 1152px) 1152px, 100vw"
          className="object-cover"
        />
        {STATUS[phase] ? (
          <span
            className={cn(
              "absolute top-4 left-4 rounded-full px-3.5 py-2 text-sm font-extrabold",
              phase === "CANCELLED" ? "bg-destructive text-white" : "bg-white text-[#0f0f10]",
            )}
          >
            {STATUS[phase]}
          </span>
        ) : null}
      </div>

      <div className="flex flex-wrap items-start gap-8">
        <div className="flex min-w-0 flex-[999_1_560px] flex-col gap-7">
          <header className="flex flex-col gap-3">
            <ul className="flex flex-wrap gap-2 text-xs font-extrabold">
              <li className="rounded-full bg-accent px-3 py-1.5 text-accent-foreground">
                {activity.category.name}
              </li>
              <li className="rounded-full bg-secondary px-3 py-1.5">
                {SKILL[activity.skillLevel]}
              </li>
              <li className="rounded-full bg-secondary px-3 py-1.5">
                {activity.joinMode === "OPEN" ? "Open — instant join" : "Request to join"}
              </li>
            </ul>
            <h1 className="text-3xl leading-[1.05] font-extrabold tracking-[-0.045em] sm:text-5xl">
              {activity.title}
            </h1>
          </header>

          <div className="grid gap-3 sm:grid-cols-2">
            <InfoTile icon={<CalendarDays className="size-5" aria-hidden="true" />} label="When">
              <strong className="text-lg font-extrabold tracking-[-0.02em]">
                {formatLongDay(activity.startsAt)}
              </strong>
              <span className="text-sm text-muted-foreground">
                {formatTime(activity.startsAt)} – {formatTime(endsAt)} ·{" "}
                {formatDuration(activity.durationMinutes)}
              </span>
            </InfoTile>
            <InfoTile icon={<MapPin className="size-5" aria-hidden="true" />} label="Where">
              <strong className="text-lg font-extrabold tracking-[-0.02em]">
                {exact ? activity.venueName : activity.areaName}
              </strong>
              <span className="text-sm text-muted-foreground">
                {exact ? activity.areaName : "Approximate area"}
              </span>
            </InfoTile>
          </div>

          <section aria-label="Map" className="flex flex-col gap-2">
            <div className="relative h-64 overflow-hidden rounded-3xl border">
              <LazyPinMap
                center={mapCenter}
                mode={exact ? "pin" : "approx"}
                zoom={exact ? 15 : 14}
              />
            </div>
            {!exact ? (
              <p className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <Lock className="size-4" aria-hidden="true" /> The exact venue is shared once
                you&apos;re in.
              </p>
            ) : null}
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-xl font-extrabold tracking-[-0.03em]">About</h2>
            <p className="leading-relaxed whitespace-pre-line text-foreground/85">
              {activity.description}
            </p>
          </section>

          {activity.whatToBring || activity.priceNote || activity.preferenceNote ? (
            <ul className="flex flex-col gap-2.5 rounded-3xl border p-5 text-[15px] font-semibold">
              {activity.whatToBring ? (
                <li className="flex gap-3">
                  <ShoppingBag className="size-5 shrink-0" aria-hidden="true" /> Bring:{" "}
                  {activity.whatToBring}
                </li>
              ) : null}
              {activity.priceNote ? (
                <li className="flex gap-3">
                  <Wallet className="size-5 shrink-0" aria-hidden="true" /> {price} ·{" "}
                  {activity.priceNote}
                </li>
              ) : null}
              {activity.preferenceNote ? (
                <li className="flex gap-3 text-muted-foreground">
                  Host&apos;s note: {activity.preferenceNote}
                </li>
              ) : null}
            </ul>
          ) : null}

          <section className="flex flex-col gap-3">
            <div className="flex items-baseline justify-between">
              <h2 className="text-xl font-extrabold tracking-[-0.03em]">Who&apos;s in</h2>
              <span
                className={cn(
                  "text-sm font-extrabold",
                  spotsLeft <= 2 && spotsLeft > 0 ? "text-brand-deep" : "text-muted-foreground",
                )}
              >
                {going} going ·{" "}
                {spotsLeft === 0
                  ? "full"
                  : `${spotsLeft} ${spotsLeft === 1 ? "spot" : "spots"} left`}
              </span>
            </div>
            <ul className="flex flex-wrap gap-4">
              <Person
                name={activity.host.name}
                image={activity.host.image}
                caption="Host"
                highlight
              />
              {activity.joinRequests.slice(0, 11).map(({ userId, user }) => (
                // First names only on public pages.
                <Person
                  key={userId}
                  name={user.name.split(" ")[0] ?? user.name}
                  image={user.image}
                />
              ))}
            </ul>
          </section>

          {activity.tags.length ? (
            <ul className="flex flex-wrap gap-2">
              {activity.tags.map(({ tag }) => (
                <li
                  key={tag}
                  className="rounded-full border px-3 py-1.5 text-sm font-semibold text-muted-foreground"
                >
                  #{tag}
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        {/* Join / host card */}
        <aside className="flex w-full flex-[1_1_320px] flex-col gap-4 lg:sticky lg:top-24 lg:max-w-sm">
          <div className="flex flex-col gap-4 rounded-3xl border bg-card p-5 shadow-[0_8px_24px_rgb(15_15_16/0.06)]">
            <div className="flex items-baseline justify-between">
              <strong className="text-3xl font-extrabold tracking-[-0.04em]">{price}</strong>
              <span className="text-sm text-muted-foreground">per person</span>
            </div>
            <div
              className="flex gap-1"
              role="img"
              aria-label={`${going} of ${activity.maxPeople} spots taken`}
            >
              {Array.from({ length: Math.min(activity.maxPeople, 12) }, (_, i) => (
                <span
                  key={i}
                  className={cn(
                    "h-2 flex-1 rounded-full",
                    i < Math.round((going / activity.maxPeople) * Math.min(activity.maxPeople, 12))
                      ? "bg-primary"
                      : "bg-secondary",
                  )}
                />
              ))}
            </div>
            <JoinPanel
              activityId={activity.id}
              joinMode={activity.joinMode}
              phase={phase}
              viewer={viewerState}
              spotsLeft={spotsLeft}
              pendingCount={pendingCount}
              hostFirstName={activity.host.name.split(" ")[0] ?? activity.host.name}
            />
          </div>

          <Link
            href={activity.host.username ? `/u/${activity.host.username}` : "#"}
            className="flex items-center gap-3 rounded-3xl bg-muted p-4"
          >
            <Avatar className="size-12">
              {activity.host.image ? <AvatarImage src={activity.host.image} alt="" /> : null}
              <AvatarFallback className="bg-accent font-extrabold text-accent-foreground">
                {initials(activity.host.name)}
              </AvatarFallback>
            </Avatar>
            <span className="flex min-w-0 flex-col">
              <span className="flex items-center gap-1.5">
                <strong className="truncate font-extrabold">{activity.host.name}</strong>
                {activity.host.verifiedAt ? <VerifiedBadge /> : null}
              </span>
              <span className="text-sm text-muted-foreground">
                Host · {activity.host._count.hostedActivities}{" "}
                {activity.host._count.hostedActivities === 1 ? "plan" : "plans"} hosted
              </span>
            </span>
          </Link>

          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Share2 className="size-4" aria-hidden="true" /> Share this page&apos;s link — previews
            show the area, never the venue.
          </p>
          {viewer && !isHost ? (
            <ReportButton targetType="ACTIVITY" targetId={activity.id} what="this plan" />
          ) : null}
        </aside>
      </div>
    </article>
  );
}

function InfoTile({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3 rounded-3xl bg-muted p-4">
      <span className="text-brand-deep">{icon}</span>
      <div className="flex flex-col">
        <span className="text-xs font-bold text-muted-foreground">{label}</span>
        {children}
      </div>
    </div>
  );
}

function Person({
  name,
  image,
  caption,
  highlight,
}: {
  name: string;
  image: string | null;
  caption?: string;
  highlight?: boolean;
}) {
  return (
    <li className="flex w-16 flex-col items-center gap-1 text-center">
      <Avatar
        className={cn(
          "size-14",
          highlight && "ring-2 ring-primary ring-offset-2 ring-offset-background",
        )}
      >
        {image ? <AvatarImage src={image} alt="" /> : null}
        <AvatarFallback className="bg-secondary font-extrabold">{initials(name)}</AvatarFallback>
      </Avatar>
      <span className="w-full truncate text-xs font-bold">{name}</span>
      {caption ? <span className="-mt-1 text-[11px] text-muted-foreground">{caption}</span> : null}
    </li>
  );
}
