import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, test } from "vitest";
import { CATALOG_DIR, loadAdapter } from "../src/adapters/manifest.ts";
import { Rng, runs } from "./fuzz-rng.ts";

const root = mkdtempSync(join(tmpdir(), "cuvette-fuzz-manifest-"));
afterAll(() => rmSync(root, { recursive: true, force: true }));

const SEEDS = readdirSync(CATALOG_DIR)
  .map((d) => join(CATALOG_DIR, d, "adapter.yaml"))
  .filter((p) => existsSync(p))
  .slice(0, 40)
  .map((p) => readFileSync(p, "utf8"));

const JUNK = ["", "null", "~", "[]", "{}", "5", "-1", "1e999", "true", '"x"', "'", '"', "{", "[", "&a x", "*nope", "!!binary aGk=", "!!js/function 'x'", "!custom x", ": :", "- - -", "? x", "|", ">", "\t", "\u0000", "﻿", "日本語", "x".repeat(5000)];

function damage(r: Rng, text: string): string {
  const lines = text.split("\n");
  for (let n = r.int(1, 4); n > 0; n--) {
    const i = r.int(0, Math.max(0, lines.length - 1));
    const k = r.int(0, 7);
    if (k === 0) lines.splice(i, 1);
    else if (k === 1) lines[i] = (lines[i] ?? "").replace(/:\s*(.*)$/, `: ${r.pick(JUNK)}`);
    else if (k === 2) lines[i] = (lines[i] ?? "").slice(0, r.int(0, (lines[i] ?? "").length));
    else if (k === 3) lines.splice(i, 0, `${" ".repeat(r.int(0, 6))}${r.pick(["name", "tools", "kind", "map", "decisions", "x"])}: ${r.pick(JUNK)}`);
    else if (k === 4) lines[i] = `${" ".repeat(r.int(0, 3))}${(lines[i] ?? "").trimStart()}`;
    else if (k === 5) lines.splice(i, 0, ...lines.slice(i, i + r.int(1, 5)));
    else if (k === 6) return text.slice(0, r.int(0, text.length));
    else lines[i] = r.bytes(r.int(1, 30)).toString("latin1");
  }
  return lines.join("\n");
}

const BOMB = `a: &a ["x","x","x","x","x","x","x","x","x"]
b: &b [*a,*a,*a,*a,*a,*a,*a,*a,*a]
c: &c [*b,*b,*b,*b,*b,*b,*b,*b,*b]
d: &d [*c,*c,*c,*c,*c,*c,*c,*c,*c]
e: &e [*d,*d,*d,*d,*d,*d,*d,*d,*d]
f: &f [*e,*e,*e,*e,*e,*e,*e,*e,*e]
g: &g [*f,*f,*f,*f,*f,*f,*f,*f,*f]
h: &h [*g,*g,*g,*g,*g,*g,*g,*g,*g]
adapter: { name: bomb }
program: { name: p, aliases: *h }
connection: { kind: cli }
`;

let n = 0;
function load(text: string): { ok: boolean; message: string; ms: number } {
  const dir = join(root, `a${n++}`);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir);
  writeFileSync(join(dir, "adapter.yaml"), text);
  const t = performance.now();
  try {
    loadAdapter(dir);
    return { ok: true, message: "", ms: performance.now() - t };
  } catch (e) {
    expect(e).toBeInstanceOf(Error);
    return { ok: false, message: (e as Error).message, ms: performance.now() - t };
  }
}

function clear(message: string): void {
  expect(message.length).toBeGreaterThan(10);
  expect(message, message.slice(0, 300)).toMatch(/adapter\.yaml/);
  expect(message.split("\n").length, message.slice(0, 300)).toBeLessThanOrEqual(12);
  expect(message, message.slice(0, 300)).not.toMatch(/^\s*\[\s*\{/);
}

describe("fuzz: adapter.yaml loader", () => {
  test("every catalog adapter.yaml loads", () => {
    expect(SEEDS.length).toBeGreaterThan(5);
    for (const s of SEEDS) expect(load(s).ok).toBe(true);
  });

  test("a damaged adapter.yaml gives a clear error, fast", () => {
    const r = new Rng(13001);
    for (let i = 0; i < runs(200); i++) {
      const res = load(damage(r, r.pick(SEEDS)));
      expect(res.ms).toBeLessThan(1000);
      if (!res.ok) clear(res.message);
    }
  });

  test("an alias bomb, a deep nest and a huge file stop fast with a clear error", () => {
    const cases = [
      BOMB,
      `adapter: { name: deep }\nprogram: { name: p }\nconnection: { kind: cli }\nx: ${"[".repeat(5000)}${"]".repeat(5000)}\n`,
      `adapter: { name: big }\nprogram: { name: p }\nconnection: { kind: cli }\ntools:\n${Array.from({ length: 20000 }, (_, k) => `  - { name: t${k}, description: "${"d".repeat(50)}", bad: 1 }`).join("\n")}\n`,
      `adapter: &x { name: self }\nprogram: { name: p, x: *x }\nconnection: { kind: cli }\n`,
      `adapter:\n  name: m\n  <<: *missing\n`,
      "\u0000\u0001\u0002",
      "",
    ];
    for (const c of cases) {
      const res = load(c);
      expect(res.ms, c.slice(0, 60)).toBeLessThan(2500);
      expect(res.ok, c.slice(0, 60)).toBe(false);
      clear(res.message);
    }
  });
});
