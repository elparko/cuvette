import { describe, expect, test } from "vitest";
import { Masker, scanContent, type PhiHit } from "../src/core/phi.ts";
import { linear, Rng, runs } from "./fuzz-rng.ts";

const FIRST = ["John", "Mary", "Anne-Marie", "O'Neil", "Jose", "Li", "Chen", "Smith"];
const LAST = ["Smith", "Garcia", "O'Brien", "Nguyen", "Doe", "Fischer", "Kowalski"];

function phi(r: Rng): string {
  const name = `${r.pick(FIRST)} ${r.pick(LAST)}`;
  const date = r.pick([`${r.int(1, 12)}/${r.int(1, 28)}/19${r.int(30, 99)}`, `19${r.int(30, 99)}-0${r.int(1, 9)}-1${r.int(0, 9)}`, `March ${r.int(1, 28)}, 19${r.int(40, 99)}`]);
  const k = r.int(0, 10);
  if (k === 0) return `Patient: ${name}`;
  if (k === 1) return `Mr. ${r.pick(LAST)}`;
  if (k === 2) return `DOB: ${date}`;
  if (k === 3) return `MRN: ${r.int(10000, 99999999)}`;
  if (k === 4) return r.pick([`(${r.int(201, 989)}) ${r.int(200, 999)}-${r.int(1000, 9999)}`, `${r.int(201, 989)}-${r.int(200, 999)}-${r.int(1000, 9999)}`]);
  if (k === 5) return `${r.int(100, 665)}-${r.int(10, 99)}-${r.int(1000, 9999)}`;
  if (k === 6) return `${r.pick(FIRST).toLowerCase()}.${r.pick(LAST).toLowerCase().replace("'", "")}@example.org`;
  if (k === 7) return `${r.int(1, 9999)} ${r.pick(["Main", "Oak Hill", "N. Elm"])} ${r.pick(["Street", "Ave", "Road", "Blvd."])}`;
  if (k === 8) return `Springfield, IL ${r.int(10000, 99999)}`;
  if (k === 9) return `${name} is a ${r.int(20, 90)}-year-old`;
  return `ZIP: ${r.int(10000, 99999)} seen ${date}`;
}

function filler(r: Rng): string {
  return r.pick(["The cells grew.", "Control group", "mean 12.5 µm", "日本語", "🧪", "‮", "\u0000", "Table 3", "n = 12", "p < 0.05", "a\tb", "x".repeat(r.int(1, 200)), "Results Summary", "\\", '"', "[NAME 1]"]);
}

function text(r: Rng): string {
  const k = r.int(0, 3);
  const parts = () => Array.from({ length: r.int(1, 12) }, () => (r.bool(0.4) ? phi(r) : filler(r)));
  if (k === 0) return Array.from({ length: r.int(1, 8) }, () => parts().join(r.pick([" ", ". ", ", "]))).join("\n");
  if (k === 1) {
    const cols = r.pick([["patient name", "dob", "value"], ["Name", "MRN", "group"], ["sample", "phone", "email"], ["id", "address", "zip", "visit date"]]);
    const rows = Array.from({ length: r.int(1, 10) }, () => cols.map((c) => (/name/i.test(c) ? `${r.pick(FIRST)} ${r.pick(LAST)}` : /dob|date/.test(c) ? `${r.int(1, 12)}/${r.int(1, 28)}/19${r.int(30, 99)}` : /mrn/i.test(c) ? String(r.int(10000, 999999)) : /phone/.test(c) ? `${r.int(201, 989)}-${r.int(200, 999)}-${r.int(1000, 9999)}` : /email/.test(c) ? `x${r.int(0, 99)}@example.org` : /address/.test(c) ? `${r.int(1, 999)} Main Street` : /zip/.test(c) ? String(r.int(10000, 99999)) : String(r.int(0, 99)))));
    const d = r.pick([",", "\t", ";"]);
    return [cols.join(d), ...rows.map((row) => row.join(d))].join("\n");
  }
  if (k === 2) {
    const rows = Array.from({ length: r.int(1, 6) }, () => ({ name: `${r.pick(FIRST)} ${r.pick(LAST)}`, note: parts().join(" "), dob: `${r.int(1, 12)}/${r.int(1, 28)}/1970` }));
    return JSON.stringify(r.bool() ? rows : { result: { table: { columns: ["name", "dob"], rows: rows.map((x) => [x.name, x.dob]) }, text: parts().join(" ") } });
  }
  return parts().join(" ") + "x".repeat(r.int(3000, 9000)) + " " + parts().join(" ");
}

function isJson(s: string): boolean {
  try {
    JSON.parse(s);
    return true;
  } catch {
    return false;
  }
}

function unmask(m: Masker, s: string): string {
  const back = new Map([...m.map].map(([k, v]) => [v, k]));
  return s.replace(/\[[A-Z ]+ \d+\]/g, (p) => back.get(p) ?? p);
}

describe("fuzz: patient data scan and mask", () => {
  test("after the mask, a new scan finds no hit, and the Masker map gives the text back", () => {
    const r = new Rng(11001);
    for (let i = 0; i < runs(600); i++) {
      const t = text(r);
      const hits = scanContent(t, "x");
      for (const h of hits) expect(h.value.length).toBeGreaterThan(0);
      const m = new Masker();
      m.add(hits);
      const masked = m.text(t);
      const again = scanContent(masked, "x");
      expect(again.map((h) => `${h.kind}: ${h.value}`), JSON.stringify(t).slice(0, 400)).toEqual([]);
      if (!isJson(t) && !t.includes("[NAME")) expect(unmask(m, masked)).toBe(t);
      if (isJson(t)) expect(isJson(masked), masked.slice(0, 300)).toBe(true);
    }
  });

  test("a value late in a very long line is found", () => {
    const r = new Rng(11002);
    for (let i = 0; i < runs(100); i++) {
      const p = r.pick(["Patient: John Smith", "MRN: 12345678", "DOB: 01/02/1980", "123-45-6789", "john.smith@example.org"]);
      const t = `${"word ".repeat(r.int(10, 4000))}${p} ${"more ".repeat(r.int(0, 3000))}`;
      expect(scanContent(t, "x").length, `at ${t.indexOf(p)}`).toBeGreaterThan(0);
    }
  });

  test("the scan and the mask run in linear time on big input", () => {
    const make = (n: number) => Array.from({ length: n / 10 }, (_, k) => (k % 7 === 0 ? `Patient: John Smith${k % 3 ? "" : "son"} MRN: ${10000 + k} DOB: 01/02/1980` : "Mary Jane Ann Lee Kim Paul Ross Hall Bell Cole Ward ")).join("\n");
    expect(linear(make, (s) => scanContent(s, "x"), 20000).ok).toBe(true);
    const long = (n: number) => `${"Aaa Bbb ".repeat(n / 8)}`;
    expect(linear(long, (s) => scanContent(s, "x"), 20000).ok).toBe(true);
    const m = new Masker();
    m.add(Array.from({ length: 300 }, (_, j): PhiHit => ({ kind: "mrn", value: String(100000 + j), where: "x" })));
    expect(linear((n) => "MRN 100001 and 100299 and x ".repeat(n / 28), (s) => m.text(s), 20000).ok).toBe(true);
    const letters = Array.from({ length: 250 }, () => `Ab ${"x".repeat(4000)} Cd`).join("\n");
    const start = performance.now();
    scanContent(letters, "x");
    expect(performance.now() - start).toBeLessThan(800);
    const json = (n: number) => JSON.stringify(Array.from({ length: n / 50 }, (_, j) => ({ name: "John Smith", id: j, dob: "01/02/1980" })));
    expect(linear(json, (s) => scanContent(s, "x"), 20000).ok).toBe(true);
  });
});
