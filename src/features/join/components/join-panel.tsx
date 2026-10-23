"use client";

import { CheckCircle2, Clock, MessageCircle, Pencil, ShieldCheck, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { StoredStatus } from "@/lib/status";

import { joinActivity, leaveActivity, withdrawFromActivity } from "../actions";

export type ViewerState =
  "anon" | "host" | "none" | "PENDING" | "APPROVED" | "REJECTED" | "WITHDRAWN" | "LEFT" | "REMOVED";

type Props = {
  activityId: string;
  joinMode: "REQUEST" | "OPEN";
  phase: StoredStatus; // effective status (time-aware)
  viewer: ViewerState;
  spotsLeft: number;
  pendingCount: number;
  hostFirstName: string;
};

const primary = "h-13 w-full rounded-2xl text-base font-extrabold";

/** The join card on the activity page — one component for every situation. */
export function JoinPanel({
  activityId,
  joinMode,
  phase,
  viewer,
  spotsLeft,
  pendingCount,
  hostFirstName,
}: Props) {
  const router = useRouter();
  const [composing, setComposing] = useState(false);
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();

  function run(
    action: () => Promise<{ ok: true } | { ok: false; error: string }>,
    success: string,
  ) {
    startTransition(async () => {
      const result = await action();
      if (!result.ok) return void toast.error(result.error);
      toast.success(success);
      setComposing(false);
      router.refresh(); // re-render the server page: spots, who's in, exact venue
    });
  }

  if (viewer === "host") {
    return (
      <div className="flex flex-col gap-2.5">
        <Link
          href={`/activities/${activityId}/manage`}
          className="flex h-13 items-center justify-center gap-2 rounded-2xl bg-primary text-base font-extrabold text-primary-foreground"
        >
          <Users className="size-4" aria-hidden="true" />
          Manage requests{pendingCount ? ` · ${pendingCount} waiting` : ""}
        </Link>
        <Link
          href={`/activities/${activityId}/edit`}
          className="flex h-11 items-center justify-center gap-2 rounded-2xl border text-sm font-bold"
        >
          <Pencil className="size-4" aria-hidden="true" /> Edit plan
        </Link>
      </div>
    );
  }

  if (viewer === "anon") {
    return (
      <Link
        href={`/sign-in?next=${encodeURIComponent(`/activities/${activityId}`)}`}
        className="flex h-13 items-center justify-center rounded-2xl bg-primary text-base font-extrabold text-primary-foreground"
      >
        Sign in to join
      </Link>
    );
  }

  if (viewer === "APPROVED") {
    return (
      <div className="flex flex-col gap-3">
        <p
          role="status"
          className="flex items-center gap-2.5 rounded-2xl bg-accent p-3.5 font-extrabold text-accent-foreground"
        >
          <CheckCircle2 className="size-5" aria-hidden="true" /> You&apos;re in!
        </p>
        <p className="flex items-start gap-2 text-sm text-muted-foreground">
          <MessageCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          The exact venue is shown above. The group chat opens in the next update (M6).
        </p>
        {phase === "OPEN" || phase === "FULL" ? (
          <Button
            variant="ghost"
            className="h-11 rounded-2xl font-bold text-destructive"
            disabled={pending}
            onClick={() => run(() => leaveActivity(activityId), "You left the plan")}
          >
            Can&apos;t make it? Leave plan
          </Button>
        ) : null}
      </div>
    );
  }

  if (phase === "ONGOING" || phase === "COMPLETED" || phase === "CANCELLED") {
    const label = {
      ONGOING: "Happening now",
      COMPLETED: "This plan is over",
      CANCELLED: "Cancelled by the host",
    }[phase];
    return <p className="rounded-2xl bg-muted p-4 text-center font-bold">{label}</p>;
  }

  if (viewer === "PENDING") {
    return (
      <div className="flex flex-col gap-3">
        <p
          role="status"
          className="flex items-center gap-2.5 rounded-2xl bg-accent p-3.5 text-accent-foreground"
        >
          <Clock className="size-5 shrink-0" aria-hidden="true" />
          <span>
            <strong className="block font-extrabold">Request sent</strong>
            <span className="text-sm">{hostFirstName} will get a notification and reply soon.</span>
          </span>
        </p>
        <Button
          variant="outline"
          className="h-11 rounded-2xl font-bold"
          disabled={pending}
          onClick={() => run(() => withdrawFromActivity(activityId), "Request withdrawn")}
        >
          Withdraw request
        </Button>
      </div>
    );
  }

  if (viewer === "REJECTED" || viewer === "REMOVED") {
    return (
      <p className="rounded-2xl bg-muted p-4 text-center text-sm font-semibold">
        The host didn&apos;t accept a request for this plan. Plenty more on Explore!
      </p>
    );
  }

  if (spotsLeft === 0 || phase === "FULL") {
    return (
      <button type="button" disabled className={`${primary} bg-muted text-muted-foreground`}>
        Full — no spots left
      </button>
    );
  }

  // none / WITHDRAWN / LEFT → can (re)join.
  const isOpen = joinMode === "OPEN";
  if (!composing) {
    return (
      <Button className={primary} onClick={() => setComposing(true)}>
        {isOpen ? "I'm in — join now" : "I'm in — request spot"}
      </Button>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      {/* FR-8.5: safety tips before joining strangers */}
      <div className="flex flex-col gap-2 rounded-2xl border border-[#f0ddba] bg-[#fdf6ea] p-4 text-[#4a3a22] dark:border-white/10 dark:bg-white/5 dark:text-foreground">
        <strong className="flex items-center gap-2 text-sm font-extrabold">
          <ShieldCheck className="size-4" aria-hidden="true" /> Meeting new people?
        </strong>
        <ul className="list-disc pl-5 text-[13px] leading-relaxed">
          <li>Meet at the venue, not at someone&apos;s home.</li>
          <li>Tell a friend where you&apos;re going.</li>
          <li>Keep chats in Gathr until you&apos;re comfortable.</li>
        </ul>
      </div>
      {!isOpen ? (
        <label className="flex flex-col gap-1.5 text-sm font-bold">
          Message to {hostFirstName}{" "}
          <span className="font-normal text-muted-foreground">(optional)</span>
          <Textarea
            rows={3}
            maxLength={280}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="I play twice a week, happy to bring shuttles!"
            className="rounded-xl font-normal"
          />
        </label>
      ) : null}
      <div className="flex gap-2">
        <Button
          variant="outline"
          className="h-12 flex-1 rounded-2xl font-bold"
          onClick={() => setComposing(false)}
        >
          Cancel
        </Button>
        <Button
          className="h-12 flex-[2] rounded-2xl font-extrabold"
          disabled={pending}
          onClick={() =>
            run(
              () => joinActivity(activityId, message.trim() || null),
              isOpen ? "You're in!" : "Request sent",
            )
          }
        >
          {pending ? "Sending…" : isOpen ? "Confirm & join" : "Send request"}
        </Button>
      </div>
    </div>
  );
}
