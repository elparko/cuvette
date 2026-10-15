import { existsSync, linkSync, mkdtempSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test, vi } from "vitest";
import { AnalysisRecord } from "../src/core/record.ts";
import { COPY_LIMIT_BYTES } from "../src/core/places.ts";
import { copyFileAtomic, writeFileAtomic } from "../src/core/atomic.ts";

const reads = vi.hoisted(() => [] as string[]);

vi.mock("node:fs", async (original) => {
  const real = await original<typeof import("node:fs")>();
  return { ...real, readFileSync: ((p: any, ...rest: any[]) => (reads.push(String(p)), (real.readFileSync as any)(p, ...rest))) as typeof real.readFileSync };
});

const tmp = () => mkdtempSync(join(tmpdir(), "cuvette-atomic-"));

test("writeFileAtomic puts the new text in a new file and leaves no temporary file", () => {
  const dir = tmp();
  const file = join(dir, "a.json");
  writeFileSync(file, "old");
  linkSync(file, join(dir, "b.json"));
  writeFileAtomic(file, "new");
  expect(readFileSync(file, "utf8")).toBe("new");
  expect(readFileSync(join(dir, "b.json"), "utf8")).toBe("old");
  expect(readdirSync(dir).sort()).toEqual(["a.json", "b.json"]);
});

test("writeFileAtomic removes its temporary file if the rename fails", () => {
  const dir = tmp();
  const file = join(dir, "target");
  writeFileAtomic(join(dir, "other"), "x");
  expect(() => writeFileAtomic(join(dir, "missing", "f"), "x")).toThrow();
  writeFileSync(join(dir, "keep"), "");
  expect(readdirSync(dir).sort()).toEqual(["keep", "other"]);
  expect(existsSync(file)).toBe(false);
});

test.skipIf(process.platform === "win32")("writeFileAtomic sets the mode of a new file", () => {
  const file = join(tmp(), "secret");
  writeFileAtomic(file, "x", 0o600);
  expect(statSync(file).mode & 0o777).toBe(0o600);
});

test("copyFileAtomic copies through a temporary file in the same folder", () => {
  const dir = tmp();
  writeFileSync(join(dir, "src"), "abc");
  writeFileSync(join(dir, "dest"), "old");
  linkSync(join(dir, "dest"), join(dir, "link"));
  copyFileAtomic(join(dir, "src"), join(dir, "dest"));
  expect(readFileSync(join(dir, "dest"), "utf8")).toBe("abc");
  expect(readFileSync(join(dir, "link"), "utf8")).toBe("old");
  expect(readdirSync(dir).sort()).toEqual(["dest", "link", "src"]);
});

test("a large file in the work folder is copied without reading it whole into memory", () => {
  const dir = tmp();
  const r = new AnalysisRecord(join(dir, "rec"), "s1");
  const src = join(dir, "rec", "work", "big.bin");
  writeFileSync(src, Buffer.alloc(COPY_LIMIT_BYTES + 1, 5));
  reads.length = 0;
  const sha = r.putBlob(src);
  expect(reads).not.toContain(src);
  expect(statSync(r.blobPath(sha)!).size).toBe(COPY_LIMIT_BYTES + 1);
  expect(readdirSync(join(dir, "rec", "blobs"))).toEqual([sha + ".bin"]);
});
