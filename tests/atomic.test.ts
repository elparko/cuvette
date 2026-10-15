import { existsSync, linkSync, mkdtempSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "vitest";
import { copyFileAtomic, writeFileAtomic } from "../src/core/atomic.ts";

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
