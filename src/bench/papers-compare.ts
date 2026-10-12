import { readFileSync } from "node:fs";
import type { PapersResult, PaperRun } from "./papers.ts";

export interface PairCount {
  pairs: number;
  both: number;
  onlyA: number;
  onlyB: number;
  neither: number;
  p: number;
}

function logChoose(n: number, k: number): number {
  let s = 0;
  for (let i = 1; i <= k; i++) s += Math.log(n - k + i) - Math.log(i);
  return s;
}

// Exact two-sided McNemar test: a binomial test on the discordant pairs with p = 0.5.
export function mcnemarExact(onlyA: number, onlyB: number): number {
  const n = onlyA + onlyB;
  if (!n) return 1;
  const k = Math.min(onlyA, onlyB);
  let tail = 0;
  for (let i = 0; i <= k; i++) tail += Math.exp(logChoose(n, i) - n * Math.LN2);
  return Math.min(1, 2 * tail);
}

export function countPairs(a: Map<string, boolean>, b: Map<string, boolean>): PairCount {
  const c = { pairs: 0, both: 0, onlyA: 0, onlyB: 0, neither: 0, p: 1 };
  for (const [k, pa] of a) {
    const pb = b.get(k);
    if (pb === undefined) continue;
    c.pairs++;
    if (pa && pb) c.both++;
    else if (pa) c.onlyA++;
    else if (pb) c.onlyB++;
    else c.neither++;
  }
  c.p = mcnemarExact(c.onlyA, c.onlyB);
  return c;
}

const scored = (r: PaperRun) => r.items.filter((i) => !i.reference);

export function outcomes(runs: PaperRun[]): { papers: Map<string, boolean>; items: Map<string, boolean> } {
  const papers = new Map<string, boolean>();
  const items = new Map<string, boolean>();
  for (const r of runs) {
    if (r.status === "skipped") continue;
    const its = scored(r);
    if (!its.length) continue;
    papers.set(`${r.paper}#${r.run}`, its.every((i) => i.computed.pass));
    for (const i of its) items.set(`${r.paper}#${r.run}#${i.key}`, i.computed.pass);
  }
  return { papers, items };
}

function runsOf(result: PapersResult, model: string | undefined, file: string): PaperRun[] {
  const runs = model ? result.runs.filter((r) => r.model === model) : result.runs;
  const models = [...new Set(runs.map((r) => r.model))];
  if (models.length !== 1) throw new Error(`${file} has ${models.length ? `the models ${models.join(", ")}` : "no runs for this model"}. Name one model with --model.`);
  return runs;
}

export function comparePapers(a: PapersResult, b: PapersResult, opts: { model?: string; names?: [string, string] } = {}): string {
  const [na, nb] = opts.names ?? ["A", "B"];
  const ra = runsOf(a, opts.model, na);
  const rb = runsOf(b, opts.model, nb);
  const oa = outcomes(ra);
  const ob = outcomes(rb);
  const rows: [string, PairCount][] = [
    ["Paper runs (all items pass)", countPairs(oa.papers, ob.papers)],
    ["Items", countPairs(oa.items, ob.items)],
  ];
  const p = (x: number) => (x < 0.001 ? "<0.001" : x.toFixed(3));
  return [
    `A: ${na} (${ra[0]!.model})`,
    `B: ${nb} (${rb[0]!.model})`,
    "Each pair is the same paper, run number and item in A and B. The computed value is the outcome.",
    "",
    "| Unit | Pairs | Both pass | Only A | Only B | Both fail | Exact McNemar p |",
    "|---|---|---|---|---|---|---|",
    ...rows.map(([u, c]) => `| ${u} | ${c.pairs} | ${c.both} | ${c.onlyA} | ${c.onlyB} | ${c.neither} | ${p(c.p)} |`),
    "",
    "The test uses only the pairs with different outcomes. Items in one paper are not independent, so the paper-run row is the main test.",
  ].join("\n");
}

export function compareFiles(fa: string, fb: string, model?: string): string {
  const load = (f: string) => {
    const r = JSON.parse(readFileSync(f, "utf8")) as PapersResult;
    if (!Array.isArray(r.runs)) throw new Error(`${f} is not a result of cuvette bench papers.`);
    return r;
  };
  return comparePapers(load(fa), load(fb), { model, names: [fa, fb] });
}
