"use client";

import { Ban } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { blockUser, unblockUser } from "../actions";

/** FR-8.2 — block with a clear explanation of what happens. */
export function BlockButton({ userId, name }: { userId: string; name: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function block() {
    startTransition(async () => {
      const result = await blockUser(userId).catch(() => null);
      if (!result?.ok) return void toast.error(result?.error ?? "Couldn't block — try again.");
      toast.success(`${name} is blocked`);
      setOpen(false);
      router.push("/explore");
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="inline-flex h-10 items-center gap-1.5 rounded-full border px-4 text-sm font-bold text-destructive"
        >
          <Ban className="size-4" aria-hidden="true" /> Block
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Block {name}?</DialogTitle>
          <DialogDescription asChild>
            <ul className="list-disc space-y-1 pl-5 text-left">
              <li>They won&apos;t see your plans or your profile, and can&apos;t ask to join.</li>
              <li>They&apos;re removed from your upcoming plans.</li>
              <li>You won&apos;t see their plans or chat messages.</li>
              <li>They aren&apos;t told. You can unblock any time from your profile.</li>
            </ul>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" className="rounded-full" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            className="rounded-full font-bold"
            disabled={pending}
            onClick={block}
          >
            {pending ? "Blocking…" : `Block ${name}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function UnblockButton({ userId, name }: { userId: string; name: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="outline"
      className="h-9 rounded-full font-bold"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await unblockUser(userId).catch(() => null);
          if (!result?.ok) return void toast.error("Couldn't unblock — try again.");
          toast.success(`${name} is unblocked`);
          router.refresh();
        })
      }
    >
      Unblock
    </Button>
  );
}
