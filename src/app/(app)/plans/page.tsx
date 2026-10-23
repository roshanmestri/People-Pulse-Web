import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";

import { getMyPlans } from "@/features/join/queries";
import { categoryPhoto } from "@/lib/category-media";
import { requireSessionUser } from "@/lib/session";
import { effectiveStatus, type StoredStatus } from "@/lib/status";
import { formatDay, formatTime } from "@/lib/time";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "My plans" };

export default function PlansPage() {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 py-8 sm:px-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-4xl font-extrabold tracking-[-0.045em]">My plans</h1>
        <Link
          href="/activities/new"
          className="rounded-full bg-primary px-4 py-2.5 text-sm font-extrabold text-primary-foreground"
        >
          + Host a plan
        </Link>
      </div>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-3xl bg-muted" />}>
        <Plans />
      </Suspense>
    </div>
  );
}

async function Plans() {
  const user = await requireSessionUser("/plans");
  const now = currentTime();
  const { hosting, going, waiting, past } = await getMyPlans(user.id, now);

  if (!hosting.length && !going.length && !waiting.length && !past.length) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-3xl bg-muted px-6 py-16 text-center">
        <p className="text-xl font-extrabold">No plans yet</p>
        <p className="max-w-sm text-muted-foreground">
          Find something nearby to join, or host your own — it takes a minute.
        </p>
        <Link
          href="/explore"
          className="rounded-full bg-foreground px-5 py-3 font-bold text-background"
        >
          Explore plans
        </Link>
      </div>
    );
  }

  return (
    <>
      <Section
        title="Hosting"
        count={hosting.length}
        empty="You're not hosting anything right now."
      >
        {hosting.map((a) => (
          <PlanRow
            key={a.id}
            plan={a}
            now={now}
            href={a.status === "DRAFT" ? `/activities/${a.id}/edit` : `/activities/${a.id}/manage`}
            detail={`${a._count.joinRequests}/${a.maxPeople} going${a.joinRequests.length ? ` · ${a.joinRequests.length} waiting` : ""}`}
            highlight={a.joinRequests.length > 0}
          />
        ))}
      </Section>
      <Section title="Going" count={going.length} empty="Nothing yet — find a plan on Explore.">
        {going.map((a) => (
          <PlanRow key={a.id} plan={a} now={now} href={`/activities/${a.id}`} detail="You're in" />
        ))}
      </Section>
      <Section title="Waiting for approval" count={waiting.length} empty="No pending requests.">
        {waiting.map((a) => (
          <PlanRow
            key={a.id}
            plan={a}
            now={now}
            href={`/activities/${a.id}`}
            detail="Request sent"
          />
        ))}
      </Section>
      {past.length ? (
        <Section title="Past" count={past.length}>
          {past.map((a) => (
            <PlanRow
              key={`${a.role}-${a.id}`}
              plan={a}
              now={now}
              href={`/activities/${a.id}`}
              detail={a.role}
              muted
            />
          ))}
        </Section>
      ) : null}
    </>
  );
}

/** Read the clock outside the component body (keeps the React Compiler purity rule happy). */
function currentTime() {
  return new Date();
}

function Section({
  title,
  count,
  empty,
  children,
}: {
  title: string;
  count: number;
  empty?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-xl font-extrabold tracking-[-0.03em]">
        {title} <span className="text-muted-foreground">· {count}</span>
      </h2>
      {count ? (
        <ul className="flex flex-col gap-2.5">{children}</ul>
      ) : (
        <p className="rounded-2xl bg-muted p-4 text-sm text-muted-foreground">{empty}</p>
      )}
    </section>
  );
}

const BADGE: Partial<Record<StoredStatus, string>> = {
  DRAFT: "Draft",
  FULL: "Full",
  ONGOING: "Live now",
  COMPLETED: "Done",
  CANCELLED: "Cancelled",
};

type Plan = {
  id: string;
  title: string;
  status: StoredStatus;
  startsAt: Date;
  durationMinutes: number;
  areaName: string;
  coverImage: string | null;
  category: { slug: string };
};

function PlanRow({
  plan,
  now,
  href,
  detail,
  highlight,
  muted,
}: {
  plan: Plan;
  now: Date;
  href: string;
  detail: string;
  highlight?: boolean;
  muted?: boolean;
}) {
  const phase = effectiveStatus(plan, now);
  const photo = plan.coverImage ?? categoryPhoto(plan.category.slug) ?? "/images/hero-football.jpg";
  return (
    <li>
      <Link
        href={href}
        className={cn(
          "flex items-center gap-3.5 rounded-3xl border bg-card p-2.5 transition hover:border-foreground/30",
          muted && "opacity-75",
        )}
      >
        <span className="relative size-20 shrink-0 overflow-hidden rounded-2xl bg-muted">
          <Image src={photo} alt="" fill sizes="80px" className="object-cover" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <strong className="truncate font-extrabold">{plan.title}</strong>
          <span className="text-sm text-muted-foreground">
            {formatDay(plan.startsAt)} · {formatTime(plan.startsAt)} · {plan.areaName}
          </span>
          <span
            className={cn("text-sm font-bold", highlight ? "text-brand-deep" : "text-foreground")}
          >
            {detail}
          </span>
        </span>
        {BADGE[phase] ? (
          <span
            className={cn(
              "mr-1.5 shrink-0 rounded-full px-3 py-1 text-xs font-extrabold",
              phase === "CANCELLED" ? "bg-destructive/10 text-destructive" : "bg-secondary",
            )}
          >
            {BADGE[phase]}
          </span>
        ) : null}
      </Link>
    </li>
  );
}
