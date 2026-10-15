import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { openAdapter, type OpenAdapter } from "./independent.ts";

const python = [join(homedir(), ".cuvette/envs/biostats/bin/python"), join(homedir(), ".cuvette/envs/biostats/Scripts/python.exe")].find(existsSync);

describe.skipIf(!python)("tables read_table with a file of the wrong type", () => {
  let tables: OpenAdapter;
  let root: string;
  beforeAll(async () => {
    root = mkdtempSync(join(tmpdir(), "cuvette-ga-tables-"));
    tables = await openAdapter("tables");
  });
  afterAll(async () => {
    await tables?.close();
    rmSync(root, { recursive: true, force: true });
  });

  test("a text file named .xlsx gives a plain message and no pandas error", { timeout: 120_000 }, async () => {
    const path = join(root, "fake.xlsx");
    writeFileSync(path, "a,b\n1,2\n");
    await expect(tables.run("read_table", { path })).rejects.toThrow(/^read_table failed: The file is not a valid xlsx file: fake\.xlsx$/);
  });

  test("an empty .csv file gives a plain message, and summarize_table says the same", { timeout: 120_000 }, async () => {
    const path = join(root, "empty.csv");
    writeFileSync(path, "");
    await expect(tables.run("read_table", { path })).rejects.toThrow(/^read_table failed: The file is not a valid csv file: empty\.csv$/);
    await expect(tables.run("summarize_table", { path, values: ["a"] })).rejects.toThrow(/The file is not a valid csv file: empty\.csv/);
  });
});

describe.skipIf(!python)("tables summarize_table with placeholders in a numeric column", () => {
  let tables: OpenAdapter;
  let root: string;
  beforeAll(async () => {
    root = mkdtempSync(join(tmpdir(), "cuvette-ga-tables-"));
    tables = await openAdapter("tables");
  });
  afterAll(async () => {
    await tables?.close();
    rmSync(root, { recursive: true, force: true });
  });

  test("a column with - ? and . cells counts as numeric, and the summary gives the number of placeholder cells", { timeout: 120_000 }, async () => {
    const path = join(root, "placeholders.csv");
    writeFileSync(path, "group,y\na,1\na,-\na,3\nb,?\nb,5\nb,.\nb,7\n");
    const r = await tables.run("summarize_table", { path, group_by: ["group"] });
    expect(r.metrics.n_values).toBe(1);
    expect(r.summary).toMatch(/y: mean 2/);
    expect(r.summary).toMatch(/3 cells in numeric columns hold a placeholder \(-, \? or \.\)/);
    expect(r.metrics.n_placeholder_cells).toBe(3);
  });
});

describe.skipIf(!python)("tables load with ID columns", () => {
  test("an ID column with a leading zero and a 17-digit barcode column stay text", () => {
    const root = mkdtempSync(join(tmpdir(), "cuvette-ga-tables-"));
    const path = join(root, "ids.csv");
    writeFileSync(path, "id,barcode,y\n007,12345678901234567,1\n008,12345678901234568,2\n-,12345678901234569,3\n");
    const code = `import json, sys\nsys.path.insert(0, ${JSON.stringify(resolve("catalog/tables"))})\nimport ga_tables as t\nf = t.load(sys.argv[1])\nprint(json.dumps([[str(v) for v in f[c]] for c in ["id", "barcode"]]))`;
    const out = execFileSync(python!, ["-c", code, path], { encoding: "utf8", env: { ...process.env, PYTHONWARNINGS: "ignore" } });
    expect(JSON.parse(out.trim().split("\n").at(-1)!)).toEqual([["007", "008", "nan"], ["12345678901234567", "12345678901234568", "12345678901234569"]]);
    rmSync(root, { recursive: true, force: true });
  });
});
