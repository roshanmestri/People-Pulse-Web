import { cn } from "@/lib/utils";

/** Blue "verified host" seal (BRD FR-2.5). */
export function VerifiedBadge({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      role="img"
      aria-label="Verified host"
      className={cn("inline-block size-4 shrink-0", className)}
    >
      <path
        d="M12 2l2.4 2.1 3.2-.3.9 3.1 2.8 1.6-1 3 1 3-2.8 1.6-.9 3.1-3.2-.3L12 22l-2.4-2.1-3.2.3-.9-3.1-2.8-1.6 1-3-1-3 2.8-1.6.9-3.1 3.2.3z"
        className="fill-verified"
      />
      <path
        d="m8.5 12 2.3 2.3 4.7-4.6"
        fill="none"
        stroke="#fff"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
