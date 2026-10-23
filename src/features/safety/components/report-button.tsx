"use client";

import { Flag } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

import { reportContent } from "../actions";
import { REPORT_REASONS, type ReportInput, type ReportReason } from "../schemas";

type Props = {
  targetType: ReportInput["targetType"];
  targetId: string;
  /** What's being reported, for the dialog title ("this plan", "Aarav", "this message"). */
  what: string;
  variant?: "link" | "button" | "icon";
};

/** FR-8.1 — report dialog. Goes to the admin queue; the reported person isn't told who. */
export function ReportButton({ targetType, targetId, what, variant = "link" }: Props) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason | "">("");
  const [details, setDetails] = useState("");
  const [pending, startTransition] = useTransition();

  function submit() {
    if (!reason) return;
    startTransition(async () => {
      const result = await reportContent({ targetType, targetId, reason, details }).catch(
        () => null,
      );
      if (!result) return void toast.error("Couldn't send the report — try again.");
      if (!result.ok) return void toast.error(result.error);
      toast.success("Thanks — our team will review it.");
      setOpen(false);
      setReason("");
      setDetails("");
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {variant === "icon" ? (
          <button
            type="button"
            aria-label={`Report ${what}`}
            className="grid size-7 place-items-center rounded-full text-muted-foreground opacity-60 hover:bg-muted hover:opacity-100 focus-visible:opacity-100"
          >
            <Flag className="size-3.5" aria-hidden="true" />
          </button>
        ) : (
          <button
            type="button"
            className={cn(
              "inline-flex items-center gap-1.5 text-sm font-bold",
              variant === "button"
                ? "h-10 rounded-full border px-4"
                : "text-muted-foreground underline-offset-4 hover:underline",
            )}
          >
            <Flag className="size-4" aria-hidden="true" /> Report
          </button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Report {what}</DialogTitle>
          <DialogDescription>
            Reports are private. Our team reviews every one. If anyone is in danger, call 112.
          </DialogDescription>
        </DialogHeader>
        <RadioGroup
          value={reason}
          onValueChange={(v) => setReason(v as ReportReason)}
          className="gap-2"
        >
          {REPORT_REASONS.map(([value, label]) => (
            <Label
              key={value}
              htmlFor={`reason-${value}`}
              className={cn(
                "flex cursor-pointer items-center gap-3 rounded-xl border p-3 font-semibold",
                reason === value && "border-primary bg-accent",
              )}
            >
              <RadioGroupItem id={`reason-${value}`} value={value} />
              {label}
            </Label>
          ))}
        </RadioGroup>
        <label className="flex flex-col gap-1.5 text-sm font-bold">
          Anything else? <span className="font-normal text-muted-foreground">(optional)</span>
          <Textarea
            rows={3}
            maxLength={500}
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            className="rounded-xl font-normal"
          />
        </label>
        <DialogFooter>
          <Button variant="outline" className="rounded-full" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            className="rounded-full font-extrabold"
            disabled={!reason || pending}
            onClick={submit}
          >
            {pending ? "Sending…" : "Send report"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
