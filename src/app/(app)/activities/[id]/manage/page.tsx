import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { VerifiedBadge } from "@/components/brand/verified-badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DecideButtons, RemoveButton } from "@/features/join/components/request-actions";
import { getManageData } from "@/features/join/queries";
import { categoryPhoto } from "@/lib/category-media";
import { requireSessionUser } from "@/lib/session";
import { effectiveStatus } from "@/lib/status";
import { formatDay, formatTime } from "@/lib/time";
import { cn, initials } from "@/lib/utils";

export const metadata: Metadata = { title: "Manage requests" };

const AGO = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
function ago(date: Date, now: Date) {
  const minutes = Math.round((date.getTime() - now.getTime()) / 60_000);
  if (Math.abs(minutes) < 60) return AGO.format(minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return AGO.format(hours, "hour");
  return AGO.format(Math.round(hours / 24), "day");
}

export default function ManagePage({ params }: PageProps<"/activities/[id]/manage">) {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-8">
      <Suspense fallback={<div className="h-[600px] animate-pulse rounded-3xl bg-muted" />}>
        <Manage params={params} />
      </Suspense>
    </div>
  );
}

async function Manage({ params }: { params: PageProps<"/activities/[id]/manage">["params"] }) {
  const { id } = await params;
  const user = await requireSessionUser(`/activities/${id}/manage`);
  const data = await getManageData(id, user.id);
  if (!data) notFound(); // not found *or* not your plan → same 404

  const { activity, requests } = data;
  const now = new Date();
  const phase = effectiveStatus(activity, now);
  const pending = requests.filter((r) => r.status === "PENDING");
  const going = requests.filter((r) => r.status === "APPROVED");
  const full = going.length >= activity.maxPeople;
  const open = phase === "OPEN" || phase === "FULL";
  const cover =
    activity.coverImage ?? categoryPhoto(activity.category.slug) ?? "/images/hero-football.jpg";

  return (
    <>
      <div className="flex flex-wrap items-center gap-5 rounded-3xl border bg-card p-3.5">
        <div className="relative h-24 w-32 shrink-0 overflow-hidden rounded-2xl bg-muted">
          <Image src={cover} alt="" fill sizes="128px" className="object-cover" />
        </div>
        <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-1">
          <span className="text-sm font-bold text-brand-deep">
            You&apos;re hosting · {formatDay(activity.startsAt)}, {formatTime(activity.startsAt)}
          </span>
          <h1 className="text-2xl font-extrabold tracking-[-0.04em] sm:text-3xl">
            {activity.title}
          </h1>
          <span className="text-sm text-muted-foreground">
            {activity.venueName} ·{" "}
            {activity.pricePerPerson ? `₹${activity.pricePerPerson} per person` : "Free"} ·{" "}
            {activity.joinMode === "OPEN" ? "Open — instant join" : "Request to join"}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/activities/${id}`}
            className="rounded-full border px-4 py-2.5 text-sm font-bold"
          >
            View plan
          </Link>
          {open ? (
            <Link
              href={`/activities/${id}/edit`}
              className="rounded-full border px-4 py-2.5 text-sm font-bold"
            >
              Edit
            </Link>
          ) : null}
        </div>
      </div>

      <div className="grid gap-3.5 sm:grid-cols-3">
        <div className="flex flex-col gap-3 rounded-3xl border bg-card p-5">
          <span className="text-sm font-bold text-muted-foreground">Going</span>
          <strong className="text-4xl font-extrabold tracking-[-0.04em]">
            {going.length}
            <span className="text-lg text-muted-foreground"> / {activity.maxPeople}</span>
          </strong>
          <div
            className="flex gap-1"
            role="img"
            aria-label={`${going.length} of ${activity.maxPeople} spots taken`}
          >
            {Array.from({ length: Math.min(activity.maxPeople, 12) }, (_, i) => (
              <span
                key={i}
                className={cn(
                  "h-2 flex-1 rounded-full",
                  i <
                    Math.round(
                      (going.length / activity.maxPeople) * Math.min(activity.maxPeople, 12),
                    )
                    ? "bg-primary"
                    : "bg-secondary",
                )}
              />
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-3 rounded-3xl border bg-card p-5">
          <span className="text-sm font-bold text-muted-foreground">Waiting for you</span>
          <strong className="text-4xl font-extrabold tracking-[-0.04em]">{pending.length}</strong>
          <span className="text-sm text-muted-foreground">requests to review</span>
        </div>
        <div
          className={cn(
            "flex flex-col gap-3 rounded-3xl p-5",
            !open
              ? "bg-muted"
              : full
                ? "bg-foreground text-background"
                : "bg-primary text-primary-foreground",
          )}
        >
          <span className="text-sm font-bold opacity-80">Status</span>
          <strong className="text-4xl font-extrabold tracking-[-0.04em]">
            {
              {
                OPEN: "Open",
                FULL: "Full",
                ONGOING: "Live",
                COMPLETED: "Done",
                CANCELLED: "Cancelled",
                DRAFT: "Draft",
              }[phase]
            }
          </strong>
          <span className="text-sm opacity-85">
            {!open
              ? "No more changes"
              : full
                ? "Hidden from “spots available”"
                : "Visible in Explore"}
          </span>
        </div>
      </div>

      {full && pending.length && open ? (
        <p
          role="status"
          className="rounded-2xl border border-primary/30 bg-accent p-4 text-sm font-semibold text-accent-foreground"
        >
          You&apos;re full. Remaining requests stay pending — if someone leaves, you can approve the
          next person.
        </p>
      ) : null}

      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-extrabold tracking-[-0.03em]">Requests · {pending.length}</h2>
        {pending.length ? (
          <ul className="grid gap-3.5 lg:grid-cols-2">
            {pending.map((r) => (
              <li key={r.id} className="flex flex-col gap-3.5 rounded-3xl border bg-card p-5">
                <Person user={r.user} meta={`asked ${ago(r.createdAt, now)}`} />
                {r.message ? (
                  <p className="rounded-2xl bg-muted px-4 py-3 text-sm leading-relaxed">
                    &ldquo;{r.message}&rdquo;
                  </p>
                ) : null}
                {open ? (
                  <div className="flex justify-end">
                    <DecideButtons
                      requestId={r.id}
                      name={r.user.name.split(" ")[0] ?? r.user.name}
                      full={full}
                    />
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-2xl bg-muted p-5 text-sm text-muted-foreground">
            No requests waiting right now.
          </p>
        )}
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-extrabold tracking-[-0.03em]">Going · {going.length}</h2>
        {going.length ? (
          <ul className="flex flex-col divide-y rounded-3xl border bg-card">
            {going.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 p-4">
                <Person user={r.user} meta={r.user.homeAreaName ?? ""} />
                {open ? (
                  <RemoveButton requestId={r.id} name={r.user.name.split(" ")[0] ?? r.user.name} />
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-2xl bg-muted p-5 text-sm text-muted-foreground">
            Nobody yet — share your plan&apos;s link!
          </p>
        )}
      </section>
    </>
  );
}

type PersonUser = {
  name: string;
  username: string | null;
  image: string | null;
  homeAreaName: string | null;
  verifiedAt: Date | null;
  _count: { hostedActivities: number; joinRequests: number };
};

function Person({ user, meta }: { user: PersonUser; meta: string }) {
  const stats = [
    user.homeAreaName,
    user._count.joinRequests ? `joined ${user._count.joinRequests}` : "new to Gathr",
    user._count.hostedActivities ? `hosted ${user._count.hostedActivities}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const body = (
    <>
      <Avatar className="size-12">
        {user.image ? <AvatarImage src={user.image} alt="" /> : null}
        <AvatarFallback className="bg-secondary font-extrabold">
          {initials(user.name)}
        </AvatarFallback>
      </Avatar>
      <span className="flex min-w-0 flex-col">
        <span className="flex items-center gap-1.5">
          <strong className="truncate font-extrabold">{user.name}</strong>
          {user.verifiedAt ? <VerifiedBadge /> : null}
          {meta ? <span className="text-xs text-muted-foreground">· {meta}</span> : null}
        </span>
        <span className="truncate text-sm text-muted-foreground">{stats}</span>
      </span>
    </>
  );
  return user.username ? (
    <Link href={`/u/${user.username}`} className="flex min-w-0 items-center gap-3">
      {body}
    </Link>
  ) : (
    <div className="flex min-w-0 items-center gap-3">{body}</div>
  );
}
