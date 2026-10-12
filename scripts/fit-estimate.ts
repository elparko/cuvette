import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { costUsd } from "../src/core/spend.ts";

interface Tokens {
  inputTokens: number;
  outputTokens: number;
  cacheRead: number;
  cacheWrite: number;
}

interface Run {
  model: string;
  paper: string;
  steps: number;
  cost: number;
  tokens: Tokens;
}

interface Fit {
  a: number;
  b: number;
  lo: number;
  hi: number;
}

const LOW = 0.02;
const HIGH = 0.98;
const TABLE_FILE = "src/core/estimate-table.ts";

const args = process.argv.slice(2);
const write = args.includes("--write");
const folders = args.filter((a) => !a.startsWith("--"));
if (!folders.length) folders.push("bench/results/final-2026-10-09", "bench/results/final-2026-10-09-reruns");

function load(): Run[] {
  const runs: Run[] = [];
  for (const folder of folders)
    for (const name of readdirSync(folder).filter((f) => f.endsWith(".json"))) {
      const data = JSON.parse(readFileSync(join(folder, name), "utf8"));
      for (const r of data.runs ?? []) {
        const model = String(r.model).replace(/^claude:/, "");
        if (!model.startsWith("claude-") || !r.metrics?.nodes) continue;
        const m = r.metrics;
        const tokens = { inputTokens: m.inputTokens, outputTokens: m.outputTokens, cacheRead: m.cacheRead, cacheWrite: m.cacheWrite };
        runs.push({ model, paper: r.paper, steps: m.nodes, cost: costUsd(model, tokens), tokens });
      }
    }
  return runs;
}

function quantile(sorted: number[], q: number): number {
  const i = (sorted.length - 1) * q;
  const f = Math.floor(i);
  return sorted[f]! + (sorted[Math.min(f + 1, sorted.length - 1)]! - sorted[f]!) * (i - f);
}

function fit(runs: Run[]): Fit {
  const x = runs.map((r) => Math.log(r.steps));
  const y = runs.map((r) => Math.log(r.cost));
  const mx = x.reduce((s, v) => s + v, 0) / x.length;
  const my = y.reduce((s, v) => s + v, 0) / y.length;
  const b = x.reduce((s, v, i) => s + (v - mx) * (y[i]! - my), 0) / x.reduce((s, v) => s + (v - mx) ** 2, 0);
  const a = my - b * mx;
  const res = x.map((v, i) => y[i]! - a - b * v).sort((p, q) => p - q);
  return { a, b, lo: quantile(res, LOW), hi: quantile(res, HIGH) };
}

function band(f: Fit, steps: number): [number, number] {
  const mid = f.a + f.b * Math.log(steps);
  return [Math.exp(mid + f.lo), Math.exp(mid + f.hi)];
}

function coverage(train: Run[], test: Run[]): { hit: number; n: number; width: number } {
  const f = fit(train);
  let hit = 0;
  let width = 0;
  for (const r of test) {
    const [lo, hi] = band(f, r.steps);
    if (r.cost >= lo && r.cost <= hi) hit++;
    width += hi / lo;
  }
  return { hit, n: test.length, width: width / test.length };
}

let seed = 7;
const random = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);

function split(runs: Run[]): { train: Run[]; test: Run[] } {
  const papers = [...new Set(runs.map((r) => r.paper))].sort();
  for (let i = papers.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [papers[i], papers[j]] = [papers[j]!, papers[i]!];
  }
  const held = new Set(papers.slice(0, Math.round(papers.length * 0.2)));
  return { train: runs.filter((r) => !held.has(r.paper)), test: runs.filter((r) => held.has(r.paper)) };
}

const all = load();
const models = [...new Set(all.map((r) => r.model))].sort();
const groups: [string, Run[]][] = models.map((m) => [m, all.filter((r) => r.model === m)]);

console.log(`Runs: ${all.length}. Papers: ${new Set(all.map((r) => r.paper)).size}. Band: residual percentiles ${LOW * 100} and ${HIGH * 100}.`);
const tables: Record<string, Fit> = {};
for (const [m, runs] of groups) {
  const first = split(runs);
  const one = coverage(first.train, first.test);
  let hit = 0;
  let n = 0;
  let width = 0;
  const rounds = 200;
  for (let i = 0; i < rounds; i++) {
    const s = split(runs);
    const c = coverage(s.train, s.test);
    hit += c.hit;
    n += c.n;
    width += c.width;
  }
  console.log(`${m}: ${runs.length} runs. One split: ${one.hit}/${one.n} (${((100 * one.hit) / one.n).toFixed(1)}%). ${rounds} random splits: ${((100 * hit) / n).toFixed(1)}%. Mean high/low ratio: ${(width / rounds).toFixed(1)}.`);
  tables[m] = fit(runs);
}

const round = (n: number) => Number(n.toFixed(4));
const body = Object.entries(tables)
  .map(([m, f]) => `  "${m}": { a: ${round(f.a)}, b: ${round(f.b)}, lo: ${round(f.lo)}, hi: ${round(f.hi)} },`)
  .join("\n");
const sonnet = all.filter((r) => r.model === "claude-sonnet-5-5");
const mix = Object.fromEntries(["inputTokens", "outputTokens", "cacheRead", "cacheWrite"].map((k) => [k, Math.round(sonnet.reduce((s, r) => s + r.tokens[k as keyof Tokens], 0) / sonnet.length)]));

if (write) {
  writeFileSync(TABLE_FILE, `export interface CostFit {\n  a: number;\n  b: number;\n  lo: number;\n  hi: number;\n}\n\nexport const COST_FITS: Record<string, CostFit> = {\n${body}\n};\n\nexport const REFERENCE_MODEL = "claude-sonnet-5-5";\n\nexport const TOKEN_MIX = ${JSON.stringify(mix)};\n`);
  console.log(`Wrote ${TABLE_FILE}`);
}
