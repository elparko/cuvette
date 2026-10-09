import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { expect, test } from "vitest";
import { writeXlsx } from "../catalog/tables/adapter.ts";
import { findAdapter } from "../src/adapters/manifest.ts";
import { startAdapter } from "../src/adapters/runtime.ts";
import type { ToolContext } from "../src/core/types.ts";
import { unzip } from "./fixtures/unzip.ts";

const PY = process.env.GA_TABLES_PYTHON || join(homedir(), ".guided-analysis/envs/biostats/bin/python");
const OPENPYXL = existsSync(PY) && spawnSync(PY, ["-c", "import openpyxl"]).status === 0;

test("write_xlsx uses the harness writer: one sheet per CSV, numbers as numbers, a frozen header, a new name for each file", () => {
  const dir = mkdtempSync(join(tmpdir(), "ga-tables-"));
  writeFileSync(join(dir, "long.csv"), "Sample,Group,Red dots\nSlice 1,Control,10\nSlice 2,Control,12\n");
  writeFileSync(join(dir, "stats.csv"), "Group,n,mean\nControl,2,11\n");
  const args = { tables: [{ path: join(dir, "long.csv"), sheet: "counts" }, { path: join(dir, "stats.csv") }], file_name: "lab" };
  const r = writeXlsx(args, { workDir: dir });
  expect(r.ok, r.error).toBe(true);
  expect(r.data).toMatchObject({ path: join(dir, "lab.xlsx"), sheets: [{ name: "counts", rows: 2, number_cells: 2 }, { name: "stats", rows: 1, number_cells: 2 }] });
  expect(r.manualRoute).toMatch(/Freeze Top Row/);
  const files = unzip(readFileSync(join(dir, "lab.xlsx")));
  const sheet = files.get("xl/worksheets/sheet1.xml")!.toString("utf8");
  expect(sheet).toContain('<c r="C2"><v>10</v></c>');
  expect(sheet).toContain('state="frozen"');
  expect(writeXlsx(args, { workDir: dir }).data).toMatchObject({ path: join(dir, "lab-2.xlsx") });
  expect(writeXlsx({ tables: [{ path: join(dir, "book.xlsx") }] }, { workDir: dir }).error).toMatch(/not a CSV/);
});

test.skipIf(!OPENPYXL)("make_plot saves its figures in the output folder that the session gives the adapter", async () => {
  const root = mkdtempSync(join(tmpdir(), "ga-tables-out-"));
  const dirs = { workDir: join(root, "work"), sessionDir: root, outputDir: join(root, "out"), figureFormats: "png,svg" };
  mkdirSync(dirs.outputDir, { recursive: true });
  writeFileSync(join(root, "t.csv"), "Group,Value\nA,1\nA,2\nB,3\nB,5\n");
  const rt = await startAdapter(findAdapter(resolve("catalog/tables")), dirs);
  try {
    const plot = (await rt.tools()).find((t) => t.name === "make_plot")!;
    const ctx = { session: "s", callId: "c", workDir: dirs.workDir, sessionDir: root, signal: new AbortController().signal, log: () => ({}) as never, callTool: async () => ({ ok: true }) } as ToolContext;
    const r = await plot.execute({ path: join(root, "t.csv"), kind: "bar", x: "Group", y: "Value", y_label: "Value (AU)", error_bars: "SD", points: true, file_name: "bars" }, ctx);
    expect(r.ok, r.error).toBe(true);
    expect(existsSync(join(dirs.outputDir, "figures", "bars.png"))).toBe(true);
    expect(existsSync(join(dirs.outputDir, "figures", "bars.svg"))).toBe(true);
    expect(r.summary).toMatch(/A 1\.5 ± 0\.7071 \(n = 2\), B 4 ± 1\.414 \(n = 2\)/);
    expect(r.manualRoute).toMatch(/Clustered Column/);
  } finally {
    await rt.close();
  }
});
