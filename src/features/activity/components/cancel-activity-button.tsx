"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

import { cancelActivity } from "../actions";

export function CancelActivityButton({
  activityId,
  peopleToNotify,
}: {
  activityId: string;
  peopleToNotify: number;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  function cancel() {
    startTransition(async () => {
      const result = await cancelActivity(activityId);
      if (!result.ok) return void toast.error(result.error);
      toast.success("Plan cancelled — everyone has been notified");
      router.push(`/activities/${activityId}`);
    });
  }

  if (!confirming) {
    return (
      <Button
        variant="ghost"
        className="h-11 rounded-full font-bold text-destructive"
        onClick={() => setConfirming(true)}
      >
        Cancel this plan
      </Button>
    );
  }
  return (
    <div
      role="alertdialog"
      aria-label="Confirm cancel"
      className="flex flex-col gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-4"
    >
      <p className="text-sm font-semibold">
        Cancel for everyone?{" "}
        {peopleToNotify
          ? `${peopleToNotify} ${peopleToNotify === 1 ? "person" : "people"} will be notified.`
          : "Nobody has joined yet."}{" "}
        This can&apos;t be undone.
      </p>
      <div className="flex gap-2">
        <Button
          variant="destructive"
          className="h-10 rounded-full font-bold"
          disabled={pending}
          onClick={cancel}
        >
          {pending ? "Cancelling…" : "Yes, cancel plan"}
        </Button>
        <Button variant="ghost" className="h-10 rounded-full" onClick={() => setConfirming(false)}>
          Keep it
        </Button>
      </div>
    </div>
  );
}
