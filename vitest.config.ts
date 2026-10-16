import { availableParallelism } from "node:os";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx", "catalog/**/*.test.ts"],
    globalSetup: ["tests/global-setup.ts"],
    setupFiles: ["tests/setup.ts"],
    pool: "forks",
    maxWorkers: Math.max(1, Math.min(4, availableParallelism() - 1)),
    testTimeout: 120000,
    hookTimeout: process.env.GITHUB_ACTIONS ? 180000 : 60000,
    teardownTimeout: 30000,
  },
});
