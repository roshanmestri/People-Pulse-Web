"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";

import { loadMoreActivities } from "../actions";
import type { DiscoverItem } from "../queries";
import { ActivityCard } from "./activity-card";

type Props = {
  initialItems: DiscoverItem[];
  initialCursor: string | null;
  query: string;
  compact: boolean;
};

/** First page arrives server-rendered; "Load more" appends pages via a Server Action. */
export function ResultsList({ initialItems, initialCursor, query, compact }: Props) {
  const [items, setItems] = useState(initialItems);
  const [cursor, setCursor] = useState(initialCursor);
  const [pending, startTransition] = useTransition();

  function loadMore() {
    if (!cursor) return;
    startTransition(async () => {
      const page = await loadMoreActivities(query, cursor);
      setItems((current) => [
        ...current,
        ...page.items.filter((i) => !current.some((c) => c.id === i.id)),
      ]);
      setCursor(page.nextCursor);
    });
  }

  return (
    <div className="flex flex-col gap-8">
      <ul
        className={
          compact ? "grid gap-6 sm:grid-cols-2" : "grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
        }
      >
        {items.map((item, i) => (
          <li key={item.id}>
            <ActivityCard item={item} eager={i < 3} />
          </li>
        ))}
      </ul>
      {cursor ? (
        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={loadMore}
          disabled={pending}
          className="h-12 self-center rounded-full px-8 font-bold"
        >
          {pending ? "Loading…" : "Load more"}
        </Button>
      ) : items.length > 3 ? (
        <p className="text-center text-sm font-semibold text-muted-foreground">
          That&apos;s everything nearby.
        </p>
      ) : null}
    </div>
  );
}
