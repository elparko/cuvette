import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, expect, test } from "vitest";
import { loadSettings } from "../src/core/config.ts";
import { Permissions, modeHook } from "../src/core/permissions.ts";
import { Session } from "../src/core/session.ts";
import type { Mode, Tool } from "../src/core/types.ts";
import { FakeProvider } from "../src/providers/fake.ts";

const tool = (o: Partial<Tool>): Tool => ({ name: "t", description: "", inputSchema: {}, source: "adapter", execute: async () => ({ ok: true }), ...o });

test("defaults", () => {
  const p = new Permissions({});
  expect(p.check(tool({ source: "adapter" }), {})).toBe("allow");
  expect(p.check(tool({ name: "run_command", source: "generic" }), {})).toBe("ask");
  expect(p.check(tool({ name: "read_file", source: "generic", readOnly: true }), {})).toBe("allow");
  expect(p.check(tool({ permission: "deny" }), {})).toBe("deny");
});

test("deny beats a more specific allow", () => {
  const p = new Permissions({ "*": "ask", "imagej_run": "allow", "imagej_*": "deny" });
  expect(p.check(tool({ name: "imagej_run" }), {})).toBe("deny");
  expect(p.check(tool({ name: "other" }), {})).toBe("ask");
});

test("run_command argv globs", () => {
  const p = new Permissions({ "run_command:git *": "allow", "run_command:rm *": "deny" });
  const rc = tool({ name: "run_command", source: "generic" });
  expect(p.check(rc, { argv: ["git", "status"] })).toBe("allow");
  expect(p.check(rc, { argv: ["rm", "-rf", "x"] })).toBe("deny");
  expect(p.check(rc, { argv: ["ls"] })).toBe("ask");
});

test("mode hook", () => {
  let mode: Mode = "plan";
  const h = modeHook(() => mode, (t) => t === "ro");
  expect(h.run({ tool: "ro", args: {} })).toEqual({});
  expect(h.run({ tool: "w", adapter: "a", args: {} }).reason).toMatch(/^Plan mode/);
  mode = "follow";
  expect(h.run({ tool: "w", adapter: "a", args: {} }).decision).toBe("instruct");
  expect(h.run({ tool: "w", args: {} })).toEqual({});
  mode = "teach";
  expect(h.run({ tool: "w", adapter: "a", args: {} }).decision).toBe("deny");
  mode = "watch";
  expect(h.run({ tool: "w", adapter: "a", args: {} })).toEqual({});
});

let session: Session | undefined;
beforeEach(() => {
  process.env.GA_HOME = mkdtempSync(join(tmpdir(), "ga-perm-"));
});
afterEach(async () => {
  await session?.close();
  session = undefined;
});

const lab = join(__dirname, "fixtures/lab");

function results(p: FakeProvider): { text: string; isError?: boolean }[] {
  return p.requests.at(-1)!.messages.flatMap((m) => m.parts).filter((x) => x.type === "tool_result") as never;
}

async function bypassSession(provider: FakeProvider, settings: Record<string, unknown> = {}, mode?: Mode) {
  const s = await Session.create({ adapters: [lab], provider, cwd: tmpdir(), mode, settings: { permissionMode: "bypass", ...settings } });
  s.decisions.applySetup({});
  s.decisions.change("method", "Default");
  return s;
}

test("bypass allows an ask rule without a card and logs the reason", async () => {
  const provider = new FakeProvider([{ calls: [{ name: "count", args: { input: "x", method: "Default" } }] }, { text: "ok" }]);
  session = await bypassSession(provider, { permissions: { count: "ask" } });
  const cards: string[] = [];
  session.bus.on((e) => e.type === "permission" && cards.push(e.rid));
  await session.send("count");
  expect(cards).toEqual([]);
  expect(results(provider)[0].isError).toBeFalsy();
  expect(session.record.entries(["permission"]).at(-1)!.data).toMatchObject({ tool: "count", decision: "allowed", reason: "bypass permissions" });
  expect(session.record.entries(["permission_mode"])[0].data).toMatchObject({ old: "ask", new: "bypass" });
});

test("bypass keeps deny rules", async () => {
  const provider = new FakeProvider([{ calls: [{ name: "count", args: { input: "x", method: "Default" } }] }, { text: "ok" }]);
  session = await bypassSession(provider, { permissions: { count: "deny" } });
  await session.send("count");
  expect(results(provider)[0].text).toMatch(/permission rules deny/);
});

test("bypass does not answer decision questions", async () => {
  const provider = new FakeProvider([{ calls: [{ name: "count", args: { input: "x", method: "Otsu" } }] }, { text: "ok" }, { text: "ok" }]);
  session = await Session.create({ adapters: [lab], provider, cwd: tmpdir(), settings: { permissionMode: "bypass", askWaits: false, autoResume: false } });
  session.decisions.applySetup({ question: "How many?" });
  const questions: string[] = [];
  session.bus.on((e) => e.type === "question" && questions.push(e.question.decisionKey ?? ""));
  await session.send("count");
  expect(questions).toContain("method");
  expect(session.decisions.hasValue("method")).toBe(false);
  expect(session.questions.open().some((q) => q.decisionKey === "method")).toBe(true);
});

test.each(["plan", "teach"] as Mode[])("bypass does not change %s mode", async (mode) => {
  const provider = new FakeProvider([{ calls: [{ name: "count", args: { input: "x", method: "Default" } }] }, { text: "ok" }]);
  session = await bypassSession(provider, {}, mode);
  await session.send("count");
  expect(results(provider)[0].text).toMatch(mode === "plan" ? /Plan mode/ : /Teach mode/);
});

test("/permissions turns bypass on and off and the record shows each change", async () => {
  const provider = new FakeProvider([{ calls: [{ name: "count", args: { input: "x", method: "Default" } }] }, { text: "ok" }]);
  session = await Session.create({ adapters: [lab], provider, cwd: tmpdir(), settings: { permissions: { count: "ask" } } });
  session.decisions.applySetup({});
  session.decisions.change("method", "Default");
  expect(session.permissionMode).toBe("ask");
  session.setPermissionMode("bypass");
  session.setPermissionMode("ask");
  expect(session.record.entries(["permission_mode"]).map((e) => e.data.new)).toEqual(["bypass", "ask"]);
  let cards = 0;
  session.bus.on((e) => {
    if (e.type === "permission") cards++, session!.respondPermission(e.rid, true);
  });
  await session.send("count");
  expect(cards).toBe(1);
});

test('the settings file can say "permissions": "bypass"', () => {
  const cwd = mkdtempSync(join(tmpdir(), "ga-perm-cwd-"));
  mkdirSync(join(cwd, ".ga"));
  writeFileSync(join(cwd, ".ga", "settings.json"), JSON.stringify({ permissions: "bypass" }));
  writeFileSync(join(cwd, ".ga", "settings.local.json"), JSON.stringify({ permissions: { "run_command:rm *": "deny" } }));
  const s = loadSettings(cwd);
  expect(s.permissionMode).toBe("bypass");
  expect(s.permissions).toEqual({ "run_command:rm *": "deny" });
  expect(loadSettings(mkdtempSync(join(tmpdir(), "ga-perm-cwd-"))).permissionMode).toBe("ask");
});
