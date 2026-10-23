"use client"; // error boundaries must be Client Components

import { RotateCw } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";

/**
 * Catches unexpected errors in any app page (the header and tab bar stay usable).
 * `retry()` re-fetches and re-renders the failed segment — often enough for a blip.
 */
export default function AppError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error); // M9: send to error tracking (e.g. Sentry) with error.digest
  }, [error]);
  const digest = error instanceof Error && "digest" in error ? String(error.digest) : null;

  return (
    <section
      role="alert"
      className="mx-auto flex w-full max-w-lg flex-col items-center gap-5 px-4 py-20 text-center"
    >
      <span className="grid size-16 place-items-center rounded-3xl bg-accent text-3xl font-extrabold text-accent-foreground">
        !
      </span>
      <h1 className="text-3xl font-extrabold tracking-[-0.04em]">Something went wrong</h1>
      <p className="text-muted-foreground">
        That didn&apos;t load. It&apos;s probably temporary — try again, or head back to Explore.
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        <Button className="h-11 rounded-full px-5 font-extrabold" onClick={() => retry()}>
          <RotateCw className="size-4" aria-hidden="true" /> Try again
        </Button>
        <Link href="/explore" className="flex h-11 items-center rounded-full border px-5 font-bold">
          Go to Explore
        </Link>
      </div>
      {digest ? <p className="text-xs text-muted-foreground">Error reference: {digest}</p> : null}
    </section>
  );
}
