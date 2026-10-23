import { ChevronLeft, MapPin } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { ChatRoom } from "@/features/chat/components/chat-room";
import { getChatAccess, listMessages } from "@/features/chat/queries";
import { chatState } from "@/features/chat/rules";
import { hiddenUserIds } from "@/features/safety/queries";
import { categoryPhoto } from "@/lib/category-media";
import { db } from "@/lib/db";
import { requireSessionUser } from "@/lib/session";
import { formatDay, formatTime } from "@/lib/time";

export const metadata: Metadata = { title: "Group chat" };

export default function ChatPage({ params }: PageProps<"/activities/[id]/chat">) {
  return (
    // Full-height chat: viewport minus header (4rem) and, on phones, the tab bar.
    <div className="mx-auto flex h-[calc(100dvh-10rem)] w-full max-w-3xl flex-col md:h-[calc(100dvh-4rem)] md:border-x">
      <Suspense fallback={<div className="m-4 flex-1 animate-pulse rounded-3xl bg-muted" />}>
        <Chat params={params} />
      </Suspense>
    </div>
  );
}

async function Chat({ params }: { params: PageProps<"/activities/[id]/chat">["params"] }) {
  const { id } = await params;
  const user = await requireSessionUser(`/activities/${id}/chat`);
  const access = await getChatAccess(id, user.id);
  if (!access) notFound(); // not a member → same as "doesn't exist"

  const { activity, memberIds } = access;
  const [messages, me] = await Promise.all([
    hiddenUserIds(user.id).then((hideSenderIds) => listMessages(id, { hideSenderIds })),
    db.user.findUniqueOrThrow({
      where: { id: user.id },
      select: { id: true, name: true, image: true },
    }),
  ]);
  const cover =
    activity.coverImage ?? categoryPhoto(activity.category.slug) ?? "/images/hero-football.jpg";

  return (
    <>
      <header className="flex items-center gap-3 border-b px-3 py-3">
        <Link
          href={`/activities/${id}`}
          aria-label="Back to plan"
          className="grid size-10 place-items-center rounded-full hover:bg-muted"
        >
          <ChevronLeft className="size-5" aria-hidden="true" />
        </Link>
        <span className="relative size-11 shrink-0 overflow-hidden rounded-xl bg-muted">
          <Image src={cover} alt="" fill sizes="44px" className="object-cover" />
        </span>
        <span className="flex min-w-0 flex-col">
          <strong className="truncate font-extrabold tracking-[-0.02em]">{activity.title}</strong>
          <span className="text-xs font-semibold text-muted-foreground">
            {formatDay(activity.startsAt)} · {formatTime(activity.startsAt)} · {memberIds.length} in
          </span>
        </span>
      </header>

      {/* Members see the exact venue (this page is members-only). */}
      <div className="mx-3 mt-3 flex items-center gap-3 rounded-2xl border border-primary/30 bg-accent p-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary">
          <MapPin className="size-[18px] text-primary-foreground" aria-hidden="true" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <strong className="truncate text-sm font-extrabold">{activity.venueName}</strong>
          <span className="text-xs font-semibold text-accent-foreground">
            {activity.areaName} · only visible to people who are in
          </span>
        </span>
        <a
          href={`https://www.openstreetmap.org/search?query=${encodeURIComponent(`${activity.venueName}, ${activity.areaName}`)}`}
          target="_blank"
          rel="noreferrer"
          className="shrink-0 text-sm font-extrabold text-brand-deep"
        >
          Directions
        </a>
      </div>

      <ChatRoom
        activityId={id}
        hostId={activity.hostId}
        me={me}
        initialMessages={messages}
        state={chatState(activity)}
      />
    </>
  );
}
