import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, expect, test } from "vitest";
import { channelOf, checkFiles, checkTable, dataCheckText, extremes, fileInfos, imageInfo, listDataFiles, readCsvTable, toNumber, unitOf, type FileInfo, type Table } from "../src/core/datacheck.ts";

const t = (columns: string[], rows: string[][]): Table => ({ columns, rows });
const ids = (c: { items: { id: string }[] }) => c.items.map((i) => i.id);
const item = (c: { items: { id: string }[] }, id: string) => (c.items as any[]).find((i) => i.id === id);

function tiff(path: string, bits: number, w = 64, h = 64, size = 0) {
  const b = Buffer.alloc(Math.max(8 + 2 + 3 * 12 + 4, size));
  b.write("II", 0, "latin1");
  b.writeUInt16LE(42, 2);
  b.writeUInt32LE(8, 4);
  b.writeUInt16LE(3, 8);
  [[256, w], [257, h], [258, bits]].forEach(([tag, v], i) => {
    const o = 10 + i * 12;
    b.writeUInt16LE(tag!, o);
    b.writeUInt16LE(3, o + 2);
    b.writeUInt32LE(1, o + 4);
    b.writeUInt16LE(v!, o + 8);
  });
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, b);
}

describe("table checks", () => {
  test("missing values in a number column become a question; an empty text cell is only shown", () => {
    const rows = Array.from({ length: 20 }, (_, i) => [`M${i + 1}`, i % 2 ? "Drug" : "Control", i < 12 ? "" : String(i), i === 3 ? "" : "note"]);
    const c = checkTable(t(["Animal", "Group", "dose", "Notes"], rows), "plate.csv");
    const m = item(c, "missing:dose");
    expect(m.level).toBe("ask");
    expect(m.question).toBe("12 rows have no value for 'dose'. Leave them out, or stop?");
    expect(m.options.map((o: any) => o.value)).toEqual(["leave_out", "stop"]);
    expect(m.rows).toEqual([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]);
    expect(item(c, "missing:Notes").level).toBe("note");
  });

  test("a group label None in a text column is a label, but None in a number column is a missing value", () => {
    const rows = Array.from({ length: 12 }, (_, i) => [`M${i + 1}`, ["None", "Drug", "Vehicle"][i % 3]!, i === 4 ? "None" : String(10 + i)]);
    const c = checkTable(t(["Animal", "Group", "dose"], rows), "plate.csv");
    expect(c.groups?.sizes.map((g) => g[0]).sort()).toEqual(["Drug", "None", "Vehicle"]);
    expect(ids(c)).not.toContain("missing:Group");
    expect(item(c, "missing:dose").level).toBe("ask");
    expect(item(c, "missing:dose").rows).toEqual([6]);
  });

  test("a row number in a message is the line of the file, after a blank line and a cell on two lines", () => {
    const dir = mkdtempSync(join(tmpdir(), "cuvette-datacheck-lines-"));
    const file = join(dir, "lines.csv");
    const rows = ["id,note,dose", "a,\"two\nlines\",1", "", "b,x,", "c,y,3", "d,z,4"];
    writeFileSync(file, rows.join("\n") + "\n");
    const c = checkTable(readCsvTable(file), "lines.csv");
    expect(item(c, "missing:dose").rows).toEqual([5]);
    expect(item(c, "missing:dose").text).toContain("row 5");
  });

  test("an empty column is shown, not asked", () => {
    const c = checkTable(t(["id", "value", "spare"], [["a", "1", ""], ["b", "2", ""], ["c", "3", ""]]), "x.csv");
    expect(item(c, "empty:spare")).toMatchObject({ level: "note", text: "Column 'spare' is empty. The harness does not use it." });
  });

  test("exact copies of rows and duplicate IDs", () => {
    const c = checkTable(t(["Sample", "Group", "Value"], [["S1", "A", "1"], ["S2", "A", "2"], ["S2", "B", "3"], ["S1", "A", "1"], ["S3", "B", "4"]]), "x.csv");
    expect(item(c, "duplicate_rows")).toMatchObject({ level: "ask", rows: [5] });
    expect(item(c, "duplicate_rows").question).toContain("Remove the copies, or keep them?");
    expect(item(c, "duplicate_ids:Sample")).toMatchObject({ level: "ask", rows: [3, 4] });
    expect(item(c, "duplicate_ids:Sample").text).toBe("1 ID in 'Sample' is on more than one row: S2 (rows 3, 4).");
  });

  test("an ID on several rows with a time column is repeated measures: shown, with the n rule", () => {
    const c = checkTable(t(["Animal", "Day", "Weight"], [["M1", "1", "20"], ["M1", "2", "21"], ["M2", "1", "19"], ["M2", "2", "22"]]), "x.csv");
    expect(ids(c)).not.toContain("duplicate_ids:Animal");
    expect(item(c, "repeated:Animal").text).toContain("Count each animal once as n.");
  });

  test("text in a number column is a question", () => {
    const c = checkTable(t(["id", "count"], [["a", "10"], ["b", "lost"], ["c", "12"], ["d", "<5"], ["e", "14"]]), "x.csv");
    const m = item(c, "mixed:count");
    expect(m.level).toBe("ask");
    expect(m.text).toBe("Column 'count' has numbers and 2 text values ('lost', '<5', in rows 3, 5).");
    expect(m.recommendation).toBe("missing");
  });

  test("numbers stored as text are read as numbers and shown", () => {
    const c = checkTable(t(["id", "area"], [["a", " 12"], ["b", "'13"], ["c", "14"]]), "x.csv");
    expect(item(c, "astext:area")).toMatchObject({ level: "note", rows: [2, 3] });
    expect(toNumber("'13")).toBe(13);
  });

  test("a decimal comma is read as a decimal point; a comma with 3 digits is a question", () => {
    const c = checkTable(t(["id", "dose", "count"], [["a", "1,5", "1,250"], ["b", "2,25", "2,500"], ["c", "3", "3,000"]]), "x.csv");
    expect(item(c, "comma").text).toBe("Column 'dose' uses a decimal comma (for example 1,5). The harness reads 1,5 as 1.5.");
    const q = item(c, "comma:count");
    expect(q.level).toBe("ask");
    expect(q.question).toBe("Column 'count' has values like 1,250. Is the comma a decimal mark (1.250) or a thousands mark (1250)?");
    expect(toNumber("1,5")).toBe(1.5);
  });

  test("a semicolon CSV with decimal commas reads as a table", () => {
    const dir = mkdtempSync(join(tmpdir(), "cuvette-dc-"));
    const p = join(dir, "eu.csv");
    writeFileSync(p, "Sample;Group;Weight (g)\nS1;A;20,5\nS2;A;21,1\nS3;B;19,8\n");
    const table = readCsvTable(p);
    expect(table.columns).toEqual(["Sample", "Group", "Weight (g)"]);
    const c = checkTable(table, p);
    expect(item(c, "comma").text).toContain("'Weight (g)' uses a decimal comma");
  });

  test("group sizes, labels that differ only in capitals, and a group with no numbers", () => {
    const c = checkTable(t(["id", "Treatment", "value"], [["1", "Control", "1"], ["2", "control ", "2"], ["3", "Drug", "3"], ["4", "Drug", "4"], ["5", "Vehicle", ""], ["6", "Vehicle", "NA"]]), "x.csv");
    expect(c.groups).toEqual({ column: "Treatment", sizes: [["Control", 1], ["control", 1], ["Drug", 2], ["Vehicle", 2]] });
    expect(item(c, "labels:Treatment:control")).toMatchObject({ level: "ask", recommendation: "join" });
    expect(item(c, "empty_group:Vehicle")).toMatchObject({ level: "note", text: "Group 'Vehicle' has 2 rows, but no numbers. It cannot be analysed." });
    expect(dataCheckText(c)).toContain("Groups in 'Treatment': Control 1, control 1, Drug 2, Vehicle 2.");
  });

  test("extreme values: the modified z-score rule reports them and removes nothing", () => {
    expect(extremes([20, 21, 22, 23, 24, 950])).toEqual([5]);
    expect(extremes([1, 2, 3, 4])).toEqual([]);
    expect(extremes([5, 5, 5, 5, 9])).toEqual([]);
    const rows = [20, 21, 22, 23, 24, 950].map((v, i) => [`m${i}`, String(v)]);
    const c = checkTable(t(["id", "Weight (g)"], rows), "x.csv");
    const x = item(c, "extreme:Weight (g)");
    expect(x.level).toBe("note");
    expect(x.text).toContain("row 7: 950");
    expect(x.text).toContain("Nothing is removed.");
  });

  test("unit hints in the column names, and one measure in two units", () => {
    expect(unitOf("Dose (mg/kg)")).toBe("mg/kg");
    expect(unitOf("length [µm]")).toBe("µm");
    expect(unitOf("area_px")).toBe("px");
    expect(unitOf("count")).toBeUndefined();
    const c = checkTable(t(["id", "Dose (mg)", "Dose (ug)"], [["a", "1", "1000"], ["b", "2", "2000"]]), "x.csv");
    expect(c.units).toEqual([["Dose (mg)", "mg"], ["Dose (ug)", "ug"]]);
    expect(item(c, "units:dose").level).toBe("ask");
  });

  test("a clean table says so", () => {
    const c = checkTable(t(["id", "value"], [["a", "1"], ["b", "2"], ["c", "3"]]), "/data/clean.csv");
    expect(c.items).toEqual([]);
    expect(dataCheckText(c)).toBe("Data check of clean.csv: 3 rows, 2 columns.\nNo missing values, copies, mixed columns or extreme values.");
  });
});

describe("file set checks", () => {
  const set = (fn: (g: string, s: number, f: number, ch: string) => FileInfo | undefined): FileInfo[] => {
    const out: FileInfo[] = [];
    for (const g of ["Ceramide", "Control"]) for (const s of [1, 2]) for (const f of [1, 2]) for (const ch of ["red", "green"]) {
      const x = fn(g, s, f, ch);
      if (x) out.push(x);
    }
    return out;
  };

  test("20x and 20X in the names: shown, the harness matches without case", () => {
    const files = set((g, s, f, ch) => ({ rel: `${g}/Set ${s}/${g === "Control" && s === 2 ? "20X" : "20x"}_Set ${s}_0${f}_${ch}.tif`, size: 1000 }));
    const c = checkFiles(files, "/data/Ox-LDL");
    const n = item(c, "names:20x");
    expect(n.level).toBe("note");
    expect(n.text).toBe("The names spell one part in 2 ways: '20x' (12 files) and '20X' (4 files). The harness treats them as the same. Match file names without case.");
  });

  test("a field without one channel is a question", () => {
    const files = set((g, s, f, ch) => (g === "Control" && s === 2 && f === 1 && ch === "red" ? undefined : { rel: `${g}/Set ${s}/Set ${s}_0${f}_${ch}.tif`, size: 1000 }));
    const c = checkFiles(files, "/data");
    const m = item(c, "channel:red");
    expect(m.level).toBe("ask");
    expect(m.files).toEqual(["Control/Set 2/Set 2_01"]);
    expect(m.question).toBe("1 field has no 'red' image (Control/Set 2/Set 2_01). Leave this field out, or stop?");
    expect(c.size).toBe("15 files in 4 folders, 2 channels (red, green)");
  });

  test("files that differ in size, empty files and different bit depths", () => {
    const files = set((g, s, f, ch) => ({ rel: `${g}/Set ${s}/Set ${s}_0${f}_${ch}.tif`, size: g === "Ceramide" && s === 1 && f === 1 ? 100 : 1000, bits: g === "Control" && s === 1 && f === 1 ? 8 : 16 }));
    files.push({ rel: "Control/Set 2/Set 2_03_red.tif", size: 0 });
    const c = checkFiles(files, "/data");
    expect(item(c, "empty_files")).toMatchObject({ level: "note", files: ["Control/Set 2/Set 2_03_red.tif"] });
    expect(item(c, "size:.tif|red").files).toEqual(["Ceramide/Set 1/Set 1_01_red.tif"]);
    const b = item(c, "bit_depth");
    expect(b.level).toBe("ask");
    expect(b.files).toEqual(["Control/Set 1/Set 1_01_red.tif", "Control/Set 1/Set 1_01_green.tif"]);
    expect(b.text).toContain("14 images 16-bit, 2 images 8-bit");
  });

  test("the channel token comes off the field name", () => {
    expect(channelOf("Set 1_01_red")).toEqual({ channel: "red", field: "Set 1_01" });
    expect(channelOf("img-DAPI-3")).toEqual({ channel: "dapi", field: "img-3" });
    expect(channelOf("Set 1_01")).toEqual({ field: "Set 1_01" });
  });

  test("bit depth and size come from the TIFF and PNG headers on disk", async () => {
    const root = mkdtempSync(join(tmpdir(), "cuvette-dc-files-"));
    tiff(join(root, "A/a_01.tif"), 16, 512, 256);
    tiff(join(root, "A/a_02.tif"), 8, 512, 256);
    const png = Buffer.alloc(33);
    png.writeUInt32BE(0x89504e47, 0);
    png.writeUInt32BE(100, 16);
    png.writeUInt32BE(50, 20);
    png[24] = 16;
    writeFileSync(join(root, "A/b.png"), png);
    writeFileSync(join(root, "A/.hidden.tif"), "x");
    writeFileSync(join(root, "notes.docx"), "x");
    expect(await imageInfo(join(root, "A/a_01.tif"))).toEqual({ width: 512, height: 256, bits: 16 });
    expect(await imageInfo(join(root, "A/b.png"))).toEqual({ width: 100, height: 50, bits: 16 });
    const rels = listDataFiles(root);
    expect(rels).toEqual(["A/a_01.tif", "A/a_02.tif", "A/b.png"]);
    const c = checkFiles(await fileInfos(root, rels), root);
    expect(item(c, "bit_depth").files).toEqual(["A/a_02.tif"]);
  });
});

describe("file reading and edge cases", () => {
  const dir = mkdtempSync(join(tmpdir(), "ga-dc-edge-"));

  test("a UTF-16 file with a byte order mark is read as text, and the check names the encoding", () => {
    const p = join(dir, "u16.csv");
    writeFileSync(p, Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from("id,len (µm)\na,1\nb,2\n", "utf16le")]));
    const tab = readCsvTable(p);
    expect(tab.columns).toEqual(["id", "len (µm)"]);
    expect(tab.rows).toEqual([["a", "1"], ["b", "2"]]);
    expect(ids(checkTable(tab, "u16.csv"))).toContain("encoding");
  });

  test("a Windows-1252 file keeps the micro sign", () => {
    const p = join(dir, "latin.csv");
    writeFileSync(p, Buffer.from("id,len (\xb5m)\na,1\n", "latin1"));
    const tab = readCsvTable(p);
    expect(tab.columns).toEqual(["id", "len (µm)"]);
    expect(tab.encoding).toBe("windows-1252");
  });

  test("a row with more cells than the header becomes a question, not a silent cut", () => {
    const p = join(dir, "rag.csv");
    writeFileSync(p, "id,weight\na,1,5\nb,2\n");
    const c = checkTable(readCsvTable(p), "rag.csv");
    expect(item(c, "ragged_rows").rows).toEqual([2]);
    expect(item(c, "ragged_rows").level).toBe("ask");
  });

  test("two columns with one name: each check reads its own column", () => {
    const c = checkTable(t(["id", "value", "value"], [["a", "1", "x"], ["b", "2", "1"], ["c", "3", "2"], ["d", "4", "3"]]), "t");
    expect(ids(c)).toContain("duplicate_columns");
    const mixed = c.items.filter((i) => i.check === "mixed_type");
    expect(mixed).toHaveLength(1);
    expect(mixed[0]!.column).toBe("value (column 3)");
    expect(mixed[0]!.text).toContain("'x'");
  });

  test("rows with no ID count as separate units in the group sizes", () => {
    const c = checkTable(t(["mouse", "group", "v"], [["", "A", "1"], ["", "A", "2"], ["m3", "B", "3"], ["m4", "B", "4"]]), "t");
    expect(c.groups!.sizes).toEqual([["A", 2], ["B", 2]]);
  });

  test("a large table is checked in linear time", () => {
    const rows = Array.from({ length: 50000 }, (_, i) => [`S${i}`, i % 2 ? "A" : "B", String(i % 997)]);
    const start = Date.now();
    checkTable(t(["sample", "group", "value"], rows), "big");
    expect(Date.now() - start).toBeLessThan(5000);
  });

  test("statistic names in brackets are not units, and one unit in two spellings is not mixed", () => {
    const stat = checkTable(t(["Area (mean)", "Area (SD)"], [["1", "2"], ["3", "4"]]), "t");
    expect(stat.items.filter((i) => i.check === "mixed_units")).toEqual([]);
    expect(stat.units).toEqual([]);
    const micro = checkTable(t(["Length (um)", "Length (µm)"], [["1", "2"], ["3", "4"]]), "t");
    expect(micro.items.filter((i) => i.check === "mixed_units")).toEqual([]);
    const time = checkTable(t(["Time (min)", "Time (s)"], [["1", "2"], ["3", "4"]]), "t");
    expect(time.items.filter((i) => i.check === "mixed_units")).toHaveLength(1);
    const molar = checkTable(t(["Dose (mM)", "Dose (nM)"], [["1", "2"], ["3", "4"]]), "t");
    expect(molar.items.filter((i) => i.check === "mixed_units")).toHaveLength(1);
  });
});
