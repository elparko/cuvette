import { randomBytes } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { blindPolicy, setBlindPolicy } from "../adapters/blind.ts";
import { adapterDirs, CATALOG_DIR, gaHome } from "../adapters/manifest.ts";
import { checkoutModelOptions, endTrustOnce, trustOnce } from "../core/trust.ts";
import { applyHeadlessSetup, attachHeadless } from "../core/headless.ts";
import type { Provider } from "../core/types.ts";
import { finalAnswer, processMetrics, rescoreItems, scoreItems, type ItemScore, type ProcessMetrics } from "./papers-score.ts";
import { AnalysisRecord } from "../core/record.ts";
import { fillPrompt, loadPaper, missingData, paperIds, PAPERS_DIR, readValues, type Paper } from "./papers-spec.ts";
import { renderPapersReport, summarize } from "./papers-report.ts";
import { adapterPaths, blindPolicyFor, leakCheck, type LeakCheck, type RunBlind } from "./papers-blind.ts";

export type RunStatus = "answer" | "error" | "timeout" | "no_answer" | "skipped";

export interface PaperRun {
  paper: string;
  model: string;
  run: number;
  status: RunStatus;
  error?: string;
  durationS: number;
  session?: string;
  dir?: string;
  answer?: string;
  items: ItemScore[];
  metrics?: ProcessMetrics;
  blind?: RunBlind;
  leaks?: LeakCheck;
}

export interface PapersOptions {
  papers: string[] | "all";
  models: string[];
  runs?: number;
  out?: string;
  dryRun?: boolean;
  blind?: boolean;
  scratch?: string;
  papersDir?: string;
  resultsDir?: string;
  providerFor?: (spec: string) => Provider | undefined;
  log?: (line: string) => void;
  checkout?: string;
}

export interface PapersResult {
  date: string;
  models: string[];
  runsPerCell: number;
  blind?: boolean;
  runs: PaperRun[];
  paths?: { md: string; json: string };
  problems: string[];
  modelOptions?: Record<string, unknown>;
}

const T7 = "/Volumes/T7";
export const REPO_ROOT = resolve(CATALOG_DIR, "..");
const RESULTS_DIR = resolve(PAPERS_DIR, "../results");

export function scratchRoot(date: string): string {
  return existsSync(T7) ? join(T7, "guided-analysis/tools/bench-runs", date) : join(tmpdir(), "ga-bench-runs", date);
}

const slug = (s: string) => s.replace(/[^A-Za-z0-9._-]+/g, "_");

export function checkModelSpec(spec: string): string | undefined {
  const i = spec.indexOf(":");
  const kind = i < 0 ? spec : spec.slice(0, i);
  const rest = i < 0 ? "" : spec.slice(i + 1);
  if (kind === "claude") return undefined;
  if (kind === "ollama") return rest ? undefined : `${spec}: name an Ollama model, for example ollama:qwen3:8b`;
  if (kind === "openai") {
    const bar = rest.lastIndexOf("|");
    return bar < 1 || bar === rest.length - 1 ? `${spec}: use openai:<base url>|<model>` : undefined;
  }
  if (kind === "fake") return undefined;
  return `${spec}: unknown model spec; use claude, claude:<id>, ollama:<model> or openai:<url>|<model>`;
}

export function checkAdapters(paper: Paper): string[] {
  const known = adapterDirs();
  return paper.adapters.filter((a) => !(a in known) && !existsSync(a)).map((a) => `${paper.id}: no adapter ${a}`);
}

const emptyRecord = {
  numbers: () => [],
  nodes: () => [],
  node: () => undefined,
  entries: () => [],
};

function runId(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}-${randomBytes(2).toString("hex")}`;
}

type RunOpts = { scratch: string; blind?: boolean; papersDir?: string; resultsDir?: string; providerFor?: PapersOptions["providerFor"]; modelOptions?: Record<string, unknown> };

export async function runPaper(paper: Paper, model: string, run: number, opts: RunOpts): Promise<PaperRun> {
  const runDir = join(opts.scratch, slug(model), paper.id, `run${run}`);
  const home = join(runDir, "home");
  mkdirSync(home, { recursive: true });
  const realHome = gaHome();
  const realCredentials = join(realHome, "credentials.json");
  if (existsSync(realCredentials)) copyFileSync(realCredentials, join(home, "credentials.json"));
  const id = runId();
  const cwd = join(home, "sessions", id, "work");
  let blind: RunBlind | undefined;
  if (opts.blind !== false) {
    mkdirSync(cwd, { recursive: true });
    const { roots, programs } = await adapterPaths(paper);
    const policy = setBlindPolicy(blindPolicyFor({ paper, runDir, scratch: opts.scratch, home: realHome, adapterRoots: roots, programs, papersDir: opts.papersDir, resultsDir: opts.resultsDir }))!;
    blind = { cwd, allow: policy.allow, deny: policy.deny, hide: policy.hide, sandbox: policy.sandbox };
  }
  const oldHome = process.env.GA_HOME;
  process.env.GA_HOME = home;
  const started = Date.now();
  const base = { paper: paper.id, model, run };
  let session: import("../core/session.ts").Session | undefined;
  let timedOut = false;
  let thrown: string | undefined;
  try {
    const { Session } = await import("../core/session.ts");
    session = await Session.create({ adapters: paper.adapters, model, provider: opts.providerFor?.(model), settings: { ...(opts.modelOptions ?? {}), headless: true, ...(paper.plan ? { planFirst: true } : {}) }, home: true, ...(blind ? { id, cwd } : {}) });
    const answers = readValues(paper, "answers");
    const setup = readValues(paper, "setup");
    attachHeadless(session, { answers, allow: new Set(paper.allow === "all" ? ["all"] : paper.allow) });
    applyHeadlessSetup(session, Object.keys(setup).length ? setup : undefined, answers);
    const s = session;
    const timer = setTimeout(() => {
      timedOut = true;
      s.interrupt();
    }, paper.timeout_s * 1000);
    const grace = new Promise<void>((done) => setTimeout(done, (paper.timeout_s + 60) * 1000).unref());
    try {
      await Promise.race([s.send(fillPrompt(paper.prompt)), grace.then(() => void (timedOut = true))]);
    } finally {
      clearTimeout(timer);
    }
  } catch (e) {
    thrown = (e as Error).message;
  }
  const durationS = (Date.now() - started) / 1000;
  const grown = blindPolicy();
  if (blind && grown) blind = { ...blind, allow: grown.allow, hide: grown.hide };
  const record = session?.record;
  const final = record ? finalAnswer(record) : undefined;
  const errors = record?.entries(["error"]) ?? [];
  const status: RunStatus = final ? "answer" : timedOut ? "timeout" : thrown || errors.length ? "error" : "no_answer";
  const error = thrown ?? (errors.length ? String(errors.at(-1)!.data.message) : undefined);
  const result: PaperRun = {
    ...base,
    status,
    error: status === "answer" ? undefined : error,
    durationS,
    session: session?.id,
    dir: session?.dir,
    answer: final ? String(final.data.text ?? "") : undefined,
    items: record ? rescoreItems(paper.items, record) : scoreItems(paper.items, emptyRecord),
    metrics: record ? processMetrics(record) : undefined,
    blind,
    leaks: record && blind ? leakCheck(record, blind) : undefined,
  };
  try {
    await session?.close();
  } catch {}
  setBlindPolicy(undefined);
  if (oldHome === undefined) delete process.env.GA_HOME;
  else process.env.GA_HOME = oldHome;
  return result;
}

export async function runPapers(opts: PapersOptions): Promise<PapersResult> {
  const log = opts.log ?? ((l: string) => console.error(l));
  const dir = opts.papersDir ?? PAPERS_DIR;
  const date = new Date().toISOString().slice(0, 10);
  const ids = opts.papers === "all" ? paperIds(dir) : opts.papers;
  const problems: string[] = [];
  for (const m of opts.models) {
    const bad = checkModelSpec(m);
    if (bad) problems.push(bad);
  }
  const papers: Paper[] = [];
  const skipped: PaperRun[] = [];
  for (const id of ids) {
    let paper: Paper;
    try {
      paper = loadPaper(id, dir);
    } catch (e) {
      problems.push((e as Error).message);
      continue;
    }
    problems.push(...checkAdapters(paper));
    const missing = missingData(paper);
    if (missing.length) {
      log(`skip ${id}: data missing: run fetch.sh (${missing[0]})`);
      for (const model of opts.models) skipped.push({ paper: id, model, run: 1, status: "skipped", error: `data missing: run fetch.sh (${missing.join(", ")})`, durationS: 0, items: [] });
      continue;
    }
    papers.push(paper);
  }
  const runsPerCell = opts.runs ?? 1;
  const result: PapersResult = { date, models: opts.models, runsPerCell, blind: opts.blind !== false, runs: [...skipped], problems };
  if (opts.dryRun) {
    for (const p of papers) log(`ok ${p.id}: ${p.adapters.join(",")} ${p.items.length} items, timeout ${p.timeout_s}s`);
    for (const p of problems) log(`problem: ${p}`);
    return result;
  }
  if (problems.length) throw new Error(problems.join("\n"));
  const checkout = opts.checkout ?? REPO_ROOT;
  const modelOptions = checkoutModelOptions(checkout);
  if (Object.keys(modelOptions).length) {
    result.modelOptions = modelOptions;
    log(`model options from the settings of ${checkout}: ${Object.entries(modelOptions).map(([k, v]) => `${k}=${JSON.stringify(v)}`).join(", ")}`);
  }
  trustOnce(checkout);
  try {
    return await runAll(opts, papers, result, { log, dir, date, modelOptions });
  } finally {
    endTrustOnce(checkout);
  }
}

async function runAll(opts: PapersOptions, papers: Paper[], result: PapersResult, c: { log: (l: string) => void; dir: string; date: string; modelOptions: Record<string, unknown> }): Promise<PapersResult> {
  const { log, dir, date, modelOptions } = c;
  const runsPerCell = result.runsPerCell;
  const scratch = opts.scratch ?? scratchRoot(date);
  const resultsDir = opts.resultsDir ?? RESULTS_DIR;
  mkdirSync(resultsDir, { recursive: true });
  const base = opts.out ? opts.out.replace(/\.(md|json)$/, "") : join(resultsDir, `papers-${date}-${opts.models.map(slug).join("+")}`);
  const paths = { md: `${base}.md`, json: `${base}.json` };
  result.paths = paths;
  const save = () => {
    mkdirSync(join(paths.json, ".."), { recursive: true });
    writeFileSync(paths.json, JSON.stringify({ ...result, summary: summarize(result) }, null, 1));
    writeFileSync(paths.md, renderPapersReport(result));
  };
  for (const model of opts.models)
    for (const paper of papers)
      for (let n = 1; n <= runsPerCell; n++) {
        log(`run ${model} ${paper.id} #${n}`);
        const r = await runPaper(paper, model, n, { scratch, blind: opts.blind, papersDir: dir, resultsDir, providerFor: opts.providerFor, modelOptions });
        const c = r.items.filter((i) => i.computed.pass).length;
        const rp = r.items.filter((i) => i.reported.pass).length;
        const leak = r.leaks ? ` blind: ${r.leaks.outside.length} outside, ${r.leaks.blocked} blocked, ${r.leaks.unsourced} unsourced` : "";
        log(`  ${r.status} ${r.durationS.toFixed(0)}s computed ${c}/${r.items.length} reported ${rp}/${r.items.filter((i) => i.inAnswer).length}${leak}${r.error ? ` (${r.error.slice(0, 120)})` : ""}`);
        result.runs.push(r);
        save();
      }
  save();
  return result;
}

export function rescoreResults(path: string): { runs: number; rescored: number } {
  const result = JSON.parse(readFileSync(path, "utf8")) as PapersResult;
  let rescored = 0;
  for (const r of result.runs) {
    if (!r.dir || !existsSync(join(r.dir, "log.jsonl"))) continue;
    const paper = loadPaper(r.paper);
    const record = new AnalysisRecord(r.dir, r.session ?? "rescore");
    r.items = rescoreItems(paper.items, record);
    if (r.blind) r.leaks = leakCheck(record, r.blind);
    rescored++;
  }
  writeFileSync(path, JSON.stringify({ ...result, summary: summarize(result) }, null, 1));
  writeFileSync(path.replace(/\.json$/, ".md"), renderPapersReport(result));
  return { runs: result.runs.length, rescored };
}
