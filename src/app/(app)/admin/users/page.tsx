import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { VerifiedBadge } from "@/components/brand/verified-badge";
import { setBadgeRevoked, setUserSuspended } from "@/features/admin/actions";
import { ActionButton } from "@/features/admin/components/action-button";
import { AdminNav } from "@/features/admin/components/admin-nav";
import { searchUsers } from "@/features/admin/queries";
import { requireAdmin } from "@/lib/session";

export const metadata: Metadata = { title: "Admin · Users" };

export default function AdminUsersPage({ searchParams }: PageProps<"/admin/users">) {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-8">
      <AdminNav active="/admin/users" />
      <Suspense fallback={<div className="h-96 animate-pulse rounded-3xl bg-muted" />}>
        <Users searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Users({
  searchParams,
}: {
  searchParams: PageProps<"/admin/users">["searchParams"];
}) {
  await requireAdmin();
  const raw = (await searchParams).q;
  const q = typeof raw === "string" ? raw.slice(0, 80) : "";
  const users = await searchUsers(q);

  return (
    <>
      {/* A plain GET form: the search lives in the URL (?q=…), no client JS needed. */}
      <form action="/admin/users" className="flex gap-2">
        <label className="flex h-11 flex-1 items-center rounded-full border px-4">
          <span className="sr-only">Search users</span>
          <input
            name="q"
            defaultValue={q}
            placeholder="Search name, email or username"
            className="flex-1 bg-transparent outline-none"
          />
        </label>
        <button
          type="submit"
          className="h-11 rounded-full bg-foreground px-5 font-bold text-background"
        >
          Search
        </button>
      </form>
      {!q ? (
        <p className="-mt-2 text-sm text-muted-foreground">
          Showing admins, suspended users and revoked badges.
        </p>
      ) : null}

      <ul className="flex flex-col divide-y rounded-3xl border bg-card">
        {users.map((u) => (
          <li key={u.id} className="flex flex-wrap items-center gap-3 p-4">
            <div className="flex min-w-0 flex-[1_1_260px] flex-col gap-0.5">
              <span className="flex items-center gap-1.5">
                {u.username ? (
                  <Link href={`/u/${u.username}`} className="font-extrabold hover:underline">
                    {u.name}
                  </Link>
                ) : (
                  <strong className="font-extrabold">{u.name || "(no name)"}</strong>
                )}
                {u.verifiedAt ? <VerifiedBadge /> : null}
                {u.role === "ADMIN" ? (
                  <span className="rounded-full bg-foreground px-2 py-0.5 text-[10px] font-extrabold text-background">
                    ADMIN
                  </span>
                ) : null}
                {u.suspendedAt ? (
                  <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-extrabold text-destructive">
                    SUSPENDED
                  </span>
                ) : null}
              </span>
              <span className="truncate text-sm text-muted-foreground">
                {u.email} · hosted {u._count.hostedActivities}
                {u.verificationRevokedAt
                  ? ` · badge revoked${u.verificationRevokedReason ? `: ${u.verificationRevokedReason}` : ""}`
                  : ""}
              </span>
            </div>
            {u.role !== "ADMIN" ? (
              <div className="flex flex-wrap gap-2">
                {u.verificationRevokedAt ? (
                  <ActionButton
                    action={setBadgeRevoked.bind(null, u.id, false)}
                    label="Restore badge"
                    success="Badge restored"
                  />
                ) : (
                  <ActionButton
                    action={setBadgeRevoked.bind(null, u.id, true)}
                    label="Revoke badge"
                    success="Badge revoked"
                    askReason="Reason (shown to the user):"
                  />
                )}
                {u.suspendedAt ? (
                  <ActionButton
                    action={setUserSuspended.bind(null, u.id, false)}
                    label="Unsuspend"
                    success="User unsuspended"
                  />
                ) : (
                  <ActionButton
                    action={setUserSuspended.bind(null, u.id, true)}
                    label="Suspend"
                    success="User suspended"
                    variant="destructive"
                    confirm={`Suspend ${u.name}? They'll be signed out everywhere.`}
                  />
                )}
              </div>
            ) : null}
          </li>
        ))}
        {!users.length ? (
          <li className="p-6 text-center text-muted-foreground">No users found.</li>
        ) : null}
      </ul>
    </>
  );
}
