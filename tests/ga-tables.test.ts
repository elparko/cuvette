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
