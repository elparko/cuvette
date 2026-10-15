import { mkdirSync, mkdtempSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, test } from "vitest";
import { agentRules, allowAdapter, blindArgv, blindCheck, blindPolicy, canonical, decide, pathsIn, sandboxDenials, sandboxReadRules, setBlindPolicy } from "../src/adapters/blind.ts";
import { runProcess } from "../src/adapters/kinds/common.ts";
import type { Entry, ToolContext } from "../src/core/types.ts";
import { runScriptTool } from "../src/tools/run_script.ts";

const root = canonical(mkdtempSync(join(tmpdir(), "cuvette-blind-")));
const data = join(root, "data");
const secret = join(root, "repo", "bench");
const adapter = join(root, "repo", "catalog", "x");
for (const d of [data, secret, adapter, join(root, "work")]) mkdirSync(d, { recursive: true });
writeFileSync(join(data, "in.csv"), "a,b\n1,2\n");
writeFileSync(join(secret, "expected.yaml"), "value: 0.752\n");
writeFileSync(join(adapter, "skill.md"), "use it\n");
symlinkSync(join(secret, "expected.yaml"), join(root, "work", "link.yaml"));

const rules = { allow: [data, adapter, join(root, "work")], deny: [join(root, "repo")], hide: [adapter] };
const darwin = process.platform === "darwin";

afterEach(() => setBlindPolicy(undefined));

test("the longest matching root decides, and a symlink resolves to its target", () => {
  expect(decide(join(data, "in.csv"), rules)).toBe("allow");
  expect(decide(join(secret, "expected.yaml"), rules)).toBe("deny");
  expect(decide(join(adapter, "skill.md"), rules)).toBe("allow");
  expect(decide("/somewhere/else", rules)).toBeUndefined();
  expect(decide(join(root, "work", "link.yaml"), rules)).toBe("deny");
  expect(decide(join(data, "..", "repo", "bench", "expected.yaml"), rules)).toBe("deny");
});

test.skipIf(process.platform === "win32")("paths come from whole strings, argv lists and code text", () => {
  expect(pathsIn({ path: "/a/b.csv" })).toEqual(["/a/b.csv"]);
  expect(pathsIn({ argv: ["cat", "/x/y"] })).toEqual(["/x/y"]);
  const code = `import pandas as pd\nd = pd.read_csv("/data/in.csv")\nx = 4/2\nopen('/repo/bench/expected.yaml')`;
  expect(pathsIn({ code })).toEqual(["/data/in.csv", "/repo/bench/expected.yaml"]);
});

test.skipIf(process.platform === "win32")("generic file tools need the allow list; other tools only stay off the deny list", () => {
  expect(blindCheck({ name: "read_file", source: "generic" }, { path: "/x" })).toBeUndefined();
  const p = { ...rules, sandbox: "off" as const };
  expect(blindCheck({ name: "read_file", source: "generic" }, { path: join(adapter, "skill.md") }, p)).toBeDefined();
  expect(blindCheck({ name: "load_table", source: "adapter" }, { path: join(adapter, "skill.md") }, p)).toBeDefined();
  expect(blindCheck({ name: "read_file", source: "generic" }, { path: join(data, "in.csv") }, p)).toBeUndefined();
  expect(blindCheck({ name: "read_file", source: "generic" }, { path: "/Users/someone/notes.txt" }, p)?.path).toBe("/Users/someone/notes.txt");
  expect(blindCheck({ name: "list_dir", source: "generic" }, { path: secret }, p)?.message).toMatch(/outside the folders of this run/);
  expect(blindCheck({ name: "read_file", source: "generic" }, { path: join(root, "work", "link.yaml") }, p)).toBeDefined();
  expect(blindCheck({ name: "load_table", source: "adapter" }, { path: "/opt/other/table.csv" }, p)).toBeUndefined();
  expect(blindCheck({ name: "run_script", source: "harness" }, { code: `open("${secret}/expected.yaml")` }, p)?.path).toBe(join(secret, "expected.yaml"));
});

test.skipIf(process.platform === "win32")("sandbox rules list wider roots first so that the narrower allow wins", () => {
  const r = sandboxReadRules(rules);
  expect(r.indexOf(`(deny file-read-data (subpath "${join(root, "repo")}"))`)).toBeGreaterThanOrEqual(0);
  expect(r.indexOf("(deny")).toBeLessThan(r.indexOf(`(allow file-read-data (subpath "${adapter}"))`));
  expect(r).not.toContain(data);
  const agent = sandboxReadRules(agentRules(rules));
  expect(agent.lastIndexOf(`(deny file-read-data (subpath "${adapter}"))`)).toBeGreaterThan(agent.lastIndexOf(`(allow file-read-data (subpath "${adapter}"))`));
  expect(sandboxReadRules(undefined)).toBe("");
});

test("without a policy the argv and the run_script profile stay unchanged", () => {
  expect(blindPolicy()).toBeUndefined();
  expect(blindArgv(["/bin/cat", "x"])).toEqual(["/bin/cat", "x"]);
  expect(sandboxDenials("Operation not permitted /repo/bench")).toEqual([]);
});

test.runIf(darwin)("adapter processes cannot read denied files but still read their own adapter folder", async () => {
  const p = setBlindPolicy(rules)!;
  expect(p.sandbox).toBe("on");
  const bad = await runProcess(["/bin/cat", join(secret, "expected.yaml")]);
  expect(bad.code).not.toBe(0);
  expect(bad.stderr).toMatch(/Operation not permitted/);
  expect(sandboxDenials(bad.stderr)).toEqual([join(secret, "expected.yaml")]);
  const viaLink = await runProcess(["/bin/cat", join(root, "work", "link.yaml")]);
  expect(viaLink.code).not.toBe(0);
  const good = await runProcess(["/bin/cat", join(adapter, "skill.md")]);
  expect(good.stdout).toBe("use it\n");
  const nested = await runProcess(["/usr/bin/sandbox-exec", "-p", "(version 1)(allow default)", "/usr/bin/true"]);
  expect(nested.code).toBe(0);
});

test.runIf(darwin)("run_script under blind mode reads the data, cannot read the expected file, and logs the denial", async () => {
  setBlindPolicy(rules);
  const workDir = join(root, "work");
  const logged: { kind: string; data: Record<string, unknown> }[] = [];
  const tool = runScriptTool({ workDir, sessionDir: join(root, "session") }, { network: false });
  const ctx: ToolContext = {
    session: "s",
    callId: "c1",
    workDir,
    sessionDir: join(root, "session"),
    signal: new AbortController().signal,
    log: (kind, d) => (logged.push({ kind, data: d }), {} as Entry),
    callTool: async () => ({ ok: true }),
  };
  const ok = await tool.execute({ purpose: "Test", does: "Runs a test.", code: `print(open(${JSON.stringify(join(data, "in.csv"))}).read())` }, ctx);
  const skill = await tool.execute({ purpose: "Test", does: "Runs a test.", code: `import os\nprint(open(os.path.join(${JSON.stringify(adapter)}, "skill.md")).read())` }, ctx);
  expect(skill.ok).toBe(false);
  expect(ok.ok).toBe(true);
  expect(ok.text).toContain("1,2");
  const path = join(secret, "expected.yaml");
  const bad = await tool.execute({ purpose: "Test", does: "Runs a test.", code: `import os\np = os.path.join(${JSON.stringify(secret)}, "expected.yaml")\nprint(open(p).read())` }, ctx);
  expect(bad.ok).toBe(false);
  expect(bad.text).not.toContain("0.752");
  expect(logged).toContainEqual({ kind: "blocked", data: expect.objectContaining({ path, reason: "blind mode", tool: "run_script" }) });
});

test.skipIf(process.platform === "win32")("a mid-session adapter adds its folder and the install root of its program to the allow list", () => {
  expect(allowAdapter(adapter, "/x/bin/tool")).toBeUndefined();
  setBlindPolicy({ allow: [data], deny: [join(root, "repo")], hide: [] });
  const p = allowAdapter(adapter, join(root, "envs", "tool", "bin", "python"))!;
  expect(p.allow).toEqual(expect.arrayContaining([data, adapter, join(root, "envs", "tool")]));
  expect(p.hide).toContain(adapter);
  expect(blindPolicy()).toBe(p);
  expect(blindCheck({ name: "read_file", source: "generic" }, { path: join(adapter, "skill.md") })).toBeDefined();
  expect(decide(join(adapter, "skill.md"), p)).toBe("allow");
});
