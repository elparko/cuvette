import { defineConfig } from "vitest/config";

export default defineConfig({
  test: { include: ["tests/**/*.test.ts", "tests/**/*.test.tsx", "catalog/**/*.test.ts"], testTimeout: 60000, hookTimeout: 60000, setupFiles: ["tests/setup.ts"] },
});
