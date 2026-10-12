import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { expect, test } from "vitest";
import { chainInputs, findSamples, metricsOf, pilotChain, planBatch, swapArgs, writeTable } from "../src/core/batch.ts";
import type { Node } from "../src/core/types.ts";

function project() {
  const root = mkdtempSync(join(tmpdir(), "cuvette-batch-"));
  const field = (rel: string, names = ["20X_CH1.tif", "20X_CH3.tif"]) => {
    mkdirSync(join(root, rel), { recursive: true });
    for (const n of names) writeFileSync(join(root, rel, n), "x");
    return join(root, rel);
  };
  const pilot = field("Ox-LDL/Ceramide/Set 2/Set 2");
  field("Ox-LDL/Ceramide/Set 1/Set 1");
  field("LDL/LDL/Set 1/Set 1", ["20x_ch1.TIF", "20x_CH3.tif"]);
  field("LDL/LDL/Set 3/Set 3", ["20X_CH1.tif"]);
  field("cuvette/run-1/segment_cells-1", ["20X_CH1.tif", "20X_CH3.tif"]);
  const out = join(root, "cuvette/run-1/segment_cells-1");
  return { root, pilot, out };
}

const node = (entry: number, tool: string, args: Record<string, unknown>, outputs: string[] = [], extra: Partial<Node> = {}): Node =>
  ({ id: `n${entry}`, ts: "", entry, adapter: "a", adapterVersion: "1", programVersion: "1", tool, args, decisions: {}, codeHash: "", inputHashes: [], outputs: outputs.map((path) => ({ path, kind: "file" })), result: {}, parents: [], summary: "", model: "", manualRoute: "", fidelity: "exact", ...extra }) as Node;

test("the pilot chain: the last run of each repeatable tool, no comparison runs, no free scripts, only in the pilot range", () => {
  const nodes = [
    node(5, "segment_cells", { path: "old.tif" }, ["o.tif"]),
    node(20, "run_script", { code: "x" }, ["s.csv"]),
    node(21, "inspect_image", { path: "a.tif" }),
    node(22, "segment_cells", { path: "a.tif" }, ["m1.tif"]),
    node(24, "count_cell_uptake", { path: "b.tif", min: 0 }, ["c1.csv"]),
    node(26, "count_cell_uptake", { path: "b.tif", min: 20 }, ["c2.csv"]),
    node(28, "count_cell_uptake", { path: "b.tif", min: 40 }, ["c3.csv"], { sensitivityOf: "min" }),
    node(40, "segment_cells", { path: "later.tif" }, ["l.tif"]),
  ];
  expect(pilotChain(nodes, 10, 30).map((n) => `${n.entry} ${n.tool} ${JSON.stringify(n.args)}`)).toEqual(['22 segment_cells {"path":"a.tif"}', '26 count_cell_uptake {"path":"b.tif","min":20}']);
});

test("chain inputs are the files the chain reads, not the files an earlier step made", () => {
  const { root, pilot } = project();
  const masks = join(root, "cuvette/run-1/segment_cells-1/20X_CH1.tif");
  const steps = [node(1, "segment_cells", { path: "{project}/Ox-LDL/Ceramide/Set 2/Set 2/20X_CH1.tif" }, [masks]), node(2, "count_cell_uptake", { path: join(pilot, "20X_CH3.tif"), cell_labels: masks, mode: "labels" }, ["c.csv"])];
  expect(chainInputs(steps, root)).toEqual([join(pilot, "20X_CH1.tif"), join(pilot, "20X_CH3.tif")]);
});

test("samples are the other folders with the same files, case does not matter, the output folder is skipped", () => {
  const { root, pilot, out } = project();
  const s = findSamples(root, [join(pilot, "20X_CH1.tif"), join(pilot, "20X_CH3.tif")], [join(root, "cuvette")]);
  expect(s.map((x) => x.label)).toEqual(["LDL/LDL/Set 1/Set 1", "Ox-LDL/Ceramide/Set 1/Set 1"]);
  expect(s[0]!.files.get(join(pilot, "20X_CH1.tif"))).toBe(join(root, "LDL/LDL/Set 1/Set 1/20x_ch1.TIF"));
  expect(findSamples(root, [join(pilot, "20X_CH1.tif"), join(pilot, "20X_CH3.tif")]).some((x) => x.files.get(join(pilot, "20X_CH1.tif"))!.startsWith(out))).toBe(true);
});

test("with one input file and no other folders, the samples are the files of the same type and name pattern next to it", () => {
  const root = mkdtempSync(join(tmpdir(), "cuvette-batch-one-"));
  for (const n of ["Set 1.tif", "Set 2.tif", "Set 10.tif", "notes.tif", "Set 3.png"]) writeFileSync(join(root, n), "x");
  expect(findSamples(root, [join(root, "Set 1.tif")]).map((x) => x.label)).toEqual(["Set 10.tif", "Set 2.tif"]);
  expect(findSamples(root, [join(root, "Set 1.tif"), join(root, "notes.tif")])).toEqual([]);
});

test("arguments: pilot files and pilot outputs become the ones for the sample, other values stay", () => {
  const root = "/p";
  const map = new Map([["/p/A/CH1.tif", "/p/B/CH1.tif"], ["/p/out/masks.tif", "/p/out2/masks.tif"]]);
  expect(swapArgs({ path: "{project}/A/CH1.tif", cell_labels: "/p/out/masks.tif", list: ["A/CH1.tif"], min: 20, pattern: "*.tif" }, map, root)).toEqual({ path: "/p/B/CH1.tif", cell_labels: "/p/out2/masks.tif", list: ["/p/B/CH1.tif"], min: 20, pattern: "*.tif" });
});

test("the table has one row for each sample, with the numbers of each step", () => {
  expect(metricsOf({ metrics: { n_cells: 507, fraction: 0.0178, name: "x", bad: NaN } })).toEqual({ n_cells: 507, fraction: 0.0178 });
  const f = join(mkdtempSync(join(tmpdir(), "cuvette-batch-t-")), "t.csv");
  writeTable(f, [
    { sample: "Set 1, field 2", ok: true, values: { "count.n": 5 } },
    { sample: "Set 3", ok: false, error: "no image", values: {} },
  ]);
  expect(readFileSync(f, "utf8")).toBe('sample,status,count.n,error\n"Set 1, field 2",done,5,\nSet 3,failed,,no image\n');
});

test("no batch when the chain is empty or no other sample exists", () => {
  const { root, pilot } = project();
  expect(planBatch([node(2, "run_script", { code: "x" }, ["a"])], 0, 10, root)).toBeUndefined();
  const one = mkdtempSync(join(tmpdir(), "cuvette-batch-alone-"));
  writeFileSync(join(one, "only.tif"), "x");
  expect(planBatch([node(2, "blur", { input: join(one, "only.tif") }, ["o"])], 0, 10, one)).toBeUndefined();
  expect(planBatch([node(2, "blur", { input: join(pilot, "20X_CH1.tif") }, ["o"])], 0, 10, root, [join(root, "cuvette")])!.samples).toHaveLength(3);
});
