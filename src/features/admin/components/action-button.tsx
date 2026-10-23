"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

type Result = { ok: true } | { ok: false; error: string };

type Props = {
  /** A Server Action pre-bound on the server, e.g. setUserSuspended.bind(null, id, true). */
  action: (reason?: string) => Promise<Result>;
  label: string;
  success: string;
  variant?: "default" | "outline" | "destructive" | "ghost";
  confirm?: string;
  /** Ask for a short reason first (shown to the user where relevant). */
  askReason?: string;
};

export function ActionButton({
  action,
  label,
  success,
  variant = "outline",
  confirm,
  askReason,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      size="sm"
      variant={variant}
      disabled={pending}
      className="h-9 rounded-full px-3.5 font-bold"
      onClick={() => {
        if (confirm && !window.confirm(confirm)) return;
        const reason = askReason ? window.prompt(askReason) : undefined;
        if (askReason && reason === null) return; // cancelled
        startTransition(async () => {
          const result = await action(reason ?? undefined).catch(() => null);
          if (!result?.ok) return void toast.error(result?.error ?? "Something went wrong");
          toast.success(success);
          router.refresh();
        });
      }}
    >
      {pending ? "…" : label}
    </Button>
  );
}
