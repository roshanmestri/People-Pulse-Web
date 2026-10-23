import Link from "next/link";

import { UserMenu } from "@/components/layout/user-menu";
import { NotificationBell } from "@/features/notifications/components/notification-bell";
import { ensureReminders, unreadCount } from "@/features/notifications/queries";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { cn } from "@/lib/utils";

/** Server Component: reads the session, then hands plain data to the client dropdown. */
export async function UserNav({ overlay }: { overlay: boolean }) {
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    return (
      <Link
        href="/sign-in"
        className={cn(
          "rounded-full px-4 py-2.5 text-sm font-bold",
          overlay ? "bg-white text-[#0f0f10]" : "border bg-background",
        )}
      >
        Sign in
      </Link>
    );
  }

  await ensureReminders(sessionUser.id); // FR-7.1 "starts in 2 hours" (created lazily)
  const [profile, unread] = await Promise.all([
    db.user.findUnique({
      where: { id: sessionUser.id },
      select: { name: true, username: true, image: true },
    }),
    unreadCount(sessionUser.id),
  ]);

  return (
    <div className="flex items-center gap-2">
      <NotificationBell initialCount={unread} overlay={overlay} />
      <UserMenu
        name={profile?.name || sessionUser.email}
        username={profile?.username ?? null}
        image={profile?.image ?? null}
      />
    </div>
  );
}

export function UserNavFallback({ overlay }: { overlay: boolean }) {
  return (
    <span
      className={cn("size-10 animate-pulse rounded-full", overlay ? "bg-white/20" : "bg-muted")}
      aria-hidden="true"
    />
  );
}
