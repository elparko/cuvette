import { mkdtempSync, realpathSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll } from "vitest";
import { readOldEnv } from "../src/core/old-names.ts";

readOldEnv();

const tempRoot = mkdtempSync(join(realpathSync(tmpdir()), "cuvette-test-"));
process.env.TMPDIR = tempRoot;
process.env.CUVETTE_SPEND_FILE = join(tempRoot, "spend.jsonl");
afterAll(() => {
  try {
    rmSync(tempRoot, { recursive: true, force: true, maxRetries: 30, retryDelay: 200 });
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "ENOTEMPTY") throw e;
  }
});
