import { chmodSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
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

test("a path that starts with ~/.cuvette is read from CUVETTE_HOME", async () => {
  const dir = mkdtempSync(join(tmpdir(), "cuvette-locate-"));
  const empty = join(dir, "empty");
  const full = join(dir, "full");
  mkdirSync(empty);
  mkdirSync(join(full, "envs", "x", "bin"), { recursive: true });
  const python = join(full, "envs", "x", "bin", "python");
  writeFileSync(python, "#!/bin/sh\necho 1\n");
  chmodSync(python, 0o755);
  const manifest = {
    adapter: { name: "locate-home-test" },
    program: { name: "p", version: "0" },
    locate: { paths: ["~/.cuvette/envs/x/bin/python"], which: [], version_command: [] },
  } as unknown as Manifest;
  const before = process.env.CUVETTE_HOME;
  try {
    process.env.CUVETTE_HOME = empty;
    expect((await locate(manifest, dir)).path).toBeUndefined();
    process.env.CUVETTE_HOME = full;
    expect((await locate(manifest, dir)).path).toBe(python);
  } finally {
    if (before === undefined) delete process.env.CUVETTE_HOME;
    else process.env.CUVETTE_HOME = before;
  }
});
