/**
 * Shown instantly while an app page's server work is in flight (navigation feedback).
 * Pages also have their own finer-grained <Suspense> skeletons for the parts that stream.
 */
export default function Loading() {
  return (
    <div
      className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-8"
      aria-busy="true"
      aria-live="polite"
    >
      <span className="sr-only">Loading…</span>
      <div className="h-10 w-64 animate-pulse rounded-2xl bg-muted" />
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="flex flex-col gap-3">
            <div className="aspect-[4/3] animate-pulse rounded-[20px] bg-muted" />
            <div className="h-5 w-3/4 animate-pulse rounded-lg bg-muted" />
            <div className="h-4 w-1/2 animate-pulse rounded-lg bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}
