"use client";

import { Share2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

/**
 * Phones: opens the system share sheet (WhatsApp, Instagram, …) via the Web Share API.
 * Desktop browsers without it: copies the link. `text` must stay public-safe — area, not venue.
 */
export function ShareButton({ title, text }: { title: string; text: string }) {
  async function share() {
    const url = window.location.href.split(/[?#]/)[0]!;
    if (navigator.share) {
      // AbortError = the user closed the sheet; nothing to report.
      await navigator.share({ title, text, url }).catch(() => undefined);
      return;
    }
    try {
      await navigator.clipboard.writeText(`${text}\n${url}`);
      toast.success("Link copied — paste it in your group chat");
    } catch {
      toast.error("Couldn't copy — copy the address bar instead.");
    }
  }

  return (
    <Button variant="outline" className="h-12 w-full rounded-full font-bold" onClick={share}>
      <Share2 className="size-4" aria-hidden="true" /> Share with friends
    </Button>
  );
}
