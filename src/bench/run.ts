import { fitAnswer } from "../core/answers.ts";
import { answerHeadless } from "../core/headless.ts";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { BENCH_DIR, ensureData } from "./datasets.ts";
import { loadScenario, scenarioIds, type Scenario } from "./scenario.ts";
import { overall, SCORE_NAMES, score, type Scores } from "./score.ts";

export interface RunOptions {
  model: string;
  guidance: boolean;
  timeoutS?: number;
}

export interface RunResult {
  sessionDir: string;
  scores: Scores;
}

export function answerFor(sc: Scenario, q: { decisionKey?: string }): unknown {
  const key = q.decisionKey ?? "";
  if (key in sc.answers.decisions) return sc.answers.decisions[key];
  return sc.answers.default;
}

export async function runScenario(id: string, opts: RunOptions): Promise<RunResult> {
  const sc = loadScenario(id);
  const cwd = sc.data ? ensureData(sc.id, sc.data.generator) : BENCH_DIR;
  const prompt = sc.prompt.replaceAll("{data}", cwd);
  const home = join(BENCH_DIR, "results", "home");
  mkdirSync(home, { recursive: true });
  const oldHome = process.env.CUVETTE_HOME;
  process.env.CUVETTE_HOME = home;
  try {
    const { Session } = await import("../core/session.ts");
    const session = await Session.create({
      adapters: [sc.adapter],
      model: opts.model,
      mode: "watch",
      cwd,
      settings: { guidance: opts.guidance, headless: true } as any,
      home: true,
    });
    session.bus.on((e) => {
      if (e.type === "permission") return void setTimeout(() => session.respondPermission(e.rid, true, "simulated scientist: allowed (scripts run in the sandbox)"), 0);
      if (e.type === "instruction") return void session.followDone(e.step, "", true);
      if (e.type !== "question") return;
      const v = e.question.decisionKey ? fitAnswer(e.question, answerFor(sc, e.question)) : answerFor(sc, e.question) ?? "Use your best judgment and state it as an assumption.";
      setTimeout(() => void answerHeadless(session, e.question, v ?? "", "simulated scientist"), 0);
    });
    const setupKeys = new Set(session.decisions.fields().filter((f) => f.stage === "setup").map((f) => f.key));
    const fromAnswers = Object.fromEntries(Object.entries(sc.answers.decisions).filter(([k]) => setupKeys.has(k)));
    session.settings.autoResume = false;
    session.decisions.applySetup({ ...fromAnswers, ...sc.setup }, { how: "bench (simulated scientist)" });
    const timer = setTimeout(() => session.interrupt(), (opts.timeoutS ?? 900) * 1000);
    try {
      await session.send(prompt);
    } finally {
      clearTimeout(timer);
    }
    try {
      await session.exportAs("protocol");
    } catch {}
    await session.close();
    return { sessionDir: session.dir, scores: score(session.dir, sc) };
  } finally {
    if (oldHome === undefined) delete process.env.CUVETTE_HOME;
    else process.env.CUVETTE_HOME = oldHome;
  }
}

interface Row {
  id: string;
  on?: Scores;
  off?: Scores;
  onDir?: string;
  offDir?: string;
}

function f(x: number | undefined): string {
  return x === undefined ? "-" : x.toFixed(2);
}

function diff(a?: number, b?: number): string {
  if (a === undefined || b === undefined) return "-";
  const d = a - b;
  return `${d >= 0 ? "+" : ""}${d.toFixed(2)}`;
}

export function renderReport(model: string, rows: Row[]): string {
  const lines = [`# Benchmark results: ${model}`, "", `Date: ${new Date().toISOString().slice(0, 10)}`, ""];
  const head = ["Scenario", "Guidance", ...SCORE_NAMES, "overall"];
  lines.push(`| ${head.join(" | ")} |`, `| ${head.map(() => "---").join(" | ")} |`);
  for (const r of rows) {
    for (const [label, s] of [["on", r.on], ["off", r.off]] as const) {
      if (s) lines.push(`| ${r.id} | ${label} | ${SCORE_NAMES.map((n) => f(s[n])).join(" | ")} | ${f(overall(s))} |`);
    }
    if (r.on && r.off)
      lines.push(`| ${r.id} | on minus off | ${SCORE_NAMES.map((n) => diff(r.on![n], r.off![n])).join(" | ")} | ${diff(overall(r.on), overall(r.off))} |`);
  }
  const both = rows.filter((r) => r.on && r.off);
  if (both.length) {
    const mean = (n: (typeof SCORE_NAMES)[number], k: "on" | "off") => both.reduce((a, r) => a + r[k]![n], 0) / both.length;
    lines.push(`| all | on minus off | ${SCORE_NAMES.map((n) => diff(mean(n, "on"), mean(n, "off"))).join(" | ")} | ${diff(both.reduce((a, r) => a + overall(r.on!), 0) / both.length, both.reduce((a, r) => a + overall(r.off!), 0) / both.length)} |`);
  }
  return lines.join("\n") + "\n";
}

export async function runBench(
  ids: string[] | "all",
  opts: { model: string; guidance: "on" | "off" | "both"; timeoutS?: number },
): Promise<{ rows: Row[]; markdown: string; paths: { md: string; json: string } }> {
  const list = ids === "all" ? scenarioIds() : ids;
  const rows: Row[] = [];
  for (const id of list) {
    const row: Row = { id };
    if (opts.guidance !== "off") {
      const r = await runScenario(id, { model: opts.model, guidance: true, timeoutS: opts.timeoutS });
      row.on = r.scores;
      row.onDir = r.sessionDir;
    }
    if (opts.guidance !== "on") {
      const r = await runScenario(id, { model: opts.model, guidance: false, timeoutS: opts.timeoutS });
      row.off = r.scores;
      row.offDir = r.sessionDir;
    }
    rows.push(row);
  }
  const dir = join(BENCH_DIR, "results");
  mkdirSync(dir, { recursive: true });
  const base = `${new Date().toISOString().slice(0, 10)}-${opts.model.replace(/[^A-Za-z0-9._-]+/g, "_")}`;
  const markdown = renderReport(opts.model, rows);
  const paths = { md: join(dir, `${base}.md`), json: join(dir, `${base}.json`) };
  writeFileSync(paths.md, markdown);
  writeFileSync(paths.json, JSON.stringify({ model: opts.model, guidance: opts.guidance, rows }, null, 2));
  return { rows, markdown, paths };
}
