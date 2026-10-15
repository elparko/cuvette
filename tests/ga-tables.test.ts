import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
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
