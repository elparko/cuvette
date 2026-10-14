import { describe, expect, test } from "vitest";
import { normalizeText, resultKey } from "../src/core/loopkey.ts";
import type { ToolOutput } from "../src/core/types.ts";
import { linear as once, Rng, runs } from "./fuzz-rng.ts";

function linear(make: (n: number) => string, run: (s: string) => void, n: number) {
  let res = once(make, run, n);
  for (let k = 0; k < 2 && !res.ok; k++) res = once(make, run, n);
  return res;
}

const WORK = ["/p/out", "/Users/lab user/proj/out", "/home/x/run.1/work", "/data/work-3", "C:\\Users\\lab\\proj\\out"];
const ALNUM = "abcdefghijklmnopqrstuvwxyz0123456789";
const pad = (n: number, w = 2) => String(n).padStart(w, "0");

function time(r: Rng): string {
  const base = `${r.int(2020, 2030)}-${pad(r.int(1, 12))}-${pad(r.int(1, 28))}${r.pick(["T", " "])}${pad(r.int(0, 23))}:${pad(r.int(0, 59))}:${pad(r.int(0, 59))}`;
  const frac = r.bool(0.5) ? `.${r.string("0123456789", 1, 9)}` : "";
  const zone = r.pick(["", "Z", "+05:30", "-08:00", "+0530", "-0800", "+00:00"]);
  return base + frac + zone;
}
function uuid(r: Rng): string {
  const h = (n: number) => r.string("0123456789abcdef", n, n);
  const u = `${h(8)}-${h(4)}-${h(4)}-${h(4)}-${h(12)}`;
  return r.bool(0.3) ? u.toUpperCase() : u;
}
function callId(r: Rng): string {
  return r.pick(["call_", "toolu_"]) + r.string(ALNUM + "ABCDEFGHIJKLMNOPQRSTUVWXYZ", 6, 24);
}
function tmpPath(r: Rng): string {
  const root = r.pick(["/tmp", "/private/tmp", "/var/tmp", "/var/folders/ab/cd12/T", "/private/var/folders/zz/yy/T"]);
  const tail = r.bool(0.7) ? `/${r.string(ALNUM, 3, 8)}.${r.pick(["csv", "png", "py", "txt"])}` : "";
  return `${root}/${r.string(ALNUM, 4, 12)}${tail}`;
}
function windowsTemp(r: Rng): string {
  return `C:\\Users\\lab\\AppData\\Local\\Temp\\${r.string(ALNUM, 4, 10)}\\${r.string(ALNUM, 3, 8)}.csv`;
}
function windowsOther(r: Rng): string {
  const name = `${r.string(ALNUM, 4, 10)}${r.pick(["/", "\\"])}${r.string(ALNUM, 3, 8)}.csv`;
  return r.pick([`C:/Users/lab/AppData/Local/Temp/${name}`, `C:\\Temp\\${name}`, `D:\\temp\\${name}`, `C:\\Users\\lab\\AppData\\Local\\temp\\${name}`, `C:\\Windows\\Temp\\${name}`, `/dev/shm/${name}`]);
}
function workName(pattern: number) {
  return (r: Rng, work: string): string => {
    const sep = work.includes("\\") ? "\\" : "/";
    const n = r.int(1, 999);
    return [`${work}${sep}script-${n}${sep}script.py`, `${work}${sep}script-${n}${sep}t-${n}.csv`, `${work}${sep}fig-${n}.png`, `${work}${sep}table-${n}.csv`, `${work}${sep}run-${n}${sep}x${sep}y-${n}.json`][pattern]!;
  };
}

type Noise = (r: Rng, work: string) => string;
const NOISE: Record<string, Noise> = { time, uuid, callId, tmp: tmpPath, windows: windowsTemp, windowsOther: windowsOther, work0: workName(0), work1: workName(1), work2: workName(2), work3: workName(3), work4: workName(4) };
const NOISE_KEYS = ["duration", "duration_s", "elapsed_s", "timings", "timestamp", "ts", "pid", "started", "finished_at", "job_id", "runId", "call_id", "script", "wall_time", "runtime_s"];

const WORDS = ["rows", "columns", "failed", "done", "running", "queued", "cells", "genes", "p", "n", "mean", "reads", "kept", "dropped"];
const real = (r: Rng): string => r.pick([`${r.pick(WORDS)}=${r.int(0, 99999)}`, `${r.int(0, 999)} ${r.pick(WORDS)}`, `${r.pick(WORDS)} ${r.int(0, 100)} percent`, `p=0.${r.int(1, 999)}`, `${r.pick(WORDS)}: ${r.pick(["ok", "error", "pending", "done"])}`, `/data/sample-${r.int(1, 99)}/reads.fastq`, `/data/run${r.int(1, 99)}.csv`, `step-${r.int(1, 99)} of the job`]);

type Slot = { kind: "real"; text: string } | { kind: "noise"; name: string };

function template(r: Rng): Slot[] {
  return Array.from({ length: r.int(1, 8) }, () => (r.bool(0.45) ? { kind: "noise" as const, name: r.pick(Object.keys(NOISE)) } : { kind: "real" as const, text: real(r) }));
}

function render(slots: Slot[], seed: number, work: string, change?: number): string {
  const r = new Rng(seed);
  return slots.map((s, i) => (s.kind === "noise" ? NOISE[s.name]!(r, work) : i === change ? `${s.text} changed${r.int(0, 9)}` : s.text)).join(" ");
}

interface Shape {
  slots: Slot[][];
  ok: boolean;
  noiseKeys: string[];
  table: number[][];
  names: string[];
}

function shape(r: Rng): Shape {
  return { slots: Array.from({ length: 5 }, () => template(r)), ok: r.bool(0.8), noiseKeys: Array.from({ length: r.int(0, 4) }, () => r.pick(NOISE_KEYS)), table: Array.from({ length: r.int(0, 3) }, () => Array.from({ length: 3 }, () => r.int(0, 1000))), names: Array.from({ length: r.int(0, 3) }, () => `${r.pick(["fig", "table", "result"])}.${r.pick(["png", "csv"])}`) };
}

function build(sh: Shape, seed: number, work: string, change?: { field: number; slot: number }): ToolOutput {
  const at = (field: number) => (change?.field === field ? change.slot : undefined);
  const r = new Rng(seed ^ 0x5bd1e995);
  const noisy = Object.fromEntries(sh.noiseKeys.map((k, i) => [k, r.pick([r.int(0, 99999), time(r), uuid(r), { a: r.int(0, 9) }, [r.int(0, 9)]])]));
  return {
    ok: sh.ok,
    error: sh.ok ? undefined : render(sh.slots[0]!, seed, work, at(0)),
    summary: render(sh.slots[1]!, seed + 1, work, at(1)),
    text: render(sh.slots[2]!, seed + 2, work, at(2)),
    data: { note: render(sh.slots[3]!, seed + 3, work, at(3)), list: [render(sh.slots[4]!, seed + 4, work, at(4))], ...noisy, nested: { ...noisy, value: sh.table.length } },
    metrics: { rows: sh.table.length, first: sh.table[0]?.[0] ?? 0 },
    table: { columns: ["a", "b", "c"], rows: sh.table, n_rows: sh.table.length },
    outputs: sh.names.map((n) => ({ path: `/data/out/${n}`, kind: "file" as const, name: n })),
  };
}

const key = (o: ToolOutput, work: string) => resultKey(o, work);

describe("fuzz: the key of a tool result", () => {
  test("two results that differ only in noise have the same key", () => {
    const r = new Rng(61001);
    for (let i = 0; i < runs(700); i++) {
      const work = r.pick(WORK);
      const sh = shape(r);
      const a = build(sh, r.int(1, 1e9), work);
      const b = build(sh, r.int(1, 1e9), work);
      expect(key(a, work), `${JSON.stringify(a)}\n${JSON.stringify(b)}`).toBe(key(b, work));
    }
  });

  test("a change in a real field gives another key", () => {
    const r = new Rng(61002);
    for (let i = 0; i < runs(700); i++) {
      const work = r.pick(WORK);
      const sh = shape(r);
      const seed = r.int(1, 1e9);
      const field = r.int(sh.ok ? 1 : 0, 4);
      const reals = sh.slots[field]!.flatMap((s, k) => (s.kind === "real" ? [k] : []));
      if (!reals.length) continue;
      const a = build(sh, seed, work);
      const b = build(sh, seed, work, { field, slot: r.pick(reals) });
      expect(key(a, work), `${JSON.stringify(a)}\n${JSON.stringify(b)}`).not.toBe(key(b, work));
    }
  });

  test("a change in the status, the numbers, the table or the output names gives another key", () => {
    const r = new Rng(61003);
    for (let i = 0; i < runs(500); i++) {
      const work = r.pick(WORK);
      const sh = shape(r);
      const seed = r.int(1, 1e9);
      const a = build(sh, seed, work);
      const flipped = build({ ...sh, ok: !sh.ok }, seed, work);
      expect(key(a, work)).not.toBe(key(flipped, work));
      if (sh.table.length) {
        const t = sh.table.map((row) => [...row]);
        const row = r.int(0, t.length - 1);
        t[row]![r.int(0, 2)]! += r.int(1, 5);
        expect(key(a, work)).not.toBe(key(build({ ...sh, table: t }, seed, work), work));
      }
      expect(key(a, work)).not.toBe(key(build({ ...sh, names: [...sh.names, "extra.png"] }, seed, work), work));
      if (sh.names.length) expect(key(a, work)).not.toBe(key(build({ ...sh, names: sh.names.map((n, k) => (k === 0 ? `other-${n}` : n)) }, seed, work), work));
      expect(key(a, work)).not.toBe(key({ ...a, metrics: { ...a.metrics, rows: (a.metrics?.rows ?? 0) + 1 } }, work));
    }
  });

  test("a number that is not finite does not look like another one", () => {
    const keys = [NaN, Infinity, -Infinity, null, 0, "NaN", "Infinity"].map((x) => key({ ok: true, metrics: { x: x as number }, data: { y: [x] } }, "/p/out"));
    expect(new Set(keys).size).toBe(keys.length);
  });

  test("each kind of noise alone is removed from a text", () => {
    const r = new Rng(61004);
    for (const name of Object.keys(NOISE)) {
      for (let i = 0; i < runs(300); i++) {
        const work = r.pick(WORK);
        const make = () => `before ${NOISE[name]!(r, work)} after`;
        const a = make();
        let b = make();
        for (let k = 0; k < 5 && b === a; k++) b = make();
        expect(normalizeText(a, work), `${name}: ${a} | ${b}`).toBe(normalizeText(b, work));
      }
    }
  });

  test("a number next to noise still changes the key", () => {
    const r = new Rng(61005);
    for (let i = 0; i < runs(500); i++) {
      const work = r.pick(WORK);
      const noise = NOISE[r.pick(Object.keys(NOISE))]!;
      const n = r.int(0, 9999);
      const pre = r.pick(["rows=", "n ", "kept: ", "(", "p=0."]);
      const post = r.pick(["", " rows", ")", "."]);
      const text = (v: number) => `${noise(r, work)} ${pre}${v}${post} ${noise(r, work)}`;
      expect(normalizeText(text(n), work), text(n)).not.toBe(normalizeText(text(n + 1), work));
    }
  });

  test("the key takes linear time", () => {
    const work = "/p/out";
    const cases: [string, (n: number) => string][] = [
      ["words", (n) => "rows=12 done ".repeat(n / 13)],
      ["temp paths", (n) => "/tmp/a/b ".repeat(n / 9)],
      ["a long temp path", (n) => "/tmp/" + "a".repeat(n)],
      ["work paths", (n) => `${work}/script-1/a.csv `.repeat(n / 22)],
      ["slashes", (n) => "/".repeat(n)],
      ["dashes and digits", (n) => "a-1".repeat(n / 3)],
      ["dashes in a work path", (n) => `${work}/` + "a-1".repeat(n / 3)],
      ["digits", (n) => "1".repeat(n)],
      ["dates", (n) => "2026-10-14 ".repeat(n / 11)],
      ["almost a date", (n) => "2026-10-14T10:00:0".repeat(n / 17)],
      ["almost a uuid", (n) => "0123456789abcdef-0123-".repeat(n / 22)],
      ["almost a call id", (n) => "call_".repeat(n / 5)],
      ["work folder prefix", (n) => work.repeat(n / work.length)],
      ["windows prefix", (n) => "C:\\a".repeat(n / 4)],
      ["windows temp prefix", (n) => "C:\\Temp\\".repeat(n / 8)],
    ];
    for (const [name, make] of cases) {
      const res = linear(make, (s) => void resultKey({ ok: true, text: s, data: { s } }, work), 20000);
      expect(res.ok, `${name}: ${res.small} ms and ${res.big} ms`).toBe(true);
    }
  });
});
