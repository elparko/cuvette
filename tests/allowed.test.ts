import { mkdirSync, mkdtempSync, rmSync, statSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, expect, test } from "vitest";
import { adapterFolderState, folderDigest, MAX_ADAPTER_FILES, rememberAdapterFolder } from "../src/adapters/allowed.ts";

const oldHome = process.env.CUVETTE_HOME;
let home = "";
let dir = "";

beforeEach(() => {
  home = mkdtempSync(join(tmpdir(), "cuvette-allowed-home-"));
  process.env.CUVETTE_HOME = home;
  dir = mkdtempSync(join(tmpdir(), "cuvette-allowed-"));
  writeFileSync(join(dir, "adapter.yaml"), "name: x\n");
});
afterEach(() => {
  if (oldHome === undefined) delete process.env.CUVETTE_HOME;
  else process.env.CUVETTE_HOME = oldHome;
  rmSync(home, { recursive: true, force: true });
  rmSync(dir, { recursive: true, force: true });
});

const unix = test.skipIf(process.platform === "win32");

test("a folder that nobody allowed has no entry, and an allowed folder is the same until a file changes", () => {
  expect(adapterFolderState(dir)).toBe("none");
  expect(rememberAdapterFolder(dir)).toBe(true);
  expect(adapterFolderState(dir)).toBe("same");
  writeFileSync(join(dir, "adapter.yaml"), "name: y\n");
  expect(adapterFolderState(dir)).toBe("changed");
});

unix("the store file is private", () => {
  rememberAdapterFolder(dir);
  expect(statSync(join(home, "adapter-hashes.json")).mode & 0o777).toBe(0o600);
});

unix("a symbolic link counts as its target text and is never followed", () => {
  symlinkSync("/etc/hostname", join(dir, "server.ts"));
  const a = folderDigest(dir).hash;
  rmSync(join(dir, "server.ts"));
  symlinkSync("/etc/hosts", join(dir, "server.ts"));
  expect(folderDigest(dir).hash).not.toBe(a);
});

test("node_modules, .venv and .git are not hashed, and the digest lists node_modules and .venv", () => {
  rememberAdapterFolder(dir);
  for (const n of ["node_modules", ".venv", ".git"]) {
    mkdirSync(join(dir, n));
    writeFileSync(join(dir, n, "f.txt"), "x");
  }
  expect(adapterFolderState(dir)).toBe("same");
  expect(folderDigest(dir).notHashed).toEqual([".git", ".venv", "node_modules"]);
});

test("a folder with more than the file limit cannot be trusted", () => {
  mkdirSync(join(dir, "many"));
  for (let i = 0; i <= MAX_ADAPTER_FILES; i++) writeFileSync(join(dir, "many", `f${i}.txt`), "");
  expect(rememberAdapterFolder(dir)).toBe(false);
  expect(adapterFolderState(dir)).toBe("too many files");
});
