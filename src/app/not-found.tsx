import Image from "next/image";
import Link from "next/link";

import { Logo } from "@/components/brand/logo";

// Shown for unknown URLs and whenever a page calls notFound() (missing, hidden or
// blocked content all look the same — nothing to discover).
export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex h-16 w-full max-w-7xl items-center px-4 sm:px-8">
        <Logo />
      </header>
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center gap-6 px-4 pb-16 text-center">
        <div className="relative h-44 w-full overflow-hidden rounded-3xl bg-muted">
          <Image src="/images/trek.jpg" alt="" fill sizes="576px" className="object-cover" />
          <span className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
          <span className="absolute bottom-4 left-5 text-5xl font-extrabold tracking-[-0.05em] text-white">
            404
          </span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-[-0.04em]">This page could not be found</h1>
        <p className="max-w-sm text-muted-foreground">
          The plan may have been cancelled or removed, or the link is wrong. There&apos;s plenty
          more happening nearby.
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          <Link
            href="/explore"
            className="rounded-full bg-primary px-5 py-3 font-extrabold text-primary-foreground"
          >
            Explore plans
          </Link>
          <Link href="/" className="rounded-full border px-5 py-3 font-bold">
            Home
          </Link>
        </div>
      </main>
    </div>
  );
}
