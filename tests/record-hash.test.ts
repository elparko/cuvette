import { mkdtempSync, readFileSync, rmSync, statSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, test, vi } from "vitest";

const reads = vi.hoisted(() => ({ n: 0 }));
vi.mock("node:fs", async (orig) => {
  const m = await orig<typeof import("node:fs")>();
  return { ...m, readSync: ((...a: Parameters<typeof m.readSync>) => (reads.n++, m.readSync(...a))) as typeof m.readSync };
});

import { COPY_LIMIT_BYTES } from "../src/core/places.ts";
import { AnalysisRecord } from "../src/core/record.ts";

const dirs: string[] = [];
afterEach(() => {
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true });
});

test("a large referenced file with a new time is hashed once for many blobPath calls", () => {
  const dir = mkdtempSync(join(tmpdir(), "cuvette-hash-"));
  dirs.push(dir);
  const work = join(dir, "out");
  const r = new AnalysisRecord(join(dir, "rec"), "s1", { workDir: work, exportDir: work, project: dir });
  const big = join(dir, "big.bin");
  writeFileSync(big, Buffer.alloc(COPY_LIMIT_BYTES + 1, 7));
  const sha = r.putBlob(big);
  const st = statSync(big);
  utimesSync(big, st.atime, new Date(st.mtimeMs + 5000));
  reads.n = 0;
  expect(r.blobPath(sha)).toBe(big);
  const first = reads.n;
  expect(first).toBeGreaterThan(0);
  expect(r.blobPath(sha)).toBe(big);
  expect(r.blobPath(sha)).toBe(big);
  expect(reads.n).toBe(first);
  expect(readFileSync(big).length).toBe(COPY_LIMIT_BYTES + 1);
});
