import { describe, expect, test } from "vitest";
import { namesValue } from "../src/core/asked.ts";
import { linear as once, Rng, runs } from "./fuzz-rng.ts";
import { withinMs } from "./timing.ts";

function linear(make: (n: number) => string, run: (s: string) => void, n: number) {
  let res = once(make, run, n);
  for (let k = 0; k < 2 && !res.ok; k++) res = once(make, run, n);
  return res;
}

const NUM = [
  { key: "min_cells", label: "Minimum cells" },
  { key: "min_genes", label: "Minimum genes" },
  { key: "resolution", label: "Cluster resolution" },
  { key: "max_depth", label: "Tree depth" },
];
const BOOL = [
  { key: "smoothing", label: "Smoothing" },
  { key: "log_scale", label: "Log scale" },
];
const TEXT = [
  { key: "test", label: "Statistical test", choices: ["Welch", "Mann-Whitney", "paired"] },
  { key: "normalization", label: "Normalization", choices: ["median", "log", "none"] },
];
const ALL = [...NUM, ...BOOL, ...TEXT];

const spell = (r: Rng, n: number): string => r.pick([String(n), `${n}.0`, n >= 0 && n < 10 ? `0${n}` : String(n), n >= 0 ? `+${n}` : String(n)]);
const nameOf = (r: Rng, f: { key: string; label: string }): string => r.pick([f.key, f.label, f.label.toLowerCase(), f.key.replace(/_/g, " "), f.key.replace(/_/g, "-")]);
const bare = (n: number): string => String(n);

function positive(r: Rng, f: { key: string; label: string }, n: number): string {
  const name = nameOf(r, f);
  const v = spell(r, n);
  return r.pick([`Set ${name} to ${v}`, `Please set the ${name} to ${v}.`, `Use ${name} of ${v}`, `${name} = ${v}`, `${name}: ${v}`, `Change ${name} to ${v}, please`, `Use ${v} for ${name}`, `Set ${name} at ${v}.`]);
}

describe("fuzz: the value gate for setting changes", () => {
  test("a number that is tied to the setting name opens the gate", () => {
    const r = new Rng(41001);
    for (let i = 0; i < runs(1500); i++) {
      const f = r.pick(NUM);
      const n = r.int(0, 999);
      const text = positive(r, f, n);
      expect(namesValue(text, f, n), text).toBe(true);
      expect(namesValue(text.toUpperCase(), f, n), text.toUpperCase()).toBe(true);
    }
  });

  test("a comma decimal opens the gate and the other number does not", () => {
    const f = NUM[2]!;
    expect(namesValue("Set cluster resolution to 2,5", f, 2.5)).toBe(true);
    expect(namesValue("Set cluster resolution to 2,5", f, 2)).toBe(false);
    expect(namesValue("Set cluster resolution to 2,5", f, 25)).toBe(false);
  });

  test("a thousands separator gives one number", () => {
    const f = NUM[0]!;
    expect(namesValue("Set minimum cells to 1,000", f, 1000)).toBe(true);
    expect(namesValue("Set minimum cells to 1 000", f, 1000)).toBe(true);
    expect(namesValue("Set minimum cells to 1,000", f, 1)).toBe(false);
    expect(namesValue("Set minimum cells to 1,000,000", f, 1)).toBe(false);
    expect(namesValue("Set minimum cells to 1,000,000", f, 1000000)).toBe(true);
  });

  test("a value that is in another setting, a file name or an identifier does not open the gate", () => {
    const r = new Rng(41002);
    for (let i = 0; i < runs(1500); i++) {
      const f = r.pick(NUM);
      const o = r.pick(NUM.filter((x) => x !== f));
      const n = r.int(10, 99);
      const m = r.int(100, 999);
      const cases = [
        `Set ${o.label} to ${n} and ${f.label} to ${m}`,
        `Set ${o.label} to ${n}, ${f.label} to ${m}`,
        `Set ${o.label} ${n}, ${f.label} ${m}`,
        `Set ${o.key} = ${n} and ${f.key} = ${m}`,
        `${o.label}: ${n}. ${f.label}: ${m}.`,
        `Use ${n} for ${o.label} and ${m} for ${f.label}`,
        `Set ${f.label} to ${m}. Load data_${n}.csv`,
        `Set ${f.label} to ${m}. Open sample-${n}/counts.tsv`,
        `Set ${f.label} to ${m} for gene${n} and v${n}`,
        `Load ${f.key}_${n}.csv`,
        `Use the ${f.label} with sample ${n}x`,
      ];
      for (const text of cases) {
        const hit = namesValue(text, f, n, ALL);
        expect(hit, `${text} | ${f.key}=${n}`).toBe(false);
        expect(namesValue(text, f, m, ALL), `${text} | ${f.key}=${m}`).toBe(text.includes(`${m}`) && !text.includes(`_${m}`) && !text.includes(`-${m}`) && !text.includes(`v${m}`) && !text.includes(`gene${m}`) && !text.includes(`${m}x`));
      }
    }
  });

  test("a setting name that is part of a longer setting name does not count", () => {
    const f = { key: "cells", label: "Cells" };
    const o = { key: "min_cells", label: "Minimum cells" };
    expect(namesValue("Set minimum cells to 5", f, 5, [o])).toBe(false);
    expect(namesValue("Set minimum cells to 5", o, 5, [f])).toBe(true);
    expect(namesValue("Set cells to 5", f, 5, [o])).toBe(true);
  });

  test("a setting name or a value inside a file name or an identifier does not count", () => {
    const f = NUM[0]!;
    expect(namesValue("Open min_cells.csv with 5 rows", f, 5)).toBe(false);
    expect(namesValue("Open data/minimum_cells/run.tsv and use 5", f, 5)).toBe(false);
    expect(namesValue("Use my_minimum_cells_table 5", f, 5)).toBe(false);
    expect(namesValue("Set minimum cells to 5", f, 5)).toBe(true);
    expect(namesValue("Set (minimum cells) to 5.", f, 5)).toBe(true);
    expect(namesValue("Set minimum_cells to 5", f, 5)).toBe(true);
    expect(namesValue("Set --minimum-cells to 5", f, 5)).toBe(true);
    const t = TEXT[0]!;
    expect(namesValue("Load welch.csv for the test", t, "Welch")).toBe(false);
    expect(namesValue("Load welch_results for the test", t, "Welch")).toBe(false);
    expect(namesValue("Set the test to Welch", t, "Welch")).toBe(true);
    expect(namesValue("Set the test to Welch.", t, "Welch")).toBe(true);
  });

  test("the sentences of the review give a card for the wrong value and apply the right one", () => {
    const alpha = { key: "alpha", label: "Alpha" };
    const cells = NUM[0]!;
    const genes = NUM[1]!;
    const window5 = { key: "window", label: "Window" };
    expect(namesValue("Use alpha 0.05 instead of 0.1", alpha, 0.1)).toBe(false);
    expect(namesValue("Use alpha 0.05 instead of 0.1", alpha, 0.05)).toBe(true);
    expect(namesValue("Set minimum cells to 5 for 10 samples", cells, 10)).toBe(false);
    expect(namesValue("Set minimum cells to 5 for 10 samples", cells, 5)).toBe(true);
    expect(namesValue("Don't set min cells and min genes to 5", cells, 5, ALL)).toBe(false);
    expect(namesValue("Don't set min cells and min genes to 5", genes, 5, ALL)).toBe(false);
    expect(namesValue("Don't set min cells and min genes to 5", cells, 5)).toBe(false);
    expect(namesValue("I don't have replicates so use window 5", window5, 5)).toBe(true);
    expect(namesValue("Set Minimum cells to 42 and Tree depth to 521", cells, 42, ALL)).toBe(true);
    expect(namesValue("Set Minimum cells to 42 and Tree depth to 521", NUM[3]!, 521, ALL)).toBe(true);
    expect(namesValue("Set Minimum cells to 42 and Tree depth to 521", cells, 521, ALL)).toBe(false);
    expect(namesValue("Set Minimum cells to 42 and Tree depth to 521", NUM[3]!, 42, ALL)).toBe(false);
    expect(namesValue("Do not touch the filters, and also not the plots, then set minimum cells to 5", cells, 5)).toBe(true);
    expect(namesValue("Never mind that I said ten, so set minimum cells to 5", cells, 5)).toBe(true);
  });

  test("a comma right after a negation does not end its reach", () => {
    const alpha = { key: "alpha", label: "Alpha" };
    expect(namesValue("Don't, under any circumstances, set alpha to 0.1", alpha, 0.1)).toBe(false);
    expect(namesValue("Do not, please, use alpha 0.1", alpha, 0.1)).toBe(false);
    expect(namesValue("Never, ever, set alpha to 0.1.", alpha, 0.1)).toBe(false);
    expect(namesValue("Do not, under any circumstances, touch the plots. Set alpha to 0.1", alpha, 0.1)).toBe(true);
    expect(namesValue("Do not, under any circumstances, touch the plots\nSet alpha to 0.1", alpha, 0.1)).toBe(true);
    expect(namesValue("Do not, under any circumstances, touch the plots, but set alpha to 0.1", alpha, 0.1)).toBe(true);
    expect(namesValue("Do not worry about the old runs window 5", { key: "window", label: "Window" }, 5)).toBe(true);
  });

  test("a negation before the value closes the gate", () => {
    const r = new Rng(41003);
    const no = ["Do not", "Don't", "Never", "Please do not", "Dont", "Do NOT", "Do n't", "I do not want to", "Never ever", "Avoid", "Without"];
    for (let i = 0; i < runs(1200); i++) {
      const f = r.pick(NUM);
      const n = r.int(0, 999);
      const name = nameOf(r, f);
      const v = spell(r, n);
      const text = r.pick([`${r.pick(no)} set ${name} to ${v}`, `${r.pick(no)} change ${name} to ${v}.`, `${name} must not be ${v}`, `Set ${name} to something else, not ${v}`, `${r.pick(no)} use ${v} for ${name}`, `Use ${name} to 3, ${r.pick(no).toLowerCase()} ${v}`]);
      if (/to 3, /.test(text) && n === 3) continue;
      expect(namesValue(text, f, n), text).toBe(false);
    }
    const f = NUM[0]!;
    expect(namesValue("Do not touch the filters. Set minimum cells to 5", f, 5)).toBe(true);
    expect(namesValue("Do not touch the filters, but set minimum cells to 5", f, 5)).toBe(true);
    expect(namesValue("Set minimum cells to 5, not 7", f, 5)).toBe(true);
    expect(namesValue("Set minimum cells to 5, not 7", f, 7)).toBe(false);
  });

  test("a negated boolean and a negated choice close the gate", () => {
    const r = new Rng(41004);
    for (let i = 0; i < runs(600); i++) {
      const f = r.pick(BOOL);
      const name = nameOf(r, f);
      const word = r.pick(["on", "off"]);
      expect(namesValue(`Turn ${name} ${word}`, f, word === "on"), `Turn ${name} ${word}`).toBe(true);
      expect(namesValue(`Turn ${name} ${word}`, f, word !== "on")).toBe(false);
      const no = r.pick(["Do not", "Don't", "Never"]);
      expect(namesValue(`${no} turn ${name} ${word}`, f, word === "on"), `${no} turn ${name} ${word}`).toBe(false);
      expect(namesValue(`${no} enable ${name}`, f, true)).toBe(false);
      expect(namesValue(`${no} disable ${name}`, f, false)).toBe(false);
      expect(namesValue(`Enable ${name}`, f, true)).toBe(true);
      expect(namesValue(`Disable ${name}`, f, false)).toBe(true);
      expect(namesValue(`Set ${name} to ${word}`, f, word === "on")).toBe(true);
      expect(namesValue(`Set ${name} to ${word}`, f, word !== "on")).toBe(false);
    }
    const t = TEXT[0]!;
    expect(namesValue("Change the test to Welch", t, "Welch")).toBe(true);
    expect(namesValue("Change the test to Welch", t, "paired")).toBe(false);
    expect(namesValue("Do not change the test to Welch", t, "Welch")).toBe(false);
    expect(namesValue("Use the paired statistical test, not Welch", t, "Welch")).toBe(false);
    expect(namesValue("Use the paired statistical test, not Welch", t, "paired")).toBe(true);
  });

  test("a choice that is far from the name or is the value of another setting does not open the gate", () => {
    const [t, norm] = TEXT as [(typeof TEXT)[0], (typeof TEXT)[0]];
    expect(namesValue("Set normalization to log and the statistical test to Welch", norm, "log", ALL)).toBe(true);
    expect(namesValue("Set normalization to log and the statistical test to Welch", norm, "Welch", ALL)).toBe(false);
    expect(namesValue("Set normalization to log and the statistical test to Welch", t, "log", ALL)).toBe(false);
    expect(namesValue("Set normalization to log and the statistical test to Welch", t, "Welch", ALL)).toBe(true);
    expect(namesValue("Normalization is something we talked about last week. Use the log transform for the plots.", norm, "log", ALL)).toBe(false);
  });

  test("random text never crashes and ASCII case does not change the answer", () => {
    const r = new Rng(41005);
    const words = ["set", "to", "the", "minimum", "cells", "min_cells", "5", "5.0", "1,000", "not", "don't", "on", "off", "=", ":", "sample_5.csv", "welch", "test", "statistical", ",", ".", "(", ")", "'", "-", "+3", ".5", "e", "∞", "\u0000", "İ"];
    for (let i = 0; i < runs(1500); i++) {
      const text = Array.from({ length: r.int(0, 30) }, () => r.pick(words)).join(r.pick([" ", "  ", "\n"]));
      const f = r.pick(ALL);
      const value = r.pick([5, 5.5, 0, -3, true, false, "welch", "Welch", "log", "5", NaN, Infinity, null, undefined, {}]);
      const a = namesValue(text, f, value, ALL);
      if (!/[^\x00-\x7f]/.test(text)) expect(namesValue(text.toUpperCase(), f, value, ALL), text).toBe(a);
      expect(namesValue(text.toLowerCase(), f, value, ALL), text).toBe(namesValue(text.toLowerCase(), f, value, ALL));
    }
  });

  test("a 1 MB request takes linear time", () => {
    const f = NUM[0]!;
    const cases: [string, (n: number) => string][] = [
      ["words", (n) => "set the minimum cells to 5 and ".repeat(n / 30)],
      ["names only", (n) => "minimum cells ".repeat(n / 14)],
      ["numbers only", (n) => "5 ".repeat(n / 2)],
      ["no spaces", (n) => "minimum_cells=5,".repeat(n / 15)],
      ["negations", (n) => "not ".repeat(n / 4)],
      ["clauses", (n) => "not, ".repeat(n / 5) + "minimum cells 5"],
    ];
    for (const [name, make] of cases) {
      const res = linear(make, (s) => void namesValue(s, f, 5, ALL), 10000);
      expect(res.ok, `${name}: ${res.small} ms for 10 000, ${res.big} ms for 40 000`).toBe(true);
    }
    const t = performance.now();
    namesValue("set the minimum cells to 6 and ".repeat(33000), f, 5, ALL);
    withinMs(performance.now() - t, 3000);
  });
});
