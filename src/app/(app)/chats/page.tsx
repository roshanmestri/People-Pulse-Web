import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";

import { listMyChats } from "@/features/chat/queries";
import { chatState } from "@/features/chat/rules";
import { categoryPhoto } from "@/lib/category-media";
import { requireSessionUser } from "@/lib/session";
import { formatDay, formatTime } from "@/lib/time";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Chats" };

export default function ChatsPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:px-8">
      <h1 className="text-4xl font-extrabold tracking-[-0.045em]">Chats</h1>
      <Suspense fallback={<div className="h-80 animate-pulse rounded-3xl bg-muted" />}>
        <Chats />
      </Suspense>
    </div>
  );
}

async function Chats() {
  const user = await requireSessionUser("/chats");
  const chats = (await listMyChats(user.id)).filter((c) => chatState(c) !== "archived");

  if (!chats.length) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-3xl bg-muted px-6 py-16 text-center">
        <p className="text-xl font-extrabold">No chats yet</p>
        <p className="max-w-sm text-muted-foreground">
          A group chat opens for every plan you host or get into.
        </p>
        <Link
          href="/explore"
          className="rounded-full bg-foreground px-5 py-3 font-bold text-background"
        >
          Find a plan
        </Link>
      </div>
    );
  }

  // Most recent conversation first; chats without messages go by start time.
  const sorted = [...chats].sort((a, b) => {
    const at = a.messages[0]?.createdAt.getTime() ?? 0;
    const bt = b.messages[0]?.createdAt.getTime() ?? 0;
    return bt - at || a.startsAt.getTime() - b.startsAt.getTime();
  });

  return (
    <ul className="flex flex-col divide-y rounded-3xl border bg-card">
      {sorted.map((chat) => {
        const last = chat.messages[0];
        const photo =
          chat.coverImage ?? categoryPhoto(chat.category.slug) ?? "/images/hero-football.jpg";
        return (
          <li key={chat.id}>
            <Link
              href={`/activities/${chat.id}/chat`}
              className="flex items-center gap-3.5 p-3.5 hover:bg-muted/60"
            >
              <span className="relative size-14 shrink-0 overflow-hidden rounded-2xl bg-muted">
                <Image src={photo} alt="" fill sizes="56px" className="object-cover" />
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="flex items-baseline justify-between gap-2">
                  <strong className={cn("truncate", chat.unread ? "font-extrabold" : "font-bold")}>
                    {chat.title}
                  </strong>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {last ? formatTime(last.createdAt) : formatDay(chat.startsAt)}
                  </span>
                </span>
                <span
                  className={cn(
                    "truncate text-sm",
                    chat.unread ? "font-semibold text-foreground" : "text-muted-foreground",
                  )}
                >
                  {last
                    ? `${last.sender.name.split(" ")[0]}: ${last.body}`
                    : "No messages yet — say hi!"}
                </span>
              </span>
              {chat.unread ? (
                <span className="size-2.5 shrink-0 rounded-full bg-primary" aria-label="Unread" />
              ) : null}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
