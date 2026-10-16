import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx", "catalog/**/*.test.ts"],
    globalSetup: ["tests/global-setup.ts"],
    setupFiles: ["tests/setup.ts"],
    pool: "forks",
    ...(process.env.GITHUB_ACTIONS ? {} : { maxWorkers: 4 }),
    testTimeout: 120000,
    hookTimeout: 60000,
    teardownTimeout: 30000,
  },
});
