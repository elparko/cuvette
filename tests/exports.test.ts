import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeAll, expect, test } from "vitest";
import { loadAdapter, type LoadedAdapter } from "../src/adapters/manifest.ts";
import { exportFlow, exportNotebook, exportProtocol, exportScript } from "../src/core/exports.ts";
import { AnalysisRecord } from "../src/core/record.ts";
import { replayFlow, type Runner } from "../src/core/replay.ts";
import type { Args, NodeIn, ToolOutput } from "../src/core/types.ts";

const YAML = `
adapter: { name: fake, title: Fake }
program: { name: FakeJ, version: "1.0" }
connection: { kind: cli }
decisions:
  - { key: sigma, label: Blur radius, kind: float, default: 1 }
map:
  - tool: open
    route: "File > Open..."
    steps: ["Choose {path}", "Click Open"]
  - tool: blur
    route: "Process > Filters > Gaussian Blur..."
    steps: ["Type {sigma} in the Sigma box", "Click OK"]
    params: [{ arg: sigma, label: "Sigma (Radius)", ui_default: 1 }]
  - { tool: fit, route: "", fidelity: code_only, difference: "Only available in code." }
`;

let dir: string;
let adapter: LoadedAdapter;
let rec: AnalysisRecord;
let a: string;
let b: string;

function nodeIn(over: Partial<NodeIn>): NodeIn {
  return {
    entry: 0, adapter: "fake", adapterVersion: "0.1.0", programVersion: "1.0", tool: "open", args: {}, decisions: {},
    codeHash: "c", inputHashes: [], outputs: [], result: {}, parents: [], summary: "", model: "m1",
    manualRoute: "", fidelity: "exact", ...over,
  };
}

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), "ga-exp-"));
  mkdirSync(join(dir, "ad"));
  writeFileSync(join(dir, "ad", "adapter.yaml"), YAML);
  adapter = loadAdapter(join(dir, "ad"));
  a = join(dir, "a.tif");
  b = join(dir, "b.tif");
  writeFileSync(a, "A");
  writeFileSync(b, "B");
  rec = new AnalysisRecord(join(dir, "s"), "20260101-000000-abcd");
  rec.append("session", { adapters: [{ name: "fake", version: "0.1.0", programVersion: "1.0" }], model: "m" });
  rec.append("setup", { values: { sigma: 2 } });
  const n1 = rec.addNode(nodeIn({ tool: "open", args: { path: a }, outputs: [{ path: "/w/a_out.tif", kind: "image" }], result: { metrics: { mean: 10 } } }));
  rec.addNode(nodeIn({ tool: "open", args: { path: b }, outputs: [{ path: "/w/b_out.tif", kind: "image" }], result: { metrics: { mean: 20 } } }));
  rec.addNode(nodeIn({
    tool: "blur", args: { path: "/w/a_out.tif", sigma: 2 }, decisions: { sigma: 2 }, parents: [n1.id],
    outputs: [{ path: "/w/blur.tif", kind: "image" }], result: { metrics: { mean: 9 } },
  }));
  rec.addNode(nodeIn({ tool: "blur", args: { path: "/w/a_out.tif", sigma: 3 }, sensitivityOf: "sigma" }));
  rec.addNode(nodeIn({ tool: "fit", args: { src: "/w/blur.tif" }, fidelity: "code_only", result: { metrics: { r2: 0.5 } } }));
});

test("protocol lists decisions, route steps, warnings, grouped repeats and a methods draft", () => {
  const md = readFileSync(exportProtocol(rec, [adapter], join(dir, "p.md")), "utf8");
  expect(md).toContain("| Blur radius | 2 |");
  expect(md).toContain("Route: File > Open...");
  expect(md).toContain(`Choose ${a}`);
  expect(md).toContain("Repeat step 1 for `" + b + "`.");
  expect(md).toContain("2. Repeat step 1");
  expect(md).toContain("3. blur");
  expect(md).toContain("Route: Process > Filters > Gaussian Blur...");
  expect(md).toContain("Type 2 in the Sigma box");
  expect(md).toContain("Sigma (Radius) = 2");
  expect(md).toContain("Warning: If you keep the default 1, you get a different result.");
  expect(md).toContain("Code only");
  expect(md).toContain("Only available in code.");
  expect(md).not.toContain("Type 3");
  expect(md).toContain("## Draft methods paragraph");
  expect(md).toContain("Data were analyzed in FakeJ 1.0.");
  expect(md).toContain("Blur was applied with Sigma (Radius) = 2.");
});

test("script calls ToolRunner and reuses earlier output paths", () => {
  const ts = readFileSync(exportScript(rec, [adapter], join(dir, "s.ts")), "utf8");
  expect(ts).toMatch(/^import \{ ToolRunner \} from ".*replay\.ts";/);
  expect(ts).toContain('await ToolRunner.start(["fake"])');
  expect(ts).toContain(`const s1 = await run.call("fake", "open", { "path": ${JSON.stringify(a)} });`);
  expect(ts).toContain('const s3 = await run.call("fake", "blur", { "path": s1.outputs[0].path, "sigma": 2 });');
  expect(ts).toContain('{ "src": s3.outputs[0].path }');
  expect(ts).not.toContain('"sigma": 3');
  expect(ts).toContain("await run.close();");
});

test("notebook has a markdown and a code cell per step", () => {
  const nb = JSON.parse(readFileSync(exportNotebook(rec, [adapter], join(dir, "n.ipynb")), "utf8"));
  expect(nb.nbformat).toBe(4);
  const code = nb.cells.filter((c: { cell_type: string }) => c.cell_type === "code");
  expect(code).toHaveLength(4);
  expect(code[2].source.join("")).toBe(`!ga run-step fake blur '{{"path":"/w/a_out.tif","sigma":2}}'`);
  const md = nb.cells.filter((c: { cell_type: string }) => c.cell_type === "markdown");
  expect(md[3].source.join("")).toContain("Process > Filters > Gaussian Blur...");
});

test("flow replaces input files and earlier outputs with placeholders", () => {
  const flow = JSON.parse(readFileSync(exportFlow(rec, [adapter], join(dir, "f.json")), "utf8"));
  expect(flow.adapters).toEqual(["fake"]);
  expect(flow.decisions).toEqual({ sigma: 2 });
  expect(flow.inputs).toEqual({ input_1: a, input_2: b });
  expect(flow.steps).toHaveLength(4);
  expect(flow.steps[0]).toEqual({ adapter: "fake", tool: "open", args: { path: "{input_1}" } });
  expect(flow.steps[2].args).toEqual({ path: "{step1.outputs.0.path}", sigma: 2 });
});

function fakeRuntime(means: number[]) {
  const calls: { tool: string; args: Args }[] = [];
  const runner: Runner = {
    async call(_adapter, tool, args): Promise<ToolOutput> {
      calls.push({ tool, args });
      const i = calls.length - 1;
      return { ok: true, metrics: { mean: means[i] ?? 0 }, outputs: [{ path: `/new/${i}.tif`, kind: "image" }] };
    },
    async close() {},
  };
  return { calls, factory: async () => runner };
}

test("replay substitutes inputs and compares metrics with the original session", async () => {
  const flowPath = exportFlow(rec, [adapter], join(dir, "f2.json"));
  const rt = fakeRuntime([10, 20, 9.5, 0]);
  const out = await replayFlow(flowPath, { input_1: "/x/a.tif", input_2: "/x/b.tif" }, { sessionDir: rec.dir, runtimeFactory: rt.factory });
  expect(rt.calls[0].args).toEqual({ path: "/x/a.tif" });
  expect(rt.calls[2].args).toEqual({ path: "/new/0.tif", sigma: 2 });
  expect(out.steps.map((s) => s.diffs.length)).toEqual([0, 0, 1, 2]);
  expect(out.steps[2].diffs[0]).toContain("mean: was 9, now 9.5");
  expect(out.steps[2].before).toEqual({ mean: 9 });
  expect(out.steps[3].diffs).toContain("r2: missing, was 0.5");
});

test("replay without a session dir reports no differences, and a missing input throws", async () => {
  const flowPath = exportFlow(rec, [adapter], join(dir, "f3.json"));
  const rt = fakeRuntime([1, 2, 3, 4]);
  const out = await replayFlow(flowPath, { input_1: a, input_2: b }, { runtimeFactory: rt.factory });
  expect(out.steps.every((s) => s.diffs.length === 0 && s.before === undefined)).toBe(true);
  await expect(replayFlow(flowPath, { input_1: a }, { runtimeFactory: rt.factory })).rejects.toThrow(/input_2/);
});

test("the protocol lists the programs that the agent loaded, with the reason, and the later decisions", () => {
  const r = new AnalysisRecord(mkdtempSync(join(tmpdir(), "ga-exp-pick-")), "s2");
  r.append("setup", { values: { question: "q" } });
  r.append("decision", { key: "adapter", old: null, new: "biostats", by: "human", reason: "answer to q1" });
  r.append("adapter", { name: "biostats", version: "0.1.1", programVersion: "0.30.0", reason: "The request is a paired test on a CSV file." });
  const md = readFileSync(exportProtocol(r, [], join(dir, "p2.md")), "utf8");
  expect(md).toContain("| Program (adapter) | biostats |");
  expect(md).toContain("## Programs");
  expect(md).toContain("- biostats adapter 0.1.1, program 0.30.0: The request is a paired test on a CSV file.");
});

test("protocol step numbers match the step numbers of the nodes when a step repeats for more inputs", () => {
  const r = new AnalysisRecord(join(dir, "s3"), "20260101-000000-abce");
  r.append("session", { adapters: [{ name: "fake", version: "0.1.0", programVersion: "1.0" }], model: "m" });
  for (const p of ["/w/1.tif", "/w/2.tif", "/w/3.tif"]) r.addNode(nodeIn({ tool: "open", args: { path: p } }));
  r.addNode(nodeIn({ tool: "fit", args: { src: "/w/x" } }));
  const md = readFileSync(exportProtocol(r, [adapter], join(dir, "p3.md")), "utf8");
  expect(md).toContain("2. Repeat step 1 for `/w/2.tif`, `/w/3.tif` (steps 2 to 3).");
  expect(md).toContain("4. fit");
});

test("protocol puts the approved plan at the top", () => {
  const r = new AnalysisRecord(join(dir, "plan"), "20260101-000000-plan");
  r.append("session", { adapters: [{ name: "fake", version: "0.1.0", programVersion: "1.0" }], model: "m" });
  r.append("plan_approved", { version: 1, text: "Question: Does drug 2 help?", plan: { steps: [] } });
  const text = readFileSync(exportProtocol(r, [adapter], join(dir, "plan-protocol.md")), "utf8");
  expect(text).toMatch(/^# Protocol\n\nSession .*\n\n## Analysis plan \(version 1, approved .*\)\n\nQuestion: Does drug 2 help\?\n/);
});
