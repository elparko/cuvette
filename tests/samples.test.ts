import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { applyEdit, designChecks, groupSummary, minPossibleP, nLevel, readSheet, sheetCsv, sheetFromFiles, sheetFromTable, sheetTable, writeSheet, type SampleRow } from "../src/core/samples.ts";

function efferocytosis(): string[] {
  const out: string[] = [];
  for (const g of ["Ceramide", "Control"]) for (const s of [1, 2, 3]) for (const f of [1, 2, 3]) for (const ch of ["red", "green"]) out.push(`Ox-LDL/${g}/Set ${s}/Set ${s}_0${f}_${ch}.tif`);
  return out;
}

const row = (sample: string, group: string, unit: string, batch = ""): SampleRow => ({ sample, group, unit, batch, path: `${sample}.tif` });

describe("sample sheet", () => {
  test("folders of uneven depth leave no cell undefined, and the sheet table shows", () => {
    const sh = sheetFromFiles(["Mouse 1/Ctrl/img_01.tif", "Mouse 2/Drug/img_01.tif", "Mouse 3/img_01.tif"], "/data");
    for (const r of sh.rows) for (const v of Object.values(r)) expect(typeof v).toBe("string");
    expect(() => sheetTable(sh.rows)).not.toThrow();
  });

  test("from the efferocytosis folder tree: group Ceramide, unit Set 1, one row for each field", () => {
    const sh = sheetFromFiles(efferocytosis(), "/data/Ox-LDL");
    expect(sh.rows).toHaveLength(18);
    expect(sh.rows[0]).toEqual({ sample: "Ceramide Set 1_01", group: "Ceramide", unit: "Set 1", batch: "", path: "Ox-LDL/Ceramide/Set 1/Set 1_01*" });
    expect(sh.rows[9]).toMatchObject({ sample: "Control Set 1_01", group: "Control", unit: "Set 1" });
    expect(sh.same).toEqual(["Ox-LDL"]);
    expect(sh.from).toBe("the folder and file names (group from folder level 2; unit from folder level 3)");
    expect(groupSummary(sh.rows)).toBe("Ceramide: 3 Sets, 9 samples; Control: 3 Sets, 9 samples");
  });

  test("one file for each field keeps the file path; a date in the folder is the batch", () => {
    const sh = sheetFromFiles(["2024-03-01/Ctrl/Mouse 1/img_01.tif", "2024-03-01/Ctrl/Mouse 2/img_01.tif", "2024-03-08/Drug/Mouse 3/img_01.tif", "2024-03-08/Drug/Mouse 4/img_01.tif"], "/data");
    expect(sh.rows.map((r) => [r.group, r.unit, r.batch, r.path])).toEqual([
      ["Ctrl", "Mouse 1", "2024-03-01", "2024-03-01/Ctrl/Mouse 1/img_01.tif"],
      ["Ctrl", "Mouse 2", "2024-03-01", "2024-03-01/Ctrl/Mouse 2/img_01.tif"],
      ["Drug", "Mouse 3", "2024-03-08", "2024-03-08/Drug/Mouse 3/img_01.tif"],
      ["Drug", "Mouse 4", "2024-03-08", "2024-03-08/Drug/Mouse 4/img_01.tif"],
    ]);
  });

  test("flat files: the group and the unit come from the file name", () => {
    const sh = sheetFromFiles(["Ctrl_Set 1_01.tif", "Ctrl_Set 1_02.tif", "KO_Set 2_01.tif", "KO_Set 2_02.tif"], "/data");
    expect(sh.rows.map((r) => [r.sample, r.group])).toEqual([["Ctrl_Set 1_01", "Ctrl"], ["Ctrl_Set 1_02", "Ctrl"], ["KO_Set 2_01", "KO"], ["KO_Set 2_02", "KO"]]);
  });

  test("from a table: one row for each animal, with group and batch columns", () => {
    const sh = sheetFromTable({ columns: ["Animal", "Treatment", "Plate", "Value"], rows: [["M1", "Ctrl", "P1", "1"], ["M1", "Ctrl", "P1", "2"], ["M2", "Drug", "P2", "3"]] }, "/data/counts.csv")!;
    expect(sh.rows).toEqual([
      { sample: "M1", group: "Ctrl", unit: "M1", batch: "P1", path: "counts.csv rows 2, 3" },
      { sample: "M2", group: "Drug", unit: "M2", batch: "P2", path: "counts.csv row 4" },
    ]);
    expect(sheetFromTable({ columns: ["x", "y"], rows: [["1", "2"]] }, "a.csv")).toBeUndefined();
  });

  test("samples.csv: write, read again, and quote a comma", () => {
    const dir = mkdtempSync(join(tmpdir(), "cuvette-samples-"));
    const p = join(dir, "out", "samples.csv");
    const rows = [row("a, 1", "Ctrl", "Set 1"), row("b", "KO", "Set 2", "Day 1")];
    writeSheet(p, rows);
    expect(readFileSync(p, "utf8").split("\n")[0]).toBe("sample,group,unit,batch,path");
    expect(sheetCsv(rows)).toContain('"a, 1",Ctrl,Set 1,,"a, 1.tif"');
    expect(readSheet(p)).toEqual(rows);
    writeFileSync(p, "Sample,Group,Unit\nx,A,Set 1\n");
    expect(readSheet(p)).toEqual([{ sample: "x", group: "A", unit: "Set 1", batch: "", path: "" }]);
  });

  test("edits: one cell, a range of rows, a value in all rows, and a wrong edit", () => {
    const rows = [row("a", "Cer", "Set 1"), row("b", "Cer", "Set 2"), row("c", "Ctrl", "Set 1")];
    const one = applyEdit(rows, "3 group Ceramide");
    expect("rows" in one && one.rows[2]!.group).toBe("Ceramide");
    const range = applyEdit(rows, "1-2 batch Day 1");
    expect("rows" in range && range.rows.map((r) => r.batch)).toEqual(["Day 1", "Day 1", ""]);
    const all = applyEdit(rows, "group Cer = Ceramide");
    expect(all).toMatchObject({ said: "2 rows: group Cer is now Ceramide." });
    expect(applyEdit(rows, "9 group X")).toEqual({ error: "Use a row number from 1 to 3." });
    expect("error" in applyEdit(rows, "make it better")).toBe(true);
  });

  test("the compact table for the terminal", () => {
    const text = sheetTable(Array.from({ length: 14 }, (_, i) => row(`s${i + 1}`, "A", "Set 1")), 12);
    expect(text.split("\n")[0]).toBe("#   sample  group  unit   batch  path");
    expect(text).toContain("… 2 more rows. All rows are in samples.csv.");
  });
});

describe("design checks", () => {
  const sheet = sheetFromFiles(efferocytosis(), "/data/Ox-LDL").rows;

  test("n = Set: the fields are not n; a warning says how many Sets each group has", () => {
    expect(nLevel(sheet, "One Set")).toBe("unit");
    expect(nLevel(sheet, "One field")).toBe("sample");
    const issues = designChecks(sheet, { n: "One Set" });
    const p = issues.find((i) => i.id === "pseudoreplication")!;
    expect(p.level).toBe("warn");
    expect(p.text).toBe("n is the Set. n per group: Ceramide 3 (9 samples), Control 3 (9 samples). The test must use the Sets as n (the mean of each Set, or a mixed model with Set as the group), not the samples.");
    expect(issues.find((i) => i.id === "blocks")?.text).toContain("Each Set (Set 1, Set 2, Set 3) has every group.");
  });

  test("fields counted as n: pseudoreplication is a question", () => {
    const p = designChecks(sheet, { n: "One field" }).find((i) => i.id === "pseudoreplication")!;
    expect(p.level).toBe("ask");
    expect(p.options!.map((o) => o.value)).toEqual(["unit", "sample"]);
    expect(p.recommendation).toBe("unit");
  });

  test("a group completely aligned with the batch is confounded", () => {
    const rows = [row("a", "Ctrl", "M1", "Day 1"), row("b", "Ctrl", "M2", "Day 1"), row("c", "Drug", "M3", "Day 2"), row("d", "Drug", "M4", "Day 2")];
    const c = designChecks(rows).find((i) => i.check === "confounding")!;
    expect(c.level).toBe("ask");
    expect(c.text).toBe("Each batch has only one group (Ctrl: Day 1; Drug: Day 2). The group effect and the batch effect cannot be separated.");
    const mixed = [...rows.slice(0, 3), row("d", "Drug", "M4", "Day 1")];
    expect(designChecks(mixed).some((i) => i.check === "confounding")).toBe(false);
  });

  test("unbalanced groups", () => {
    const rows = [...["M1", "M2", "M3", "M4", "M5", "M6"].map((m) => row(m, "Ctrl", m)), row("M7", "Drug", "M7"), row("M8", "Drug", "M8"), row("M9", "Drug", "M9")];
    expect(designChecks(rows).find((i) => i.id === "unbalanced")?.text).toBe("The groups are not balanced: Ctrl n = 6, Drug n = 3. A test that assumes equal variances is less safe. Welch's test or a model is safer.");
  });

  test("too few n per group for the planned test", () => {
    const one = designChecks([row("a", "Ctrl", "M1"), row("b", "Ctrl", "M2"), row("c", "Drug", "M3")]).find((i) => i.id === "too_few")!;
    expect(one).toMatchObject({ level: "ask", recommendation: "descriptive" });
    const two = designChecks([row("a", "Ctrl", "M1"), row("b", "Ctrl", "M2"), row("c", "Drug", "M3"), row("d", "Drug", "M4")]).find((i) => i.id === "too_few")!;
    expect(two.level).toBe("warn");
    const none = designChecks([row("a", "Ctrl", "Set 1"), row("b", "Ctrl", "Set 2"), row("c", "Drug", "")]).find((i) => i.id === "too_few")!;
    expect(none.text).toBe("Some groups have fewer than 2 Sets: Drug n = 0. No test can estimate the spread with n below 2.");
    const rank = designChecks(sheet, { n: "One Set", test: "Mann-Whitney U test" }).find((i) => i.id === "too_few_rank")!;
    expect(rank.text).toBe("With n = 3 and n = 3, the smallest possible two-sided p of the Mann-Whitney test is 0.10. The test cannot reach p < 0.05.");
    expect(minPossibleP(3, 3)).toBeCloseTo(0.1);
    expect(minPossibleP(4, 4)).toBeCloseTo(2 / 70);
    expect(designChecks(sheet, { n: "One Set", test: "Welch t-test" }).some((i) => i.id === "too_few_rank")).toBe(false);
  });
});

describe("sample sheet edge cases", () => {
  test("a row with no ID stays in the sheet with its row number", () => {
    const s = sheetFromTable({ columns: ["mouse", "group"], rows: [["m1", "A"], ["", "A"], ["m3", "B"]] }, "x.csv")!;
    expect(s.rows.map((r) => r.sample)).toEqual(["m1", "row 3", "m3"]);
  });

  test("readSheet reads tabs, a UTF-16 file and an exact column name before a prefix", () => {
    const dir = mkdtempSync(join(tmpdir(), "ga-sheet-"));
    const p = join(dir, "samples.csv");
    writeFileSync(p, "sample_type\tsample\tgroup\nfield\tS1\tA\n");
    expect(readSheet(p)[0]).toMatchObject({ sample: "S1", group: "A" });
    writeFileSync(p, Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from("sample,group\nS1,Ctrl\n", "utf16le")]));
    expect(readSheet(p)[0]).toMatchObject({ sample: "S1", group: "Ctrl" });
  });
});
