"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

import { decideJoinRequest, removeFromActivity } from "../actions";

type Result = { ok: true } | { ok: false; error: string };

function useAction() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const run = (action: () => Promise<Result>, success: string) =>
    startTransition(async () => {
      const result = await action().catch(() => null);
      if (!result) return void toast.error("Couldn't reach the server — try again.");
      if (!result.ok) return void toast.error(result.error);
      toast.success(success);
      router.refresh();
    });
  return { pending, run };
}

/** Approve / Decline buttons on a pending request card. */
export function DecideButtons({
  requestId,
  name,
  full,
}: {
  requestId: string;
  name: string;
  full: boolean;
}) {
  const { pending, run } = useAction();
  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        className="h-11 rounded-full px-5 font-bold"
        disabled={pending}
        onClick={() => run(() => decideJoinRequest(requestId, "reject"), `Declined ${name}`)}
      >
        Decline
      </Button>
      <Button
        className="h-11 rounded-full px-6 font-extrabold"
        disabled={pending || full}
        title={full ? "You're full — remove someone or add spots first" : undefined}
        onClick={() => run(() => decideJoinRequest(requestId, "approve"), `${name} is in!`)}
      >
        Approve
      </Button>
    </div>
  );
}

/** Remove an approved member (frees their spot). */
export function RemoveButton({ requestId, name }: { requestId: string; name: string }) {
  const { pending, run } = useAction();
  return (
    <Button
      variant="ghost"
      className="h-10 rounded-full font-bold text-destructive"
      disabled={pending}
      onClick={() => {
        if (window.confirm(`Remove ${name} from this plan? They'll be notified.`)) {
          run(() => removeFromActivity(requestId), `Removed ${name}`);
        }
      }}
    >
      Remove
    </Button>
  );
}
