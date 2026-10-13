import { describe, expect, test } from "vitest";
import { annotate, checkAnswer, extractNumbers, splitSentences } from "../src/core/claims.ts";
import type { Entry, EntryKind } from "../src/core/types.ts";
import { linear, Rng, runs } from "./fuzz-rng.ts";

type Logged = { node: string; path: string; value: number };

function fake(numbers: Logged[]) {
  const appended: Record<string, unknown>[] = [];
  const record = {
    numbers: () => numbers,
    entries: (_k?: EntryKind[]) => [] as Entry[],
    live: (_k?: EntryKind[]) => [] as Entry[],
    rewound: () => new Set(),
    setAside: () => false,
    append: (kind: string, data: Record<string, unknown>) => {
      appended.push(data);
      return { id: 1, ts: "", session: "s", kind, data } as Entry;
    },
  };
  return record as any;
}

const WORDS = ["mean", "median", "area", "signal", "intensity", "slope", "estimate", "width", "score", "level"];
const SUP: Record<string, string> = { "-": "⁻", "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹" };

function sig(v: number, k: number): string {
  return String(Number(v.toPrecision(k)));
}

function thousands(s: string): string {
  const [i, d] = s.split(".");
  return i!.replace(/\B(?=(\d{3})+$)/g, ",") + (d ? `.${d}` : "");
}

function written(r: Rng, v: number): string {
  const k = r.int(3, 6);
  const neg = v < 0 ? "-" : "";
  const a = Math.abs(v);
  const style = r.int(0, 4);
  if (style === 1 || a < 1e-3 || a >= 1e7) {
    const [m, e] = a.toExponential(k - 1).split("e");
    const exp = String(Number(e));
    const form = r.int(0, 3);
    if (form === 0) return `${neg}${m}e${exp}`;
    if (form === 1) return `${neg}${m} × 10^${exp}`;
    if (form === 2) return `${neg}${m}×10${[...exp].map((c) => SUP[c]).join("")}`;
    return `${neg}${m}E${exp}`;
  }
  const plain = r.bool(0.2) && a < 1e4 ? a.toFixed(Math.max(0, k - 1 - Math.floor(Math.log10(a)))) : sig(a, k);
  if (style === 2 && a >= 1000 && !plain.includes("e")) return neg + thousands(plain);
  return neg + plain;
}

function neutral(r: Rng, num: string, after = ""): string {
  const shown = r.bool(0.2) ? num.replace(/^-/, "−") : num;
  const lead = r.pick(["is ", "is ", "= ", "≈ ", "was about ", "(", ": ", "is ~", "reached "]);
  const close = lead === "(" ? ")" : "";
  return r.bool(0.15) ? `| ${r.pick(WORDS)} | ${shown}${after} |` : `The ${r.pick(WORDS)} ${lead}${shown}${after}${close}.`;
}

function loggedSet(r: Rng): Logged[] {
  return Array.from({ length: r.int(1, 8) }, (_, i) => ({ node: `n${i + 1}`, path: `result.${r.pick(WORDS)}`, value: (r.bool(0.2) ? -1 : 1) * r.logUniform(1e-6, 1e7) }));
}

describe("fuzz: number reader and claim check", () => {
  test("a logged number written in the same unit is never flagged", () => {
    const r = new Rng(101);
    const fails: string[] = [];
    for (let i = 0; i < runs(1500); i++) {
      const logged = loggedSet(r);
      const t = r.pick(logged);
      const kind = r.int(0, 5);
      let text: string;
      if (kind === 0) text = neutral(r, written(r, t.value));
      else if (kind === 1) {
        t.path = "result.share_pct";
        t.value = Math.abs(t.value) % 100;
        text = neutral(r, sig(t.value, r.int(3, 5)), r.pick(["%", " %", " percent"]));
      } else if (kind === 2) {
        t.path = `result.${r.pick(["time_ms", "dose_mg", "length_um", "volume_ml"])}`;
        t.value = Math.abs(t.value);
        const unit = { time_ms: "ms", dose_mg: "mg", length_um: "µm", volume_ml: "mL" }[t.path.slice(7)]!;
        text = neutral(r, written(r, t.value), ` ${unit}`);
      } else if (kind === 4) {
        t.path = `result.${r.pick(["fraction", "positive_frac", "proportion"])}`;
        t.value = r.next();
        text = neutral(r, sig(t.value * 100, r.int(3, 5)), "%");
      } else if (kind === 5) {
        t.path = `result.${r.pick(["fold_change", "ratio", "log2_fc"])}`;
        t.value = r.logUniform(1.1, 50);
        if (t.path.includes("log")) t.value = Math.log2(t.value);
        text = neutral(r, sig(t.path.includes("log") ? 2 ** t.value : t.value, r.int(3, 5)), r.pick(["-fold", " fold", "-fold higher"]));
      } else {
        text = `${neutral(r, written(r, t.value))} Then ${neutral(r, written(r, r.pick(logged).value)).toLowerCase()}`;
      }
      const claims = checkAnswer(text, fake(logged));
      if (claims.some((c) => c.label === "unsourced")) fails.push(`${JSON.stringify(logged.map((x) => [x.path, x.value]))} :: ${text}`);
    }
    expect(fails.slice(0, 5)).toEqual([]);
  });

  test("a number far from every logged value is always flagged", () => {
    const r = new Rng(202);
    const fails: string[] = [];
    for (let i = 0; i < runs(1500); i++) {
      const logged = loggedSet(r);
      const near = (x: number) => logged.some((l) => [l.value, l.value * 100, l.value / 100, -l.value, 1 / l.value].some((v) => Math.abs(Math.log(Math.abs(x / v))) < Math.log(3)));
      let x = r.logUniform(11, 1e6);
      for (let k = 0; k < 50 && near(x); k++) x = r.logUniform(11, 1e6);
      if (near(x)) continue;
      const shown = sig(x, r.int(3, 5));
      if (!shown.includes(".")) continue;
      const text = neutral(r, shown);
      const claims = checkAnswer(text, fake(logged));
      if (!claims.some((c) => c.label === "unsourced" && Math.abs(c.value! - Number(shown)) < 1e-9)) fails.push(`${JSON.stringify(logged.map((l) => l.value))} :: ${text} :: ${JSON.stringify(claims)}`);
    }
    expect(fails.slice(0, 5)).toEqual([]);
  });

  const PIECES = ["1,5", "3-5", "3–5", "3 - 5", "1/2", "3/4", "1st", "2nd", "3rd", "21st", "-0.5", "−2.5", "+4", "1e5", "1E-3", "2.5 × 10^-3", "4·10⁻²", "1,234,567.89", "12,34", "1 000", "50%", "50 %", "0.5 percent", "10-fold", "2 fold", "5 mg", "5mg", "3 µL", "12 h", "4 min", "p < 0.05", "n = 12", "(Smith, 2020)", "[1, 2]", "doi 10.1000/xyz", "v1.2.3", "2024-01-01", "1:2", "PMID 123", "step 4", "Fig. 3", "#5", "1.", "1)", "..", ".5", "5.", "e", "×", "^", "⁻", "|", "\n", "\n\n", "| 3 | 4 |", "|---|---|", " ", "\t", "decreased", "lower", "may", "et al.", "~", "≈", "±", "1,5,7", "0,001"];

  test("random answers do not crash, and each found number is inside the text", () => {
    const r = new Rng(303);
    for (let i = 0; i < runs(800); i++) {
      const text = Array.from({ length: r.int(1, 30) }, () => (r.bool(0.7) ? r.pick(PIECES) : r.string("0123456789.,-+eE%x× ^()[]|abc\n", 1, 8))).join(r.pick([" ", "", " ", "\n"]));
      const logged = loggedSet(r);
      for (const small of [true, false]) {
        for (const f of extractNumbers(text, { small })) {
          expect(Number.isFinite(f.value), text).toBe(true);
          expect(f.start).toBeGreaterThanOrEqual(0);
          expect(f.end).toBeLessThanOrEqual(text.length);
          expect(f.start).toBeLessThan(f.end);
        }
      }
      for (const s of splitSentences(text)) expect(text.slice(s.start, s.end)).toBe(s.text);
      const claims = checkAnswer(text, fake(logged));
      const marked = annotate(text, claims);
      expect(marked.replaceAll(" [no source]", "").startsWith(text)).toBe(true);
    }
  });

  test("the run time grows about linearly with the answer length", () => {
    const shapes: [string, (n: number) => string][] = [
      ["one long word", (n) => "a".repeat(n)],
      ["one long number", (n) => "1".repeat(n)],
      ["hyphens", (n) => "-".repeat(n)],
      ["word and hyphen", (n) => "a-".repeat(n / 2)],
      ["small numbers with commas", (n) => "1,".repeat(n / 2)],
      ["open brackets", (n) => "[1,".repeat(n / 3)],
      ["one table row", (n) => `|${" 3 |".repeat(n / 4)}`],
      ["sentences", (n) => "The area is 12.5 mm. ".repeat(n / 21)],
      ["many sentences", (n) => "The area is 12.5 mm. ".repeat(n / 5)],
      ["many numbers", (n) => "12.5 ".repeat(n / 5)],
      ["dots", (n) => "1.".repeat(n / 2)],
      ["exponents", (n) => "1e".repeat(n / 2)],
    ];
    const r = new Rng(404);
    const logged = Array.from({ length: 50 }, (_, i) => ({ node: `n${i}`, path: "result.x", value: r.logUniform(1e-3, 1e5) }));
    const slow = shapes.map(([name, make]) => ({ name, ...linear(make, (s) => {
      checkAnswer(s, fake(logged));
      extractNumbers(s);
    }, 5000) })).filter((x) => !x.ok);
    expect(slow).toEqual([]);
  });
});
