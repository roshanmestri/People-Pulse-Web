import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import {
  dismissReport,
  setActivityHidden,
  setMessageHidden,
  setUserSuspended,
} from "@/features/admin/actions";
import { ActionButton } from "@/features/admin/components/action-button";
import { AdminNav } from "@/features/admin/components/admin-nav";
import { listReports } from "@/features/admin/queries";
import { REPORT_REASONS } from "@/features/safety/schemas";
import { requireAdmin } from "@/lib/session";
import { formatDay, formatTime } from "@/lib/time";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Admin · Reports" };

const REASON = Object.fromEntries(REPORT_REASONS) as Record<string, string>;

export default function AdminReportsPage({ searchParams }: PageProps<"/admin">) {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-8">
      <AdminNav active="/admin" />
      <Suspense fallback={<div className="h-96 animate-pulse rounded-3xl bg-muted" />}>
        <Reports searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Reports({ searchParams }: { searchParams: PageProps<"/admin">["searchParams"] }) {
  await requireAdmin();
  const resolved = (await searchParams).status === "resolved";
  const reports = await listReports(resolved ? "RESOLVED" : "OPEN");

  return (
    <>
      <div className="flex gap-2">
        <Link
          href="/admin"
          className={cn(
            "rounded-full border px-4 py-2 text-sm font-bold",
            !resolved && "border-foreground bg-foreground text-background",
          )}
        >
          Open
        </Link>
        <Link
          href="/admin?status=resolved"
          className={cn(
            "rounded-full border px-4 py-2 text-sm font-bold",
            resolved && "border-foreground bg-foreground text-background",
          )}
        >
          Resolved
        </Link>
      </div>

      {!reports.length ? (
        <p className="rounded-3xl bg-muted p-10 text-center font-semibold text-muted-foreground">
          {resolved ? "Nothing resolved yet." : "No open reports — all clear."}
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {reports.map((r) => {
            const t = r.target;
            return (
              <li key={r.id} className="flex flex-col gap-3 rounded-3xl border bg-card p-5">
                <div className="flex flex-wrap items-center gap-2 text-xs font-extrabold">
                  <span className="rounded-full bg-secondary px-2.5 py-1">{r.targetType}</span>
                  <span className="rounded-full bg-accent px-2.5 py-1 text-accent-foreground">
                    {REASON[r.reason] ?? r.reason}
                  </span>
                  {r.openReports > 1 ? (
                    <span className="rounded-full bg-destructive/10 px-2.5 py-1 text-destructive">
                      {r.openReports} open reports
                    </span>
                  ) : null}
                  {resolved ? (
                    <span className="rounded-full bg-muted px-2.5 py-1">{r.status}</span>
                  ) : null}
                  <span className="ml-auto font-semibold text-muted-foreground">
                    {formatDay(r.createdAt)} · {formatTime(r.createdAt)} · by {r.reporter.name}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5">
                  {t.href ? (
                    <Link href={t.href} className="text-lg font-extrabold hover:underline">
                      {t.label}
                    </Link>
                  ) : (
                    <span className="text-lg font-extrabold">{t.label}</span>
                  )}
                  <span className="text-sm text-muted-foreground">{t.extra}</span>
                </div>
                {r.details ? (
                  <p className="rounded-2xl bg-muted px-4 py-3 text-sm">
                    &ldquo;{r.details}&rdquo;
                  </p>
                ) : null}
                {!resolved ? (
                  <div className="flex flex-wrap justify-end gap-2">
                    <ActionButton
                      action={dismissReport.bind(null, r.id)}
                      label="Dismiss"
                      success="Report dismissed"
                      variant="ghost"
                    />
                    {t.kind === "ACTIVITY" && !t.hidden ? (
                      <ActionButton
                        action={setActivityHidden.bind(null, t.id, true)}
                        label="Hide plan"
                        success="Plan hidden"
                        variant="destructive"
                        confirm="Hide this plan for everyone?"
                      />
                    ) : null}
                    {t.kind === "MESSAGE" && !t.hidden ? (
                      <ActionButton
                        action={setMessageHidden.bind(null, t.id, true)}
                        label="Hide message"
                        success="Message hidden"
                        variant="destructive"
                      />
                    ) : null}
                    {t.kind === "USER" && !t.suspended ? (
                      <ActionButton
                        action={setUserSuspended.bind(null, t.id, true)}
                        label="Suspend user"
                        success="User suspended"
                        variant="destructive"
                        confirm="Suspend this user? They'll be signed out everywhere."
                      />
                    ) : null}
                    {t.kind === "ACTIVITY" ? (
                      <ActionButton
                        action={setUserSuspended.bind(null, t.hostId, true)}
                        label="Suspend host"
                        success="Host suspended"
                        confirm="Suspend the host? They'll be signed out and their plans leave Explore."
                      />
                    ) : null}
                    {t.kind === "MESSAGE" ? (
                      <ActionButton
                        action={setUserSuspended.bind(null, t.senderId, true)}
                        label="Suspend sender"
                        success="Sender suspended"
                        confirm="Suspend the sender? They'll be signed out everywhere."
                      />
                    ) : null}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
