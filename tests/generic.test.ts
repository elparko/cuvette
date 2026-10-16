import { existsSync, mkdtempSync, readFileSync, realpathSync, symlinkSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeAll, expect, test } from "vitest";
import type { Tool, ToolContext } from "../src/core/types.ts";
import { genericTools, insideWorkDir } from "../src/tools/generic.ts";
import { integrityError, integrityReason, withoutSecrets } from "../src/adapters/kinds/common.ts";
import { checkText } from "../src/core/ste.ts";
import { credentialsPath, isCredentialsFile } from "../src/core/credentials.ts";

const root = mkdtempSync(join(tmpdir(), "cuvette-generic-"));
const dirs = { workDir: join(root, "work"), sessionDir: join(root, "session") };
mkdirSync(dirs.workDir, { recursive: true });
mkdirSync(dirs.sessionDir, { recursive: true });

const ctx = (signal: AbortSignal = new AbortController().signal): ToolContext => ({ session: "s", callId: "c", workDir: dirs.workDir, sessionDir: dirs.sessionDir, signal, log: () => { throw new Error("no log"); }, callTool: async () => ({ ok: true }) });
let tools: Record<string, Tool>;
beforeAll(() => {
  tools = Object.fromEntries(genericTools(dirs).map((t) => [t.name, t]));
});

test("tool list and flags", () => {
  expect(Object.keys(tools)).toEqual(["run_command", "read_file", "list_dir", "write_file", "screenshot"]);
  for (const t of Object.values(tools)) expect(t.source).toBe("generic");
  expect(tools.run_command.permission).toBe("ask");
  expect(tools.read_file.readOnly).toBe(true);
  expect(tools.write_file.permission).toBeUndefined();
});

test("read_file refuses files that hold secrets, also through a link", async () => {
  const dir = join(root, "secrets");
  mkdirSync(dir, { recursive: true });
  for (const name of [".env", ".netrc", "id_rsa", "server.pem"]) {
    writeFileSync(join(dir, name), "SECRET=1");
    expect(await tools.read_file.execute({ path: join(dir, name) }, ctx())).toMatchObject({ ok: false, error: expect.stringMatching(/cannot read it/) });
  }
  symlinkSync(join(dir, ".env"), join(dir, "notes.txt"));
  expect((await tools.read_file.execute({ path: join(dir, "notes.txt") }, ctx())).ok).toBe(false);
  writeFileSync(join(dir, "plain.txt"), "hello");
  expect(await tools.read_file.execute({ path: join(dir, "plain.txt") }, ctx())).toMatchObject({ ok: true, text: "hello" });
});

test("screenshot asks before it runs", async () => {
  expect(tools.screenshot.readOnly).toBeFalsy();
  expect(tools.screenshot.permission).toBe("ask");
});

test("run_command runs without a shell and reports failures", async () => {
  const r = await tools.run_command.execute({ purpose: "Test", does: "Runs a test.", argv: [process.execPath, "-e", "console.log(process.argv[1]); console.error('warn')", "a;b $(x)"] }, ctx());
  expect(r).toMatchObject({ ok: true, fidelity: "none" });
  expect(r.text).toContain("a;b $(x)");
  expect(r.text).toContain("[stderr]");
  expect(r.manualRoute).toContain(process.platform === "win32" ? '"a;b $(x)"' : "'a;b $(x)'");
  const f = await tools.run_command.execute({ purpose: "Test", does: "Runs a test.", argv: [process.execPath, "-e", "process.exit(2)"] }, ctx());
  expect(f).toMatchObject({ ok: false, error: expect.stringMatching(/exited with code 2/) });
  expect((await tools.run_command.execute({ purpose: "Test", does: "Runs a test.", argv: [] }, ctx())).ok).toBe(false);
  expect((await tools.run_command.execute({ purpose: "Test", does: "Runs a test.", argv: ["/no/such/prog"] }, ctx())).error).toMatch(/cannot start/);
  const t = await tools.run_command.execute({ purpose: "Test", does: "Runs a test.", argv: [process.execPath, "-e", "setTimeout(()=>{},30000)"], timeout_s: 1 }, ctx());
  expect(t.error).toMatch(/timed out after 1 s/);
});

test("read_file and list_dir", async () => {
  const p = join(root, "note.txt");
  writeFileSync(p, "0123456789");
  const r = await tools.read_file.execute({ path: p, max_bytes: 4 }, ctx());
  expect(r).toMatchObject({ ok: true, text: "0123", data: { size: 10, truncated: true } });
  writeFileSync(join(root, "bin.dat"), Buffer.from([1, 0, 2]));
  expect((await tools.read_file.execute({ path: join(root, "bin.dat") }, ctx())).text).toBe("[binary file]");
  expect((await tools.read_file.execute({ path: join(root, "none") }, ctx())).ok).toBe(false);
  const l = await tools.list_dir.execute({ path: root }, ctx());
  expect(l.text).toContain("note.txt");
  expect((l.data as { entries: { name: string }[] }).entries.map((e) => e.name)).toContain("work");
});

test("list_dir shows a link to a folder as a folder", async () => {
  const dir = mkdtempSync(join(tmpdir(), "cuvette-generic-link-"));
  mkdirSync(join(dir, "real"));
  symlinkSync(join(dir, "real"), join(dir, "linkdir"));
  symlinkSync(join(dir, "none"), join(dir, "broken"));
  const l = await tools.list_dir.execute({ path: dir }, ctx());
  expect(l.text).toContain("d linkdir");
  expect(l.text).toContain("- broken");
});

test("write_file writes an absolute path in the project folder that the scientist names", async () => {
  const project = mkdtempSync(join(tmpdir(), "cuvette-generic-proj-"));
  const write = genericTools({ ...dirs, projectDir: project }).find((t) => t.name === "write_file")!;
  expect((await write.execute({ name: join(project, "results", "table.csv"), text: "a\n1\n" }, ctx())).ok).toBe(true);
  expect(readFileSync(join(project, "results", "table.csv"), "utf8")).toBe("a\n1\n");
  expect((await write.execute({ name: "rel.txt", text: "x" }, ctx())).ok).toBe(true);
  expect(existsSync(join(dirs.workDir, "rel.txt"))).toBe(true);
  expect((await write.execute({ name: join(project, "..", "escape.txt"), text: "x" }, ctx())).ok).toBe(false);
});

test("write_file writes only inside the work folder", async () => {
  const ok = await tools.write_file.execute({ name: "sub/out.txt", text: "hello" }, ctx());
  expect(ok.ok).toBe(true);
  expect(readFileSync(join(dirs.workDir, "sub", "out.txt"), "utf8")).toBe("hello");
  expect(ok.outputs?.[0].name).toBe("out.txt");
  for (const name of ["../escape.txt", "/tmp/cuvette-abs.txt", "..", "sub/../../escape2.txt"]) {
    const r = await tools.write_file.execute({ name, text: "x" }, ctx());
    expect(r).toMatchObject({ ok: false, error: expect.stringMatching(/^the path is outside the session folder /) });
  }
  symlinkSync(root, join(dirs.workDir, "link"));
  expect((await tools.write_file.execute({ name: "link/escape3.txt", text: "x" }, ctx())).ok).toBe(false);
  expect(existsSync(join(root, "escape.txt"))).toBe(false);
  expect(existsSync(join(root, "escape3.txt"))).toBe(false);
});

test("screenshot (dry run) returns a PNG", async () => {
  process.env.CUVETTE_SCREEN_DRY_RUN = "1";
  try {
    const r = await tools.screenshot.execute({}, ctx());
    expect(r).toMatchObject({ ok: true, fidelity: "none" });
    expect(readFileSync(r.images![0]).subarray(1, 4).toString()).toBe("PNG");
  } finally {
    delete process.env.CUVETTE_SCREEN_DRY_RUN;
  }
});

test("write_file refuses a symlink as the target file", () => {
  const root = mkdtempSync(join(tmpdir(), "cuvette-hard-"));
  const work = join(root, "work");
  mkdirSync(work);
  const outside = join(root, "outside.txt");
  writeFileSync(outside, "keep");
  symlinkSync(outside, join(work, "out.txt"));
  expect(insideWorkDir(work, "out.txt")).toBeUndefined();
  expect(readFileSync(outside, "utf8")).toBe("keep");
});

test("write_file does not make folders outside the work folder through a symlink", () => {
  const root = mkdtempSync(join(tmpdir(), "cuvette-hard-"));
  const work = join(root, "work");
  const other = join(root, "other");
  mkdirSync(work);
  mkdirSync(other);
  symlinkSync(other, join(work, "link"));
  expect(insideWorkDir(work, "link/new/deep/x.txt")).toBeUndefined();
  expect(existsSync(join(other, "new"))).toBe(false);
});

test("write_file accepts a name that starts with two dots", () => {
  const work = mkdtempSync(join(tmpdir(), "cuvette-hard-"));
  expect(insideWorkDir(work, "..notes.txt")).toBe(join(work, "..notes.txt"));
  expect(insideWorkDir(work, "../x.txt")).toBeUndefined();
});

test("read_file and the credentials check refuse the saved key file", async () => {
  const home = mkdtempSync(join(tmpdir(), "cuvette-hard-home-"));
  const old = process.env.CUVETTE_HOME;
  process.env.CUVETTE_HOME = home;
  try {
    writeFileSync(credentialsPath(), '{"anthropic_api_key":"sk-ant-secret"}');
    symlinkSync(credentialsPath(), join(home, "alias.json"));
    expect(isCredentialsFile(join(home, "alias.json"))).toBe(true);
    const read = genericTools({ workDir: home, sessionDir: home, projectDir: home }).find((t) => t.name === "read_file")!;
    const r = await read.execute({ path: "alias.json" }, ctx());
    expect(r.ok).toBe(false);
    expect(JSON.stringify(r)).not.toContain("sk-ant-secret");
  } finally {
    if (old === undefined) delete process.env.CUVETTE_HOME;
    else process.env.CUVETTE_HOME = old;
  }
});

test("run_command does not pass API keys to the program", async () => {
  process.env.ANTHROPIC_API_KEY_TEST_ONLY = "sk-ant-secret";
  try {
    expect(withoutSecrets()).not.toHaveProperty("ANTHROPIC_API_KEY_TEST_ONLY");
    const root = mkdtempSync(join(tmpdir(), "cuvette-hard-"));
    const run = genericTools({ workDir: root, sessionDir: root, projectDir: root }).find((t) => t.name === "run_command")!;
    const r = await run.execute({ purpose: "Test", does: "Shows the settings.", argv: [process.execPath, "-e", "console.log(JSON.stringify(process.env))"] }, ctx());
    expect(r.ok).toBe(true);
    expect(r.text).not.toContain("sk-ant-secret");
    expect(r.text).toContain("PATH");
  } finally {
    delete process.env.ANTHROPIC_API_KEY_TEST_ONLY;
  }
});


test("the text after a change of the record or the settings says what changed, that Cuvette did not undo it, and what to do", () => {
  const one = integrityError("script", ["/home/.cuvette/settings.json"]);
  expect(one).toBe("The script changed the record or the settings of Cuvette: /home/.cuvette/settings.json. A script must not write there. Cuvette did not undo the change. Do not run it again. Tell the scientist to check this file.");
  expect(integrityError("command", ["/a/log.jsonl", "/b/settings.json"])).toContain("Tell the scientist to check these files.");
  const reason = integrityReason("program", "/home/.cuvette/settings.json");
  expect(reason).toBe("The program changed /home/.cuvette/settings.json. This file belongs to the record or the settings of Cuvette. Cuvette did not undo the change. Check the file. If it is wrong, restore it from a backup.");
  for (const text of [one, reason]) expect(checkText(text.replace(/\S*[\\/]\S*/g, "X"))).toEqual([]);
});

test("write_file refuses a hook script of the project and the folder of a hook script", async () => {
  const project = realpathSync(mkdtempSync(join(tmpdir(), "cuvette-generic-hook-")));
  mkdirSync(join(project, ".cuvette"));
  mkdirSync(join(project, "hooks"));
  writeFileSync(join(project, "hooks", "check.py"), "pass\n");
  writeFileSync(join(project, ".cuvette", "settings.json"), JSON.stringify({ hooks: { PreToolUse: [{ command: ["python3", "hooks/check.py"] }] } }));
  const write = genericTools({ ...dirs, projectDir: project }).find((t) => t.name === "write_file")!;
  const logs: string[] = [];
  const c = { ...ctx(), log: (k: string) => void logs.push(k) } as unknown as ToolContext;
  for (const name of ["hooks/check.py", "hooks/new.py"]) {
    const r = await write.execute({ name: join(project, name), text: "evil" }, c);
    expect(r).toMatchObject({ ok: false, error: expect.stringMatching(/belongs to the record or to the settings/) });
  }
  expect(readFileSync(join(project, "hooks", "check.py"), "utf8")).toBe("pass\n");
  expect(existsSync(join(project, "hooks", "new.py"))).toBe(false);
  expect((await write.execute({ name: join(project, "results", "t.csv"), text: "a" }, c)).ok).toBe(true);
});

const realPlatform = process.platform;
afterEach(() => void Object.defineProperty(process, "platform", { value: realPlatform }));

for (const platform of ["win32", "darwin"]) {
  test(`write_file refuses a hook script, its folder and LAB.md with other letter case on ${platform}`, async () => {
    const project = realpathSync(mkdtempSync(join(tmpdir(), "cuvette-generic-case-")));
    mkdirSync(join(project, ".cuvette"));
    mkdirSync(join(project, "hooks"));
    writeFileSync(join(project, "hooks", "check.py"), "pass\n");
    writeFileSync(join(project, ".cuvette", "settings.json"), JSON.stringify({ hooks: { PreToolUse: [{ command: ["python3", "hooks/check.py"] }] } }));
    const write = genericTools({ ...dirs, projectDir: project }).find((t) => t.name === "write_file")!;
    const c = { ...ctx(), log: () => {} } as unknown as ToolContext;
    Object.defineProperty(process, "platform", { value: platform });
    for (const name of ["HOOKS/CHECK.PY", "Hooks/new.py", "LAB.MD"]) {
      const r = await write.execute({ name: join(project, name), text: "evil" }, c);
      expect(r, name).toMatchObject({ ok: false, error: expect.stringMatching(/belongs to the record or to the settings/) });
    }
    expect(readFileSync(join(project, "hooks", "check.py"), "utf8")).toBe("pass\n");
  });
}

test.skipIf(realPlatform === "darwin" || realPlatform === "win32")("write_file keeps the letter case of a path on Linux", async () => {
  const project = realpathSync(mkdtempSync(join(tmpdir(), "cuvette-generic-case-")));
  mkdirSync(join(project, ".cuvette"));
  mkdirSync(join(project, "hooks"));
  writeFileSync(join(project, "hooks", "check.py"), "pass\n");
  writeFileSync(join(project, ".cuvette", "settings.json"), JSON.stringify({ hooks: { PreToolUse: [{ command: ["python3", "hooks/check.py"] }] } }));
  const write = genericTools({ ...dirs, projectDir: project }).find((t) => t.name === "write_file")!;
  const c = { ...ctx(), log: () => {} } as unknown as ToolContext;
  expect((await write.execute({ name: join(project, "HOOKS", "new.py"), text: "ok" }, c)).ok).toBe(true);
});
