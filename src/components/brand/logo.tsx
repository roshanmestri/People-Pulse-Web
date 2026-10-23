import Link from "next/link";

import { cn } from "@/lib/utils";

export function Logo({
  tone = "default",
  className,
}: {
  tone?: "default" | "light";
  className?: string;
}) {
  return (
    <Link
      href="/"
      className={cn(
        "flex items-center gap-2.5 text-[22px] font-extrabold tracking-[-0.04em]",
        tone === "light" ? "text-white" : "text-foreground",
        className,
      )}
    >
      <span className="grid size-[30px] place-items-center rounded-[9px] bg-primary">
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#0f0f10"
          strokeWidth="3"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="10" r="3" />
          <path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z" />
        </svg>
      </span>
      gathr
    </Link>
  );
}
