import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { DEFAULTS, loadSettings, type Settings } from "../src/core/config.ts";
import { describe as describeSettings, permissionRules, resolve } from "../src/core/settings.ts";
import { trustFolder, untrustFolder } from "../src/core/trust.ts";
import { Rng, runs } from "./fuzz-rng.ts";

const root = mkdtempSync(join(tmpdir(), "cuvette-fuzz-config-"));
const saved = { home: process.env.HOME, cuvette: process.env.CUVETTE_HOME };
beforeAll(() => {
  process.env.HOME = join(root, "home");
  process.env.CUVETTE_HOME = join(root, "cuvette");
  mkdirSync(process.env.CUVETTE_HOME, { recursive: true });
});
afterAll(() => {
  process.env.HOME = saved.home;
  if (saved.cuvette === undefined) delete process.env.CUVETTE_HOME;
  else process.env.CUVETTE_HOME = saved.cuvette;
  rmSync(root, { recursive: true, force: true });
});

const GOOD: Record<string, unknown[]> = {
  model: ["claude", "ollama:q", "openai:u|m"],
  referee: ["same", "none", "claude"],
  mode: ["watch", "follow", "teach", "plan"],
  maxSteps: [1, 5, 90],
  guidance: [true, false],
  autoResume: [true, false],
  effort: ["low", "high", "max"],
  promptCache: ["off", "5m", "1h"],
  numCtx: [4096, 65536],
  think: [true, false],
  toolExposure: ["all", "search", "auto"],
  permissionMode: ["ask", "bypass"],
  messages: ["after-step", "queue"],
  export_xlsx: ["on", "off", true, false],
  show_thinking: ["on", "off", true, false],
  output_folder: ["out", "cuvette", "/abs/path"],
  defaultAdapters: [[], ["a"], ["a", "b"]],
  input_keys: ["mac", "emacs", "vim", "classic"],
  text_style: ["ste", "plain"],
  animations: ["on", "off"],
  footer_hints: ["full", "short", "off"],
  local_model: ["qwen3:8b"],
  phi_check: ["on", "off", true, false],
};
const BAD = [null, 5, -1, 0, "", " ", "bogus", true, false, [], ["x"], {}, { a: 1 }, [1], "Infinity"];
const SAFE = ["animations", "input_keys", "openImages"];
const PHI_ONLY_USER = "phi_check";

const FREE_TEXT = ["model", "referee", "output_folder", "local_model"];

function fits(key: string, v: unknown): boolean {
  if (!Object.hasOwn(GOOD, key)) return true;
  if (["maxSteps", "numCtx"].includes(key)) return typeof v === "number" && Number.isFinite(v) && v > 0;
  if (key === "defaultAdapters") return Array.isArray(v) && v.every((x) => typeof x === "string");
  if (FREE_TEXT.includes(key)) return typeof v === "string" && v.trim() !== "";
  return GOOD[key]!.some((g) => JSON.stringify(g) === JSON.stringify(v));
}

function pickLayer(r: Rng, goodOnly = false): Record<string, unknown> {
  const layer: Record<string, unknown> = {};
  for (const key of Object.keys(GOOD)) {
    if (!r.bool(0.25)) continue;
    layer[key] = !goodOnly && r.bool(0.35) ? r.pick(BAD) : r.pick(GOOD[key]!);
  }
  if (r.bool(0.3)) layer.permissions = Object.fromEntries(Array.from({ length: r.int(0, 3) }, () => [r.pick(["Bash", "run_*", "count:*", "x"]), r.pick(["allow", "ask", "deny", "maybe", 5, null])]));
  if (r.bool(0.2)) layer.notify = { ntfy: r.pick(["topic", "t2"]) };
  if (r.bool(0.1)) layer.unknown_key = r.pick(BAD);
  if (r.bool(0.05)) Object.assign(layer, { constructor: r.pick(BAD) });
  return layer;
}

function expectedFor(layers: { layer: Record<string, unknown>; safeOnly: boolean; user: boolean }[], overrides: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...(DEFAULTS as unknown as Record<string, unknown>) };
  const rules: Record<string, unknown> = {};
  for (const { layer, safeOnly, user } of layers) {
    for (const [k, v] of Object.entries(layer)) {
      if (safeOnly && !SAFE.includes(k)) continue;
      if (k === PHI_ONLY_USER && !user) continue;
      if (k === "permissions") {
        for (const [p, rule] of Object.entries(v as object)) if (["allow", "ask", "deny"].includes(rule as string)) rules[p] = rule;
        continue;
      }
      if (k === "notify") {
        out.notify = { ...(out.notify as object), ...(v as object) };
        continue;
      }
      if (k === "constructor" || k === "unknown_key") continue;
      if (fits(k, v)) out[k] = v;
    }
  }
  for (const [k, v] of Object.entries(overrides)) out[k] = v;
  out.permissions = rules;
  return out;
}

let dirs = 0;

function setup(r: Rng): { cwd: string; layers: { layer: Record<string, unknown>; safeOnly: boolean; user: boolean }[]; trusted: boolean } {
  const n = dirs++;
  const cwd = join(root, `p${n}`);
  mkdirSync(cwd, { recursive: true });
  const trusted = r.bool();
  const layers: { layer: Record<string, unknown>; safeOnly: boolean; user: boolean }[] = [];
  const empty = r.bool(0.1);
  const user = empty || r.bool(0.2) ? {} : pickLayer(r);
  writeFileSync(join(process.env.CUVETTE_HOME!, "settings.json"), empty ? "" : JSON.stringify(user));
  layers.push({ layer: user, safeOnly: false, user: true });
  for (const dir of [".ga", ".cuvette"])
    for (const file of ["settings.json", "settings.local.json"]) {
      if (!r.bool(0.35)) continue;
      const layer = pickLayer(r);
      mkdirSync(join(cwd, dir), { recursive: true });
      writeFileSync(join(cwd, dir, file), JSON.stringify(layer));
      layers.push({ layer, safeOnly: !trusted, user: false });
    }
  if (trusted) trustFolder(cwd);
  else untrustFolder(cwd);
  return { cwd, layers, trusted };
}

describe("fuzz: the settings layers", () => {
  test("the user, project and command line layers apply in order, and a wrong value is ignored with a note", () => {
    for (let seed = 1; seed <= runs(120); seed++) {
      const r = new Rng(seed);
      const { cwd, layers } = setup(r);
      const overrides: Record<string, unknown> = {};
      for (const key of ["model", "maxSteps", "mode", "permissionMode"]) if (r.bool(0.3)) overrides[key] = r.pick(GOOD[key]!);
      if (r.bool(0.2)) overrides.model = undefined;
      const notes: string[] = [];
      const got = loadSettings(cwd, overrides as Partial<Settings>, notes) as unknown as Record<string, unknown>;
      const want = expectedFor(layers, Object.fromEntries(Object.entries(overrides).filter(([, v]) => v !== undefined)));
      for (const key of Object.keys(want)) expect(got[key], `seed ${seed}: ${key} ${JSON.stringify(layers)}`).toEqual(want[key]);
      let count = 0;
      for (const { layer, safeOnly } of layers)
        for (const [k, v] of Object.entries(layer)) {
          if (safeOnly && !SAFE.includes(k)) continue;
          if (k === "permissions") count += Object.values(v as object).filter((rule) => !["allow", "ask", "deny"].includes(rule as string)).length;
          else if (!fits(k, v)) count++;
        }
      expect(notes.length, `seed ${seed}: ${notes.join(" | ")}`).toBe(count);
      for (const note of notes) expect(note).toMatch(/must be .*Cuvette ignores/);
    }
  });

  test("an unknown key or a key with a strange value does not stop the load", () => {
    const home = process.env.CUVETTE_HOME!;
    const cwd = join(root, "unknown");
    mkdirSync(cwd, { recursive: true });
    const bodies = ['{"__proto__":{"x":1}}', '{"constructor":{"prototype":{"y":1}}}', '{"unknown":{"a":[1,2,{"b":null}]}}', '{"hooks":5,"notify":[],"permissions":{"__proto__":"allow"}}', '{"permissions":{"a":{"b":1}}}', '{"mode":["watch"]}', '{"a":1e999}'];
    for (const body of bodies) {
      writeFileSync(join(home, "settings.json"), body);
      const notes: string[] = [];
      const s = loadSettings(cwd, {}, notes);
      expect(s.mode).toBe("watch");
      expect((s as unknown as Record<string, unknown>).x).toBeUndefined();
      expect(({} as Record<string, unknown>).x).toBeUndefined();
      expect(({} as Record<string, unknown>).y).toBeUndefined();
    }
  });

  test("the settings panel shows the value that the loader uses", () => {
    for (let seed = 1; seed <= runs(60); seed++) {
      const r = new Rng(seed + 800);
      const { cwd } = setup(r);
      const loaded = loadSettings(cwd) as unknown as Record<string, unknown>;
      for (const row of describeSettings({ cwd })) {
        const name = row.def.name;
        if (!Object.hasOwn(GOOD, name) || row.def.read || name === PHI_ONLY_USER || loaded[name] === undefined) continue;
        const v = resolve(row.def, { cwd }).value;
        expect(JSON.stringify(v), `seed ${seed}: ${name}`).toBe(JSON.stringify(loaded[name]));
      }
      const rules = Object.fromEntries(permissionRules(cwd).map((x) => [x.pattern, x.rule]));
      expect(rules, `seed ${seed}: rules`).toEqual(loaded.permissions);
    }
  });

  test("a user settings file that is damaged stays as it is when a folder is trusted", () => {
    const file = join(process.env.CUVETTE_HOME!, "settings.json");
    const cwd = join(root, "damaged");
    mkdirSync(join(cwd, ".cuvette"), { recursive: true });
    writeFileSync(join(cwd, ".cuvette", "settings.json"), JSON.stringify({ mode: "plan" }));
    for (const body of ['{"model": "claude",}', "[1]", "null", '{"model":']) {
      writeFileSync(file, body);
      expect(() => trustFolder(cwd)).toThrow(/settings file .* (is not valid JSON|must hold one JSON object)/);
      expect(readFileSync(file, "utf8")).toBe(body);
      expect(() => untrustFolder(cwd)).not.toThrow();
    }
    writeFileSync(file, "");
    trustFolder(cwd);
    expect(JSON.parse(readFileSync(file, "utf8")).trusted_folders).toHaveLength(1);
  });
});
