import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { accessOf } from "../src/adapters/access.ts";
import { Manifest } from "../src/adapters/manifest.ts";
import { readLog } from "../src/core/programs.ts";
import { runTui } from "../src/tui/app.tsx";
import { FakeSession } from "../src/ui/fake-session.ts";
import type { ProgramHooks } from "../src/ui/programs.ts";
import { makeHarness, sleep, until, type Harness } from "../src/tui/testing.ts";

const DOWN = "\x1b[B";
const old = process.env.CUVETTE_HOME;
let home = "";
let live: { h: Harness; done: Promise<void> } | undefined;

beforeEach(() => {
  home = mkdtempSync(join(tmpdir(), "cuvette-home-"));
  process.env.CUVETTE_HOME = home;
});
afterEach(async () => {
  if (live) {
    live.h.type("\x03");
    await sleep(20);
    live.h.type("\x03");
    await Promise.race([live.done, sleep(500)]);
    live = undefined;
  }
  if (old === undefined) delete process.env.CUVETTE_HOME;
  else process.env.CUVETTE_HOME = old;
});

function hooks(exec: ProgramHooks["exec"]): ProgramHooks {
  const py = join(home, "envs", "biostats", "bin", "python");
  mkdirSync(dirname(py), { recursive: true });
  writeFileSync(py, "");
  const m = (name: string, field: string, paths: string[]) => Manifest.parse({ adapter: { name, field }, program: { name: name.toUpperCase() }, connection: { kind: "cli" }, locate: { paths } });
  return {
    home,
    env: {},
    adapters: {
      alpha: { manifest: m("alpha", "statistics", ["~/.cuvette/envs/biostats/bin/python"]), root: "/x/alpha" },
      zeta: { manifest: m("zeta", "microscopy", ["~/.cuvette/envs/cellpose/bin/python"]), root: "/x/zeta" },
    },
    locate: async (mm) => (mm.adapter.name === "alpha" ? { path: py, version: "1.0", how: "path" } : { version: "", how: "not found" }),
    run: async () => ({ code: 0, stdout: "", stderr: "" }),
    find: (n) => (n === "uv" ? "/x/uv" : undefined),
    size: async () => 2048,
    lastUsed: () => new Map(),
    exec,
  };
}

async function key(h: Harness, k: string) {
  h.type(k);
  await sleep(60);
}

async function open(exec: ProgramHooks["exec"]) {
  const h = makeHarness(120, 60);
  const s = new FakeSession({ delayMs: 0 });
  live = { h, done: runTui(s, { stdin: h.stdin, stdout: h.stdout, autoSetup: false, env: {}, programs: hooks(exec) }) };
  await sleep(100);
  await key(h, "/programs");
  await key(h, "\r");
  await until(() => h.last().includes("Enter actions") && h.last().includes("2.0 KB"));
  return { h, s };
}

test("/programs lists the programs by field and turns an adapter off after a confirmation card", async () => {
  const { h, s } = await open(vi.fn(async () => 0));
  const screen = h.last();
  for (const t of ["Programs", "Microscopy", "Statistics", "zeta", "missing", "alpha", "installed", "2 adapters"]) expect(screen).toContain(t);
  await key(h, DOWN);
  await key(h, "\r");
  await until(() => h.last().includes("Turn off"));
  expect(h.last()).toContain("Remove");
  for (let i = 0; i < 6 && !/▸ Turn off/.test(h.last()); i++) {
    const before = h.last();
    await key(h, DOWN);
    await until(() => h.last() !== before);
  }
  await key(h, "\r");
  await until(() => h.last().includes("Nothing changes before you confirm"));
  expect(h.last()).toContain("no session can load it");
  expect(accessOf("alpha").off).toBeUndefined();
  await key(h, "\r");
  await until(() => h.last().includes("alpha is now off"));
  expect(accessOf("alpha").off).toBe(true);
  expect(s.record.entries(["program"]).at(-1)!.data).toMatchObject({ action: "disable", adapter: "alpha", via: "terminal" });
});

test("install shows the command, runs after Enter, and prints the progress", async () => {
  let release = () => {};
  const exec = vi.fn((_c: string, line: (l: string) => void) => {
    line("Resolved 9 packages");
    return new Promise<number>((done) => (release = () => done(0)));
  });
  const { h } = await open(exec);
  await key(h, "\r");
  await until(() => h.last().includes("Install"));
  await key(h, "\r");
  await until(() => h.last().includes("Command: uv venv"));
  expect(exec).not.toHaveBeenCalled();
  await key(h, "\r");
  await until(() => h.last().includes("Resolved 9 packages"));
  release();
  await until(() => h.last().includes("Installed zeta."));
  expect(readLog(home).at(-1)).toMatchObject({ action: "install", adapter: "zeta", ok: true });
});

test("a failure while an install runs shows the message and leaves the busy step", async () => {
  const exec = vi.fn(async () => {
    throw new Error("EACCES: permission denied");
  });
  const { h } = await open(exec);
  await key(h, "\r");
  await until(() => h.last().includes("Install"));
  await key(h, "\r");
  await until(() => h.last().includes("Command: uv venv"));
  await key(h, "\r");
  await until(() => h.last().includes("EACCES: permission denied"));
  expect(h.last()).toContain("Enter actions");
});

test("Esc stops an install that runs, and the screen says so", async () => {
  const exec = vi.fn((_c: string, line: (l: string) => void, signal?: AbortSignal) => {
    line("Resolved 9 packages");
    return new Promise<number | null>((done) => signal?.addEventListener("abort", () => done(null)));
  });
  const { h } = await open(exec);
  await key(h, "\r");
  await until(() => h.last().includes("Install"));
  await key(h, "\r");
  await until(() => h.last().includes("Command: uv venv"));
  await key(h, "\r");
  await until(() => h.last().includes("Resolved 9 packages"));
  expect(h.last()).toContain("Esc stops the install");
  await key(h, "\x1b");
  await until(() => h.last().includes("You stopped the install"));
  expect(h.last()).toContain("Enter actions");
  expect(readLog(home).at(-1)).toMatchObject({ action: "install", adapter: "zeta", ok: false, stopped: true });
});

test("a failure while the plan is prepared shows the message and returns to the list", async () => {
  const base = hooks(vi.fn(async () => 0));
  let armed = false;
  const h = makeHarness(120, 60);
  const s = new FakeSession({ delayMs: 0 });
  live = { h, done: runTui(s, { stdin: h.stdin, stdout: h.stdout, autoSetup: false, env: {}, programs: { ...base, find: (n: string) => { if (armed) throw new Error("EACCES: no access to PATH"); return base.find!(n); } } }) };
  await sleep(100);
  await key(h, "/programs");
  await key(h, "\r");
  await until(() => h.last().includes("Enter actions") && h.last().includes("2.0 KB"));
  armed = true;
  await key(h, "\r");
  await until(() => h.last().includes("Install"));
  await key(h, "\r");
  await until(() => h.last().includes("EACCES: no access to PATH") || h.last().includes("Command: uv venv"));
  expect(h.last()).toContain("EACCES: no access to PATH");
  expect(h.last()).toContain("Enter actions");
});
