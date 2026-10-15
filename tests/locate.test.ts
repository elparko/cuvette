import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "vitest";
import { locate } from "../src/adapters/locate.ts";
import type { Manifest } from "../src/adapters/manifest.ts";

test("the version command does not get environment variables with secret names", async () => {
  const dir = mkdtempSync(join(tmpdir(), "cuvette-locate-"));
  const file = join(dir, "env.js");
  writeFileSync(file, "console.log(`key=${process.env.ANTHROPIC_API_KEY ?? 'none'} keep=${process.env.CUVETTE_KEEP ?? 'none'}`)");
  const before = { key: process.env.ANTHROPIC_API_KEY, keep: process.env.CUVETTE_KEEP };
  process.env.ANTHROPIC_API_KEY = "sk-test-secret";
  process.env.CUVETTE_KEEP = "yes";
  try {
    const manifest = {
      adapter: { name: "locate-env-test" },
      program: { name: "p", version: "0" },
      locate: { paths: [], which: [], version_command: [process.execPath, file] },
    } as unknown as Manifest;
    const r = await locate(manifest, dir);
    expect(r.version).toBe("key=none keep=yes");
  } finally {
    if (before.key === undefined) delete process.env.ANTHROPIC_API_KEY;
    else process.env.ANTHROPIC_API_KEY = before.key;
    if (before.keep === undefined) delete process.env.CUVETTE_KEEP;
    else process.env.CUVETTE_KEEP = before.keep;
  }
});
