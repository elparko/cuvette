import { existsSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { isAbsolute } from "node:path";
import type { LoadedAdapter } from "../adapters/manifest.ts";
import { ADAPTER_DECISION } from "./decisions.ts";
import type { AnalysisRecord } from "./record.ts";
import type { Node } from "./types.ts";
import { describeRoute, fillTemplate, show, writeOut } from "./trail.ts";
import type { RouteText } from "./trail.ts";

const REPLAY_PATH = fileURLToPath(new URL("./replay.ts", import.meta.url));

export function mainNodes(record: AnalysisRecord): Node[] {
  return record.nodes().filter((n) => !n.sensitivityOf);
}

function adapterOf(adapters: LoadedAdapter[], n: Node): LoadedAdapter | undefined {
  return adapters.find((a) => a.name === n.adapter);
}

function isPathLike(v: unknown): v is string {
  return typeof v === "string" && (isAbsolute(v) || /[\\/]/.test(v));
}

function sameButOnePath(a: Node, b: Node): string | undefined {
  if (a.adapter !== b.adapter || a.tool !== b.tool) return undefined;
  const keys = new Set([...Object.keys(a.args), ...Object.keys(b.args)]);
  const diff = [...keys].filter((k) => JSON.stringify(a.args[k]) !== JSON.stringify(b.args[k]));
  if (diff.length !== 1) return undefined;
  const k = diff[0];
  return isPathLike(a.args[k]) && isPathLike(b.args[k]) ? k : undefined;
}

interface Group {
  first: Node;
  rest: Node[];
  key?: string;
}

function group(nodes: Node[]): Group[] {
  const out: Group[] = [];
  for (const n of nodes) {
    const g = out[out.length - 1];
    if (g) {
      const last = g.rest[g.rest.length - 1] ?? g.first;
      const k = sameButOnePath(g.first, n) ?? sameButOnePath(last, n);
      if (k && (!g.key || g.key === k)) {
        g.key = k;
        g.rest.push(n);
        continue;
      }
    }
    out.push({ first: n, rest: [] });
  }
  return out;
}

export function setupValues(record: AnalysisRecord): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const e of record.entries(["setup", "decision"])) {
    if (e.kind === "decision") out[String(e.data.key)] = e.data.new;
    else if (e.data.values && typeof e.data.values === "object") Object.assign(out, e.data.values);
  }
  return out;
}

function sessionInfo(record: AnalysisRecord) {
  const first = record.entries()[0];
  return { id: first?.session ?? "", date: (first?.ts ?? new Date().toISOString()).slice(0, 10) };
}

function labelOf(adapters: LoadedAdapter[], key: string): string {
  if (key === ADAPTER_DECISION.key) return ADAPTER_DECISION.label;
  for (const a of adapters) {
    const d = a.manifest.decisions.find((x) => x.key === key);
    if (d) return d.label;
  }
  return key;
}

function lastRouteSegment(route: string): string {
  const seg = route.split(">").map((s) => s.trim()).filter(Boolean);
  return seg[seg.length - 1] ?? route;
}

function stepRoute(adapters: LoadedAdapter[], n: Node): RouteText | undefined {
  const me = adapterOf(adapters, n)?.mapEntry(n.tool, n.args);
  return me ? describeRoute(me, n.args) : undefined;
}

// ---------------------------------------------------------------- protocol

export function stepLines(adapters: LoadedAdapter[], n: Node): string[] {
  const r = stepRoute(adapters, n);
  const out: string[] = [];
  const codeOnly = r ? r.fidelity === "code_only" : n.fidelity === "code_only" || n.fidelity === "none";
  if (!r) {
    out.push(n.manualRoute ? `Route: ${n.manualRoute}` : `Run the tool "${n.tool}" with these settings: ${JSON.stringify(n.args)}.`);
  } else {
    out.push(`Route: ${r.route}`);
    for (const s of r.steps) out.push(`- ${s}`);
    for (const p of r.params) out.push(`- ${p}`);
    for (const w of r.warnings) out.push(`- ${w}`);
    if (r.fidelity === "close" && r.difference) out.push(`- Note: ${r.difference}`);
  }
  if (codeOnly) {
    out.push("- Code only: this step has no route in the program menus. Run it with the script or flow export.");
    if (r?.difference) out.push(`- Note: ${r.difference}`);
  }
  return out;
}

function methodsSentence(adapters: LoadedAdapter[], n: Node): string {
  const me = adapterOf(adapters, n)?.mapEntry(n.tool, n.args);
  const r = me ? describeRoute(me, n.args) : undefined;
  if (me?.summary) return fillTemplate(me.summary, n.args).replace(/\.?$/, ".");
  const name = r ? lastRouteSegment(r.route).replace(/\.\.\.$/, "") : n.tool;
  const withParams = r?.params.length ? ` with ${r.params.join(", ")}` : "";
  return `${name} was applied${withParams}.`;
}

function programNames(adapters: LoadedAdapter[], nodes: Node[]): string {
  const seen = new Map<string, string>();
  for (const n of nodes) {
    const a = adapterOf(adapters, n);
    const name = a?.manifest.program.name ?? n.adapter;
    seen.set(name, n.programVersion || a?.manifest.program.version || "");
  }
  return [...seen].map(([k, v]) => (v ? `${k} ${v}` : k)).join(" and ");
}

export function exportProtocol(record: AnalysisRecord, adapters: LoadedAdapter[], path: string): string {
  const info = sessionInfo(record);
  const nodes = mainNodes(record);
  const lines = ["# Protocol", "", `Session ${info.id}, ${info.date}.`, ""];
  const setup = Object.entries(setupValues(record));
  lines.push("## Decision record", "");
  if (setup.length) {
    lines.push("| Decision | Value |", "| --- | --- |");
    for (const [k, v] of setup) lines.push(`| ${labelOf(adapters, k).replace(/\|/g, "\\|")} | ${show(v).replace(/\|/g, "\\|")} |`);
  } else lines.push("No setup values were recorded.");
  const loads = record.entries(["adapter"]);
  if (loads.length) {
    lines.push("", "## Programs", "");
    for (const e of loads) lines.push(`- ${show(e.data.name)} adapter ${show(e.data.version)}, program ${show(e.data.programVersion) || "version unknown"}: ${show(e.data.reason)}`);
  }
  lines.push("", "## Steps", "");
  const groups = group(nodes);
  const sentences: string[] = [];
  let num = 0;
  for (const g of groups) {
    num++;
    lines.push(`${num}. ${g.first.summary ? g.first.summary : g.first.tool}`);
    for (const l of stepLines(adapters, g.first)) lines.push(`   ${l}`);
    sentences.push(methodsSentence(adapters, g.first));
    if (g.rest.length && g.key) {
      const here = num;
      num++;
      const paths = g.rest.map((n) => `\`${show(n.args[g.key!])}\``).join(", ");
      lines.push(`${num}. Repeat step ${here} for ${paths}.`);
      sentences.push(`The same step was repeated for ${g.rest.length} more input${g.rest.length === 1 ? "" : "s"}.`);
    }
  }
  if (!groups.length) lines.push("No steps were recorded.");
  const chosen = setup.map(([k, v]) => `${labelOf(adapters, k)} = ${show(v)}`).join("; ");
  lines.push("", "## Draft methods paragraph", "", "Draft. Check each sentence before you use it.", "");
  const prog = programNames(adapters, nodes);
  lines.push(
    [
      prog ? `Data were analyzed in ${prog}.` : "",
      chosen ? `Settings chosen before the analysis: ${chosen}.` : "",
      ...sentences,
    ].filter(Boolean).join(" "),
    "",
  );
  return writeOut(path, lines.join("\n"));
}

// ---------------------------------------------------------------- script

function outputIndex(nodes: Node[]): Map<string, string> {
  const map = new Map<string, string>();
  nodes.forEach((n, k) => n.outputs.forEach((o, i) => { if (!map.has(o.path)) map.set(o.path, `s${k + 1}.outputs[${i}].path`); }));
  return map;
}

function toCode(v: unknown, refs: Map<string, string>): string {
  if (typeof v === "string" && refs.has(v)) return refs.get(v)!;
  if (Array.isArray(v)) return `[${v.map((x) => toCode(x, refs)).join(", ")}]`;
  if (v && typeof v === "object") {
    const items = Object.entries(v).map(([k, x]) => `${JSON.stringify(k)}: ${toCode(x, refs)}`);
    return `{ ${items.join(", ")} }`;
  }
  return JSON.stringify(v) ?? "null";
}

export function exportScript(record: AnalysisRecord, adapters: LoadedAdapter[], path: string): string {
  const nodes = mainNodes(record);
  const names = [...new Set(nodes.map((n) => n.adapter))];
  const lines = [
    `import { ToolRunner } from ${JSON.stringify(REPLAY_PATH)};`,
    "",
    `const run = await ToolRunner.start(${JSON.stringify(names)});`,
    "",
  ];
  const seen = new Map<string, string>();
  nodes.forEach((n, k) => {
    const route = stepRoute(adapters, n)?.route ?? n.manualRoute;
    if (route) lines.push(`// Step ${k + 1}: ${route.split("\n")[0]}`);
    const refs = new Map(seen);
    lines.push(`const s${k + 1} = await run.call(${JSON.stringify(n.adapter)}, ${JSON.stringify(n.tool)}, ${toCode(n.args, refs)});`);
    n.outputs.forEach((o, i) => { if (!seen.has(o.path)) seen.set(o.path, `s${k + 1}.outputs[${i}].path`); });
  });
  lines.push("", "await run.close();", "");
  return writeOut(path, lines.join("\n"));
}

// ---------------------------------------------------------------- notebook

function shellQuote(s: string): string {
  return `'${s.replace(/'/g, `'\\''`)}'`;
}

function cellSource(text: string): string[] {
  const parts = text.split("\n");
  return parts.map((l, i) => (i < parts.length - 1 ? l + "\n" : l));
}

export function exportNotebook(record: AnalysisRecord, adapters: LoadedAdapter[], path: string): string {
  const info = sessionInfo(record);
  const cells: unknown[] = [
    { cell_type: "markdown", metadata: {}, source: cellSource(`# Analysis ${info.id}\n\nEach step has a manual route and a code cell that runs the step.`) },
  ];
  mainNodes(record).forEach((n, k) => {
    const r = stepRoute(adapters, n);
    const md = [`## Step ${k + 1}: ${n.summary || n.tool}`, ""];
    if (r) md.push(`Route: ${r.route}`, ...r.steps.map((s) => `- ${s}`), ...r.params.map((p) => `- ${p}`), ...r.warnings.map((w) => `- ${w}`));
    else md.push(n.manualRoute ? `Route: ${n.manualRoute}` : "This step has no manual route.");
    cells.push({ cell_type: "markdown", metadata: {}, source: cellSource(md.join("\n")) });
    const json = JSON.stringify(n.args).replace(/\{/g, "{{").replace(/\}/g, "}}").replace(/\$/g, "$$$$");
    cells.push({
      cell_type: "code",
      execution_count: null,
      metadata: {},
      outputs: [],
      source: cellSource(`!ga run-step ${n.adapter} ${n.tool} ${shellQuote(json)}`),
    });
  });
  const nb = {
    nbformat: 4,
    nbformat_minor: 4,
    metadata: { kernelspec: { display_name: "Python 3", language: "python", name: "python3" }, language_info: { name: "python" } },
    cells,
  };
  return writeOut(path, JSON.stringify(nb, null, 1) + "\n");
}

// ---------------------------------------------------------------- flow

function isExistingFile(v: unknown): v is string {
  if (!isPathLike(v)) return false;
  try {
    return existsSync(v) && statSync(v).isFile();
  } catch {
    return false;
  }
}

export function exportFlow(record: AnalysisRecord, _adapters: LoadedAdapter[], path: string): string {
  const nodes = mainNodes(record);
  const inputs: Record<string, string> = {};
  const byPath = new Map<string, string>();
  const produced = new Map<string, string>();
  const swap = (v: unknown): unknown => {
    if (typeof v === "string") {
      const made = produced.get(v);
      if (made) return `{${made}}`;
      if (isExistingFile(v)) {
        if (!byPath.has(v)) {
          const key = `input_${byPath.size + 1}`;
          byPath.set(v, key);
          inputs[key] = v;
        }
        return `{${byPath.get(v)}}`;
      }
      return v;
    }
    if (Array.isArray(v)) return v.map(swap);
    if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, swap(x)]));
    return v;
  };
  const steps = nodes.map((n, k) => {
    const args = swap(n.args) as Record<string, unknown>;
    n.outputs.forEach((o, i) => { if (!produced.has(o.path)) produced.set(o.path, `step${k + 1}.outputs.${i}.path`); });
    return { adapter: n.adapter, tool: n.tool, args };
  });
  const flow = { adapters: [...new Set(nodes.map((n) => n.adapter))], decisions: setupValues(record), steps, inputs };
  return writeOut(path, JSON.stringify(flow, null, 2) + "\n");
}
