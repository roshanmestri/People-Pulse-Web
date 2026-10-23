import { readFileSync } from "node:fs";

import { test as base, type Page } from "@playwright/test";

import { STATE_DIR, type Fixtures, type Role } from "./db";

/** Pages already signed in as each test user (sessions saved by global-setup). */
type RolePages = { as: (role: Role) => Promise<Page>; plans: Fixtures };

export const test = base.extend<RolePages>({
  plans: async ({}, provide) => {
    await provide(JSON.parse(readFileSync(`${STATE_DIR}/fixtures.json`, "utf8")) as Fixtures);
  },
  // (Playwright calls the second argument `use`; renamed so the React hooks lint rule
  // doesn't mistake it for React's use().)
  as: async ({ browser }, provide) => {
    const contexts: Awaited<ReturnType<typeof browser.newContext>>[] = [];
    await provide(async (role) => {
      const context = await browser.newContext({ storageState: `${STATE_DIR}/${role}.json` });
      contexts.push(context);
      return context.newPage();
    });
    await Promise.all(contexts.map((c) => c.close()));
  },
});

export { expect } from "@playwright/test";
