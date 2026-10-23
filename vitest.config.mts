import path from "node:path";

import { defineConfig } from "vitest/config";

// Unit tests for pure logic (no browser, no database). Run: npm test
export default defineConfig({
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src") } },
  test: { include: ["src/**/*.test.ts"], environment: "node" },
});
