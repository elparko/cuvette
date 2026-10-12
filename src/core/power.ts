import { collectTests } from "./testcount.ts";
import type { AnalysisRecord } from "./record.ts";
import type { FindingIn } from "./types.ts";

export type TKind = "one" | "paired" | "two";

export interface TDesign {
  kind: TKind;
  n1: number;
  n2?: number;
}

const LANCZOS = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];

function lgamma(x: number): number {
  if (x < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * x)) - lgamma(1 - x);
  const z = x - 1;
  let a = LANCZOS[0];
  const t = z + 7.5;
  for (let i = 1; i < 9; i++) a += LANCZOS[i] / (z + i);
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(a);
}

export function normCdf(x: number): number {
  if (x > 8) return 1;
  if (x < -8) return 0;
  const pdf = Math.exp((-x * x) / 2) / Math.sqrt(2 * Math.PI);
  if (Math.abs(x) <= 3) {
    let term = x;
    let sum = x;
    for (let n = 1; n < 200 && Math.abs(term) > 1e-18; n++) {
      term *= (x * x) / (2 * n + 1);
      sum += term;
    }
    return 0.5 + pdf * sum;
  }
  const a = Math.abs(x);
  let f = a;
  for (let k = 60; k >= 1; k--) f = a + k / f;
  const tail = pdf / f;
  return x > 0 ? 1 - tail : tail;
}

export function normQuantile(p: number): number {
  let lo = -40;
  let hi = 40;
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    if (normCdf(mid) < p) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

const STEPS = 2000;

export function ntCdf(t: number, df: number, ncp: number): number {
  const vmax = df + 14 * Math.sqrt(2 * df) + 40;
  const umax = Math.sqrt(vmax);
  const logConst = -(df / 2) * Math.LN2 - lgamma(df / 2);
  const h = umax / STEPS;
  const f = (u: number) => {
    if (u === 0) return df === 1 ? Math.exp(logConst) * 2 * normCdf(-ncp) : 0;
    const v = u * u;
    const dens = Math.exp(logConst + (df / 2 - 1) * Math.log(v) - v / 2);
    return normCdf((t * u) / Math.sqrt(df) - ncp) * 2 * u * dens;
  };
  let sum = f(0) + f(umax);
  for (let i = 1; i < STEPS; i++) sum += f(i * h) * (i % 2 ? 4 : 2);
  return Math.min(1, Math.max(0, (sum * h) / 3));
}

function tQuantile(p: number, df: number): number {
  let lo = 0;
  let hi = 1000;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (ntCdf(mid, df, 0) < p) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

function tShape(design: TDesign): { df: number; scale: number } {
  if (design.kind === "two") {
    const n2 = design.n2 ?? design.n1;
    return { df: design.n1 + n2 - 2, scale: 1 / Math.sqrt(1 / design.n1 + 1 / n2) };
  }
  return { df: design.n1 - 1, scale: Math.sqrt(design.n1) };
}

function tPower(d: number, df: number, scale: number, crit: number): number {
  const ncp = Math.abs(d) * scale;
  return 1 - ntCdf(crit, df, ncp) + ntCdf(-crit, df, ncp);
}

export function powerT(d: number, design: TDesign, alpha = 0.05): number {
  const { df, scale } = tShape(design);
  return tPower(d, df, scale, tQuantile(1 - alpha / 2, df));
}

function solve(power: (x: number) => number, target: number, hi: number): number {
  let lo = 0;
  for (let i = 0; i < 50; i++) {
    const mid = (lo + hi) / 2;
    if (power(mid) < target) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

export function minEffectT(design: TDesign, power = 0.8, alpha = 0.05): number {
  const { df, scale } = tShape(design);
  const crit = tQuantile(1 - alpha / 2, df);
  return solve((d) => tPower(d, df, scale, crit), power, 10);
}

export function powerR(r: number, n: number, alpha = 0.05): number {
  const t = tQuantile(1 - alpha / 2, n - 2);
  const rc = Math.sqrt((t * t) / (t * t + n - 2));
  const zr = Math.atanh(Math.abs(r)) + Math.abs(r) / (2 * (n - 1));
  const zc = Math.atanh(rc);
  const k = Math.sqrt(n - 3);
  return normCdf((zr - zc) * k) + normCdf((-zr - zc) * k);
}

export function minEffectR(n: number, power = 0.8, alpha = 0.05): number {
  return solve((r) => powerR(r, n, alpha), power, 0.999);
}

export function cohenH(p1: number, p2: number): number {
  return 2 * Math.asin(Math.sqrt(p1)) - 2 * Math.asin(Math.sqrt(p2));
}

export function powerProportions(h: number, n1: number, n2 = n1, alpha = 0.05): number {
  const z = normQuantile(1 - alpha / 2);
  const k = Math.abs(h) * Math.sqrt((n1 * n2) / (n1 + n2));
  return normCdf(k - z) + normCdf(-k - z);
}

export function minEffectH(n1: number, n2 = n1, power = 0.8, alpha = 0.05): number {
  return solve((h) => powerProportions(h, n1, n2, alpha), power, Math.PI);
}

export function proportionFromH(p1: number, h: number): number {
  return Math.sin(Math.asin(Math.sqrt(p1)) + h / 2) ** 2;
}

export interface PowerInfo {
  node: string;
  step: number;
  test: string;
  sample: string;
  observed: number;
  power: number;
  minimum: number;
  minimumText: string;
  mediumPower: number;
}

type Shape = Omit<PowerInfo, "node" | "step" | "test">;

const num = (v: unknown): number | undefined => (typeof v === "number" && Number.isFinite(v) ? v : undefined);
const fmt = (x: number) => String(Number(x.toPrecision(2)));

function tShapeInfo(m: Record<string, unknown>, name: string): Shape | undefined {
  if (!/\bt[- ]?test/i.test(name)) return undefined;
  const t = num(m.statistic);
  const n1 = num(m.n_a);
  const n2 = num(m.n_b);
  if (t === undefined || !n1 || !n2) return undefined;
  const design: TDesign = /paired/i.test(name) ? { kind: "paired", n1 } : /one[- ]sample/i.test(name) ? { kind: "one", n1 } : { kind: "two", n1, n2 };
  if (design.kind === "two" ? n1 + n2 < 4 : n1 < 3) return undefined;
  const d = Math.abs(design.kind === "two" ? t * Math.sqrt(1 / n1 + 1 / n2) : t / Math.sqrt(n1));
  const minimum = minEffectT(design);
  const diff = num(m.mean_diff);
  const sd = diff !== undefined && d > 0 ? Math.abs(diff) / d : undefined;
  return {
    sample: design.kind === "two" ? `${n1} and ${n2} subjects in the groups` : design.kind === "paired" ? `${n1} pairs` : `${n1} subjects`,
    observed: d,
    power: powerT(d, design),
    minimum,
    minimumText: sd ? `a difference of ${fmt(minimum * sd)} or more, in the unit of the outcome` : `a standardized difference (Cohen d) of ${fmt(minimum)} or more`,
    mediumPower: powerT(0.5, design),
  };
}

function correlationInfo(m: Record<string, unknown>, name: string): Shape | undefined {
  if (!/correlat|pearson|spearman/i.test(name)) return undefined;
  const r = num(m.r) ?? num(m.rho) ?? num(m.pearson_r) ?? num(m.spearman_rho) ?? num(m.correlation);
  const n = num(m.n);
  if (r === undefined || !n || n < 5) return undefined;
  const minimum = minEffectR(n);
  return {
    sample: `${n} subjects`,
    observed: Math.abs(r),
    power: powerR(r, n),
    minimum,
    minimumText: `a correlation of ${fmt(minimum)} or more`,
    mediumPower: powerR(0.3, n),
  };
}

export function powerNotes(record: AnalysisRecord): PowerInfo[] {
  const out: PowerInfo[] = [];
  for (const t of collectTests(record)) {
    const metrics = (record.node(t.node)?.result as { metrics?: Record<string, unknown> } | undefined)?.metrics;
    if (!metrics) continue;
    const info = tShapeInfo(metrics, t.test) ?? correlationInfo(metrics, t.test);
    if (info) out.push({ node: t.node, step: t.step, test: t.test, ...info });
  }
  return out;
}

export function powerFindings(record: AnalysisRecord): FindingIn[] {
  return powerNotes(record)
    .filter((p) => p.mediumPower < 0.8)
    .map((p) => ({
      check: "low_power",
      severity: "info" as const,
      message: `With ${p.sample}, the ${p.test} in step ${p.step} finds only ${p.minimumText} (80% power, alpha 0.05). The observed effect has a power of ${fmt(p.power)}.`,
      nodes: [p.node],
    }));
}
