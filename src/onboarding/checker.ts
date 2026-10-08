import { existsSync, mkdtempSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { parse as parseYaml, parseDocument, YAMLSeq } from "yaml";
import type { z } from "zod";
import { locate } from "../adapters/locate.ts";
import { adapterDirs, loadAdapter, Manifest } from "../adapters/manifest.ts";
import type { LoadedAdapter } from "../adapters/manifest.ts";
import { runTests as runKnownAnswerTests } from "./kat.ts";
import type { TestOutcome } from "./kat.ts";

export interface Report {
  ok: boolean;
  errors: string[];
  warnings: string[];
  tests?: TestOutcome[];
}

interface ToolInfo {
  args: Set<string> | undefined;
}

function zodLines(err: z.ZodError): string[] {
  return err.issues.map((i) => {
    const where = i.path.length ? i.path.map(String).join(".") : "adapter.yaml";
    const extra = i.code === "unrecognized_keys" ? ` (${(i as { keys: string[] }).keys.join(", ")})` : "";
    return `${where}: ${i.message}${extra}`;
  });
}

function resolveDir(dirOrName: string): string | undefined {
  if (existsSync(dirOrName)) return statSync(dirOrName).isDirectory() ? resolve(dirOrName) : resolve(dirOrName, "..");
  return adapterDirs()[dirOrName];
}

function firstSegment(arg: string): string {
  return arg.split(/[.[]/)[0];
}

function readFrontmatter(text: string): Record<string, unknown> | undefined {
  const m = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text);
  if (!m) return undefined;
  try {
    const out = parseYaml(m[1]);
    return out && typeof out === "object" ? (out as Record<string, unknown>) : {};
  } catch {
    return undefined;
  }
}

export async function locatedVersion(adapter: LoadedAdapter): Promise<string> {
  if (!adapter.manifest.locate.version_command.length) return "";
  try {
    return (await locate(adapter.manifest)).version;
  } catch {
    return "";
  }
}

function checkStatic(adapter: LoadedAdapter, errors: string[], warnings: string[], tools: Map<string, ToolInfo>, toolsKnown: boolean) {
  const m = adapter.manifest;
  const need = (what: string, tool: string): boolean => {
    if (tools.has(tool)) return true;
    if (toolsKnown) errors.push(`${what}: no tool named "${tool}"`);
    return false;
  };
  const argOk = (what: string, tool: string, arg: string) => {
    const info = tools.get(tool);
    if (info?.args && !info.args.has(firstSegment(arg))) {
      errors.push(`${what}: tool "${tool}" has no argument "${firstSegment(arg)}"`);
    }
  };

  for (const e of m.map) {
    const what = `map entry for "${e.tool}"`;
    if (!need(what, e.tool)) continue;
    for (const p of e.params) {
      const info = tools.get(e.tool);
      if (info?.args && !info.args.has(firstSegment(p.arg)))
        warnings.push(`${what}, param "${p.arg}": the tool has no such argument. This is fine for a dialog field that the tool fixes; say the value in "difference" or the param note`);
    }
    for (const k of Object.keys(e.match)) argOk(`${what}, match "${k}"`, e.tool, k);
    if (e.fidelity === "close" && !e.difference) warnings.push(`${what}: fidelity is "close" but "difference" is empty`);
    if (e.fidelity !== "code_only" && !e.route) errors.push(`${what}: the route is empty`);
    if (e.evidence.source === "unverified" && e.fidelity === "exact") {
      warnings.push(`${what}: fidelity is "exact" but the evidence source is "unverified"`);
    }
  }

  for (const [name] of tools) {
    if (!m.map.some((e) => e.tool === name)) {
      const msg = `tool "${name}" has no map entry. Add one, with fidelity "code_only" if the program has no manual route`;
      if (toolsKnown) errors.push(msg);
    }
  }

  for (const d of m.decisions) {
    const what = `decision "${d.key}"`;
    for (const l of d.links) {
      if (need(`${what}, link`, l.tool)) argOk(`${what}, link`, l.tool, l.arg);
    }
    if (d.sensitivity?.tool) {
      need(`${what}, sensitivity`, d.sensitivity.tool);
    }
    if (d.kind === "choice" && !d.choices.length) warnings.push(`${what}: kind is "choice" but "choices" is empty`);
    if (d.kind === "choice" && d.choices.length && d.default !== undefined && !d.choices.some((c) => JSON.stringify(c) === JSON.stringify(d.default))) {
      errors.push(`${what}: the default is not in "choices"`);
    }
    if (d.lo !== undefined && d.hi !== undefined && d.lo > d.hi) errors.push(`${what}: "lo" is above "hi"`);
    if (d.owner === "fixed" && d.default === undefined) errors.push(`${what}: owner is "fixed" but there is no default`);
    if (!d.links.length) warnings.push(`${what}: no link to a tool argument, so the harness cannot enforce it`);
  }

  for (const c of m.checks) {
    if (c.rule) {
      if (need(`check "${c.id}"`, c.rule.tool)) argOk(`check "${c.id}"`, c.rule.tool, c.rule.arg);
    }
  }

  for (const t of m.tests) {
    const earlier = new Set<string>();
    for (const [i, call] of t.calls.entries()) {
      const what = `test "${t.id}", call ${i + 1}`;
      need(what, call.tool);
      const text = JSON.stringify(call.args);
      for (const ref of text.matchAll(/\{saved\.([^.{}]+)/g)) {
        if (!earlier.has(ref[1])) errors.push(`${what}: uses saved result "${ref[1]}" before any call saves it`);
      }
      if (call.save_as) earlier.add(call.save_as);
    }
    for (const rel of t.data) {
      if (!existsSync(join(adapter.root, rel))) errors.push(`test "${t.id}": data file "${rel}" does not exist`);
    }
    if (!t.expect.length) warnings.push(`test "${t.id}": no expectations`);
    for (const e of t.expect) {
      const known = [e.equals, e.approx, e.min, e.max, e.contains].some((v) => v !== undefined);
      if (!known) warnings.push(`test "${t.id}": expectation on "${e.path}" has no comparison`);
    }
  }
  if (!m.tests.length) warnings.push("no known-answer tests");
}

async function checkModule(adapter: LoadedAdapter, errors: string[]): Promise<Awaited<ReturnType<LoadedAdapter["module"]>>> {
  const m = adapter.manifest;
  const needsFn = m.checks.filter((c) => !c.rule && !c.text);
  if (m.module && !existsSync(join(adapter.root, m.module))) {
    errors.push(`module "${m.module}" does not exist`);
    return {};
  }
  let mod: Awaited<ReturnType<LoadedAdapter["module"]>> = {};
  try {
    mod = await adapter.module();
  } catch (err) {
    errors.push(`module "${m.module}" fails to import: ${(err as Error).message}`);
    return {};
  }
  for (const c of needsFn) {
    if (typeof mod.checks?.[c.id] !== "function") {
      errors.push(`check "${c.id}" has no rule and no text, and the module has no function with this id`);
    }
  }
  return mod;
}

function checkFiles(adapter: LoadedAdapter, errors: string[], warnings: string[]) {
  if (!adapter.standardsText()) warnings.push("no STANDARDS.md and no \"standards\" text");
  else if (!existsSync(join(adapter.root, "STANDARDS.md"))) warnings.push("no STANDARDS.md file");
  const dir = join(adapter.root, "skills");
  if (!existsSync(dir)) return;
  for (const f of readdirSync(dir).filter((x) => x.endsWith(".md"))) {
    const fm = readFrontmatter(readFileSync(join(dir, f), "utf8"));
    if (!fm) errors.push(`skills/${f}: no frontmatter between --- lines`);
    else {
      if (!fm.name) errors.push(`skills/${f}: frontmatter has no "name"`);
      if (!fm.description) errors.push(`skills/${f}: frontmatter has no "description"`);
    }
  }
}

async function checkVersions(adapter: LoadedAdapter, warnings: string[]) {
  const { adapter: info, program } = adapter.manifest;
  if (info.status !== "draft") {
    if (!program.tested_versions.length) warnings.push(`status is "${info.status}" but "tested_versions" is empty`);
    if (!info.approved_by) warnings.push(`status is "${info.status}" but "approved_by" is empty`);
    if (!info.approved_on) warnings.push(`status is "${info.status}" but "approved_on" is empty`);
  }
  const found = await locatedVersion(adapter);
  if (found && program.tested_versions.length && !program.tested_versions.includes(found)) {
    warnings.push(`the installed version "${found}" is not in tested_versions (${program.tested_versions.join(", ")}). Run the tests again`);
  }
}

export async function checkAdapter(dirOrName: string, opts: { runTests?: boolean } = {}): Promise<Report> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const dir = resolveDir(dirOrName);
  if (!dir || !existsSync(join(dir, "adapter.yaml"))) {
    return { ok: false, errors: [`no adapter.yaml found for "${dirOrName}"`], warnings };
  }
  let raw: unknown;
  try {
    raw = parseYaml(readFileSync(join(dir, "adapter.yaml"), "utf8"));
  } catch (err) {
    return { ok: false, errors: [`adapter.yaml is not valid YAML: ${(err as Error).message}`], warnings };
  }
  const parsed = Manifest.safeParse(raw);
  if (!parsed.success) return { ok: false, errors: zodLines(parsed.error), warnings };

  const adapter = loadAdapter(dir);
  const m = adapter.manifest;
  const tools = new Map<string, ToolInfo>();
  for (const t of m.tools) tools.set(t.name, { args: m.connection.kind === "mcp" && !Object.keys(t.params).length ? undefined : new Set(Object.keys(t.params)) });
  for (const t of m.tools) {
    for (const r of t.required) if (!(r in t.params)) errors.push(`tool "${t.name}": required argument "${r}" is not in "params"`);
  }
  if (m.connection.kind === "files") for (const n of ["list_files", "read_table", "image_info", "wait_for_file"]) tools.set(n, { args: undefined });
  const mod = await checkModule(adapter, errors);
  for (const t of mod.tools ?? []) {
    const props = (t.inputSchema as { properties?: Record<string, unknown> }).properties;
    tools.set(t.name, { args: props ? new Set(Object.keys(props)) : undefined });
  }

  let tests: TestOutcome[] | undefined;
  let toolsKnown = (tools.size > 0 && m.connection.kind !== "mcp") || m.connection.kind === "files";
  if (opts.runTests) {
    const work = mkdtempSync(join(tmpdir(), "ga-check-"));
    let runtime: Awaited<ReturnType<typeof import("../adapters/runtime.ts").startAdapter>> | undefined;
    try {
      const { startAdapter } = await import("../adapters/runtime.ts");
      runtime = await startAdapter(adapter, { workDir: work, sessionDir: work });
      for (const t of await runtime.tools()) {
        const props = (t.inputSchema as { properties?: Record<string, unknown> }).properties;
        const key = t.remoteName ?? t.name;
        tools.set(key, { args: props ? new Set(Object.keys(props)) : undefined });
      }
      toolsKnown = true;
      checkStatic(adapter, errors, warnings, tools, toolsKnown);
      tests = await runKnownAnswerTests(adapter, runtime, { workDir: work });
      for (const t of tests) for (const f of t.failures) errors.push(`test "${t.id}" failed: ${f}`);
    } catch (err) {
      errors.push(`the adapter did not start: ${(err as Error).message}`);
      if (!runtime) checkStatic(adapter, errors, warnings, tools, toolsKnown);
    } finally {
      await runtime?.close().catch(() => undefined);
    }
  } else {
    checkStatic(adapter, errors, warnings, tools, toolsKnown);
    if (!toolsKnown) warnings.push("the tool list is not known without starting the program. Run with runTests to check tools, links and the map");
  }

  checkFiles(adapter, errors, warnings);
  await checkVersions(adapter, warnings);
  const report: Report = { ok: errors.length === 0, errors, warnings };
  if (tests) report.tests = tests;
  return report;
}

export async function approveAdapter(
  dir: string,
  by: string,
  opts: { version?: string; force?: boolean } = {},
): Promise<{ status: string; tested_versions: string[]; approved_on: string }> {
  const root = resolveDir(dir);
  if (!root) throw new Error(`no adapter found for "${dir}"`);
  if (!opts.force) {
    const report = await checkAdapter(root);
    if (!report.ok) throw new Error(`the adapter has errors:\n${report.errors.join("\n")}`);
  }
  const file = join(root, "adapter.yaml");
  const doc = parseDocument(readFileSync(file, "utf8"));
  const adapter = loadAdapter(root);
  const version = opts.version ?? ((await locatedVersion(adapter)) || adapter.manifest.program.version);
  const today = new Date().toISOString().slice(0, 10);
  doc.setIn(["adapter", "status"], "approved");
  doc.setIn(["adapter", "approved_by"], by);
  doc.setIn(["adapter", "approved_on"], today);
  const tested = doc.getIn(["program", "tested_versions"], true);
  const current = adapter.manifest.program.tested_versions;
  if (version && !current.includes(version)) {
    if (tested instanceof YAMLSeq) tested.add(doc.createNode(version));
    else doc.setIn(["program", "tested_versions"], [...current, version]);
  }
  writeFileSync(file, doc.toString());
  return { status: "approved", tested_versions: version && !current.includes(version) ? [...current, version] : current, approved_on: today };
}
