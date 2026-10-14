import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "vitest";
import { fileHash, harnessWrite, harnessWrote, noteHarnessWrite } from "../src/core/harness-writes.ts";

const file = () => join(mkdtempSync(join(tmpdir(), "cuvette-hw-")), "settings.json");

test("a file that the harness wrote counts as written only while it has the recorded content", () => {
  const f = file();
  harnessWrite(f, () => writeFileSync(f, "one"));
  expect(harnessWrote(f, fileHash(f))).toBe(true);
  writeFileSync(f, "two");
  expect(harnessWrote(f, fileHash(f))).toBe(false);
});

test("a file with no recorded write is not a harness write, and a recorded hash is for that path only", () => {
  const a = file();
  const b = file();
  writeFileSync(a, "x");
  writeFileSync(b, "x");
  expect(harnessWrote(a, fileHash(a))).toBe(false);
  noteHarnessWrite(a);
  expect(harnessWrote(a, fileHash(a))).toBe(true);
  expect(harnessWrote(b, fileHash(b))).toBe(false);
});

test("a file counts as written by the harness while the write is running", () => {
  const f = file();
  writeFileSync(f, "x");
  harnessWrite(f, () => {
    expect(harnessWrote(f, "any hash")).toBe(true);
  });
  expect(harnessWrote(f, "any hash")).toBe(false);
});
