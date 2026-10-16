import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx", "catalog/**/*.test.ts"],
    globalSetup: ["tests/global-setup.ts"],
    setupFiles: ["tests/setup.ts"],
    pool: "forks",
    maxWorkers: 4,
    testTimeout: 120000,
    hookTimeout: 60000,
    teardownTimeout: 30000,
  },
});
