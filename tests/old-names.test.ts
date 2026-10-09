import { spawnSync } from "node:child_process";
import { existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "vitest";
import { addOldEnv, homeFolder, moveOldHome, oldHomePath, readOldEnv } from "../src/core/old-names.ts";

const ROOT = join(__dirname, "..");
const home = () => mkdtempSync(join(tmpdir(), "cuvette-oldnames-"));

test("readOldEnv copies each GA_ name to its CUVETTE_ name", () => {
  const env: NodeJS.ProcessEnv = { GA_HOME: "/old", GA_BUDGET_USD: "5", GA_BENCH_DATA: "/data", PATH: "/bin" };
  readOldEnv(env);
  expect(env.CUVETTE_HOME).toBe("/old");
  expect(env.CUVETTE_BUDGET_USD).toBe("5");
  expect(env.CUVETTE_BENCH_DATA).toBe("/data");
  expect(env.GA_HOME).toBe("/old");
  expect(Object.keys(env).filter((k) => k.startsWith("CUVETTE_"))).toHaveLength(3);
});

test("readOldEnv keeps a CUVETTE_ name that is already set", () => {
  const env: NodeJS.ProcessEnv = { GA_HOME: "/old", CUVETTE_HOME: "/new", CUVETTE_LIVE: "", GA_LIVE: "1" };
  readOldEnv(env);
  expect(env.CUVETTE_HOME).toBe("/new");
  expect(env.CUVETTE_LIVE).toBe("");
});

test("addOldEnv gives a child process both names", () => {
  const env = addOldEnv({ CUVETTE_WORK_DIR: "/w", CUVETTE_ADAPTER_DIR: "/a", CUVETTE_OUTPUT_RESULT: "/w/r.csv", PATH: "/bin" });
  expect(env).toMatchObject({ GA_WORK_DIR: "/w", GA_ADAPTER_DIR: "/a", GA_OUTPUT_RESULT: "/w/r.csv", CUVETTE_WORK_DIR: "/w", PATH: "/bin" });
  expect(env).not.toHaveProperty("GA_PATH");
});

test("moveOldHome moves ~/.guided-analysis to ~/.cuvette once and old sessions still open", () => {
  const h = home();
  const old = join(h, ".guided-analysis");
  mkdirSync(join(old, "sessions", "s1"), { recursive: true });
  writeFileSync(join(old, "sessions", "s1", "log.jsonl"), '{"id":1}\n');

  const msg = moveOldHome(h);
  expect(msg).toContain(join(h, ".cuvette"));
  expect(readFileSync(join(h, ".cuvette", "sessions", "s1", "log.jsonl"), "utf8")).toBe('{"id":1}\n');
  if (process.platform !== "win32") expect(lstatSync(old).isSymbolicLink()).toBe(true);
  expect(readFileSync(join(old, "sessions", "s1", "log.jsonl"), "utf8")).toBe('{"id":1}\n');

  expect(moveOldHome(h)).toBeUndefined();
});

test("after the move the old envs path still resolves through the link", () => {
  const h = home();
  const py = join("envs", "science", "bin", "python");
  mkdirSync(join(h, ".guided-analysis", "envs", "science", "bin"), { recursive: true });
  writeFileSync(join(h, ".guided-analysis", py), "#!/bin/sh\n");
  moveOldHome(h);
  expect(readFileSync(join(h, ".guided-analysis", py), "utf8")).toBe("#!/bin/sh\n");
  expect(readFileSync(join(h, ".cuvette", py), "utf8")).toBe("#!/bin/sh\n");
  expect(homeFolder(h)).toBe(join(h, ".cuvette"));
});

test("before the move, homeFolder and oldHomePath point to the old folder", () => {
  const h = home();
  mkdirSync(join(h, ".guided-analysis", "envs"), { recursive: true });
  expect(homeFolder(h)).toBe(join(h, ".guided-analysis"));
  expect(oldHomePath(join(h, ".cuvette", "envs"), h)).toBe(join(h, ".guided-analysis", "envs"));
  expect(oldHomePath(join(h, ".cuvette", "missing"), h)).toBe(join(h, ".cuvette", "missing"));
  expect(oldHomePath("/usr/bin/python3", h)).toBe("/usr/bin/python3");
  mkdirSync(join(h, ".cuvette"));
  expect(homeFolder(h)).toBe(join(h, ".cuvette"));
});

test("moveOldHome uses ~/.cuvette and does nothing when both folders exist", () => {
  const h = home();
  mkdirSync(join(h, ".guided-analysis", "sessions"), { recursive: true });
  mkdirSync(join(h, ".cuvette"));
  expect(moveOldHome(h)).toBeUndefined();
  expect(existsSync(join(h, ".guided-analysis", "sessions"))).toBe(true);
  expect(existsSync(join(h, ".cuvette", "sessions"))).toBe(false);
});

test("moveOldHome does nothing when there is no old folder", () => {
  const h = home();
  expect(moveOldHome(h)).toBeUndefined();
  expect(existsSync(join(h, ".cuvette"))).toBe(false);
});

function cli(bin: string, args: string[], env: Record<string, string>) {
  const clean = Object.fromEntries(Object.entries(process.env).filter(([k]) => !/^(GA|CUVETTE)_HOME$/.test(k)));
  return spawnSync("node", [join(ROOT, "bin", bin), ...args], { env: { ...clean, ...env }, encoding: "utf8", timeout: 60000 });
}

const SESSION = '{"id":1,"kind":"session","data":{"adapters":[],"model":"m"}}\n';

test("the CLI moves the old home folder at start, and bin/ga.js prints one notice", () => {
  const h = home();
  mkdirSync(join(h, ".guided-analysis", "sessions", "s1"), { recursive: true });
  writeFileSync(join(h, ".guided-analysis", "sessions", "s1", "log.jsonl"), SESSION);
  const r = cli("ga.js", ["sessions"], { HOME: h, USERPROFILE: h });
  expect(r.status).toBe(0);
  expect(r.stderr.trim().split("\n")).toEqual(["The command ga is now cuvette.", expect.stringMatching(/^Moved .*\.guided-analysis to .*\.cuvette\./)]);
  expect(r.stdout).toContain("s1");
  expect(existsSync(join(h, ".cuvette", "sessions", "s1", "log.jsonl"))).toBe(true);

  const again = cli("cuvette.js", ["sessions"], { HOME: h, USERPROFILE: h });
  expect(again.stderr).toBe("");
  expect(again.stdout).toContain("s1");
});

test("the CLI reads GA_HOME when CUVETTE_HOME is not set, and moves nothing", () => {
  const h = home();
  const legacy = join(h, "legacy-home");
  mkdirSync(join(legacy, "sessions", "s2"), { recursive: true });
  writeFileSync(join(legacy, "sessions", "s2", "log.jsonl"), SESSION);
  mkdirSync(join(h, ".guided-analysis"));
  const r = cli("cuvette.js", ["sessions"], { HOME: h, USERPROFILE: h, GA_HOME: legacy });
  expect(r.stdout).toContain("s2");
  expect(r.stderr).toBe("");
  expect(existsSync(join(h, ".guided-analysis"))).toBe(true);
  expect(existsSync(join(h, ".cuvette"))).toBe(false);
});
