import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "vitest";
import { crc32, zip } from "../src/eln/zip.ts";
import { unzip } from "./fixtures/unzip.ts";

test("crc32 matches the known value", () => {
  expect(crc32(Buffer.from("123456789"))).toBe(0xcbf43926);
});

test("files and folders round trip, with deflate and store", () => {
  const big = Buffer.from("abc".repeat(1000));
  const tiny = Buffer.from("x");
  const out = unzip(zip([{ name: "top/", data: Buffer.alloc(0) }, { name: "top/big.txt", data: big }, { name: "top/ü.txt", data: tiny }]));
  expect([...out.keys()]).toEqual(["top/", "top/big.txt", "top/ü.txt"]);
  expect(out.get("top/big.txt")).toEqual(big);
  expect(out.get("top/ü.txt")).toEqual(tiny);
});

test("the system unzip tool accepts the archive", () => {
  const dir = mkdtempSync(join(tmpdir(), "cuvette-zip-"));
  const file = join(dir, "a.zip");
  writeFileSync(file, zip([{ name: "t/", data: Buffer.alloc(0) }, { name: "t/a.txt", data: Buffer.from("hello ".repeat(100)) }]));
  try {
    expect(execFileSync("unzip", ["-t", file]).toString()).toMatch(/No errors detected/);
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
  }
});
