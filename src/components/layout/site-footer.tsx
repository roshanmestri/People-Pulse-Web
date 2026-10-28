import Link from "next/link";

/** Footer for the public pages (landing, about, privacy, terms). Server Component. */
export function SiteFooter() {
  return (
    <footer className="border-t bg-muted/60">
      <div className="mx-auto flex max-w-7xl flex-wrap justify-between gap-4 px-4 py-7 text-sm text-muted-foreground sm:px-8">
        <span>© 2026 gathr</span>
        <nav aria-label="Footer" className="flex flex-wrap gap-5">
          <Link href="/about">About</Link>
          <Link href="/#safety">Safety</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
        </nav>
      </div>
    </footer>
  );
}
