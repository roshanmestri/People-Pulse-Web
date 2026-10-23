"use server";

import { hiddenUserIds } from "@/features/safety/queries";
import { getSessionUser } from "@/lib/session";

import { decodeCursor, encodeCursor, parseFilters } from "./filters";
import { getHome, resolveCenter, searchActivities, toSearchArgs } from "./queries";

/**
 * "Load more" on Explore. Takes the page's query string + the cursor it was given,
 * re-parses everything (never trust the client) and returns the next page.
 */
export async function loadMoreActivities(query: string, cursor: string) {
  const parsedCursor = decodeCursor(cursor);
  if (!parsedCursor) return { items: [], nextCursor: null };

  const filters = parseFilters(Object.fromEntries(new URLSearchParams(query)));
  const user = await getSessionUser();
  const center = resolveCenter(filters, user ? await getHome(user.id) : null);

  const hidden = await hiddenUserIds(user?.id ?? null);
  const page = await searchActivities(toSearchArgs(filters, center, hidden), parsedCursor);
  return { items: page.items, nextCursor: page.nextCursor ? encodeCursor(page.nextCursor) : null };
}
