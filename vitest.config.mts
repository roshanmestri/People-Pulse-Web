import path from "node:path";

import { configDefaults, defineConfig } from "vitest/config";

// Unit tests for pure logic (no browser, no database). Run: npm test
// Tests named *.db.test.ts need the Docker database and run via: npm run test:db
export default defineConfig({
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src") } },
  test: {
    include: ["src/**/*.test.ts"],
    exclude: [...configDefaults.exclude, "src/**/*.db.test.ts"],
    environment: "node",
  },
});
