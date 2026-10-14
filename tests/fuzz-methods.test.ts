import { chmodSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { exportMethod, fillFromMethod, importMethod, listMethods, loadMethod, methodNote, methodsDir, methodText, readMethod, saveMethod, type Method } from "../src/core/methods.ts";
import type { AnalysisPlan } from "../src/core/plan.ts";
import { Rng, runs } from "./fuzz-rng.ts";

const root = mkdtempSync(join(tmpdir(), "cuvette-fuzz-methods-"));
const saved = { home: process.env.HOME, cuvette: process.env.CUVETTE_HOME };
beforeAll(() => {
  process.env.HOME = join(root, "home");
  process.env.CUVETTE_HOME = join(root, "cuvette");
});
afterAll(() => {
  process.env.HOME = saved.home;
  if (saved.cuvette === undefined) delete process.env.CUVETTE_HOME;
  else process.env.CUVETTE_HOME = saved.cuvette;
  rmSync(root, { recursive: true, force: true });
});

const WORDS = "abc xyz 12.5 é 日本 😀 \"q\" \\ {x} <b>";

function plan(r: Rng): AnalysisPlan {
  const some = <T>(max: number, make: (i: number) => T): T[] => Array.from({ length: r.int(0, max) }, (_, i) => make(i));
  const word = () => r.string([...WORDS], 1, 12);
  return {
    restatement: r.bool() ? word() : undefined,
    question: r.bool() ? word() : undefined,
    definitions: some(2, () => ({ measure: word(), definition: word() })),
    exclusions: some(2, () => ({ what: word(), ...(r.bool() ? { effect: word() } : {}) })),
    pilot: r.bool() ? { sample: word(), shows: some(2, word) } : undefined,
    programs: some(2, () => ({ part: word(), adapter: word(), alternatives: some(2, word) })),
    steps: some(4, (i) => ({
      step: word(),
      status: r.pick(["todo", "done"]),
      ...(r.bool() ? { tool: "count" } : {}),
      decisions: some(3, (j) => ({ label: word(), key: `k${i}${j}`, value: r.pick([1, "Otsu", true, 2.5, [1, 2], { a: 1 }, 0, "", false]) })),
    })),
    outputs: some(2, word),
    checks: some(2, () => ({ check: word() })),
  };
}

function method(r: Rng, name: string): Method {
  const word = () => r.string([...WORDS], 1, 12);
  return {
    cuvette_method: 1,
    name,
    saved: "2026-01-02T03:04:05.000Z",
    from: r.bool() ? { session: "s", folder: "/f", title: word() } : undefined,
    request: word(),
    questions: Array.from({ length: r.int(0, 3) }, () => ({ question: word(), answer: word() })),
    analysis: plan(r),
    programs: Array.from({ length: r.int(0, 2) }, () => ({ adapter: word(), version: "1" })),
    decisions: Object.fromEntries(Array.from({ length: r.int(0, 3) }, (_, i) => [`d${i}`, r.pick([1, "x", false, null])])),
    pilot: { required: r.bool(), shows: [] },
  };
}

const plain = (v: unknown) => JSON.parse(JSON.stringify(v));

describe("fuzz: methods", () => {
  test("a method that is saved and loaded has the same steps and text", () => {
    for (let seed = 1; seed <= runs(150); seed++) {
      const r = new Rng(seed);
      const m = method(r, `m${seed}`);
      const path = saveMethod(m);
      const back = loadMethod(m.name);
      expect(back.path).toBe(path);
      const { path: _p, hash: _h, ...rest } = back;
      expect(rest).toEqual(plain(m));
      expect(back.analysis.steps).toEqual(plain(m.analysis.steps));
      expect(methodText(back)).toBe(methodText(plain(m)));
      expect(methodNote(back)).toBe(methodNote(plain(m)));
      const filled = fillFromMethod({ steps: [] } as AnalysisPlan, back);
      expect(filled.steps).toEqual(plain(m.analysis.steps));
      const copy = join(root, `export-${seed}.json`);
      exportMethod(m.name, copy);
      expect(readMethod(readFileSync(copy, "utf8")).analysis).toEqual(plain(m.analysis));
      const rows = listMethods().filter((x) => x.name === m.name);
      expect(rows.length).toBe(1);
    }
  });

  test("a name with odd characters gives a clear error or a file in the methods folder, and nothing outside it", () => {
    const names = ["", " ", ".", "..", "../x", "a/b", "a\\b", "a:b", "a*b", "a\0b", "a\nb", " ok ", "CON", "nul.x", "com1", "é", "😀", "a b", "-a", "_a", ".a", "a.", "a".repeat(101), "a".repeat(100), "ok-1.2_x"];
    const alphabet = ["a", "B", "0", "_", "-", ".", "é", " ", "/", "\\", ":", "*", "\0", "\n", "😀"];
    const r = new Rng(77);
    for (let i = 0; i < runs(150); i++) names.push(r.string(alphabet, 0, 8));
    const before = new Set(existsSync(root) ? readdirSync(root) : []);
    for (const name of names) {
      const m = method(new Rng(5), name);
      let path: string | undefined;
      try {
        path = saveMethod(m);
      } catch (e) {
        expect(e).toBeInstanceOf(Error);
        expect((e as Error).message, JSON.stringify(name)).toMatch(/method name|reserved|100 characters/);
        expect(() => loadMethod(name)).toThrow(/method name|reserved|100 characters|No method named/);
        continue;
      }
      expect(dirname(path), JSON.stringify(name)).toBe(methodsDir());
      expect(basename(path)).toBe(`${name.trim()}.json`);
      expect(loadMethod(name.trim()).name).toBe(name);
      expect(listMethods().some((x) => x.name === name.trim())).toBe(true);
    }
    expect(new Set(readdirSync(root))).toEqual(before);
  });

  test("a damaged method file gives a clear error, and the list skips it", () => {
    const bad = join(root, "bad");
    mkdirSync(bad, { recursive: true });
    const wrong = [null, 5, "x", [], {}, true, [null], [5], { a: 1 }, ["a"], [{}], [{ step: 5 }], [{ label: 5 }]];
    const fields = ["name", "saved", "request", "questions", "programs", "decisions", "pilot", "inputs", "analysis"];
    const inner = ["restatement", "question", "definitions", "exclusions", "pilot", "programs", "steps", "outputs", "checks", "data", "reference", "out_of_scope"];
    const stepFields = ["step", "decisions", "method", "tool", "reason"];
    for (let seed = 1; seed <= runs(300); seed++) {
      const r = new Rng(seed + 900);
      const m: any = plain(method(r, "dam"));
      m.analysis.steps = m.analysis.steps.length ? m.analysis.steps : [{ step: "s", status: "todo", decisions: [{ label: "l", value: 1 }] }];
      const k = r.int(0, 4);
      if (k === 0) m[r.pick(fields)] = r.pick(wrong);
      else if (k === 1) m.analysis[r.pick(inner)] = r.pick(wrong);
      else if (k === 2) m.analysis.steps[0][r.pick(stepFields)] = r.pick(wrong);
      else if (k === 3) delete m[r.pick(fields)];
      let text = JSON.stringify(m);
      if (r.bool(0.3)) text = text.slice(0, r.int(0, text.length));
      if (r.bool(0.05)) text = r.bytes(r.int(1, 50)).toString("latin1");
      writeFileSync(join(bad, "dam.json"), text);
      let ok: Method | undefined;
      try {
        ok = readMethod(text, "dam.json");
      } catch (e) {
        expect(e).toBeInstanceOf(Error);
        expect((e as Error).message, text.slice(0, 80)).toMatch(/is not a method file|is not a Cuvette method file|is damaged/);
        expect(() => loadMethod(join(bad, "dam.json"))).toThrow(/dam\.json is/);
      }
      if (ok) {
        methodText(ok);
        methodNote(ok);
        fillFromMethod({ steps: [] } as unknown as AnalysisPlan, ok);
        fillFromMethod({ steps: [{ step: "s", status: "todo", decisions: [{ label: "l" }] }] } as unknown as AnalysisPlan, ok);
        expect(typeof ok.saved).toBe("string");
      }
    }
  });

  test.skipIf(process.platform === "win32" || process.getuid?.() === 0)("a folder that is read-only gives a clear error, and a damaged file in the list does not hide the others", () => {
    const r = new Rng(3);
    saveMethod(method(r, "good-one"));
    writeFileSync(join(methodsDir(), "broken.json"), "{ not json");
    writeFileSync(join(methodsDir(), "empty.json"), "");
    writeFileSync(join(methodsDir(), "null.json"), "null");
    expect(listMethods().map((x) => x.name)).toContain("good-one");
    chmodSync(methodsDir(), 0o555);
    try {
      expect(() => saveMethod(method(r, "new-one"))).toThrow(/Cannot write the method file .*read-only/);
      expect(() => importMethod(join(methodsDir(), "good-one.json"), "other")).toThrow(/Cannot write the method file/);
      expect(loadMethod("good-one").name).toBe("good-one");
    } finally {
      chmodSync(methodsDir(), 0o755);
    }
    const home = join(root, "ro-home");
    mkdirSync(home);
    chmodSync(home, 0o555);
    const was = process.env.CUVETTE_HOME;
    process.env.CUVETTE_HOME = join(home, "inner");
    try {
      expect(() => saveMethod(method(r, "x"))).toThrow(/Cannot write the method file/);
    } finally {
      process.env.CUVETTE_HOME = was;
      chmodSync(home, 0o755);
    }
  });
});
