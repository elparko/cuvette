import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { expect, test } from "vitest";
import { CATALOG_DIR } from "../src/adapters/manifest.ts";

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const p = join(dir, d.name);
    return d.isDirectory() ? walk(p) : d.isFile() ? [p] : [];
  });
}

test("the catalog names no private drive under /Volumes/", () => {
  const files = walk(CATALOG_DIR).filter((p) => /\.(ya?ml|sh|R|py|mjs|js|ts|md|txt|idXML)$/.test(p));
  expect(files.filter((p) => p.endsWith("adapter.yaml")).length).toBeGreaterThan(40);
  const hits = files.filter((p) => readFileSync(p, "utf8").includes("/Volumes/")).map((p) => relative(CATALOG_DIR, p));
  expect(hits).toEqual([]);
});

test("the catalog and the source name no private folder of the author", () => {
  const files = [...walk(CATALOG_DIR), ...walk(join(CATALOG_DIR, "../src"))].filter((p) => /\.(ya?ml|sh|R|py|mjs|js|ts|tsx|md|txt)$/.test(p));
  const hits = files.filter((p) => /\/Users\/parker|\/Volumes\/T\d\b/.test(readFileSync(p, "utf8"))).map((p) => relative(CATALOG_DIR, p));
  expect(hits).toEqual([]);
});
