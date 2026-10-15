import { mkdtempSync, realpathSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll } from "vitest";
import { readOldEnv } from "../src/core/old-names.ts";

readOldEnv();
process.env.CUVETTE_CARD_GUARD_MS = "0";

const tempRoot = mkdtempSync(join(realpathSync.native(tmpdir()), "cuvette-test-"));
process.env.TMPDIR = tempRoot;
process.env.TEMP = tempRoot;
process.env.TMP = tempRoot;
process.env.CUVETTE_SPEND_FILE = join(tempRoot, "spend.jsonl");
afterAll(() => {
  try {
    rmSync(tempRoot, { recursive: true, force: true, maxRetries: 30, retryDelay: 200 });
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "ENOTEMPTY") throw e;
  }
});
