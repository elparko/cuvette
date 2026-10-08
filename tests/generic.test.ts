import { existsSync, mkdtempSync, readFileSync, symlinkSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeAll, expect, test } from "vitest";
import type { Tool, ToolContext } from "../src/core/types.ts";
import { genericTools } from "../src/tools/generic.ts";

const root = mkdtempSync(join(tmpdir(), "ga-generic-"));
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

test("run_command runs without a shell and reports failures", async () => {
  const r = await tools.run_command.execute({ argv: [process.execPath, "-e", "console.log(process.argv[1]); console.error('warn')", "a;b $(x)"] }, ctx());
  expect(r).toMatchObject({ ok: true, fidelity: "none" });
  expect(r.text).toContain("a;b $(x)");
  expect(r.text).toContain("[stderr]");
  expect(r.manualRoute).toContain(process.platform === "win32" ? '"a;b $(x)"' : "'a;b $(x)'");
  const f = await tools.run_command.execute({ argv: [process.execPath, "-e", "process.exit(2)"] }, ctx());
  expect(f).toMatchObject({ ok: false, error: expect.stringMatching(/exited with code 2/) });
  expect((await tools.run_command.execute({ argv: [] }, ctx())).ok).toBe(false);
  expect((await tools.run_command.execute({ argv: ["/no/such/prog"] }, ctx())).error).toMatch(/cannot start/);
  const t = await tools.run_command.execute({ argv: [process.execPath, "-e", "setTimeout(()=>{},30000)"], timeout_s: 1 }, ctx());
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

test("write_file writes only inside the work folder", async () => {
  const ok = await tools.write_file.execute({ name: "sub/out.txt", text: "hello" }, ctx());
  expect(ok.ok).toBe(true);
  expect(readFileSync(join(dirs.workDir, "sub", "out.txt"), "utf8")).toBe("hello");
  expect(ok.outputs?.[0].name).toBe("out.txt");
  for (const name of ["../escape.txt", "/tmp/ga-abs.txt", "..", "sub/../../escape2.txt"]) {
    const r = await tools.write_file.execute({ name, text: "x" }, ctx());
    expect(r).toMatchObject({ ok: false, error: "the path is outside the session work folder" });
  }
  symlinkSync(root, join(dirs.workDir, "link"));
  expect((await tools.write_file.execute({ name: "link/escape3.txt", text: "x" }, ctx())).ok).toBe(false);
  expect(existsSync(join(root, "escape.txt"))).toBe(false);
  expect(existsSync(join(root, "escape3.txt"))).toBe(false);
});

test("screenshot (dry run) returns a PNG", async () => {
  process.env.GA_SCREEN_DRY_RUN = "1";
  try {
    const r = await tools.screenshot.execute({}, ctx());
    expect(r).toMatchObject({ ok: true, fidelity: "none" });
    expect(readFileSync(r.images![0]).subarray(1, 4).toString()).toBe("PNG");
  } finally {
    delete process.env.GA_SCREEN_DRY_RUN;
  }
});
