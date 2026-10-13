import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, cpSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "vitest";
import { CATALOG_DIR, loadAdapter } from "../src/adapters/manifest.ts";
import type { LoadedAdapter } from "../src/adapters/manifest.ts";

type Tools = Map<string, Set<string> | undefined>;

const CORE = "ask_scientist calculate compare_options find_tools list_dir load_skill note plan propose_change propose_lab_rule read_file run_command run_script screenshot search_literature task write_file list_adapters use_adapter".split(" ");
const FILES_TOOLS = "list_files read_table image_info wait_for_file".split(" ");
const SNAKE = /(?<![\w./{-])([a-z][a-z0-9]*(?:_[a-z0-9]+)+)(?![\w(]|[-.]\w)/g;
// Result keys that the script builds at run time, such as "n_" + an atom group.
const BUILT: Record<string, string[]> = { mdanalysis: ["n_hydrogen"] };
const RUN = /\b(?:run|runs|call|calls)\s+([a-z][a-z0-9]*(?:_[a-z0-9]+)+)\b(?:\s+of\s+the\s+([\w-]+)\s+adapter)?/gi;
const DECISION_TOOLS = /\b(?:propose_change|compare_options|ask_scientist)\b|\bask the scientist\b/i;

function sourceText(dir: string): string {
  let out = "";
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (["skills", "data", "node_modules", "__pycache__"].includes(f)) continue;
    if (statSync(p).isDirectory()) out += sourceText(p);
    else if (/\.(ya?ml|ts|py|R|r|ijm|groovy|jl|sh|mjs|js|json|md)$/.test(f)) out += readFileSync(p, "utf8") + "\n";
  }
  return out;
}

async function toolArgs(a: LoadedAdapter): Promise<Tools> {
  const m = a.manifest;
  const out: Tools = new Map();
  for (const t of m.tools) out.set(t.name, m.connection.kind === "mcp" && !Object.keys(t.params).length ? undefined : new Set(Object.keys(t.params)));
  for (const t of (await a.module()).tools ?? []) out.set(t.name, new Set(Object.keys((t.inputSchema as { properties?: object }).properties ?? {})));
  if (m.connection.kind === "files") for (const n of FILES_TOOLS) out.set(n, undefined);
  if (m.connection.kind === "mcp") {
    for (const n of [...m.map.map((e) => e.tool), ...m.decisions.flatMap((d) => d.links.map((l) => l.tool)), ...m.tests.flatMap((t) => t.calls.map((c) => c.tool))]) if (!out.has(n)) out.set(n, undefined);
    if (m.connection.state_tool && !out.has(m.connection.state_tool)) out.set(m.connection.state_tool, undefined);
  }
  if (m.connection.history_tool) out.set("review_my_steps", new Set(["adapter", "args"]));
  return out;
}

const sentences = (text: string) => text.split(/(?<=[.:;])\s+|\n/);

function skillProblems(a: LoadedAdapter, all: Map<string, Tools>): string[] {
  const problems: string[] = [];
  const own = all.get(a.name)!;
  const outside = a.manifest.connection.kind === "mcp";
  const linked = new Map<string, Set<string>>();
  for (const d of a.manifest.decisions) for (const l of d.links) linked.set(l.tool, new Set([...(linked.get(l.tool) ?? []), l.arg.split(/[.[]/)[0]]));
  const anyLinked = new Set([...[...linked.values()].flatMap((s) => [...s]), ...a.manifest.decisions.filter((d) => d.links.length).map((d) => d.key)]);
  const known = new Set([...CORE, ...own.keys(), ...(BUILT[a.name] ?? []), ...[...sourceText(a.root).matchAll(/[A-Za-z_][A-Za-z0-9_]*/g)].map((x) => x[0])]);
  for (const s of a.skills()) {
    const where = `${a.name}/${s.name}`;
    const text = readFileSync(s.path, "utf8").replace(/^---[\s\S]*?---/, "");
    const named = [...all.keys()].filter((n) => n !== a.name && new RegExp(`\\b${n}\\b`, "i").test(text));
    const otherTools: Tools = new Map(named.flatMap((n) => [...all.get(n)!]));
    for (const [, tok] of text.matchAll(SNAKE)) {
      if (!outside && !known.has(tok) && !otherTools.has(tok)) problems.push(`${where}: "${tok}" is not a tool, an argument, a decision or a result of the adapter`);
    }
    for (const line of sentences(text)) {
      const viaDecision = DECISION_TOOLS.test(line);
      for (const [, tool, of] of line.matchAll(RUN)) {
        const t = tool.toLowerCase();
        const target = of && all.has(of) ? all.get(of)! : undefined;
        const args = target ? target.get(t) : (own.get(t) ?? otherTools.get(t));
        const isTool = target ? target.has(t) : own.has(t) || otherTools.has(t) || CORE.includes(t);
        if (!isTool) {
          problems.push(`${where}: "${t}" follows run or call, but it is not a tool${of ? ` of ${of}` : ""}`);
          continue;
        }
        const withArg = new RegExp(`\\b${t}\\b[^.;]*?\\bwith\\s+(?:the\\s+)?(?:argument\\s+)?([a-z][a-z0-9]*(?:_[a-z0-9]+)*)\\s+(?:set\\s+to|=|at|to)\\b`, "i").exec(line);
        if (withArg && args && !args.has(withArg[1]) && /_/.test(withArg[1])) problems.push(`${where}: ${t} has no argument "${withArg[1]}"`);
        if (withArg && !of && linked.get(t)?.has(withArg[1]) && !viaDecision) problems.push(`${where}: the harness fills "${withArg[1]}" of ${t} from a decision. Use propose_change or compare_options`);
      }
      for (const [, arg] of line.matchAll(/\bset\s+([a-z][a-z0-9]*(?:_[a-z0-9]+)*)\s+(?:to|=)\s/gi)) {
        if (anyLinked.has(arg) && !viaDecision) problems.push(`${where}: the harness fills "${arg}" from a decision. Use propose_change or compare_options`);
      }
    }
  }
  return problems;
}

async function catalogTools(adapters: LoadedAdapter[]): Promise<Map<string, Tools>> {
  const all = new Map<string, Tools>();
  for (const a of adapters) all.set(a.name, await toolArgs(a));
  return all;
}

test("each tool, argument and result name in a catalog skill exists in its adapter, and no skill sets a decision value by hand", async () => {
  const adapters = readdirSync(CATALOG_DIR)
    .filter((d) => existsSync(join(CATALOG_DIR, d, "adapter.yaml")))
    .map((d) => loadAdapter(join(CATALOG_DIR, d)));
  const all = await catalogTools(adapters);
  expect(adapters.flatMap((a) => skillProblems(a, all))).toEqual([]);
});

test("the skill check finds a wrong tool, a wrong argument, an unknown name and a decision value set by hand", async () => {
  const dir = mkdtempSync(join(tmpdir(), "cuvette-skills-"));
  try {
    cpSync(join(CATALOG_DIR, "pwr"), dir, { recursive: true });
    writeFileSync(
      join(dir, "skills", "bad.md"),
      ["---", "name: bad", "description: A bad skill.", "---", "1. Run power_z_test.", "2. Run power_t_test with sample_count set to 10.", "3. Read n_subjects_total.", "4. Set sidedness to one-sided.", "5. Call propose_change to set sidedness to two-sided."].join("\n"),
    );
    const a = loadAdapter(dir);
    const all = await catalogTools([a]);
    expect(skillProblems(a, all)).toEqual([
      'pwr/bad: "power_z_test" is not a tool, an argument, a decision or a result of the adapter',
      'pwr/bad: "sample_count" is not a tool, an argument, a decision or a result of the adapter',
      'pwr/bad: "n_subjects_total" is not a tool, an argument, a decision or a result of the adapter',
      'pwr/bad: "power_z_test" follows run or call, but it is not a tool',
      'pwr/bad: power_t_test has no argument "sample_count"',
      'pwr/bad: the harness fills "sidedness" from a decision. Use propose_change or compare_options',
    ]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
