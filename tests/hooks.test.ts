import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "vitest";
import { HookRunner } from "../src/core/hooks.ts";
import type { Hook, PreToolUseInput } from "../src/core/types.ts";

const input: PreToolUseInput = { event: "PreToolUse", session: "s", mode: "watch", tool: "seg", args: { a: 1 } };
const dir = mkdtempSync(join(tmpdir(), "cuvette-hook-"));
const script = (name: string, body: string) => {
  const p = join(dir, name);
  writeFileSync(p, body);
  return [process.execPath, p];
};
const hook = (name: string, run: Hook["run"], extra: Partial<Hook> = {}): Hook => ({ name, event: "PreToolUse", run, ...extra });

test("merge and chain args", async () => {
  const seen: any[] = [];
  const r = await new HookRunner([
    hook("a", () => ({ updatedArgs: { a: 2 }, deviations: [{ arg: "a", key: "k", setup: 1, used: 2 }], applied: { k: 1 }, additionalContext: "one" })),
    hook("b", (i) => { seen.push(i.args); return { updatedArgs: { ...i.args, b: 3 }, applied: { j: 2 }, additionalContext: "two" }; }),
  ]).pre(input);
  expect(seen[0]).toEqual({ a: 2 });
  expect(r.updatedArgs).toEqual({ a: 2, b: 3 });
  expect(r.applied).toEqual({ k: 1, j: 2 });
  expect(r.additionalContext).toBe("one\ntwo");
  expect(r.deviations).toHaveLength(1);
});

test("first stop wins; matcher filters", async () => {
  let ran = false;
  const r = await new HookRunner([
    hook("m", () => ({ decision: "deny", reason: "no" }), { matcher: "^other$" }),
    hook("b", () => ({ decision: "block", waitingOn: ["k"] })),
    hook("c", () => { ran = true; return {}; }),
  ]).pre(input);
  expect(r).toMatchObject({ decision: "block", waitingOn: ["k"] });
  expect(ran).toBe(false);
});

test("command hooks: exit 2, claude shape, defer, failure", async () => {
  const deny = script("deny.js", "process.stderr.write('blocked here');process.exit(2)");
  expect((await new HookRunner([], { PreToolUse: [{ command: deny }] }).pre(input))).toMatchObject({ decision: "deny", reason: "blocked here" });

  const cc = script("cc.js", `let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const i=JSON.parse(s);console.log(JSON.stringify({hookSpecificOutput:{permissionDecision:'allow',updatedInput:{...i.tool_input,z:1},additionalContext:'hi'}}))})`);
  const r = await new HookRunner([], { PreToolUse: [{ matcher: "seg|x", command: cc }] }).pre(input);
  expect(r).toMatchObject({ decision: "allow", updatedArgs: { a: 1, z: 1 }, additionalContext: "hi" });

  const defer = script("defer.js", "console.log(JSON.stringify({hookSpecificOutput:{permissionDecision:'defer'}}))");
  expect((await new HookRunner([], { PreToolUse: [{ command: defer }] }).pre(input)).decision).toBe("block");

  const bad = script("bad.js", "process.exit(1)");
  const e = await new HookRunner([], { PreToolUse: [{ command: bad }] }).pre(input);
  expect(e.decision).toBeUndefined();
  expect(e.errors).toHaveLength(1);
});

test("post and preAnswer merge", async () => {
  const h = new HookRunner([
    { name: "p", event: "PostToolUse", run: () => ({ additionalContext: "x", findings: [{ check: "c", severity: "info", message: "m" }] }) },
    { name: "q", event: "PreAnswer", run: (i) => ({ answer: i.answer + "!" }) },
    { name: "r", event: "PreAnswer", run: (i) => ({ answer: i.answer + "?" }) },
  ]);
  const p = await h.post({ event: "PostToolUse", session: "s", tool: "t", args: {}, output: { ok: true } });
  expect(p.findings).toHaveLength(1);
  expect((await h.preAnswer({ event: "PreAnswer", session: "s", answer: "a" })).answer).toBe("a!?");
});
