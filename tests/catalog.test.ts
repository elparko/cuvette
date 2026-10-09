import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach, expect, test } from "vitest";
import { adapterIndex, alternatives, fileTypeHint, filesFor, formatIndex, installHint } from "../src/adapters/catalog.ts";
import { Manifest } from "../src/adapters/manifest.ts";
import { trustFolder } from "../src/core/trust.ts";

let cwd = "";
beforeEach(() => {
  process.env.GA_HOME = mkdtempSync(join(tmpdir(), "ga-catalog-home-"));
  cwd = mkdtempSync(join(tmpdir(), "ga-catalog-"));
  const dir = join(cwd, ".ga", "adapters", "stats-here");
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, "adapter.yaml"),
    [
      "adapter: { name: stats-here, field: statistics, file_types: ['.csv', '.tsv'], status: approved, description: 'Runs t tests on a CSV file. Second sentence.' }",
      "program: { name: Stats here }",
      "connection: { kind: cli }",
      "locate: { env: GA_STATS_HERE, paths: ['/nowhere/stats-here'] }",
    ].join("\n"),
  );
  trustFolder(cwd);
});

test("the index lists every adapter with its field, file types, status and program check", () => {
  const list = adapterIndex(cwd);
  const mine = list.find((a) => a.name === "stats-here")!;
  expect(mine).toMatchObject({ program: "Stats here", field: "statistics", fileTypes: [".csv", ".tsv"], status: "approved", found: "no", does: "Runs t tests on a CSV file." });
  expect(list.find((a) => a.name === "samtools")?.fileTypes).toContain(".bam");
  expect(list.find((a) => a.name === "biostats")?.field).toBe("statistics");
  const text = formatIndex(list);
  expect(text).toMatch(/^\d+ adapters \(name \| program/);
  expect(text).toContain("- stats-here | Stats here | statistics | Runs t tests on a CSV file. | files: .csv .tsv | approved | program found: no");
  expect(text).toMatch(/use_adapter\(name, reason\)/);
});

test("a filter keeps the adapters that match a word, and says so when none match", () => {
  const list = adapterIndex(cwd);
  const bam = formatIndex(list, ".bam");
  expect(bam).toContain("- samtools |");
  expect(bam).not.toContain("- biostats |");
  expect(formatIndex(list, "sleep.csv")).toContain("- biostats |");
  expect(formatIndex(list, "zzzz-nothing")).toMatch(/No adapter matches/);
});

test("the program check runs once for each adapter in a session", () => {
  const cache = new Map();
  adapterIndex(cwd, cache);
  cache.set("stats-here", { path: "/fake/bin/stats", how: "test" });
  expect(adapterIndex(cwd, cache).find((a) => a.name === "stats-here")!.found).toBe("yes");
});

test("the file-type hint names adapters for the files in the request", () => {
  const list = adapterIndex(cwd);
  expect(fileTypeHint("Is drug 2 better? Data: /data/sleep.csv", list, cwd)).toMatch(/sleep\.csv -> [a-z0-9-]+(, [a-z0-9-]+){3}\. .*use_adapter/);
  expect(fileTypeHint("Data: /data/sleep.csv", list, cwd)).toContain("biostats");
  expect(fileTypeHint("Count reads in /data/x.bam and call variants in calls.vcf.gz", list, cwd)).toMatch(/x\.bam -> samtools.*calls\.vcf\.gz -> bcftools/);
  expect(fileTypeHint("Quantify salmon/quant.sf", list, cwd)).toMatch(/quant\.sf -> deseq2/);
  expect(fileTypeHint("Look at run.imzML", list, cwd)).toMatch(/run\.imzML -> cardinal, pyimzml, smile-msi/);
  expect(fileTypeHint("No files here, just a question.", list, cwd)).toBe("");
  expect(fileTypeHint("Count reads in /data/x.bam", list, cwd, ["samtools"])).toBe("");
});

test("a 10x folder named in the request matches through the files in it", () => {
  const tenx = join(cwd, "filtered");
  mkdirSync(tenx);
  for (const f of ["matrix.mtx.gz", "barcodes.tsv.gz", "features.tsv.gz"]) writeFileSync(join(tenx, f), "");
  expect(fileTypeHint(`Cluster the cells in ${tenx}`, adapterIndex(cwd), cwd)).toMatch(/matrix\.mtx\.gz -> scanpy/);
});

test("alternatives share a file type with the proposed adapter", () => {
  const list = adapterIndex(cwd);
  expect(alternatives(list, "biostats", [], 20)).toEqual(expect.arrayContaining(["lme4", "stats-here"]));
  expect(alternatives(list, "biostats", [], 20)).not.toContain("samtools");
  expect(alternatives(list, "biostats")).toHaveLength(4);
  expect(alternatives(list, "biostats", ["lme4"], 20)).not.toContain("lme4");
  expect(filesFor("see /d/a.csv and /d/b.bam", list.find((a) => a.name === "biostats")!, cwd)).toEqual(["a.csv"]);
});

test("the install hint comes from the manifest, or from the locate rules", () => {
  const base = { adapter: { name: "x" }, program: { name: "X", homepage: "https://x.org" }, connection: { kind: "cli" }, locate: { env: "X_PATH", which: ["x"] } };
  expect(installHint(Manifest.parse(base))).toBe("Install X (https://x.org). Or set X_PATH to its path. The harness looks for: x on the PATH.");
  expect(installHint(Manifest.parse({ ...base, program: { name: "X", install: "brew install x" } }))).toBe("brew install x");
});
