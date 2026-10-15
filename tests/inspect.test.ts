import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeAll, beforeEach, expect, test } from "vitest";
import { groundQuestions, inspectData, type Inspection } from "../src/core/inspect.ts";
import { Session } from "../src/core/session.ts";
import { FakeProvider } from "../src/providers/fake.ts";
import { scriptPython } from "../src/tools/run_script.ts";

let root = "";
let session: Session | undefined;
beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), "cuvette-inspect-"));
  execFileSync(scriptPython(), ["-I", join(__dirname, "fixtures/make_two_channel.py"), join(root, "images"), "2"]);
  writeFileSync(join(root, "counts.csv"), "group,set,positive,total\ncontrol,1,5,40\ncontrol,2,7,38\ntreated,1,20,41\ntreated,2,22,39\n");
});
beforeEach(() => {
  process.env.CUVETTE_HOME = mkdtempSync(join(tmpdir(), "cuvette-inspect-home-"));
});
afterEach(async () => {
  await session?.close();
  session = undefined;
});

test("a folder with a brightfield and a red channel: the summary names both channels and says there is no nuclear stain", async () => {
  const insp = await inspectData(join(root, "images"), join(root, "out"));
  expect(insp.ok).toBe(true);
  expect(insp.summary).toContain("images has 2 groups: control (6 files, 2 fields); treated (6 files, 2 fields).");
  expect(insp.summary).toContain("Each field has 3 images: CH1 is brightfield, CH3 is red fluorescence, and Overlay is an overlay that combines the channels.");
  expect(insp.summary).toContain("There is no nuclear stain");
  expect(insp.colors).toEqual(["red"]);
  expect(insp.kinds).toEqual(["brightfield", "fluorescence"]);
  expect(insp.previews).toHaveLength(3);
  expect(insp.previews.every((p) => existsSync(p))).toBe(true);
});

test("a CSV: the rows, the columns and the values of the group column", async () => {
  const insp = await inspectData(join(root, "counts.csv"), join(root, "out"));
  expect(insp.summary).toBe("counts.csv: 4 rows, 4 columns: group (text), set (number), positive (number), total (number). Column group has the values control (2), treated (2).");
  expect(insp.images_seen).toBe(false);
});

test("a 0-to-1 float image is floating point, not 10-bit", async () => {
  const p = join(root, "float.tif");
  execFileSync(scriptPython(), ["-I", "-c", "import sys, numpy, tifffile; tifffile.imwrite(sys.argv[1], numpy.linspace(0, 1, 64 * 64, dtype='float32').reshape(64, 64))", p]);
  const insp = await inspectData(p, join(root, "out"));
  expect(insp.summary).toContain("Size 64 x 64, 32-bit floating point.");
});

const tiff = (name: string, axes: string, shape: number[], extra = "") => {
  const p = join(root, name);
  execFileSync(scriptPython(), ["-I", "-c", `import sys, numpy, tifffile; a = (numpy.random.default_rng(1).random(${JSON.stringify(shape)}) * 500).astype('uint16'); tifffile.imwrite(sys.argv[1], a, metadata={'axes': '${axes}'}${extra})`, p]);
  return p;
};

test("a TIFF with the axes CZYX keeps the channels, and a uint16 image with a low maximum is 16-bit", async () => {
  const insp = await inspectData(tiff("czyx.ome.tif", "CZYX", [3, 2, 32, 32], ", ome=True"), join(root, "out"));
  expect(insp.summary).toContain("has 3 channels");
  expect(insp.summary).toContain("16-bit.");
  expect(insp.summary).not.toContain("10-bit");
});

test("a multi-page TIFF with the axes IYX keeps the pages as channels", async () => {
  const insp = await inspectData(tiff("iyx.tif", "IYX", [3, 32, 32]), join(root, "out"));
  expect(insp.summary).toContain("has 3 channels");
  expect(insp.summary).not.toContain("planes");
});

test("a TIFF with an axis that Cuvette cannot keep warns, and the summary makes no claim about a nuclear stain", async () => {
  const insp = await inspectData(tiff("icyx.tif", "ICYX", [4, 2, 32, 32]), join(root, "out"));
  expect(insp.summary).toContain("The file has 4 planes on the axis I. Cuvette read only the first plane of this axis.");
  expect(insp.summary).not.toContain("no nuclear stain");
});

test("a CSV in Windows-1252 reads", async () => {
  const p = join(root, "latin.csv");
  writeFileSync(p, Buffer.from("group,dose\nµM low,1\ncafé,2\n", "latin1"));
  const insp = await inspectData(p, join(root, "out"));
  expect(insp.ok).toBe(true);
  expect(insp.summary).toContain("latin.csv: 2 rows, 2 columns: group (text), dose (number).");
});

test("the rule check drops a question or an option that names a stain or a channel the data does not have", () => {
  const insp = { ok: true, kind: "folder", summary: "Each field has 3 images: CH1 is brightfield, CH3 is red fluorescence.", colors: ["red"], kinds: ["brightfield", "fluorescence"], images_seen: true, previews: [] } as Inspection;
  const g = groundQuestions(
    [
      { question: "Which channel is DAPI?", options: ["CH1", "CH3"] },
      { question: "What counts as a positive cell?", options: ["Any red inside the cell", "Green and red overlap", "Red covers most of the cell"] },
      { question: "Do you want the nuclei counted too?", options: ["Yes", "No"] },
      { question: "CH1 looks like brightfield. Is that right?", options: ["Yes", "No"] },
      { question: "There is no nuclear stain. Should I count each round dark object in CH1 as one cell?", options: ["Yes", "No"] },
    ],
    insp,
  );
  expect(g.kept.map((q) => q.question)).toEqual(["What counts as a positive cell?", "CH1 looks like brightfield. Is that right?", "There is no nuclear stain. Should I count each round dark object in CH1 as one cell?"]);
  expect(g.kept[0]!.options).toEqual(["Any red inside the cell", "Red covers most of the cell"]);
  expect(g.dropped.map((d) => d.question)).toEqual(["Which channel is DAPI?", "What counts as a positive cell? (options: Green and red overlap)", "Do you want the nuclei counted too?"]);
  expect(g.dropped[0]!.reason).toMatch(/^The data has no blue channel or stain\./);
});

test("clarify waits for a data look; then the found text and the questions follow the data, and the dropped ones are logged", async () => {
  const provider = new FakeProvider([
    { calls: [{ name: "clarify", args: { found: "I see DAPI and GFP in each field.", questions: [{ question: "Which channel is DAPI?", options: ["CH1", "CH3"] }] } }] },
    { calls: [{ name: "inspect_data", args: { path: join(root, "images") } }] },
    {
      calls: [{
        name: "clarify",
        args: {
          found: "I see DAPI and GFP in each field.",
          questions: [
            { question: "Which channel is DAPI?", options: ["CH1", "CH3"] },
            { question: "What counts as a positive cell?", options: ["Any red inside the cell", "Green inside the cell"] },
          ],
        },
      }],
    },
    { text: "Thanks." },
  ]);
  session = await Session.create({ adapters: [], provider, cwd: root, interactive: true, settings: { pilot: "off" } as never });
  session.decisions.applySetup({ question: "Do treated cells eat more?" });
  const asked: { text: string; options: string[] }[] = [];
  let found = "";
  session.bus.on((e) => {
    if (e.type === "clarify") found = e.found;
    if (e.type === "question") {
      asked.push({ text: e.question.text, options: e.question.options.map((o) => o.label) });
      setTimeout(() => session!.answer(e.question.qid, e.question.options[0]!.value), 0);
    }
  });
  await session.send("What fraction of cells is red-positive in images/, by group?");
  const results = session.record.entries(["tool_result"]).filter((e) => e.data.tool === "clarify");
  expect(String(results[0]!.data.error)).toMatch(/^Look at the data first: call inspect_data/);
  expect(session.record.entries(["inspection"])[0]!.data.summary).toContain("CH1 is brightfield, CH3 is red fluorescence");
  expect(found).toContain("CH1 is brightfield, CH3 is red fluorescence");
  expect(found).not.toContain("I see DAPI");
  expect(found).not.toContain("GFP");
  expect(asked[0]).toEqual({ text: "What counts as a positive cell?", options: ["Any red inside the cell"] });
  expect(asked.slice(1).map((a) => a.text)).toContain("I found counts.csv (columns group, set, positive, total). Is this an earlier analysis of these images? Should the demonstration compare with it?");
  const all = JSON.stringify(asked);
  for (const w of ["DAPI", "green", "Green", "nuclei", "nuclear"]) expect(all).not.toContain(w);
  const log = session.record.entries(["clarify"]).map((e) => e.data.action);
  expect(log).toEqual(["found_replaced", "dropped", "asked", "answered"]);
  expect((session.record.entries(["clarify"])[1]!.data.dropped as { question: string }[]).map((d) => d.question)).toEqual(["Which channel is DAPI?", "What counts as a positive cell? (options: Green inside the cell)"]);
});
