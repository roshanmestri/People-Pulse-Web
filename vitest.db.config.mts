import path from "node:path";

import { defineConfig } from "vitest/config";

// Integration tests against the real Postgres in Docker (docker compose up -d).
export default defineConfig({
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src") } },
  test: {
    include: ["src/**/*.db.test.ts"],
    environment: "node",
    testTimeout: 30_000,
    fileParallelism: false,
  },
});
