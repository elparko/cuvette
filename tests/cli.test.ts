import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, expect, test } from "vitest";
import { TSX_CLI } from "../src/adapters/kinds/common.ts";

const CUVETTE = join(__dirname, "..", "bin/cuvette.js");
let root = "";
let project = "";
let data = "";

function home(settings?: Record<string, unknown>): string {
  const h = mkdtempSync(join(root, "home-"));
  cpSync(join(__dirname, "fixtures", "drive"), join(h, "adapters", "drivefix"), { recursive: true });
  if (settings) writeFileSync(join(h, "settings.json"), JSON.stringify(settings));
  return h;
}

function cli(h: string, args: string[], cwd = project) {
  const r = spawnSync("node", [CUVETTE, ...args], { cwd, env: { ...process.env, CUVETTE_HOME: h, CUVETTE_NO_OPEN: "1", ANTHROPIC_API_KEY: "" }, encoding: "utf8", timeout: 60_000 });
  return { code: r.status, out: r.stdout, err: r.stderr };
}

function fake(name: string, script: unknown): string {
  const p = join(root, `${name}.json`);
  writeFileSync(p, JSON.stringify(script));
  return `fake:${p}`;
}

const headless = (h: string, model: string) => cli(h, ["-p", "Give the mean of x", "--adapter", "drivefix", "--model", model, "--trust-folder", "--output", "json"]);

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), "cuvette-cli-"));
  project = join(root, "project");
  mkdirSync(project);
  data = join(project, "a.csv");
  writeFileSync(data, "x,y\n1,10\n2,20\n3,30\n4,40\n");
});

afterAll(() => rmSync(root, { recursive: true, force: true }));

test("a run with an answer exits 0, and its script, flow and replay give the same numbers", () => {
  const h = home();
  const model = fake("answer", [{ calls: [{ name: "mean_of", args: { path: data, column: "x" } }] }, { calls: [{ name: "count_rows", args: { path: data } }] }, { text: "The mean of x is 2.5 over 4 rows." }]);
  const run = headless(h, model);
  expect(run.code, run.err).toBe(0);
  const out = JSON.parse(run.out);
  expect(out.stop).toBe("answer");
  const script = cli(h, ["export", out.session, "--format", "script"]).out.trim();
  expect(script).toMatch(/replay\.mts$/);
  const ran = spawnSync("node", [TSX_CLI, script], { cwd: tmpdir(), env: { ...process.env, CUVETTE_HOME: h }, encoding: "utf8" });
  expect(ran.status, ran.stderr).toBe(0);
  expect(ran.stdout).toBe('Step 1 mean_of: {"mean":2.5}\nStep 2 count_rows: {"n_rows":4}\n');
  const flow = cli(h, ["export", out.session, "--format", "flow"]).out.trim();
  expect(JSON.parse(readFileSync(flow, "utf8")).inputs).toEqual({ input_1: data });
  const same = cli(h, ["replay", flow, "--input", `input_1=${data}`, "--session", out.session]);
  expect(same.code, same.err).toBe(0);
  expect(same.out).toBe("● mean_of same\n● count_rows same\n");
  const other = join(root, "b.csv");
  writeFileSync(other, "x,y\n1,1\n5,2\n");
  const diff = cli(h, ["replay", flow, "--input", `input_1=${other}`, "--session", out.session]);
  expect(diff.code).toBe(1);
  expect(diff.out).toBe("● mean_of differs: mean: was 2.5, now 3\n● count_rows differs: n_rows: was 4, now 2\n");
  const alone = cli(h, ["replay", flow, "--input", `input_1=${other}`]);
  expect(alone.code).toBe(0);
  expect(alone.out).toContain('● mean_of ran, no original to compare: {"mean":3}');
  const missing = cli(h, ["replay", flow]);
  expect(missing.code).toBe(1);
  expect(missing.err).toContain("no input given for input_1");
});

test("a script stops with exit code 1 at a failed step", () => {
  const h = home();
  const model = fake("answer2", [{ calls: [{ name: "mean_of", args: { path: data, column: "x" } }] }, { text: "The mean of x is 2.5." }]);
  const out = JSON.parse(headless(h, model).out);
  const script = cli(h, ["export", out.session, "--format", "script"]).out.trim();
  writeFileSync(script, readFileSync(script, "utf8").replace(`"column": "x"`, `"column": "nope"`));
  const ran = spawnSync("node", [TSX_CLI, script], { cwd: tmpdir(), env: { ...process.env, CUVETTE_HOME: h }, encoding: "utf8" });
  expect(ran.status).toBe(1);
  expect(ran.stdout).toContain("Step 1 mean_of: failed: no column nope");
});

test("headless: the step limit and a model error exit 1, with the reason in the JSON", () => {
  const loop = headless(home({ maxSteps: 2 }), fake("loop", Array.from({ length: 5 }, (_, i) => ({ calls: [{ name: "count_rows", args: { path: data, n: i } }] }))));
  expect(loop.code).toBe(1);
  expect(JSON.parse(loop.out).stop).toBe("max_steps");
  const broken = headless(home(), fake("broken", {}));
  expect(broken.code).toBe(1);
  expect(JSON.parse(broken.out).stop).toBe("error");
});

test("run-step exits 0 on a good step and 1 on a failed step, a missing tool or bad JSON", () => {
  const h = home();
  const good = cli(h, ["run-step", "drivefix", "mean_of", JSON.stringify({ path: data, column: "y" })]);
  expect(good.code, good.err).toBe(0);
  expect(JSON.parse(good.out).metrics).toEqual({ mean: 25 });
  const failed = cli(h, ["run-step", "drivefix", "mean_of", JSON.stringify({ path: data, column: "z" })]);
  expect(failed.code).toBe(1);
  expect(JSON.parse(failed.out).error).toContain("no column z");
  const tool = cli(h, ["run-step", "drivefix", "nope", "{}"]);
  expect(tool.code).toBe(1);
  expect(JSON.parse(tool.out).error).toBe('no tool "nope" in adapter "drivefix"');
  const json = cli(h, ["run-step", "drivefix", "mean_of", "{bad"]);
  expect(json.code).toBe(1);
  expect(json.err).toContain("not valid JSON");
  const adapter = cli(h, ["run-step", "nosuch", "mean_of", "{}"]);
  expect(adapter.code).toBe(1);
  expect(adapter.err).toContain('no adapter named "nosuch"');
});

test("run-step and replay do not start an adapter that is turned off in Programs", () => {
  const h = home({ programs: { drivefix: { off: true } } });
  const r = cli(h, ["run-step", "drivefix", "mean_of", JSON.stringify({ path: data, column: "y" })]);
  expect(r.code).toBe(1);
  expect(r.err).toContain("turned off in Programs");
});

test("bench checks its arguments before any model call", () => {
  const h = home();
  const runs = cli(h, ["bench", "papers", "--models", "fake:x", "--runs", "two"]);
  expect(runs.code).toBe(1);
  expect(runs.err).toContain('--runs must be a whole number of 1 or more, not "two"');
  expect(cli(h, ["bench", "papers", "--models", "fake:x", "--runs", "0"]).code).toBe(1);
  const guidance = cli(h, ["bench", "--model", "fake:x", "--guidance", "maybe"]);
  expect(guidance.code).toBe(1);
  expect(guidance.err).toContain('--guidance must be on, off or both, not "maybe"');
  const scenario = cli(h, ["bench", "no-such-scenario", "--model", "fake:x"]);
  expect(scenario.code).toBe(1);
  expect(scenario.err).toContain("No scenario no-such-scenario.");
  expect(cli(h, ["bench", "papers"]).code).toBe(1);
  expect(cli(h, ["bench", "compare", "--results", "a.json"]).code).toBe(1);
  expect(cli(h, ["bench", "site", "--results", "a.json"]).code).toBe(1);
});
