import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, test } from "vitest";
import mod, { fidelity, manualRoute, menuFromProps, menuIndex, readZipEntry } from "../catalog/imagej/adapter.ts";
import { locate } from "../src/adapters/locate.ts";
import { loadAdapter } from "../src/adapters/manifest.ts";
import { renderMacro, startMacro } from "../src/adapters/kinds/macro.ts";
import { runProcess } from "../src/adapters/kinds/common.ts";
import { checkAdapter } from "../src/onboarding/checker.ts";
import { runTests } from "../src/onboarding/kat.ts";
import type { AdapterCheckContext } from "../src/adapters/manifest.ts";
import type { Entry, FindingIn, Node, ToolContext } from "../src/core/types.ts";

const ROOT = resolve(import.meta.dirname, "../catalog/imagej");
const adapter = loadAdapter(ROOT);
const JAR = "/Applications/ImageJ.app/Contents/Java/ij.jar";
const live = !!process.env.GA_LIVE;

function macroFor(tool: string, args: Record<string, unknown>): string {
  const def = adapter.manifest.tools.find((t) => t.name === tool)!;
  const outputs = Object.fromEntries(Object.keys(def.outputs).map((k) => [k, `/work/${tool}-1/${k}.out`]));
  const full: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(def.params)) if ("default" in v) full[k] = v.default;
  return renderMacro(def.macro, {
    args: { ...full, ...args },
    outputs,
    ph: { call_dir: `/work/${tool}-1`, work_dir: "/work" },
    declared: new Set(Object.keys(def.params)),
    adapterDir: ROOT,
  });
}

describe("adapter files", () => {
  test("the checker finds no error", async () => {
    const r = await checkAdapter(ROOT);
    expect(r.errors).toEqual([]);
  });

  test("each tool has a map entry, and each decision link names a real argument", () => {
    const names = new Set(adapter.manifest.tools.map((t) => t.name));
    names.add("list_commands");
    for (const n of names) expect(adapter.manifest.map.some((m) => m.tool === n), n).toBe(true);
    for (const d of adapter.manifest.decisions) {
      for (const l of d.links) {
        const t = adapter.manifest.tools.find((x) => x.name === l.tool);
        expect(t && l.arg in t.params, `${d.key} -> ${l.tool}.${l.arg}`).toBe(true);
      }
    }
  });

  test("each check has a function in the module", () => {
    for (const c of adapter.manifest.checks) expect(typeof mod.checks?.[c.id], c.id).toBe("function");
  });

  test("the skills have a name and a description", () => {
    const skills = adapter.skills();
    expect(skills.map((s) => s.name).sort()).toEqual(["batch-folder", "compare-conditions", "count-cells", "follow-mode"]);
    for (const s of skills) expect(s.description.length).toBeGreaterThan(10);
    expect(adapter.standardsText()).toContain("unit of replication".replace("unit of replication", "Unit of replication"));
  });

  test("the sensitivity tool takes the arguments of the threshold tool", () => {
    const sens = adapter.manifest.decisions.find((d) => d.key === "threshold_method")!.sensitivity!;
    const props = adapter.manifest.tools.find((t) => t.name === sens.tool)!.params;
    expect(Object.keys(props)).toEqual(expect.arrayContaining(["input", "method", "dark_background"]));
  });
});

describe("macro templates", () => {
  test("a path with quotes, backslashes and spaces stays inside the string literal", () => {
    const m = macroFor("open_image", { path: 'C:\\my data\\"a".tif' });
    expect(m).toContain('openImage("C:\\\\my data\\\\\\"a\\".tif");');
    expect(m).toContain('printInfo("C:\\\\my data\\\\\\"a\\".tif");');
  });

  test("numbers and booleans are bare words, output paths are filled", () => {
    const m = macroFor("threshold_and_count", { input: "/i.tif", method: "Otsu", dark_background: true, sigma: 1.5, min_size: 20 });
    expect(m).toContain('pipeline(0, false, 1.5, "Otsu", true, false);');
    expect(m).toContain('analyze(20, 0, 0, false, "None", "/work/threshold_and_count-1/outlines.out", "/work/threshold_and_count-1/particles.out");');
  });

  test("run_macro puts the code in as it is, after the callDir line", () => {
    const m = macroFor("run_macro", { code: 'print("n=" + 1);' });
    expect(m).toBe('callDir = "/work/run_macro-1";\nprint("n=" + 1);\n');
  });

  test("the library is included once and defines the functions that the tools call", () => {
    const m = macroFor("count_folder", { folder: "/f" });
    const lib = readFileSync(join(ROOT, "lib.ijm"), "utf8");
    expect(m.startsWith(lib)).toBe(true);
    for (const fn of ["openImage", "pipeline", "analyze", "globToRegex", "printCounts"]) expect(lib).toContain(`function ${fn}(`);
  });

  test("every tool macro renders with no open template token", () => {
    for (const def of adapter.manifest.tools) {
      const args: Record<string, unknown> = {};
      for (const k of def.required) args[k] = def.params[k].type === "number" ? 1 : "x";
      const m = macroFor(def.name, args).replace(readFileSync(join(ROOT, "lib.ijm"), "utf8"), "");
      expect(m, def.name).not.toMatch(/\{(output\.[a-z_]+|[a-z_]+)\}/);
    }
  });
});

describe("manual routes", () => {
  test("threshold gives the menu path, the dialog fields and the recorder text", () => {
    const r = manualRoute("threshold", { method: "Otsu", dark_background: true })!;
    expect(r.startsWith("Image > Adjust > Threshold...")).toBe(true);
    expect(r).toContain("Dark background = on");
    expect(r).toContain('setAutoThreshold("Otsu dark");');
    expect(r).toContain('run("Convert to Mask");');
  });

  test("analyze_particles shows the size range and the edge setting", () => {
    const r = manualRoute("analyze_particles", { min_size: 20, max_size: 0, min_circularity: 0.5, exclude_edges: true })!;
    expect(r).toContain("Size = 20-Infinity");
    expect(r).toContain("Exclude on edges = on");
    expect(r).toContain('"size=20-Infinity circularity=0.50-1.00 show=Outlines display clear exclude"');
  });

  test("a combined tool lists each step in order and skips the steps that are off", () => {
    const r = manualRoute("threshold_and_count", { method: "Li", dark_background: false, rolling_radius: 25, sigma: 0, watershed: true, min_size: 5 })!;
    const order = ["Subtract Background...", "Threshold...", "Watershed", "Analyze Particles..."].map((s) => r.indexOf(s));
    expect(order.every((i) => i > -1)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(r).not.toContain("Gaussian Blur...");
    expect(r).toContain('run("Subtract Background...", "rolling=25");');
  });

  test("count_folder repeats the steps for the files", () => {
    const r = manualRoute("count_folder", { folder: "/data/run1", pattern: "*.tif", method: "Default" })!;
    expect(r.startsWith("Repeat the steps below for each image in /data/run1 that matches *.tif.")).toBe(true);
  });

  test("the fidelity of run_macro depends on the code", () => {
    expect(fidelity("run_macro", { code: 'run("Invert");\nrun("Median...", "radius=2");' })).toBe("exact");
    expect(fidelity("run_macro", { code: 'for (i=0;i<3;i++) run("Invert");' })).toBe("code_only");
    expect(fidelity("threshold", {})).toBeUndefined();
  });

  test.skipIf(!existsSync(JAR))("each menu path in the map exists in the program's menus", () => {
    const menus = new Set(menuFromProps(readZipEntry(JAR, "IJ_Props.txt")!));
    const routes = adapter.manifest.map.map((m) => m.route).filter((r) => r.includes(" > "));
    expect(routes.length).toBeGreaterThan(8);
    for (const r of routes) {
      const label = r.split(" > ").pop()!;
      const hit = [...menus].some((m) => m === r || m.endsWith(` > ${label}`) || m.replace(/\[.*?\]/g, "").trim() === r);
      expect(hit, r).toBe(true);
    }
  });
});

describe("checks", () => {
  let n = 0;
  const node = (tool: string, args: Record<string, unknown>, metrics: Record<string, number> = {}, values: Record<string, unknown> = {}): Node =>
    ({ id: `n${++n}`, tool, args, result: { ok: true, metrics, data: { values } } }) as unknown as Node;
  const ctx = (nodes: Node[], decisions: Record<string, unknown>, answer: string, entries: Entry[] = []): AdapterCheckContext => ({ nodes, decisions, answer, entries });
  const run = (id: string, c: AdapterCheckContext) => mod.checks![id](c) as FindingIn[];

  test("pseudoreplication: p-values from particles in one image", () => {
    const nodes = [node("threshold_and_count", { input: "/a.tif" }, { count: 40 })];
    const f = run("pseudoreplication", ctx(nodes, { replicate: "cells or particles (exploratory)" }, "The area is larger (p < 0.01)."));
    expect(f).toHaveLength(1);
    expect(f[0].severity).toBe("error");
    expect(run("pseudoreplication", ctx(nodes, { replicate: "images or fields" }, "p < 0.01"))).toEqual([]);
    expect(run("pseudoreplication", ctx(nodes, { replicate: "cells or particles (exploratory)" }, "The mean area is 300."))).toEqual([]);
  });

  test("pseudoreplication: many images lower the severity", () => {
    const nodes = ["a", "b", "c", "d"].map((x) => node("threshold_and_count", { input: `/${x}.tif` }, { count: 10 }));
    const f = run("pseudoreplication", ctx(nodes, { replicate: "cells or particles (exploratory)" }, "p = 0.03"));
    expect(f[0].severity).toBe("warning");
  });

  test("uncalibrated_units: micrometers without a scale", () => {
    const nodes = [node("open_image", { path: "/a.tif" }, { calibrated: 0 }, { pixel_unit: "pixels" })];
    expect(run("uncalibrated_units", ctx(nodes, { pixel_size: "uncalibrated" }, "The nuclei are 12 um wide."))).toHaveLength(1);
    expect(run("uncalibrated_units", ctx(nodes, { pixel_size: "0.65 um/pixel" }, "The nuclei are 12 um wide."))).toEqual([]);
    expect(run("uncalibrated_units", ctx([...nodes, node("set_scale", {})], { pixel_size: "uncalibrated" }, "12 µm"))).toEqual([]);
    expect(run("uncalibrated_units", ctx(nodes, { pixel_size: "uncalibrated" }, "The nuclei are 12 pixels wide."))).toEqual([]);
  });

  test("saturation: only if the saturated image was measured", () => {
    const open = node("open_image", { path: "/a.tif" }, { saturated_fraction: 0.05 });
    expect(run("saturation", ctx([open], {}, ""))).toEqual([]);
    const f = run("saturation", ctx([open, node("measure", { input: "/a.tif" })], {}, ""));
    expect(f).toHaveLength(1);
    expect(f[0].nodes).toEqual([open.id]);
    expect(run("saturation", ctx([node("open_image", {}, { saturated_fraction: 0.001 }), node("measure", {})], {}, ""))).toEqual([]);
  });

  test("jpeg_quantification: a JPEG that was measured", () => {
    const nodes = [node("open_image", { path: "/a.JPG" }), node("analyze_particles", { mask: "/m.tif" })];
    expect(run("jpeg_quantification", ctx(nodes, {}, ""))).toHaveLength(1);
    expect(run("jpeg_quantification", ctx([node("open_image", { path: "/a.JPG" })], {}, ""))).toEqual([]);
    expect(run("jpeg_quantification", ctx([node("open_image", { path: "/a.tif" }), node("measure", { input: "/a.tif" })], {}, ""))).toEqual([]);
  });

  test("threshold_not_checked: an unchecked method, and a count that depends on it", () => {
    const one = [node("threshold", { input: "/a.tif", method: "Default" })];
    expect(run("threshold_not_checked", ctx(one, { threshold_method: "Default" }, ""))[0].severity).toBe("info");
    const many = [
      node("threshold_and_count", { input: "/a.tif", method: "Default" }, { count: 64 }),
      node("threshold_and_count", { input: "/a.tif", method: "Triangle" }, { count: 119 }),
    ];
    const f = run("threshold_not_checked", ctx(many, {}, ""));
    expect(f[0].severity).toBe("warning");
    expect(f[0].message).toContain("20 percent");
    const close = [
      node("threshold_and_count", { input: "/a.tif", method: "Default" }, { count: 64 }),
      node("threshold_and_count", { input: "/a.tif", method: "Otsu" }, { count: 66 }),
    ];
    expect(run("threshold_not_checked", ctx(close, {}, ""))).toEqual([]);
    const entry = { kind: "sensitivity", data: { decisionKey: "threshold_method", options: [{ value: "Default", ok: true, metrics: { count: 10 } }, { value: "Li", ok: true, metrics: { count: 20 } }] } } as unknown as Entry;
    expect(run("threshold_not_checked", ctx(one, {}, "", [entry]))[0].severity).toBe("warning");
  });

  test("background_not_handled: uneven background and no subtract step", () => {
    const open = node("open_image", { path: "/a.tif" }, { background_variation: 0.4 });
    const count = node("threshold_and_count", { input: "/a.tif", rolling_radius: 0 }, { count: 5 });
    expect(run("background_not_handled", ctx([open, count], {}, ""))).toHaveLength(1);
    expect(run("background_not_handled", ctx([open, node("subtract_background", { input: "/a.tif" }), count], {}, ""))).toEqual([]);
    expect(run("background_not_handled", ctx([open, node("threshold_and_count", { input: "/a.tif", rolling_radius: 25 })], {}, ""))).toEqual([]);
    expect(run("background_not_handled", ctx([node("open_image", {}, { background_variation: 0.01 }), count], {}, ""))).toEqual([]);
  });
});

describe("hook", () => {
  const hook = mod.hooks![0];
  test("adds context for saturation, JPEG, uneven background and a missing scale", () => {
    const out = hook.run({
      tool: "open_image",
      output: { ok: true, metrics: { saturated_fraction: 0.2, background_variation: 0.5, calibrated: 0 }, data: { values: { file_type: "jpeg" } } },
    });
    expect(out.additionalContext).toContain("Saturation");
    expect(out.additionalContext).toContain("JPEG");
    expect(out.additionalContext).toContain("background");
    expect(out.additionalContext).toContain("no scale");
  });

  test("adds nothing for a clean image or another tool", () => {
    expect(hook.run({ tool: "open_image", output: { ok: true, metrics: { saturated_fraction: 0, calibrated: 1 }, data: { values: { file_type: "tiff" } } } })).toEqual({});
    expect(hook.run({ tool: "threshold", output: { ok: true } })).toEqual({});
  });
});

describe.skipIf(!live)("live ImageJ", () => {
  const ctx = { signal: new AbortController().signal } as unknown as ToolContext;
  const work = mkdtempSync(join(tmpdir(), "ga-imagej-"));

  test("the known-answer tests of the adapter pass", async () => {
    const rt = await startMacro(adapter, { workDir: join(work, "kat"), sessionDir: work });
    expect(rt.programVersion).toMatch(/^1\.\d+/);
    const outcomes = await runTests(adapter, rt, { workDir: join(work, "kat") });
    expect(outcomes.length).toBe(adapter.manifest.tests.length);
    for (const o of outcomes) expect(o.failures, o.id).toEqual([]);
    await rt.close();
  });

  test("blobs.gif: the Default threshold finds 64 particles, and 46 if edges are excluded", async () => {
    const rt = await startMacro(adapter, { workDir: join(work, "blobs"), sessionDir: work });
    const tools = Object.fromEntries((await rt.tools()).map((t) => [t.name, t]));
    const blobs = join(ROOT, "data/blobs.gif");
    const a = await tools.threshold_and_count.execute({ input: blobs, method: "Default", dark_background: false }, ctx);
    expect(a.metrics?.count).toBe(64);
    const b = await tools.threshold_and_count.execute({ input: blobs, method: "Default", dark_background: false, exclude_edges: true }, ctx);
    expect(b.metrics?.count).toBe(46);
    expect(a.images?.length).toBe(1);
    expect(a.table?.n_rows).toBe(64);
    expect(a.table?.columns).toContain("Area");
    await rt.close();
  });

  test("the macro that the manual route writes gives the same count as the tool", async () => {
    const jar = (await locate(adapter.manifest)).path!;
    const route = manualRoute("threshold_and_count", { method: "Default", dark_background: false, rolling_radius: 0, sigma: 0, watershed: false, min_size: 0, max_size: 0, min_circularity: 0, exclude_edges: false })!;
    const lines = route.split("\n").filter((l) => /^ {2}(run|setAutoThreshold)\(/.test(l)).map((l) => l.trim());
    const macro = [`open("${join(ROOT, "data/blobs.gif")}");`, 'setOption("BlackBackground", false);', ...lines, 'print("manual_count=" + nResults);'].join("\n");
    const file = join(work, "manual.ijm");
    writeFileSync(file, macro);
    const r = await runProcess(["java", "-Dapple.awt.UIElement=true", "-jar", jar, "-batch", file], { timeoutMs: 60000 });
    expect(r.stdout).toContain("manual_count=64");
  });

  test("list_commands finds menu paths from the program", async () => {
    const rt = await startMacro(adapter, { workDir: join(work, "lc"), sessionDir: work });
    const tools = Object.fromEntries((await rt.tools()).map((t) => [t.name, t]));
    const o = await tools.list_commands.execute({ query: "gaussian blur" }, ctx);
    expect(o.text).toContain("Process > Filters > Gaussian Blur...");
    const all = await menuIndex();
    for (const m of adapter.manifest.map.map((e) => e.route).filter((r) => r.includes(" > "))) {
      const label = m.split(" > ").pop()!;
      expect(all.some((p) => p === m || p.endsWith(` > ${label}`)), m).toBe(true);
    }
    await rt.close();
  });

  test("a bad file path and an unknown command fail with a plain message", async () => {
    const rt = await startMacro(adapter, { workDir: join(work, "err"), sessionDir: work });
    const tools = Object.fromEntries((await rt.tools()).map((t) => [t.name, t]));
    const a = await tools.open_image.execute({ path: join(work, "missing.tif") }, ctx);
    expect(a.ok).toBe(false);
    expect(a.error).toContain("File not found");
    const b = await tools.run_command.execute({ input: join(ROOT, "data/discs.png"), command: "Not A Command" }, ctx);
    expect(b.ok).toBe(false);
    expect(b.error).toContain("Unknown menu command");
    await rt.close();
  });
});
