import Link from "next/link";

import { cn } from "@/lib/utils";

const TABS = [
  { href: "/admin", label: "Reports" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/categories", label: "Categories" },
] as const;

export function AdminNav({ active }: { active: (typeof TABS)[number]["href"] }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <h1 className="text-4xl font-extrabold tracking-[-0.045em]">Admin</h1>
        <span className="rounded-full bg-foreground px-2.5 py-1 text-xs font-extrabold text-background">
          Moderation
        </span>
      </div>
      <nav aria-label="Admin" className="flex gap-1 self-start rounded-full bg-muted p-1">
        {TABS.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active === tab.href ? "page" : undefined}
            className={cn(
              "rounded-full px-4 py-2 text-sm",
              active === tab.href
                ? "bg-background font-extrabold shadow-sm"
                : "font-semibold text-muted-foreground",
            )}
          >
            {tab.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
