import { mkdirSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "vitest";
import { batchReason, pilotRows, pilotState, pilotText, validationRows } from "../src/core/pilot.ts";
import { AnalysisRecord } from "../src/core/record.ts";

const record = () => new AnalysisRecord(mkdtempSync(join(tmpdir(), "ga-pilot-")), "s1");

test("a batch step is a declared batch tool, a list of files, a folder, or a script that loops over files", () => {
  const dir = mkdtempSync(join(tmpdir(), "ga-batch-"));
  mkdirSync(join(dir, "images"));
  expect(batchReason("count_all", {}, true)).toBe("count_all is a batch tool in its adapter.");
  expect(batchReason("count", { inputs: ["/d/a.tif", "/d/b.tif", "/d/c.tif"] })).toBe("count gets 3 input files in inputs.");
  expect(batchReason("count", { inputs: ["/d/a.tif", "/d/b.tif"] })).toBeUndefined();
  expect(batchReason("count", { input: join(dir, "images") })).toBe(`count gets the folder ${join(dir, "images")}.`);
  expect(batchReason("count", { input: join(dir, "images"), output_dir: dir })).toBe(`count gets the folder ${join(dir, "images")}.`);
  expect(batchReason("count", { input: "/d/a.tif", output_dir: dir })).toBeUndefined();
  expect(batchReason("run_script", { code: "for f in glob.glob('/d/*.tif'):\n  count(f)" })).toBe("The script loops over the files in a folder.");
  expect(batchReason("run_script", { code: "print(1)" })).toBeUndefined();
});

test("a pilot is out of date after a decision changes or a program loads, not after a first answer", () => {
  const r = record();
  expect(pilotState(r)).toEqual({});
  const run = r.append("pilot_run", { sample: "Set 1", values: { cells: 296 }, images: [], check: "", comparison: [], definitions: [] });
  const ok = r.append("pilot_approved", { run: run.id, sample: "Set 1" });
  expect(pilotState(r)).toEqual({ approved: ok });
  r.append("decision", { key: "equal_variance", old: null, new: false, by: "human" });
  expect(pilotState(r).stale).toBeUndefined();
  r.append("decision", { key: "min_size", old: 300, new: 500, by: "human" });
  expect(pilotState(r).stale).toBe("min_size changed to 500 after the pilot");
  r.append("pilot_approved", { run: run.id, sample: "Set 1" });
  r.append("decision", { key: "definition:positive cell", old: "1 red pixel", new: "5 red pixels", by: "human" });
  expect(pilotState(r).stale).toBe("the definition of positive cell changed after the pilot");
  r.append("pilot_approved", { run: run.id, sample: "Set 1" });
  r.append("adapter", { name: "cellpose" });
  expect(pilotState(r).stale).toBe("the program changed (cellpose loaded) after the pilot");
});

test("the pilot text gives the numbers with their definitions, the reference comparison, the images and the agent's check", () => {
  const base = { sample: "Set 1", values: { "positive cells": 296 }, images: ["/f/qc.png"], check: "Clumps are left out.", definitions: [{ measure: "positive cells", definition: "A cell with at least 1 red pixel inside its outline." }] };
  const text = pilotText({ ...base, comparison: ['positive cells: the agent got 296; the reference "Red dots" says 530 (56% of the reference).'] });
  expect(text).toBe(
    [
      "Pilot sample: Set 1",
      "",
      "Numbers",
      "- positive cells: 296. A cell with at least 1 red pixel inside its outline.",
      "",
      "Against the reference",
      '- positive cells: the agent got 296; the reference "Red dots" says 530 (56% of the reference).',
      "",
      "QC images (opened on screen)",
      "- /f/qc.png",
      "",
      "The agent's check: Clumps are left out.",
    ].join("\n"),
  );
  expect(pilotText({ ...base, comparison: [] })).toContain("No reference to compare with. Judge the method from the QC images. A quick hand count of this sample is a good check.");
  expect(pilotText({ ...base, comparison: [], reference: { path: "/r.xlsx", mode: "blind" } })).toContain("The reference is held back for the blind test.");
});

test("the Pilot and Validation sheets come from the record", () => {
  const r = record();
  const run = r.append("pilot_run", { sample: "Set 1", values: { "positive cells": 296 }, images: ["/f/qc.png"], check: "", comparison: [], reference: { path: "/r.xlsx", mode: "compare", values: { "Red dots": 530 } }, definitions: [{ measure: "positive cells", definition: "At least 1 red pixel." }] });
  r.append("pilot_approved", { run: run.id, sample: "Set 1" });
  expect(pilotRows(r)).toEqual({ columns: ["Run", "Sample", "Measure", "Value", "Definition", "Reference", "Status", "QC images"], rows: [[run.id, "Set 1", "positive cells", 296, "At least 1 red pixel.", "Red dots = 530", "approved", "/f/qc.png"]] });
  expect(validationRows(r)).toBeUndefined();
  r.append("validation", { pairs: [{ sample: "Set 1", ours: 296, ref: 530, pilot: true }, { sample: "Set 2", ours: 400, ref: 410, pilot: false }], summary: ["s"], plot: "/f/ba.png" });
  expect(validationRows(r)).toEqual({
    columns: ["Sample", "Agent", "Reference", "Difference", "Percent", "Pilot sample"],
    rows: [["Set 1", 296, 530, -234, -44.2, "yes"], ["Set 2", 400, 410, -10, -2.4, ""]],
    summary: ["s"],
    plot: "/f/ba.png",
  });
});
