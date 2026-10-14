import { mkdtempSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "vitest";
import { harnessWrites } from "../src/core/harness-writes.ts";
import { trustFolder } from "../src/core/trust.ts";

test("saving the trust list counts as a harness write", () => {
  const old = process.env.CUVETTE_HOME;
  process.env.CUVETTE_HOME = mkdtempSync(join(tmpdir(), "cuvette-hw-"));
  try {
    const folder = realpathSync(mkdtempSync(join(tmpdir(), "cuvette-hw-folder-")));
    const before = harnessWrites();
    trustFolder(folder);
    expect(harnessWrites()).toBeGreaterThan(before);
  } finally {
    if (old === undefined) delete process.env.CUVETTE_HOME;
    else process.env.CUVETTE_HOME = old;
  }
});
