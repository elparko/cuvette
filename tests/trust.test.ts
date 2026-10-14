import { spawn, spawnSync } from "node:child_process";
import { existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, renameSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { CATALOG_DIR, adapterDirs, findAdapter } from "../src/adapters/manifest.ts";
import { accessOf } from "../src/adapters/access.ts";
import { runPapers } from "../src/bench/papers.ts";
import { loadSettings } from "../src/core/config.ts";
import { Session } from "../src/core/session.ts";
import { runScriptTool } from "../src/tools/run_script.ts";
import { describe as describeSettings, changeSetting } from "../src/core/settings.ts";
import { scanFolder, trustedFolders, trustFolder, trustStatus, TRUST_TITLE, untrustFolder } from "../src/core/trust.ts";
import { commands } from "../src/ui/commands.ts";
import { FakeProvider } from "../src/providers/fake.ts";

const seen = vi.hoisted(() => [] as { spec: string; opts: Record<string, unknown> }[]);
vi.mock("../src/providers/index.ts", async (orig) => {
  const m = await orig<typeof import("../src/providers/index.ts")>();
  return { ...m, makeProvider: async (spec: string, opts: Record<string, unknown> = {}) => (seen.push({ spec, opts }), m.makeProvider(spec, opts as never)) };
});

const oldHome = process.env.CUVETTE_HOME;
let home = "";
let cwd = "";
let session: Session | undefined;

beforeEach(() => {
  home = mkdtempSync(join(tmpdir(), "cuvette-trust-home-"));
  process.env.CUVETTE_HOME = home;
  writeFileSync(join(home, "settings.json"), JSON.stringify({ defaultAdapters: [] }));
  cwd = mkdtempSync(join(tmpdir(), "cuvette-trust-"));
});
afterEach(async () => {
  await session?.close();
  session = undefined;
  if (oldHome === undefined) delete process.env.CUVETTE_HOME;
  else process.env.CUVETTE_HOME = oldHome;
});

function project(dir: string, settings: Record<string, unknown>, file = "settings.json", root = cwd) {
  mkdirSync(join(root, dir), { recursive: true });
  writeFileSync(join(root, dir, file), JSON.stringify(settings));
}

const hook = (name: string) => ({ hooks: { SessionStart: [{ command: ["sh", "-c", `touch ${name}`] }] } });

function shadowAdapter(dir = ".ga") {
  const a = join(cwd, dir, "adapters", "biostats");
  mkdirSync(a, { recursive: true });
  writeFileSync(join(a, "adapter.yaml"), readFileSync(join(CATALOG_DIR, "biostats", "adapter.yaml"), "utf8"));
  writeFileSync(join(a, "evil.ts"), "export default {}");
}

const start = (interactive = false, extra: Record<string, unknown> = {}) =>
  Session.create({ adapters: [], provider: new FakeProvider([{ text: "ok" }]), cwd, interactive, settings: { guidance: false, referee: "none" }, ...extra });

test("an untrusted folder: the hook does not run, bypass is not applied, the shadow adapter is not loaded", async () => {
  project(".ga", { ...hook("ran"), permissions: "bypass", model: "claude:x", animations: "off" });
  shadowAdapter();
  expect(loadSettings(cwd)).toMatchObject({ permissionMode: "ask", model: "claude", animations: "off", hooks: {} });
  expect(findAdapter("biostats", cwd).root).toBe(join(CATALOG_DIR, "biostats"));
  expect(findAdapter(join(cwd, ".cuvette", "adapters", "biostats"), cwd).root).toBe(join(CATALOG_DIR, "biostats"));
  session = await start();
  expect(existsSync(join(cwd, "ran"))).toBe(false);
  expect(session.permissionMode).toBe("ask");
  expect(session.trustNotice).toMatch(/^Cuvette ignored the settings, hooks and adapters in .*: the folder is not trusted\. Use --trust-folder, or cuvette trust add /);
  expect(session.record.entries(["notice"]).map((e) => e.data.text)).toContain(session.trustNotice);
  const scan = scanFolder(cwd);
  expect(scan.adapters).toEqual([{ name: "biostats", replaces: "the catalog adapter biostats" }]);
  expect(scan.bypass).toBe(true);
  expect(scan.keys.sort()).toEqual(["hooks", "model", "permissionMode"]);
});

test("a program path from an untrusted folder is ignored", () => {
  project(".ga", { programs: { biostats: { path: "/tmp/evil", code: true } } });
  expect(accessOf("biostats", cwd)).toEqual({});
  trustFolder(cwd);
  expect(accessOf("biostats", cwd)).toEqual({ path: "/tmp/evil", code: true });
});

test("the .cuvette folder is covered in the same way", async () => {
  project(".cuvette", { ...hook("ran2"), permissions: "bypass" }, "settings.local.json");
  shadowAdapter(".cuvette");
  expect(loadSettings(cwd).permissionMode).toBe("ask");
  expect(findAdapter("biostats", cwd).root).toBe(join(CATALOG_DIR, "biostats"));
  trustFolder(cwd);
  expect(loadSettings(cwd).permissionMode).toBe("bypass");
  expect(findAdapter("biostats", cwd).root).toBe(join(cwd, ".cuvette", "adapters", "biostats"));
});

test("only display settings: no card, and they apply", async () => {
  project(".ga", { animations: "off", input_keys: "vim" });
  expect(trustStatus(cwd).state).toBe("none");
  expect(loadSettings(cwd)).toMatchObject({ animations: "off", input_keys: "vim" });
  session = await start(true);
  expect(session.questions.open()).toEqual([]);
});

test("the trust card shows the folder, the keys, each hook in full, the adapters and bypass; trust once applies for this session only", async () => {
  project(".ga", { ...hook("ran"), permissions: "bypass", model: "claude:x" });
  shadowAdapter();
  session = await start(true);
  const q = session.questions.open().find((x) => x.title === TRUST_TITLE)!;
  expect(q.text).toContain(scanFolder(cwd).folder);
  expect(q.options.map((o) => o.label)).toEqual(["Trust this folder", "Trust once (this session)", "Do not trust (the session runs with user settings only)"]);
  expect(q.evidence).toContain("Settings that would change:\n");
  expect(q.evidence).toContain('  model: claude:x');
  expect(q.evidence).toContain("Bypass permissions: ON.");
  expect(q.evidence).toContain("  SessionStart: sh -c \"touch ran\"");
  expect(q.evidence).toContain("  biostats: replaces the catalog adapter biostats");
  expect(existsSync(join(cwd, "ran"))).toBe(false);
  await session.answer(q.qid, "once");
  expect(existsSync(join(cwd, "ran"))).toBe(true);
  expect(session.permissionMode).toBe("bypass");
  expect(trustStatus(cwd).state).toBe("once");
  expect(trustedFolders()).toEqual([]);
  expect(session.record.entries(["trust"]).map((e) => e.data.choice)).toEqual(["once"]);
  await session.close();
  session = undefined;
  expect(trustStatus(cwd).state).toBe("new");
});

test("a SessionStart hook of a folder that the scientist trusts in the session shows its error as a notice", async () => {
  project(".ga", { hooks: { SessionStart: [{ command: ["sh", "-c", "echo not json"] }] } });
  session = await start(true);
  const q = session.questions.open().find((x) => x.title === TRUST_TITLE)!;
  await session.answer(q.qid, "once");
  expect(session.record.entries(["notice"]).map((e) => String(e.data.text))).toContainEqual(expect.stringMatching(/gave output that is not JSON: not json/));
});

test("do not trust: the session keeps user settings only", async () => {
  project(".ga", { ...hook("ran"), permissions: "bypass" });
  session = await start(true);
  const q = session.questions.open()[0]!;
  await session.answer(q.qid, 3);
  expect(existsSync(join(cwd, "ran"))).toBe(false);
  expect(session.permissionMode).toBe("ask");
  expect(trustStatus(cwd).state).toBe("new");
});

test("trust is stored with a hash, and a changed file asks again and shows what changed", async () => {
  project(".ga", { model: "claude:x" });
  session = await start(true);
  await session.answer(session.questions.open()[0]!.qid, "trust");
  const [e] = trustedFolders();
  expect(e).toMatchObject({ path: scanFolder(cwd).folder, hash: scanFolder(cwd).hash, keys: ["model"] });
  expect(JSON.parse(readFileSync(join(home, "settings.json"), "utf8")).trusted_folders).toHaveLength(1);
  await session.close();
  session = await start(true);
  expect(session.questions.open()).toEqual([]);
  expect(session.settings.model).toBe("claude:x");
  await session.close();

  project(".ga", { model: "claude:x", ...hook("ran") });
  const t = trustStatus(cwd);
  expect(t.state).toBe("changed");
  expect(t.changes).toEqual(["new settings key: hooks", 'new hook: SessionStart: sh -c "touch ran"', "changed file: .ga/settings.json"]);
  session = await start(true);
  const q = session.questions.open()[0]!;
  expect(q.text).toMatch(/changed after you trusted this folder/);
  expect(q.evidence).toContain("Changes since you trusted the folder:\n  new settings key: hooks");
  expect(existsSync(join(cwd, "ran"))).toBe(false);
  expect(session.settings.hooks).toEqual({});
});

test("a project setting that the scientist saves keeps a trusted folder trusted", async () => {
  project(".ga", { model: "claude:x" });
  trustFolder(cwd);
  await changeSetting({ cwd }, "referee", "none", "project");
  expect(trustStatus(cwd).state).toBe("trusted");
  untrustFolder(cwd);
  await expect(changeSetting({ cwd }, "referee", "same", "project")).resolves.toMatchObject({ note: expect.stringMatching(/not trusted/) });
});

test("--trust-folder trusts the folder for one session", async () => {
  project(".ga", { ...hook("ran"), permissions: "bypass" });
  session = await start(false, { trustFolder: true });
  expect(existsSync(join(cwd, "ran"))).toBe(true);
  expect(session.permissionMode).toBe("bypass");
  expect(session.trustNotice).toBeUndefined();
  await session.close();
  session = undefined;
  expect(trustStatus(cwd).state).toBe("new");
});

test("the Folder trust row and /trust", async () => {
  project(".ga", { ...hook("ran") });
  const row = describeSettings({ cwd, env: {} }).find((r) => r.def.name === "folder_trust")!;
  expect(row).toMatchObject({ value: "not trusted" });
  expect(row.def.details!({ cwd }).join("\n")).toContain('SessionStart: sh -c "touch ran"');
  await changeSetting({ cwd }, "folder_trust", "trusted", "user");
  expect(trustStatus(cwd).state).toBe("trusted");
  await changeSetting({ cwd }, "folder_trust", "not trusted", "user");
  expect(trustStatus(cwd).state).toBe("new");

  session = await start(true);
  const printed: string[] = [];
  const ctx = { session, print: (t: string) => printed.push(t), notice: (t: string) => printed.push(t), error: (t: string) => printed.push(t), refresh() {}, hasQuestionCard: () => true, openCard() {} } as never;
  const trust = commands.find((c) => c.name === "trust")!;
  await trust.run([], ctx);
  expect(printed[0]).toContain("Trust: not trusted");
  await trust.run(["on"], ctx);
  expect(printed[1]).toMatch(/This folder is trusted/);
  expect(existsSync(join(cwd, "ran"))).toBe(true);
  expect(trustStatus(cwd).state).toBe("trusted");
});

const cuvette = join(__dirname, "..", "bin/cuvette.js");
const cli = (args: string[]) =>
  new Promise<{ stdout: string; stderr: string }>((resolve) => {
    const child = spawn("node", [cuvette, ...args], { cwd, env: { ...process.env, CUVETTE_HOME: home, CUVETTE_NO_OPEN: "1" } });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => (stdout += d));
    child.stderr.on("data", (d) => (stderr += d));
    child.on("close", () => resolve({ stdout, stderr }));
    child.stdin.end();
  });

test("headless: an untrusted folder is ignored with a one-line notice; --trust-folder uses it", async () => {
  project(".ga", { ...hook("ran"), referee: "none" });
  const a = await cli(["-p", "hello", "--model", "fake:"]);
  expect(a.stderr.split("\n").filter((l) => l.includes("Cuvette ignored"))).toHaveLength(1);
  expect(existsSync(join(cwd, "ran"))).toBe(false);
  const b = await cli(["-p", "hello", "--model", "fake:", "--trust-folder"]);
  expect(b.stderr).not.toContain("Cuvette ignored");
  expect(existsSync(join(cwd, "ran"))).toBe(true);
  const list = await cli(["trust", "add", cwd]);
  expect(list.stdout).toContain("Trusted ");
  expect((await cli(["trust", "list"])).stdout).toContain(`${scanFolder(cwd).folder}  trusted`);
}, 120000);

test("the benchmark runner trusts its own checkout and passes think=true to the model", async () => {
  const root = mkdtempSync(join(tmpdir(), "cuvette-trust-bench-"));
  const checkout = join(root, "checkout");
  project(".ga", { think: true }, "settings.local.json", checkout);
  const papersDir = join(root, "papers");
  mkdirSync(join(papersDir, "lab-count"), { recursive: true });
  mkdirSync(join(root, "data/lab"), { recursive: true });
  writeFileSync(join(root, "data/lab/a.tif"), "x");
  writeFileSync(
    join(papersDir, "lab-count", "bench.yaml"),
    JSON.stringify({ adapters: [join(__dirname, "fixtures/lab")], prompt: "Count {data}/lab/a.tif.", data: ["lab/a.tif"], timeout_s: 60, items: [{ key: "count", description: "n", value: 66, exact: true }] }),
  );
  const oldData = process.env.CUVETTE_BENCH_DATA;
  process.env.CUVETTE_BENCH_DATA = join(root, "data");
  const lines: string[] = [];
  seen.length = 0;
  try {
    const r = await runPapers({ papers: ["lab-count"], models: ["fake:"], papersDir, scratch: join(root, "scratch"), resultsDir: join(root, "results"), checkout, log: (l) => lines.push(l) });
    expect(r.modelOptions).toEqual({ think: true });
    expect(r.runs[0]!.error ?? "").not.toMatch(/think/);
  } finally {
    if (oldData === undefined) delete process.env.CUVETTE_BENCH_DATA;
    else process.env.CUVETTE_BENCH_DATA = oldData;
  }
  expect(seen.find((s) => s.spec === "fake:")?.opts.think).toBe(true);
  expect(lines[0]).toContain("think=true");
  expect(trustStatus(checkout).state).toBe("new");
});


const sandboxWorks = process.platform === "darwin" && spawnSync("/usr/bin/sandbox-exec", ["-p", "(version 1)(allow default)", "/usr/bin/true"]).status === 0;

function trustedProject() {
  const root = realpathSync(cwd);
  const adapter = join(root, ".cuvette", "adapters", "x");
  mkdirSync(adapter, { recursive: true });
  writeFileSync(join(adapter, "adapter.yaml"), "adapter: { name: x }\n");
  const out = join(root, "cuvette", "mine");
  mkdirSync(join(out, ".record"), { recursive: true });
  trustFolder(root);
  const dirs = { workDir: out, sessionDir: join(out, ".record"), projectDir: root };
  const tool = runScriptTool(dirs, { network: false });
  const run = (code: string) => tool.execute({ purpose: "Test", does: "Runs a test.", code }, { session: "s", callId: "c", workDir: out, sessionDir: dirs.sessionDir, signal: new AbortController().signal, log: () => ({}) as never, callTool: async () => ({ ok: true }) });
  return { root, adapter, run };
}

test("a normal adapter in a trusted project folder still loads", () => {
  const p = trustedProject();
  expect(trustStatus(p.root).state).toBe("trusted");
  expect(adapterDirs(p.root).x).toBe(p.adapter);
});

test("a script that writes a new file under the adapters folder makes the folder changed", async () => {
  const p = trustedProject();
  const r = await p.run(`import os\nos.makedirs(${JSON.stringify(join(p.adapter, "skills"))}, exist_ok=True)\nopen(${JSON.stringify(join(p.adapter, "skills", "evil.md"))}, 'w').write('x')\nopen(${JSON.stringify(join(p.adapter, "run.sh"))}, 'w').write('x')`);
  expect(r.error).toBeUndefined();
  const s = trustStatus(p.root);
  expect(s.state).toBe("changed");
  expect(s.changes).toEqual(expect.arrayContaining([expect.stringContaining("new file: .cuvette/adapters/x/run.sh"), expect.stringContaining("new file: .cuvette/adapters/x/skills/evil.md")]));
  expect(adapterDirs(p.root).x).toBeUndefined();
});

test("a new skills folder of the project settings counts in the trust hash", () => {
  const p = trustedProject();
  mkdirSync(join(p.root, ".cuvette", "skills"));
  writeFileSync(join(p.root, ".cuvette", "skills", "s.md"), "x");
  expect(trustStatus(p.root).state).toBe("changed");
});

test.skipIf(!sandboxWorks)("on the real macOS sandbox, a script cannot replace the adapters folder with a link", async () => {
  const p = trustedProject();
  const other = join(realpathSync(mkdtempSync(join(tmpdir(), "cuvette-evil-"))), "adapters");
  mkdirSync(join(other, "evil"), { recursive: true });
  writeFileSync(join(other, "evil", "adapter.yaml"), "adapter: { name: evil }\n");
  const folder = join(p.root, ".cuvette", "adapters");
  const move = `import os, shutil\nshutil.move(${JSON.stringify(folder)}, ${JSON.stringify(folder + "-old")})\nos.symlink(${JSON.stringify(other)}, ${JSON.stringify(folder)})`;
  expect((await p.run(move)).ok).toBe(false);
  expect(lstatSync(folder).isSymbolicLink()).toBe(false);
  expect(trustStatus(p.root).state).toBe("trusted");
  expect(adapterDirs(p.root).evil).toBeUndefined();
  expect(adapterDirs(p.root).x).toBe(p.adapter);
  const remove = `import os, shutil\nshutil.rmtree(${JSON.stringify(folder)})\nos.symlink(${JSON.stringify(other)}, ${JSON.stringify(folder)})`;
  expect((await p.run(remove)).ok).toBe(false);
  expect(lstatSync(folder).isSymbolicLink()).toBe(false);
  expect(adapterDirs(p.root).evil).toBeUndefined();
});

test.skipIf(process.platform === "win32")("a linked adapters folder is not loaded and the folder is not trusted, where no sandbox stops the link", () => {
  const p = trustedProject();
  const other = join(realpathSync(mkdtempSync(join(tmpdir(), "cuvette-evil-"))), "adapters");
  mkdirSync(join(other, "evil"), { recursive: true });
  writeFileSync(join(other, "evil", "adapter.yaml"), "adapter: { name: evil }\n");
  const folder = join(p.root, ".cuvette", "adapters");
  mkdirSync(join(p.root, "moved"));
  renameSync(folder, join(p.root, "moved", "adapters"));
  symlinkSync(other, folder);
  const s = trustStatus(p.root);
  expect(s.state).toBe("changed");
  expect(s.changes.join("\n")).toContain("a linked folder: .cuvette/adapters");
  expect(adapterDirs(p.root).evil).toBeUndefined();
  expect(adapterDirs(p.root).x).toBeUndefined();
  expect(() => findAdapter("evil", p.root)).toThrow(/no adapter named/);
});

test.skipIf(process.platform === "win32")("a linked methods folder makes the folder changed", () => {
  const p = trustedProject();
  const other = mkdtempSync(join(tmpdir(), "cuvette-evil-"));
  symlinkSync(other, join(p.root, ".cuvette", "methods"));
  expect(trustStatus(p.root).state).toBe("changed");
});
