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

test("a Stop command hook blocks with exit code 2 or with decision block, and gets stop_hook_active", async () => {
  const exit2 = script("stop2.mjs", `let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const j=JSON.parse(s);process.stderr.write("active "+j.stop_hook_active);process.exit(2)})`);
  expect(await new HookRunner([], { Stop: [{ command: exit2 }] }, dir).stop({ session: "s", stop_hook_active: true })).toBe("active true");
  const json = script("stopj.mjs", `process.stdin.resume();process.stdin.on("end",()=>console.log(JSON.stringify({decision:"block",reason:"Run the check."})))`);
  expect(await new HookRunner([], { Stop: [{ command: json }] }, dir).stop({ session: "s" })).toBe("Run the check.");
  const ok = script("stopok.mjs", `process.stdin.resume();process.stdin.on("end",()=>process.exit(0))`);
  expect(await new HookRunner([], { Stop: [{ command: ok }] }, dir).stop({ session: "s" })).toBeUndefined();
});

test("a command hook with output that is not JSON gives an error, and the runner reports it", async () => {
  const bad = script("notjson.js", "console.log('deny please')");
  const seen: string[] = [];
  const h = new HookRunner([], { PreToolUse: [{ command: bad }], Stop: [{ command: bad }] });
  h.onError = (m) => seen.push(m);
  const r = await h.pre(input);
  expect(r.decision).toBeUndefined();
  expect(r.errors?.[0]).toMatch(/not JSON: deny please/);
  expect(await h.stop({ session: "s" })).toBeUndefined();
  expect(seen).toHaveLength(2);
});

test("a hook that hangs stops at once when the turn stops, and the call does not run", async () => {
  const hang = script("hang.js", "setInterval(() => {}, 1000)");
  const h = new HookRunner([], { PreToolUse: [{ command: hang }], Stop: [{ command: hang }] });
  const ctl = new AbortController();
  const t0 = Date.now();
  setTimeout(() => ctl.abort(), 200);
  const r = await h.pre(input, ctl.signal);
  expect(r.decision).toBe("deny");
  const ctl2 = new AbortController();
  setTimeout(() => ctl2.abort(), 200);
  expect(await h.stop({ session: "s" }, ctl2.signal)).toBeUndefined();
  expect(Date.now() - t0).toBeLessThan(5000);
});
