import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, test } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { loadAdapter } from "../src/adapters/manifest.ts";
import { readFields } from "../src/adapters/kinds/common.ts";
import { runTests } from "../src/onboarding/kat.ts";
import type { Entry, Node, Tool, ToolOutput } from "../src/core/types.ts";

const DIR = resolve("catalog/smile-msi");
const adapter = loadAdapter(DIR);

const TOOL_ARGS: Record<string, string[]> = {
  list_slides: [], history: ["ref"], slide_state: ["ref"], analysis_catalog: ["category"], scripting_guide: [],
  run_result: ["ref", "run_id"], open_slide: ["ref", "stride", "ppm", "norm", "reduce", "tic_max_amp"], state: [],
  find_peaks: ["snr", "max_peaks", "spatial", "min_morans", "region", "max_candidates"],
  run_analysis: ["step_id", "params", "features", "a", "b", "region", "groups", "mask", "target_mz"],
  run_script: ["code"], send_regions: ["names", "groups", "parents"], ion_image: ["mz", "cmap", "mask"],
  mean_spectrum: ["region", "top_n"], annotate: ["mz", "mode", "match_ppm"], export_feature_table: ["ref", "tol_ppm"],
  close_slide: [], apply_settings: ["ppm", "norm", "reduce", "tic_max_amp"],
  list_user_tools: [], run_user_tool: ["name", "args"], get_tool_code: ["name", "version"],
  save_flow: ["name", "description", "steps"], list_flows: [], run_flow: ["name", "params"],
  create_tool: ["name", "description", "code", "parameters"],
  edit_tool: ["name", "code", "description", "parameters", "note"], delete_tool: ["name"],
};

const STEP_IDS = [
  "find_peaks", "find_spatial_features", "roi_comparison", "region_comparison", "discriminating_features",
  "multigroup_features", "class_comparison", "class_composition", "marker_panel", "shrunken_centroids",
  "roi_localization", "region_membership", "auto_segment", "colocalize", "coloc_modules", "region_correlation",
  "pca", "nmf", "plsda", "classify_cv", "embedding", "annotate",
];

const callArgs = (tool: string): Record<string, unknown> =>
  tool === "open_slide" ? { ref: "demo" } : tool === "run_analysis" ? { step_id: "roi_comparison" } : {};

describe("smile-msi manifest", () => {
  test("loads with the connection, locate and module settings", () => {
    const m = adapter.manifest;
    expect(m.adapter.name).toBe("smile-msi");
    expect(m.connection.kind).toBe("mcp");
    expect(m.connection.command).toEqual(["{program_path}", "{adapter_dir}/wrapper.py"]);
    expect(m.connection.state_tool).toBe("state");
    expect(m.connection.history_tool).toBe("history");
    expect(m.locate.env).toBe("SMILE_MSI_PYTHON");
    expect(m.locate.paths).toContain("~/Code/SMILE-MSI/.venv/Scripts/python.exe");
    expect(m.module).toBe("adapter.ts");
    expect(adapter.standardsText()).toContain("putative");
    expect(adapter.skills().map((s) => s.name).sort()).toEqual(["compare-regions", "explore-slide", "follow-mode", "identify-lipids", "teach-mode"]);
    for (const s of adapter.skills()) expect(s.description.length).toBeGreaterThan(10);
  });

  test("every tool has a map entry", () => {
    for (const tool of Object.keys(TOOL_ARGS)) {
      expect(adapter.mapEntry(tool, callArgs(tool)), tool).toBeDefined();
    }
  });

  test("every important step has its own run_analysis entry", () => {
    for (const id of STEP_IDS) {
      const e = adapter.mapEntry("run_analysis", { step_id: id });
      expect(e?.match.step_id, id).toBe(id);
      expect(e?.route, id).toMatch(/Analyze|tab/);
    }
    expect(adapter.mapEntry("run_analysis", { step_id: "no_such_step" })?.fidelity).toBe("close");
    expect(adapter.mapEntry("find_peaks", { spatial: true })?.route).toContain("spatial");
    expect(adapter.mapEntry("open_slide", { ref: "demo" })?.fidelity).toBe("exact");
  });

  test("map parameters point at real tool arguments or step parameters", () => {
    const notTool = /Not a tool argument/;
    for (const e of adapter.manifest.map) {
      for (const p of e.params) {
        if (e.tool === "run_analysis") {
          expect(["a", "b", "groups", "mask"].includes(p.arg) || p.arg.startsWith("params."), `${e.tool} ${p.arg}`).toBe(true);
        } else if (!notTool.test(p.note)) {
          expect(TOOL_ARGS[e.tool], e.tool).toContain(p.arg);
        }
      }
    }
  });

  test("decision links point at real tools and arguments", () => {
    const stepParams = new Set(adapter.manifest.map.filter((e) => e.tool === "run_analysis").flatMap((e) => e.params.map((p) => p.arg)));
    const linked = new Set<string>();
    for (const d of adapter.manifest.decisions) {
      for (const l of d.links) {
        expect(TOOL_ARGS[l.tool], `${d.key} -> ${l.tool}`).toBeDefined();
        const top = l.arg.split(".")[0];
        expect(TOOL_ARGS[l.tool], `${d.key} -> ${l.tool}.${l.arg}`).toContain(top);
        if (l.arg.includes(".")) expect(stepParams.has(l.arg), l.arg).toBe(true);
        linked.add(`${l.tool}.${l.arg}`);
      }
    }
    expect(adapter.linksFor("run_analysis")).toMatchObject({ "params.tol_ppm": "ppm", "params.norm": "norm", "params.max_q": "max_q", "params.min_auc": "min_auc" });
    expect(adapter.linksFor("find_peaks")).toMatchObject({ snr: "snr", max_peaks: "max_peaks", min_morans: "spatial_min_morans", max_candidates: "spatial_max_candidates" });
    expect(adapter.linksFor("annotate")).toEqual({ mode: "mode", match_ppm: "id_ppm" });
    expect(adapter.linksFor("apply_settings")).toEqual({ ppm: "ppm", norm: "norm", reduce: "reduce", tic_max_amp: "tic_max_amp" });
  });

  test("decisions have ranges, defaults and owners from the profile schema", () => {
    const by = Object.fromEntries(adapter.manifest.decisions.map((d) => [d.key, d]));
    expect(by.ppm).toMatchObject({ kind: "float", default: 10, lo: 1, hi: 200, owner: "human" });
    expect(by.norm).toMatchObject({ kind: "choice", default: "tic", choices: ["tic", "none", "rms"], owner: "human" });
    expect(by.norm.sensitivity).toMatchObject({ tool: "run_analysis", args: { step_id: "discriminating_features" }, options: ["tic", "rms", "none"] });
    expect(by.replicate.default).toBe("pixels (exploratory)");
    expect(by.max_q).toMatchObject({ lo: 0.001, hi: 0.25, default: 0.05 });
    expect(by.min_auc).toMatchObject({ lo: 0.5, hi: 1, default: 0.7 });
    expect(Object.keys(by).length).toBe(15);
  });

  test("known-answer tests are declared", () => {
    expect(adapter.manifest.tests.map((t) => t.id)).toEqual(["demo-opens", "settings-apply", "demo-planted-lipids", "demo-rim-vs-core", "demo-norm-none"]);
  });

  test("manualRoute joins the map route and the argument values", async () => {
    const mod = await adapter.module();
    const route = mod.manualRoute!("run_analysis", { step_id: "roi_comparison", a: "rim", b: "core", params: { norm: "rms", tol_ppm: 10 } });
    expect(route).toContain("Analyze > This slide > Statistics > Region comparison (A vs B)");
    expect(route).toContain("Compare A = rim");
    expect(route).toContain("vs B = core");
    expect(route).toContain("Normalization = rms");
    expect(route).toContain("Extraction tol (ppm) = 10");
    expect(mod.manualRoute!("find_peaks", { snr: 3 })).toContain("Find peaks");
  });
});

const entry = (id: number, kind: Entry["kind"], data: Record<string, unknown>, node?: string): Entry =>
  ({ id, ts: "", session: "s", kind, data, node });
const node = (id: string, tool: string, args: Record<string, unknown>, result: unknown): Node =>
  ({ id, ts: "", entry: 1, adapter: "smile-msi", adapterVersion: "", programVersion: "", tool, args, decisions: {}, codeHash: "", inputHashes: [], outputs: [], result, parents: [], summary: "", model: "", manualRoute: "", fidelity: "exact" });

describe("smile-msi checks", () => {
  const run = async (name: string, ctx: { entries?: Entry[]; nodes?: Node[]; decisions?: Record<string, unknown>; answer?: string }) =>
    (await adapter.module()).checks![name]({ entries: [], nodes: [], decisions: {}, answer: "", ...ctx });

  test("the checks in the module match the manifest", async () => {
    const mod = await adapter.module();
    expect(Object.keys(mod.checks!).sort()).toEqual(adapter.manifest.checks.map((c) => c.id).sort());
  });

  test("pixel_replication flags a pixel test and passes a section test", async () => {
    const nodes = [node("n1", "run_analysis", { step_id: "roi_comparison" }, {})];
    expect(await run("pixel_replication", { nodes, decisions: { replicate: "pixels (exploratory)" } })).toHaveLength(1);
    expect(await run("pixel_replication", { nodes, decisions: {} })).toHaveLength(1);
    expect(await run("pixel_replication", { nodes, decisions: { replicate: "regions / sections" } })).toHaveLength(0);
    expect(await run("pixel_replication", { nodes: [node("n2", "find_peaks", {}, {})] })).toHaveLength(0);
  });

  test("failed_result_ignored needs a mention of the failure", async () => {
    const base = [entry(1, "tool_call", { callId: "a", tool: "run_analysis" }), entry(2, "tool_result", { callId: "a", tool: "run_analysis", ok: false, error: "no groups" })];
    const silent = [...base, entry(3, "assistant", { text: "The rim has more sulfatide." })];
    const told = [...base, entry(3, "assistant", { text: "The analysis failed, so I changed the groups." })];
    const f = await run("failed_result_ignored", { entries: silent });
    expect(f).toHaveLength(1);
    expect(f[0].severity).toBe("error");
    expect(await run("failed_result_ignored", { entries: told })).toHaveLength(0);
    expect(await run("failed_result_ignored", { entries: [...base, entry(3, "blocked", { callId: "a" })] })).toHaveLength(0);
  });

  test("putative_identity_stated_as_fact", async () => {
    const bad = await run("putative_identity_stated_as_fact", { answer: "The rim holds PC 34:1 and PE 38:4." });
    expect(bad).toHaveLength(1);
    expect(await run("putative_identity_stated_as_fact", { answer: "The rim holds putative PC 34:1 at sum-composition level." })).toHaveLength(0);
    expect(await run("putative_identity_stated_as_fact", { answer: "The ratio is PC 1:1." })).toHaveLength(0);
  });

  test("p_value_without_effect_size", async () => {
    expect(await run("p_value_without_effect_size", { answer: "The difference has p = 0.003." })).toHaveLength(1);
    expect(await run("p_value_without_effect_size", { answer: "The difference has p = 0.003 and AUC 0.91." })).toHaveLength(0);
    expect(await run("p_value_without_effect_size", { answer: "Features pass at q < 0.05.", decisions: { max_q: 0.05 } })).toHaveLength(0);
  });

  test("artefacts_not_addressed", async () => {
    const iso = node("n3", "annotate", {}, { table: { columns: ["mz", "isotopologue"], rows: [[886.5, true]] } });
    expect(await run("artefacts_not_addressed", { nodes: [iso], answer: "PI 38:4 is high in the core." })).toHaveLength(1);
    expect(await run("artefacts_not_addressed", { nodes: [iso], answer: "I removed the isotope peaks." })).toHaveLength(0);
    expect(await run("artefacts_not_addressed", { nodes: [node("n4", "auto_segment", {}, { segmentation: { background_clusters: { "0": 400 } } })], answer: "Two clusters." })).toHaveLength(1);
  });

  test("no_question", async () => {
    expect(await run("no_question", { decisions: {} })).toHaveLength(1);
    expect(await run("no_question", { decisions: { question: "Which lipids differ?" } })).toHaveLength(0);
  });
});

const PYTHON = [process.env.SMILE_MSI_PYTHON, join(homedir(), "Code/SMILE-MSI/.venv/bin/python"), join(homedir(), "code/SMILE-MSI/.venv/bin/python")]
  .filter((p): p is string => !!p)
  .find((p) => existsSync(p));

const MAKE_SESSION = `
import json, os, sys, tempfile
sys.path.insert(0, ${JSON.stringify(DIR)})
from smile_msi import runs, session
import wrapper
d = tempfile.mkdtemp(prefix="ga-smile-hist-")
path = os.path.join(d, "slide__test.json")
settings = {"ppm": 5.0, "norm": "rms", "reduce": "sum", "snr": 1.5,
            "profile_deviations": {"norm": ["tic", "rms"], "ppm": [10.0, 5.0], "snr": [3.0, 1.5]}}
session.save_session(path, session.build_session(source="/nonexistent/slide.imzML", settings=settings, peaks=[]))
store = runs.RunStore(session.runs_dir_path(path))
def add(step, params, now, status="done"):
    r = runs.new_run(step, title=step, params=params, now=now)
    r.status = status
    store.save(r)
add("find_peaks", {"snr": 3.0, "min_rel_intensity": 0.002, "prominence": 1.0, "max_peaks": 500}, "2026-01-01T10:00:00+00:00")
add("roi_comparison", {"method": "mwu", "max_q": 0.05, "tol_ppm": 5.0, "norm": "rms"}, "2026-01-01T10:05:00+00:00")
add("pca", {"n_components": 3}, "2026-01-01T10:06:00+00:00", "error")
add("find_spatial_features", {"snr": 3.0, "min_morans": 0.05, "max_candidates": 2000, "tol_ppm": 5.0, "norm": "rms"}, "2026-01-01T09:00:00+00:00")
print(json.dumps(wrapper.history(path)))
print(json.dumps(wrapper.history("demo")))
`;

describe.skipIf(!PYTHON)("smile-msi history on a temporary session", () => {
  test("the steps are the settings the scientist changed, then the finished runs oldest first", () => {
    const out = execFileSync(PYTHON!, ["-I", "-c", MAKE_SESSION], { encoding: "utf8", timeout: 120000 }).trim().split("\n");
    const h = JSON.parse(out[0]);
    expect(h.n_runs).toBe(3);
    expect(h.steps.map((s: { tool: string; args: unknown }) => [s.tool, s.args])).toEqual([
      ["apply_settings", { norm: "rms", ppm: 5 }],
      ["find_peaks", { snr: 3, min_morans: 0.05, max_candidates: 2000, spatial: true }],
      ["find_peaks", { snr: 3, max_peaks: 500 }],
      ["run_analysis", { step_id: "roi_comparison", params: { method: "mwu", max_q: 0.05, tol_ppm: 5, norm: "rms" } }],
    ]);
    expect(h.steps[3].line).toContain("Analyze > This slide > Statistics > Region comparison (A vs B)");
    expect(h.steps[3].line).toContain("Normalization = rms");
    expect(JSON.parse(out[1]).steps).toEqual([]);
  });
});

describe.skipIf(!process.env.GA_LIVE || !PYTHON)("smile-msi live", () => {
  const workDir = mkdtempSync(join(tmpdir(), "ga-smile-"));
  const client = new Client({ name: "ga-test", version: "0" });
  const transport = new StdioClientTransport({
    command: PYTHON!,
    args: [join(DIR, "wrapper.py")],
    env: { ...(process.env as Record<string, string>), GA_WORK_DIR: workDir },
  });
  let toolList: { name: string; inputSchema: { properties?: Record<string, unknown> } }[] = [];

  const call = async (name: string, args: Record<string, unknown> = {}) => {
    const r = (await client.callTool({ name, arguments: args }, undefined, { timeout: 300000 })) as { isError?: boolean; content: { type: string; text?: string }[] };
    const text = r.content.find((c) => c.type === "text")?.text ?? "";
    return { isError: !!r.isError, text, json: r.isError ? undefined : (JSON.parse(text) as any) };
  };

  test("connect and list tools", async () => {
    await client.connect(transport);
    toolList = (await client.listTools()).tools as typeof toolList;
    expect(toolList.map((t) => t.name).sort()).toEqual(Object.keys(TOOL_ARGS).sort());
  });

  test("tool arguments match the table used by the fast tests", () => {
    for (const t of toolList) expect(Object.keys(t.inputSchema.properties ?? {}).sort(), t.name).toEqual([...TOOL_ARGS[t.name]].sort());
  });

  test("every tool has a map entry and every link points at a real argument", () => {
    for (const t of toolList) expect(adapter.mapEntry(t.name, callArgs(t.name)), t.name).toBeDefined();
    for (const d of adapter.manifest.decisions) {
      for (const l of d.links) {
        const tool = toolList.find((t) => t.name === l.tool);
        expect(tool, `${d.key} -> ${l.tool}`).toBeDefined();
        expect(Object.keys(tool!.inputSchema.properties ?? {})).toContain(l.arg.split(".")[0]);
      }
    }
  });

  test("state works with no slide open", async () => {
    const r = await call("state");
    expect(r.json.slide_open).toBe(false);
    expect(r.json.summary).toBe("No slide is open.");
  });

  test("open_slide demo, state and apply_settings", async () => {
    const o = await call("open_slide", { ref: "demo" });
    expect(o.json.n_pixels).toBe(1584);
    expect(o.json.groups).toEqual({ "Group A": 792, "Group B": 792 });
    expect(o.json.settings).toEqual({ ppm: 20, norm: "tic", reduce: "sum", tic_max_amp: 3 });
    expect(o.json.mode).toBe("negative");
    expect(o.json.manual_route).toBe("File > Load demo dataset.");

    const a = await call("apply_settings", { ppm: 10, norm: "rms", reduce: "max", tic_max_amp: 5 });
    expect(a.json.was).toEqual({ ppm: 20, norm: "tic", reduce: "sum", tic_max_amp: 3 });
    expect(a.json.now).toEqual({ ppm: 10, norm: "rms", reduce: "max", tic_max_amp: 5 });
    expect(a.json.changed.sort()).toEqual(["norm", "ppm", "reduce", "tic_max_amp"]);
    expect(a.json.summary).toContain("Changed");

    const s = await call("state");
    expect(s.json.settings).toEqual(a.json.now);
    expect(s.json.n_features).toBe(0);

    const bad = await call("apply_settings", { ppm: 5000 });
    expect(bad.isError).toBe(true);
    expect(bad.text).toContain("between");

    const again = await call("open_slide", { ref: "demo", ppm: 10, norm: "tic" });
    expect(again.json.settings).toEqual({ ppm: 10, norm: "tic", reduce: "sum", tic_max_amp: 3 });
    expect(again.json.settings_change.changed.sort()).toEqual(["ppm"]);
  });

  test("results carry summary, metrics, outputs and a manual route that starts like the map route", async () => {
    await call("open_slide", { ref: "demo" });
    const peaks = await call("find_peaks", { max_peaks: 40 });
    expect(peaks.json.metrics).toMatchObject({ n_features: 40, n_detected: 11432 });
    expect(peaks.json.manual_route.startsWith(adapter.mapEntry("find_peaks", {})!.route)).toBe(true);
    const cmp = await call("run_analysis", { step_id: "roi_comparison", a: "left", b: "right" });
    expect(cmp.json.table.rows.length).toBe(12);
    expect(cmp.json.table.columns).toContain("AUC");
    expect(cmp.json.outputs[0].kind).toBe("table");
    expect(cmp.json.manual_route).toContain("Compare A = left vs B = right.");
    expect(cmp.json.manual_route.startsWith(adapter.mapEntry("run_analysis", { step_id: "roi_comparison" })!.route)).toBe(true);
    const ann = await call("annotate", { mz: [885.5488] });
    expect(ann.json.manual_route.startsWith(adapter.mapEntry("annotate", {})!.route)).toBe(true);
    const img = await call("ion_image", { mz: 885.5488 });
    expect(img.json.outputs[0].kind).toBe("image");
    expect(existsSync(img.json.png)).toBe(true);
    expect(img.json.png.startsWith(workDir)).toBe(true);
  });

  test("the known-answer tests in adapter.yaml pass", async () => {
    const tools: Tool[] = toolList.map((t) => ({
      name: t.name,
      description: "",
      inputSchema: t.inputSchema as Record<string, unknown>,
      source: "adapter",
      adapter: "smile-msi",
      async execute(args): Promise<ToolOutput> {
        const r = await call(t.name, args);
        if (r.isError) return { ok: false, error: r.text };
        return { ok: true, data: r.json, text: r.text, ...readFields(r.json) };
      },
    }));
    const outcomes = await runTests(adapter, { tools: async () => tools }, { workDir });
    expect(outcomes.map((o) => [o.id, o.failures])).toEqual(adapter.manifest.tests.map((t) => [t.id, []]));
  });

  test("close", async () => {
    await client.close();
  });
});
