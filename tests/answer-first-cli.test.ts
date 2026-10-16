import { spawn } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, expect, test } from "vitest";
import { confirmCode } from "../src/adapters/source.ts";
import { withinMs } from "./timing.ts";

const CUVETTE = join(__dirname, "..", "bin/cuvette.js");
const REFEREE_MS = 1500;
const ANSWER = "The mean of x is 2.5 over 4 rows.";
const CALLS = (data: string) => [{ calls: [{ name: "mean_of", args: { path: data, column: "x" } }] }, { calls: [{ name: "count_rows", args: { path: data } }] }];
let root = "";
let project = "";
let data = "";

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), "cuvette-first-cli-"));
  project = join(root, "project");
  mkdirSync(project);
  data = join(project, "a.csv");
  writeFileSync(data, "x,y\n1,10\n2,20\n3,30\n4,40\n");
});

afterAll(() => rmSync(root, { recursive: true, force: true }));

function script(name: string, value: unknown): string {
  const p = join(root, `${name}.json`);
  writeFileSync(p, JSON.stringify(value));
  return `fake:${p}`;
}

function setup(name: string, steps: unknown[], reply: string, referee: Record<string, unknown> = { complete: reply, completeDelayMs: REFEREE_MS }) {
  const home = mkdtempSync(join(root, "home-"));
  cpSync(join(__dirname, "fixtures", "drive"), join(home, "adapters", "drivefix"), { recursive: true });
  const before = process.env.CUVETTE_HOME;
  process.env.CUVETTE_HOME = home;
  try {
    confirmCode(join(home, "adapters", "drivefix"));
  } finally {
    if (before === undefined) delete process.env.CUVETTE_HOME;
    else process.env.CUVETTE_HOME = before;
  }
  return { home, model: script(`${name}-model`, steps), referee: script(`${name}-referee`, { steps: [], ...referee }) };
}

interface Run {
  code: number | null;
  out: string;
  err: string;
  chunks: { at: number; text: string }[];
  ended: number;
}

function run(s: { home: string; model: string; referee: string }, output?: string): Promise<Run> {
  const args = [CUVETTE, "-p", "Give the mean of x", "--adapter", "drivefix", "--model", s.model, "--referee", s.referee, "--trust-folder", ...(output ? ["--output", output] : [])];
  return new Promise((resolve) => {
    const child = spawn("node", args, { cwd: project, env: { ...process.env, CUVETTE_HOME: s.home, CUVETTE_NO_OPEN: "1", ANTHROPIC_API_KEY: "", TMPDIR: root } });
    const r: Run = { code: null, out: "", err: "", chunks: [], ended: 0 };
    child.stdout.on("data", (d: Buffer) => {
      r.out += d;
      r.chunks.push({ at: Date.now(), text: String(d) });
    });
    child.stderr.on("data", (d: Buffer) => (r.err += d));
    child.on("close", (code) => {
      r.code = code;
      r.ended = Date.now();
      resolve(r);
    });
  });
}

const WARNING = JSON.stringify({ severity: "warning", message: "The sample is small." });
const ERROR = JSON.stringify({ severity: "error", message: "The mean has no control to compare with." });

test("headless text mode prints the answer before the referee reply and exits after the review", async () => {
  const r = await run(setup("text", [...CALLS(data), { text: ANSWER }], WARNING));
  expect(r.code, r.err).toBe(0);
  const first = r.chunks.find((c) => c.text.includes(ANSWER))!;
  expect(first).toBeDefined();
  expect(r.ended - first.at).toBeGreaterThanOrEqual(1000);
  expect(r.out).toMatch(new RegExp(`^${ANSWER}\\n\\nSession: `));
  expect(r.err).toContain("Review warning: The sample is small.");
  expect(r.out).not.toContain("Corrected answer");
});

test("headless text mode marks the corrected answer after the first answer", async () => {
  const r = await run(setup("fix", [...CALLS(data), { text: ANSWER }, { text: `${ANSWER} No control was run.` }], ERROR));
  expect(r.code, r.err).toBe(0);
  const first = r.chunks.find((c) => c.text.includes(ANSWER))!;
  expect(r.ended - first.at).toBeGreaterThanOrEqual(1000);
  const at = (text: string) => r.out.indexOf(text);
  expect(at(ANSWER)).toBeGreaterThanOrEqual(0);
  expect(at("Corrected answer. The review found problems")).toBeGreaterThan(at(ANSWER));
  expect(at("No control was run.")).toBeGreaterThan(at("Corrected answer"));
  expect(r.out.match(/Session: /g)).toHaveLength(1);
});

test("headless json has answerReadyMs below turnMs by about the referee time, and the findings of the review", async () => {
  const r = await run(setup("json", [...CALLS(data), { text: ANSWER }], WARNING), "json");
  expect(r.code, r.err).toBe(0);
  const out = JSON.parse(r.out);
  expect(out.stop).toBe("answer");
  expect(out.answer).toBe(ANSWER);
  expect(out.turnMs - out.answerReadyMs).toBeGreaterThanOrEqual(1000);
  withinMs(out.turnMs - out.answerReadyMs, REFEREE_MS * 10);
  expect(out.findings.map((f: { message: string; source: string }) => `${f.source}: ${f.message}`)).toContain("referee: The sample is small.");
});

test("headless stream-json sends answer_ready before the review notes and ends with the result", async () => {
  const r = await run(setup("stream", [...CALLS(data), { text: ANSWER }], WARNING), "stream-json");
  expect(r.code, r.err).toBe(0);
  const lines = r.out.trim().split("\n").map((l) => JSON.parse(l));
  const kinds = lines.filter((l) => l.type === "entry").map((l) => l.entry.kind);
  expect(kinds.indexOf("answer_ready")).toBeGreaterThan(-1);
  expect(kinds.indexOf("answer_ready")).toBeLessThan(kinds.indexOf("finding"));
  const result = lines.at(-1);
  expect(result.type).toBe("result");
  expect(result.answer).toBe(ANSWER);
  expect(result.turnMs - result.answerReadyMs).toBeGreaterThanOrEqual(1000);
  const ready = lines.find((l) => l.type === "entry" && l.entry.kind === "answer_ready");
  expect(ready.entry.data.elapsedMs).toBe(result.answerReadyMs);
});

test("headless json gives the review state and the finding count", async () => {
  const done = JSON.parse((await run(setup("state", [...CALLS(data), { text: ANSWER }], WARNING), "json")).out);
  expect(done.review).toBe("done");
  expect(done.findingCount).toBe(1);
  const none = JSON.parse((await run(setup("none", [{ text: "Hello." }], WARNING), "json")).out);
  expect(none.review).toBe("none");
  expect(none.findingCount).toBe(0);
});

test("a referee that fails gives review failed, keeps the answer and exits 0", async () => {
  const r = await run(setup("failed", [...CALLS(data), { text: ANSWER }], "", { completeError: "referee down" }), "json");
  expect(r.code, r.err).toBe(0);
  const out = JSON.parse(r.out);
  expect(out.review).toBe("failed");
  expect(out.stop).toBe("answer");
  expect(out.answer).toBe(ANSWER);
  expect(r.err).toContain("referee down");
  const stream = await run(setup("failed2", [...CALLS(data), { text: ANSWER }], "", { completeError: "referee down" }), "stream-json");
  expect(JSON.parse(stream.out.trim().split("\n").at(-1)!)).toMatchObject({ type: "result", review: "failed", answer: ANSWER });
});
