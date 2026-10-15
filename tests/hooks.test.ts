import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
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

test("a command hook keeps a multi-byte character that spans two output chunks", async () => {
  const text = "€".repeat(20000);
  const body = `const b=Buffer.from(JSON.stringify({additionalContext:${JSON.stringify(text)}}));const cut=b.indexOf(0xe2)+1;process.stdout.write(b.subarray(0,cut));setTimeout(()=>process.stdout.write(b.subarray(cut)),100)`;
  const split = script("split.js", body);
  const r = await new HookRunner([], { PostToolUse: [{ command: split }] }).post({ event: "PostToolUse", session: "s", tool: "t", args: {}, output: { ok: true } });
  expect(r.additionalContext).toBe(text);
});

test("the notices of a command hook write out escape sequences of the command and of its output", async () => {
  const esc = "\\u001b]0;SECRET-TEXT\\u0007";
  const fail = script("fail-esc.js", `process.stderr.write("bad ${esc}");process.exit(1)`);
  const e = await new HookRunner([], { PreToolUse: [{ command: [...fail, `arg${"\u001b]0;SECRET-ARG\u0007"}`] }] }).pre(input);
  const text = JSON.stringify(e);
  expect(text).toContain("SECRET-TEXT");
  expect(text).toContain("SECRET-ARG");
  expect(text).not.toMatch(/\\u001b|\\u0007/);
  const block = script("block-esc.js", `process.stderr.write("no ${esc}");process.exit(2)`);
  const r = await new HookRunner([], { PreToolUse: [{ command: block }] }).pre(input);
  expect(r.reason).toContain("SECRET-TEXT");
  expect(r.reason).not.toMatch(/[\u0000-\u0008\u000b-\u001f]/);
});

const sh = (body: string) => ["sh", "-c", body];

test("a timeout kills the grandchild of a shell hook and blocks the call", async () => {
  const marker = join(dir, "grandchild-alive");
  const h = new HookRunner([], { PreToolUse: [{ command: sh(`(sleep 1; echo x > ${marker}) & wait`) }] }, dir, 300);
  const r = await h.pre(input);
  expect(r.decision).toBe("deny");
  expect(r.reason).toMatch(/timed out/);
  await new Promise((res) => setTimeout(res, 1500));
  expect(existsSync(marker)).toBe(false);
});

test("an abort kills the grandchild of a shell hook", async () => {
  const pidFile = join(dir, "grandchild-pid");
  const h = new HookRunner([], { PreToolUse: [{ command: sh(`sh -c 'echo $$ > ${pidFile}; sleep 30' & wait`) }] }, dir);
  const ctl = new AbortController();
  setTimeout(() => ctl.abort(), 500);
  await h.pre(input, ctl.signal);
  const pid = Number(readFileSync(pidFile, "utf8").trim());
  const alive = () => {
    try {
      process.kill(pid, 0);
      return true;
    } catch {
      return false;
    }
  };
  for (let i = 0; i < 20 && alive(); i++) await new Promise((res) => setTimeout(res, 100));
  expect(alive()).toBe(false);
});

test("a command hook does not get environment variables with secret names", async () => {
  const before = process.env.CUVETTE_TEST_TOKEN;
  process.env.CUVETTE_TEST_TOKEN = "t-secret";
  try {
    const env = script("env.js", "console.log(JSON.stringify({additionalContext: String(process.env.CUVETTE_TEST_TOKEN)}))");
    const r = await new HookRunner([], { PostToolUse: [{ command: env }] }).post({ event: "PostToolUse", session: "s", tool: "t", args: {}, output: { ok: true } });
    expect(r.additionalContext).toBe("undefined");
  } finally {
    if (before === undefined) delete process.env.CUVETTE_TEST_TOKEN;
    else process.env.CUVETTE_TEST_TOKEN = before;
  }
});

test("a command hook with more than 64 KB of output gives an error and the cut is noted", async () => {
  const big = script("big.js", "process.stdout.write('a'.repeat(200000))");
  const r = await new HookRunner([], { PreToolUse: [{ command: big }] }).pre(input);
  expect(r.decision).toBeUndefined();
  expect(r.errors?.[0]).toMatch(/more than 64 KB/);
  const loud = script("loud.js", "process.stderr.write('e'.repeat(200000),()=>process.exit(2))");
  const d = await new HookRunner([], { PreToolUse: [{ command: loud }] }).pre(input);
  expect(d.decision).toBe("deny");
  expect(d.reason).toMatch(/\[cut at 64 KB\]$/);
  expect(d.reason!.length).toBeLessThan(70000);
});

test("a PreToolUse hook that fails to start blocks the call, and a hook of another event does not", async () => {
  const missing = [join(dir, "no-such-program")];
  const r = await new HookRunner([], { PreToolUse: [{ command: missing }] }).pre(input);
  expect(r.decision).toBe("deny");
  expect(r.reason).toMatch(/no-such-program.*failed to start/);
  const h = new HookRunner([], { Stop: [{ command: missing }] });
  expect(await h.stop({ session: "s" })).toBeUndefined();
});

test("a matcher that is not a valid regex matches a PreToolUse hook and is reported once", async () => {
  let ran = 0;
  const h = new HookRunner([hook("b", () => { ran++; return {}; }, { matcher: "(" })]);
  const seen: string[] = [];
  h.onError = (m) => seen.push(m);
  await h.pre(input);
  await h.pre(input);
  expect(ran).toBe(2);
  expect(seen).toHaveLength(1);
  expect(seen[0]).toMatch(/not a valid regular expression/);
});

test("a matcher that is not a valid regex skips a hook of another event with one notice", async () => {
  let ran = 0;
  const h = new HookRunner([{ name: "p", event: "PostToolUse", matcher: "(", run: () => { ran++; return {}; } }]);
  const seen: string[] = [];
  h.onError = (m) => seen.push(m);
  const p = { event: "PostToolUse" as const, session: "s", tool: "t", args: {}, output: { ok: true } };
  await h.post(p);
  await h.post(p);
  expect(ran).toBe(0);
  expect(seen).toHaveLength(1);
});

test("the same bad matcher is reported once for each event", async () => {
  const h = new HookRunner([
    hook("b", () => ({}), { matcher: "(" }),
    { name: "p", event: "PostToolUse", matcher: "(", run: () => ({}) },
  ]);
  const seen: string[] = [];
  h.onError = (m) => seen.push(m);
  await h.pre(input);
  await h.post({ event: "PostToolUse", session: "s", tool: "t", args: {}, output: { ok: true } });
  expect(seen).toHaveLength(2);
});
