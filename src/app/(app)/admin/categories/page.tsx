import type { Metadata } from "next";
import { Suspense } from "react";

import { CategoryIcon } from "@/components/category-icon";
import { setCategoryActive } from "@/features/admin/actions";
import { ActionButton } from "@/features/admin/components/action-button";
import { AdminNav } from "@/features/admin/components/admin-nav";
import { CategoryForm } from "@/features/admin/components/category-form";
import { listAllCategories } from "@/features/admin/queries";
import { requireAdmin } from "@/lib/session";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Admin · Categories" };

export default function AdminCategoriesPage() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-8">
      <AdminNav active="/admin/categories" />
      <Suspense fallback={<div className="h-96 animate-pulse rounded-3xl bg-muted" />}>
        <Categories />
      </Suspense>
    </div>
  );
}

async function Categories() {
  await requireAdmin();
  const categories = await listAllCategories();
  return (
    <>
      <CategoryForm />
      <p className="-mt-2 text-sm text-muted-foreground">
        Hidden categories disappear from Explore filters and the host form; existing plans keep
        theirs.
      </p>
      <ul className="grid gap-2.5 sm:grid-cols-2">
        {categories.map((c) => (
          <li
            key={c.id}
            className={cn(
              "flex items-center gap-3 rounded-2xl border bg-card p-3.5",
              !c.isActive && "opacity-60",
            )}
          >
            <span className="grid size-10 place-items-center rounded-xl bg-accent">
              <CategoryIcon name={c.icon} className="size-5 text-brand-deep" />
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <strong className="truncate font-extrabold">{c.name}</strong>
              <span className="text-xs text-muted-foreground">
                {c.slug} · {c._count.activities} plans{c.isActive ? "" : " · hidden"}
              </span>
            </span>
            <ActionButton
              action={setCategoryActive.bind(null, c.id, !c.isActive)}
              label={c.isActive ? "Hide" : "Show"}
              success={c.isActive ? `Hid ${c.name}` : `Showing ${c.name}`}
            />
          </li>
        ))}
      </ul>
    </>
  );
}
