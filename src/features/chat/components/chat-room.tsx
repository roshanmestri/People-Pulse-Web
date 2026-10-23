"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Lock, SendHorizontal } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDay, formatTime } from "@/lib/time";
import { cn, initials } from "@/lib/utils";

import { markChatRead, sendMessage } from "../actions";
import type { ChatMessage } from "../queries";
import type { ChatState } from "../rules";

type Me = { id: string; name: string; image: string | null };
type Props = {
  activityId: string;
  hostId: string;
  me: Me;
  initialMessages: ChatMessage[];
  state: ChatState;
};

const QUICK_REPLIES = ["On my way", "Running 5 min late", "I'm here!", "Bringing water"];
const POLL_MS = 4_000;

type Shown = ChatMessage & { pending?: boolean };

export function ChatRoom({ activityId, hostId, me, initialMessages, state }: Props) {
  const queryClient = useQueryClient();
  const key = ["chat", activityId];
  const open = state === "open";
  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  // Polling (FR-6.3 Phase 1): refetch the latest messages every few seconds while open.
  const { data: messages } = useQuery<Shown[]>({
    queryKey: key,
    queryFn: async () => {
      const res = await fetch(`/api/activities/${activityId}/messages`);
      if (!res.ok) throw new Error("Couldn't load messages");
      return ((await res.json()) as { messages: ChatMessage[] }).messages;
    },
    initialData: initialMessages,
    refetchInterval: open ? POLL_MS : false,
  });

  // Optimistic send: show the message instantly, confirm (or roll back) when the server answers.
  const send = useMutation({
    mutationFn: async (text: string) => {
      const result = await sendMessage(activityId, text);
      if (!result.ok) throw new Error(result.error);
      return result.message;
    },
    onMutate: async (text) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<Shown[]>(key) ?? [];
      const temp: Shown = {
        id: `temp-${Date.now()}`,
        body: text.trim(),
        createdAt: new Date().toISOString(),
        sender: me,
        pending: true,
      };
      queryClient.setQueryData<Shown[]>(key, [...previous, temp]);
      return { previous, tempId: temp.id };
    },
    onError: (error, _text, context) => {
      if (context) queryClient.setQueryData(key, context.previous);
      toast.error(error.message || "Message not sent");
    },
    onSuccess: (message, _text, context) => {
      queryClient.setQueryData<Shown[]>(key, (current = []) =>
        current.map((m) => (m.id === context?.tempId ? message : m)),
      );
    },
  });

  // Opening the chat clears its "new messages" alert (and refreshes the bell).
  useEffect(() => {
    void markChatRead(activityId).then(() =>
      queryClient.invalidateQueries({ queryKey: ["notifications", "unread"] }),
    );
  }, [activityId, queryClient]);

  // Keep the newest message in view.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  function submit(text: string) {
    if (!text.trim() || !open) return;
    send.mutate(text);
    setDraft("");
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ol
        className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-4"
        aria-label="Messages"
        aria-live="polite"
      >
        {messages.length === 0 ? (
          <li className="m-auto max-w-xs text-center text-sm text-muted-foreground">
            No messages yet. Say hi and sort out the details!
          </li>
        ) : null}
        {messages.map((m, i) => {
          const mine = m.sender.id === me.id;
          const date = new Date(m.createdAt);
          const prev = messages[i - 1];
          const newDay = !prev || formatDay(new Date(prev.createdAt)) !== formatDay(date);
          const sameSender = prev && !newDay && prev.sender.id === m.sender.id;
          return (
            <li key={m.id} className="flex flex-col gap-3">
              {newDay ? (
                <span className="self-center rounded-full bg-muted px-3 py-1 text-xs font-bold text-muted-foreground">
                  {formatDay(date)}
                </span>
              ) : null}
              <div className={cn("flex max-w-[85%] items-end gap-2", mine && "self-end")}>
                {!mine ? (
                  <Avatar className={cn("size-8", sameSender && "invisible")}>
                    {m.sender.image ? <AvatarImage src={m.sender.image} alt="" /> : null}
                    <AvatarFallback className="bg-secondary text-[11px] font-extrabold">
                      {initials(m.sender.name)}
                    </AvatarFallback>
                  </Avatar>
                ) : null}
                <div className={cn("flex flex-col gap-1", mine && "items-end")}>
                  {!mine && !sameSender ? (
                    <span className="text-xs font-semibold text-muted-foreground">
                      {m.sender.name.split(" ")[0]}
                      {m.sender.id === hostId ? (
                        <span className="text-brand-deep"> · Host</span>
                      ) : null}
                    </span>
                  ) : null}
                  <p
                    className={cn(
                      "rounded-[18px] px-3.5 py-2.5 text-[15px] leading-snug break-words whitespace-pre-wrap",
                      mine
                        ? "rounded-br-md bg-primary font-medium text-primary-foreground"
                        : "rounded-bl-md bg-muted text-foreground",
                      m.pending && "opacity-60",
                    )}
                  >
                    {m.body}
                  </p>
                  <span className="text-[11px] font-semibold text-muted-foreground">
                    {m.pending ? "Sending…" : formatTime(date)}
                  </span>
                </div>
              </div>
            </li>
          );
        })}
        <div ref={bottomRef} />
      </ol>

      {open ? (
        <div className="flex flex-col gap-2 border-t bg-background px-3 pt-2.5 pb-3">
          <div className="-mx-3 flex gap-2 overflow-x-auto px-3">
            {QUICK_REPLIES.map((text) => (
              <button
                key={text}
                type="button"
                onClick={() => submit(text)}
                className="h-9 shrink-0 rounded-full border px-3.5 text-[13px] font-bold whitespace-nowrap"
              >
                {text}
              </button>
            ))}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit(draft);
            }}
            className="flex items-end gap-2"
          >
            <label className="flex min-h-12 flex-1 items-center rounded-3xl bg-muted px-4">
              <span className="sr-only">Message the group</span>
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  // Enter sends; Shift+Enter adds a new line.
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    submit(draft);
                  }
                }}
                rows={1}
                maxLength={1000}
                placeholder="Message the group"
                className="max-h-32 w-full resize-none bg-transparent py-3 text-[15px] outline-none"
              />
            </label>
            <button
              type="submit"
              aria-label="Send"
              disabled={!draft.trim()}
              className="grid size-12 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground disabled:opacity-40"
            >
              <SendHorizontal className="size-5" aria-hidden="true" />
            </button>
          </form>
        </div>
      ) : (
        <p className="flex items-center justify-center gap-2 border-t bg-muted px-4 py-4 text-sm font-semibold text-muted-foreground">
          <Lock className="size-4" aria-hidden="true" />
          {state === "cancelled"
            ? "This plan was cancelled — the chat is read-only."
            : "This chat is archived (7 days after the plan)."}
        </p>
      )}
    </div>
  );
}
