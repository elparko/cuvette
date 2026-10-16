import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");

function packedPaths(): string[] {
  const out = execFileSync("npm", ["pack", "--dry-run", "--json", "--ignore-scripts"], {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    shell: process.platform === "win32",
  });
  const [pack] = JSON.parse(out) as { files: { path: string }[] }[];
  return pack.files.map((f) => f.path);
}

describe("npm package file list", () => {
  it("includes the license and citation files and excludes tests and bench", () => {
    const paths = packedPaths();
    expect(paths).toContain("CITATION.cff");
    expect(paths).toContain("CREDITS.md");
    expect(paths).toContain("DATA_LICENSES.md");
    expect(paths.some((p) => p.startsWith("LICENSES/"))).toBe(true);
    expect(paths).toContain("bin/cuvette.js");
    expect(paths).toContain("bin/node-check.js");
    expect(paths.some((p) => p.startsWith("tests/"))).toBe(false);
    expect(paths.some((p) => p.startsWith("bench/"))).toBe(false);
  }, 120_000);
});
