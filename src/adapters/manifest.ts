import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";
import { z } from "zod";
import type { Hook, Tool } from "../core/types.ts";

export const SPEC_VERSION = "1";

const Program = z.strictObject({
  name: z.string(),
  version: z.string().default(""),
  tested_versions: z.array(z.string()).default([]),
  homepage: z.string().default(""),
  docs: z.array(z.string()).default([]),
});

const Locate = z.strictObject({
  env: z.string().default(""),
  paths: z.array(z.string()).default([]),
  which: z.array(z.string()).default([]),
  version_command: z.array(z.string()).default([]),
  version_pattern: z.string().default(""),
});

export const ConnectionKind = z.enum(["mcp", "cli", "python", "script", "http", "macro", "files", "screen"]);

const Connection = z.strictObject({
  kind: ConnectionKind,
  transport: z.enum(["stdio", "http"]).default("stdio"),
  command: z.array(z.string()).default([]),
  env: z.record(z.string(), z.string()).default({}),
  cwd: z.string().default(""),
  url: z.string().default(""),
  interpreter: z.array(z.string()).default([]),
  macro_ext: z.string().default(".txt"),
  base_url: z.string().default(""),
  headers: z.record(z.string(), z.string()).default({}),
  network: z.boolean().default(false),
  watch: z.array(z.string()).default([]),
  state_tool: z.string().default(""),
  history_tool: z.string().default(""),
  startup_timeout_s: z.number().default(60),
  call_timeout_s: z.number().default(600),
});

const DecisionLink = z.strictObject({ tool: z.string(), arg: z.string() });

const Sensitivity = z.strictObject({
  options: z.array(z.unknown()).default([]),
  tool: z.string().default(""),
  args: z.record(z.string(), z.unknown()).default({}),
  compare: z.array(z.string()).default([]),
  max_runs: z.number().int().default(3),
});

export const Decision = z.strictObject({
  key: z.string(),
  label: z.string(),
  kind: z.enum(["text", "choice", "float", "int", "bool"]).default("text"),
  default: z.unknown().optional(),
  choices: z.array(z.unknown()).default([]),
  lo: z.number().optional(),
  hi: z.number().optional(),
  owner: z.enum(["human", "agent", "fixed"]).default("human"),
  group: z.string().default("Method"),
  help: z.string().default(""),
  essential: z.boolean().default(false),
  stage: z.enum(["setup", "when_needed"]).default("setup"),
  links: z.array(DecisionLink).default([]),
  sensitivity: Sensitivity.optional(),
  changes_conclusion: z.boolean().default(true),
});

const ParamMap = z.strictObject({
  arg: z.string(),
  label: z.string(),
  ui_default: z.unknown().optional(),
  note: z.string().default(""),
});

const Evidence = z.strictObject({
  source: z.enum(["program_definitions", "macro_recorder", "demonstration", "docs", "code", "unverified"]).default("unverified"),
  test: z.string().default(""),
  note: z.string().default(""),
});

export const MapEntry = z.strictObject({
  tool: z.string(),
  match: z.record(z.string(), z.unknown()).default({}),
  route: z.string(),
  steps: z.array(z.string()).default([]),
  params: z.array(ParamMap).default([]),
  fidelity: z.enum(["exact", "close", "code_only"]).default("close"),
  difference: z.string().default(""),
  evidence: Evidence.default({ source: "unverified", test: "", note: "" }),
  summary: z.string().default(""),
});

const Check = z.strictObject({
  id: z.string(),
  description: z.string().default(""),
  severity: z.enum(["info", "warning", "error"]).default("warning"),
  rule: z.strictObject({
    tool: z.string(),
    arg: z.string(),
    op: z.enum(["==", "!=", "<", "<=", ">", ">=", "missing", "present"]),
    value: z.unknown().optional(),
    message: z.string(),
  }).optional(),
  text: z.string().default(""),
});

const ExpectItem = z.strictObject({
  path: z.string(),
  equals: z.unknown().optional(),
  approx: z.number().optional(),
  rel: z.number().default(1e-6),
  abs: z.number().default(0),
  min: z.number().optional(),
  max: z.number().optional(),
  contains: z.string().optional(),
});

const TestCall = z.strictObject({
  tool: z.string(),
  args: z.record(z.string(), z.unknown()).default({}),
  save_as: z.string().default(""),
});

export const KnownAnswerTest = z.strictObject({
  id: z.string(),
  description: z.string().default(""),
  calls: z.array(TestCall),
  expect: z.array(ExpectItem).default([]),
  data: z.array(z.string()).default([]),
  manual_route_checked: z.boolean().default(false),
});

const OutputSpec = z.strictObject({
  kind: z.enum(["image", "table", "file", "text", "json"]).default("file"),
  ext: z.string().default(""),
  description: z.string().default(""),
});

export const ToolDef = z.strictObject({
  name: z.string(),
  description: z.string(),
  title: z.string().default(""),
  params: z.record(z.string(), z.record(z.string(), z.unknown())).default({}),
  required: z.array(z.string()).default([]),
  read_only: z.boolean().default(false),
  approval: z.boolean().default(false),
  outputs: z.record(z.string(), OutputSpec).default({}),
  command: z.array(z.string()).default([]),
  function: z.string().default(""),
  script: z.string().default(""),
  macro: z.string().default(""),
  request: z.record(z.string(), z.unknown()).default({}),
  parse: z.enum(["text", "json", "csv", "keyvalue"]).default("text"),
});

const AdapterInfo = z.strictObject({
  name: z.string().regex(/^[a-z0-9][a-z0-9-]*$/),
  title: z.string().default(""),
  version: z.string().default("0.1.0"),
  spec: z.string().default(SPEC_VERSION),
  description: z.string().default(""),
  authors: z.array(z.string()).default([]),
  status: z.enum(["draft", "approved", "locked"]).default("draft"),
  approved_by: z.string().default(""),
  approved_on: z.string().default(""),
});

const DataRules = z.strictObject({
  cloud_visibility: z.enum(["all", "summaries", "none"]).default("all"),
  note: z.string().default(""),
});

export const Manifest = z
  .strictObject({
    adapter: AdapterInfo,
    program: Program,
    connection: Connection,
    locate: Locate.default({ env: "", paths: [], which: [], version_command: [], version_pattern: "" }),
    standards: z.string().default(""),
    module: z.string().default(""),
    decisions: z.array(Decision).default([]),
    map: z.array(MapEntry).default([]),
    checks: z.array(Check).default([]),
    tests: z.array(KnownAnswerTest).default([]),
    tools: z.array(ToolDef).default([]),
    data_rules: DataRules.default({ cloud_visibility: "all", note: "" }),
  })
  .superRefine((m, ctx) => {
    const dup = (label: string, keys: string[]) => {
      const seen = new Set<string>();
      for (const k of keys) {
        if (seen.has(k)) ctx.addIssue({ code: "custom", message: `duplicate ${label} ${JSON.stringify(k)}` });
        seen.add(k);
      }
    };
    dup("decision", m.decisions.map((d) => d.key));
    dup("check", m.checks.map((c) => c.id));
    dup("test", m.tests.map((t) => t.id));
    dup("tool", m.tools.map((t) => t.name));
    dup("map entry", m.map.map((e) => e.tool + JSON.stringify(Object.entries(e.match).sort())));
  });

export type Manifest = z.infer<typeof Manifest>;
export type Decision = z.infer<typeof Decision>;
export type MapEntry = z.infer<typeof MapEntry>;
export type ToolDef = z.infer<typeof ToolDef>;
export type KnownAnswerTest = z.infer<typeof KnownAnswerTest>;

export interface Skill {
  name: string;
  description: string;
  path: string;
}

export interface AdapterCheckContext {
  entries: import("../core/types.ts").Entry[];
  nodes: import("../core/types.ts").Node[];
  decisions: Record<string, unknown>;
  answer: string;
}

export interface AdapterModule {
  checks?: Record<string, (ctx: AdapterCheckContext) => import("../core/types.ts").FindingIn[] | Promise<import("../core/types.ts").FindingIn[]>>;
  hooks?: Hook[];
  tools?: Tool[];
  manualRoute?: (tool: string, args: Record<string, unknown>) => string | undefined;
}

export interface LoadedAdapter {
  manifest: Manifest;
  root: string;
  name: string;
  standardsText(): string;
  skills(): Skill[];
  mapEntry(tool: string, args?: Record<string, unknown>): MapEntry | undefined;
  linksFor(tool: string): Record<string, string>;
  module(): Promise<AdapterModule>;
}

function frontmatter(text: string): Record<string, string> {
  const m = /^---\n([\s\S]*?)\n---/.exec(text);
  if (!m) return {};
  const out = parseYaml(m[1]);
  return typeof out === "object" && out ? out : {};
}

export function loadAdapter(path: string): LoadedAdapter {
  const file = statSync(path).isDirectory() ? join(path, "adapter.yaml") : path;
  const root = dirname(resolve(file));
  const manifest = Manifest.parse(parseYaml(readFileSync(file, "utf8")));
  let mod: Promise<AdapterModule> | undefined;
  return {
    manifest,
    root,
    name: manifest.adapter.name,
    standardsText() {
      const parts = [manifest.standards.trim()];
      const f = join(root, "STANDARDS.md");
      if (existsSync(f)) parts.push(readFileSync(f, "utf8").trim());
      return parts.filter(Boolean).join("\n\n");
    },
    skills() {
      const dir = join(root, "skills");
      if (!existsSync(dir)) return [];
      return readdirSync(dir)
        .filter((f) => f.endsWith(".md"))
        .map((f) => {
          const p = join(dir, f);
          const fm = frontmatter(readFileSync(p, "utf8"));
          return { name: fm.name ?? f.replace(/\.md$/, ""), description: fm.description ?? "", path: p };
        });
    },
    mapEntry(tool, args = {}) {
      const fits = manifest.map.filter(
        (m) => m.tool === tool && Object.entries(m.match).every(([k, v]) => String(args[k]) === String(v)),
      );
      fits.sort((a, b) => Object.keys(b.match).length - Object.keys(a.match).length);
      return fits[0];
    },
    linksFor(tool) {
      const out: Record<string, string> = {};
      for (const d of manifest.decisions) for (const l of d.links) if (l.tool === tool) out[l.arg] = d.key;
      return out;
    },
    module() {
      if (!manifest.module) return Promise.resolve({});
      mod ??= import(join(root, manifest.module)).then((m) => (m.default ?? m) as AdapterModule);
      return mod;
    },
  };
}

export function gaHome(): string {
  return process.env.GA_HOME || join(homedir(), ".guided-analysis");
}

export const CATALOG_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "../../catalog");

export function adapterDirs(cwd = process.cwd()): Record<string, string> {
  const found: Record<string, string> = {};
  for (const base of [join(cwd, ".ga", "adapters"), join(gaHome(), "adapters"), CATALOG_DIR]) {
    if (!existsSync(base)) continue;
    for (const d of readdirSync(base)) {
      const p = join(base, d);
      if (existsSync(join(p, "adapter.yaml")) && !(d in found)) found[d] = p;
    }
  }
  return found;
}

export function findAdapter(nameOrPath: string, cwd = process.cwd()): LoadedAdapter {
  if (existsSync(nameOrPath)) return loadAdapter(nameOrPath);
  const dirs = adapterDirs(cwd);
  const dir = dirs[nameOrPath];
  if (!dir) throw new Error(`no adapter named "${nameOrPath}". Known: ${Object.keys(dirs).join(", ") || "none"}`);
  return loadAdapter(dir);
}
