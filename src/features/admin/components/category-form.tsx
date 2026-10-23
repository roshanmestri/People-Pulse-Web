"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { createCategory } from "../actions";

export function CategoryForm() {
  const router = useRouter();
  const [values, setValues] = useState({ name: "", slug: "", icon: "Sparkles" });
  const [pending, startTransition] = useTransition();
  const set = (key: keyof typeof values) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setValues((v) => ({
      ...v,
      [key]: e.target.value,
      // Suggest a slug from the name until the admin edits it.
      ...(key === "name"
        ? {
            slug: e.target.value
              .toLowerCase()
              .trim()
              .replace(/[^a-z]+/g, "-")
              .replace(/^-|-$/g, ""),
          }
        : {}),
    }));

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const result = await createCategory(values);
          if (!result.ok) return void toast.error(result.error);
          toast.success(`Added “${values.name}”`);
          setValues({ name: "", slug: "", icon: "Sparkles" });
          router.refresh();
        });
      }}
      className="grid gap-3 rounded-3xl border bg-card p-5 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end"
    >
      <label className="flex flex-col gap-1.5 text-sm font-bold">
        Name
        <Input
          value={values.name}
          onChange={set("name")}
          placeholder="Board games"
          className="h-10 rounded-xl"
          required
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-bold">
        Slug
        <Input
          value={values.slug}
          onChange={set("slug")}
          placeholder="board-games"
          className="h-10 rounded-xl"
          required
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-bold">
        Icon (lucide name)
        <Input
          value={values.icon}
          onChange={set("icon")}
          placeholder="Puzzle"
          className="h-10 rounded-xl"
          required
        />
      </label>
      <Button type="submit" disabled={pending} className="h-10 rounded-full font-extrabold">
        Add category
      </Button>
    </form>
  );
}
