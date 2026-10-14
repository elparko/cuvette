import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, test } from "vitest";
import type { Args, Tool, ToolContext } from "../src/core/types.ts";
import { loadAdapter, type ToolDef } from "../src/adapters/manifest.ts";
import { startAdapter, type AdapterRuntime } from "../src/adapters/runtime.ts";
import { collectOutputs, parseToolText, readFields, buildOutput, runProcess, type CallDir } from "../src/adapters/kinds/common.ts";
import { convertResult } from "../src/adapters/mcp.ts";
import { Rng, runs } from "./fuzz-rng.ts";

const root = mkdtempSync(join(tmpdir(), "cuvette-fuzz-adapter-"));
const started: AdapterRuntime[] = [];
afterAll(async () => {
  for (const rt of started) await rt.close();
  rmSync(root, { recursive: true, force: true });
});

const WORDS = ["a", "µg", "naïve", "日本語", "🧪", "\u202e", "\u0000", "<b>", '"q"', "\\", "\n", "\r", "\t", "x".repeat(50)];

function junkJson(r: Rng, depth = 0): unknown {
  const k = r.int(0, depth > 3 ? 4 : 8);
  if (k === 0) return null;
  if (k === 1) return r.bool();
  if (k === 2) return r.pick([0, -1, 1e308, -1e-308, 3.5, 2 ** 53 + 1]);
  if (k === 3) return r.string(WORDS, 0, 6);
  if (k === 4) return r.pick(["/etc/passwd", "/", root, "C:\\x", "~/x"]);
  if (k === 5 && r.bool(0.2)) return { toString: 1, valueOf: 1 };
  if (k === 5) return Array.from({ length: r.int(0, 5) }, () => junkJson(r, depth + 1));
  const o: Record<string, unknown> = {};
  for (let n = r.int(0, 6); n > 0; n--) {
    const key = r.pick(["ok", "error", "summary", "metrics", "outputs", "table", "columns", "rows", "n_rows", "path", "manual_route", "fidelity", "toString", "valueOf", "__proto__", "constructor", "x"]);
    o[key] = junkJson(r, depth + 1);
  }
  return o;
}

function damaged(r: Rng, s: string): string {
  const k = r.int(0, 5);
  if (k === 0) return s.slice(0, r.int(0, s.length));
  if (k === 1) return s.slice(r.int(0, s.length));
  if (k === 2) return s.replace(/[{}[\]":,]/, "");
  if (k === 3) return `${s}${s}`;
  if (k === 4) return r.bytes(r.int(1, 40)).toString("latin1");
  return s;
}

const def = (over: Partial<ToolDef> = {}): ToolDef => ({ name: "t", description: "d", params: {}, required: [], outputs: {}, parse: "json", command: [], ...over }) as unknown as ToolDef;
const fakeAdapter = { name: "fz", mapEntry: () => undefined, manifest: { adapter: { name: "fz" } } } as never;

describe("fuzz: adapter output readers", () => {
  test("readFields and parseToolText take any JSON value without a crash", () => {
    const r = new Rng(7001);
    for (let i = 0; i < runs(1500); i++) {
      const v = junkJson(r);
      expect(() => readFields(v, { scanPaths: true, inferMetrics: true })).not.toThrow();
      const text = r.bool(0.7) ? JSON.stringify(v) : damaged(r, JSON.stringify(v));
      for (const mode of ["json", "keyvalue", "csv", "text"] as const) {
        try {
          parseToolText(mode, text, []);
        } catch (e) {
          expect(mode).toBe("json");
          expect(e).toBeInstanceOf(SyntaxError);
        }
      }
    }
  });

  test("a table with object columns or flat rows reads without a crash", () => {
    const f = readFields(JSON.parse('{"table":{"columns":[{"toString":1},null,2],"rows":[1,["a"]]}}'));
    expect(f.table).toMatchObject({ columns: ['{"toString":1}', "null", "2"], rows: [[1], ["a"]], n_rows: 2 });
  });

  test("buildOutput returns an output for any stdout", () => {
    const r = new Rng(7002);
    const dir = join(root, "build");
    mkdirSync(dir);
    for (let i = 0; i < runs(400); i++) {
      const v = junkJson(r);
      const raw = JSON.stringify(v) ?? "";
      const stdout = r.bool(0.6) ? raw : r.bool() ? damaged(r, raw) : r.bytes(r.int(0, 300)).toString("utf8");
      const parse = r.pick(["json", "keyvalue", "csv", "text"] as const);
      const out = buildOutput({ adapter: fakeAdapter, def: def({ parse }), args: {}, call: { dir, outputs: {} }, stdout, route: "r" });
      expect(typeof out.ok).toBe("boolean");
      expect(["string", "undefined"]).toContain(typeof out.summary);
      if (!out.ok) expect(typeof out.error).toBe("string");
    }
  });

  test("convertResult takes random MCP content without a crash", () => {
    const r = new Rng(7003);
    const dir = join(root, "mcp");
    mkdirSync(dir);
    for (let i = 0; i < runs(400); i++) {
      const content = Array.from({ length: r.int(0, 4) }, () => {
        const type = r.pick(["text", "image", "resource", "audio", ""]);
        const text = r.bool(0.5) ? JSON.stringify(junkJson(r)) : damaged(r, JSON.stringify(junkJson(r)) ?? "");
        return { type, text: r.bool(0.9) ? text : undefined, data: type === "image" ? r.bytes(r.int(0, 50)).toString(r.bool() ? "base64" : "latin1") : undefined, mimeType: r.pick([undefined, "image/png", "IMAGE/JPEG", "text/html", ""]) };
      });
      const res = { content: r.bool(0.9) ? content : undefined, structuredContent: r.bool(0.2) ? junkJson(r) : undefined, isError: r.bool(0.2) };
      const out = convertResult(res, r.pick(["t", "a/b", "../x", "日本"]), {}, undefined, dir);
      expect(typeof out.ok).toBe("boolean");
      expect(["string", "undefined"]).toContain(typeof out.summary);
      expect((out.text ?? "").length).toBeLessThanOrEqual(20100);
    }
  });

  test("collectOutputs: odd names, symlinks, a loop and many files", () => {
    const r = new Rng(7004);
    for (let i = 0; i < runs(6); i++) {
      const dir = join(root, `out-${i}`);
      mkdirSync(dir);
      const names = new Set<string>();
      const made: string[] = [];
      for (let n = r.int(1, 40); n > 0; n--) {
        const name = r.pick(["a b.csv", "ü.png", "日本.txt", "-x", "#1", "%20", "x\ny", "x\\y", " lead", "trail ", "a".repeat(200), "out.csv", "😀.json"]) + r.int(0, 9999);
        if (names.has(name)) continue;
        names.add(name);
        const sub = r.bool(0.3) ? join(dir, "sub", "deep") : dir;
        mkdirSync(sub, { recursive: true });
        writeFileSync(join(sub, name), "x");
        made.push(join(sub, name));
      }
      writeFileSync(join(dir, ".hidden"), "x");
      symlinkSync(dir, join(dir, "loop"));
      symlinkSync(join(dir, "nowhere"), join(dir, "broken"));
      symlinkSync(made[0], join(dir, "link-to-file"));
      const call: CallDir = { dir, outputs: { out: join(dir, "out.csv") } };
      const files = collectOutputs(call, def({ outputs: { out: { kind: "table" } } as never }));
      expect(files.map((f) => f.path).sort()).toEqual(expect.arrayContaining([...made].sort()));
      expect(files.every((f) => !f.path.includes(".hidden"))).toBe(true);
    }
    const many = join(root, "many");
    mkdirSync(many);
    for (let n = 0; n < 5000; n++) writeFileSync(join(many, `f${n}.txt`), "");
    const t = performance.now();
    expect(collectOutputs({ dir: many, outputs: {} }, def()).length).toBe(5000);
    expect(performance.now() - t).toBeLessThan(5000);
  });
});

const FAKE = String.raw`
const fs = require("node:fs");
const path = require("node:path");
const dir = process.argv[process.argv.length - 1];
const plan = () => JSON.parse(fs.readFileSync(path.join(dir, "plan.json"), "utf8"));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function play(steps, id) {
  for (const s of steps) {
    const text = s.text.replaceAll("@ID@", String(id)).replaceAll("@ID2@", String(id + 7));
    const buf = s.b64 ? Buffer.from(s.b64, "base64") : Buffer.from(text);
    if (s.err) process.stderr.write(buf);
    else if (s.split) {
      const at = Math.min(buf.length, s.split);
      process.stdout.write(buf.subarray(0, at));
      await sleep(5);
      process.stdout.write(buf.subarray(at));
    } else process.stdout.write(buf);
    if (s.exit !== undefined) {
      await sleep(5);
      process.exit(s.exit);
    }
  }
}
(async () => {
  await play(plan().start, 0);
  let buf = "";
  process.stdin.on("data", async (d) => {
    buf += d.toString();
    let i;
    while ((i = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, i);
      buf = buf.slice(i + 1);
      await play(plan().reply, JSON.parse(line).id);
    }
  });
})();
`;

interface Step {
  text: string;
  err?: boolean;
  split?: number;
  exit?: number;
  b64?: string;
}

function noise(r: Rng): Step {
  const k = r.int(0, 8);
  if (k === 0) return { text: "null\n" };
  if (k === 1) return { text: `${r.pick(["42", '"str"', "[]", "true", "{}", '{"id":"@ID@"}', '{"id":null}', '{"ready":false}'])}\n` };
  if (k === 2) return { text: `{"id":@ID2@,"ok":true,"result":"stale"}\n` };
  if (k === 3) return { text: "", b64: Buffer.concat([r.bytes(r.int(1, 200)), Buffer.from("\n")]).toString("base64") };
  if (k === 4) return { text: `${"y".repeat(r.int(1000, 300000))}\n` };
  if (k === 5) return { text: `Warning: ${r.string(WORDS, 1, 5)}\n`, err: true };
  if (k === 6) return { text: '{"id": @ID@, "ok": tr\n' };
  if (k === 7) return { text: "", b64: Buffer.from([0xff, 0xfe, 0x00, 0x0a]).toString("base64") };
  return { text: "plain text from a print()\n" };
}

describe("fuzz: program output", () => {
  test("text with many-byte characters in big chunks reads back with no lost character", async () => {
    const r = new Rng(7201);
    for (let i = 0; i < runs(3); i++) {
      const text = r.string(["a", "µ", "日", "🧪", "\n", "é", "\u0301"], 100000, 300000);
      const src = join(root, `big-${i}.txt`);
      writeFileSync(src, text);
      const out = await runProcess([process.execPath, "-e", `process.stdout.write(require("fs").readFileSync(${JSON.stringify(src)}));process.stderr.write(require("fs").readFileSync(${JSON.stringify(src)}))`]);
      expect(out.code).toBe(0);
      expect(out.stdout === text).toBe(true);
      expect(out.stderr === text).toBe(true);
    }
  });
});

const hasNumpy = await import("node:child_process").then(({ spawnSync }) => spawnSync("python3", ["-c", "import numpy"]).status === 0);

describe("fuzz: Python worker replies", () => {
  test.skipIf(!hasNumpy)("an array with NaN or infinity gives a reply, not a timeout", async () => {
    const dir = mkdtempSync(join(root, "nan-"));
    writeFileSync(join(dir, "adapter.yaml"), `adapter: { name: t-nan }\nprogram: { name: t }\nconnection:\n  kind: python\n  call_timeout_s: 20\ntools:\n  - { name: f, description: d, function: "m:f" }\n`);
    writeFileSync(join(dir, "m.py"), "import numpy as np\ndef f(): return np.array([np.nan, 1.0, np.inf])\n");
    const dirs = { workDir: join(dir, "work"), sessionDir: join(dir, "session") };
    const rt = await startAdapter(loadAdapter(dir), dirs);
    started.push(rt);
    const [tool] = await rt.tools();
    const t = performance.now();
    const out = await tool.execute({}, { session: "s", callId: "c", workDir: dirs.workDir, sessionDir: dirs.sessionDir, signal: new AbortController().signal } as unknown as ToolContext);
    expect(out.ok).toBe(true);
    expect(out.metrics).toMatchObject({ size: 3, ndim: 1 });
    expect(performance.now() - t).toBeLessThan(15000);
  }, 30000);

  test("a worker with damaged output never hangs or crashes the harness", async () => {
    const r = new Rng(7101);
    const dir = mkdtempSync(join(root, "py-"));
    writeFileSync(join(dir, "fake.cjs"), FAKE);
    writeFileSync(
      join(dir, "adapter.yaml"),
      `adapter: { name: t-fuzzpy }\nprogram: { name: t }\nconnection:\n  kind: python\n  interpreter: ["${process.execPath}", "${join(dir, "fake.cjs")}"]\n  call_timeout_s: 3\n  startup_timeout_s: 3\ntools:\n  - { name: f, description: d, function: "m:f" }\n`,
    );
    const plan = (start: Step[], reply: Step[]) => writeFileSync(join(dir, "plan.json"), JSON.stringify({ start, reply }));
    plan([{ text: '{"ready": true}\n' }], [{ text: '{"id":@ID@,"ok":true,"result":1}\n' }]);
    const dirs = { workDir: join(dir, "work"), sessionDir: join(dir, "session") };
    const rt = await startAdapter(loadAdapter(dir), dirs);
    started.push(rt);
    const tools: Record<string, Tool> = Object.fromEntries((await rt.tools()).map((t) => [t.name, t]));
    const ctx = (): ToolContext => ({ session: "s", callId: "c", workDir: dirs.workDir, sessionDir: dirs.sessionDir, signal: new AbortController().signal, log: () => undefined, callTool: async () => ({ ok: true }) }) as unknown as ToolContext;
    const run = (args: Args = {}) => tools.f.execute(args, ctx());
    for (let i = 0; i < runs(12); i++) {
      const value = r.string(WORDS, 0, 8);
      const good = JSON.stringify({ id: 0, ok: true, result: { value } }).replace('"id":0', '"id":@ID@');
      const start = [...Array.from({ length: r.int(0, 3) }, () => noise(r)), { text: '{"ready": true}\n' }];
      const reply = Array.from({ length: r.int(0, 4) }, () => noise(r));
      const fate = r.int(0, 3);
      const bytes = Buffer.from(`${good}\n`);
      if (fate === 0) reply.push({ text: `${good}\n` });
      else if (fate === 1) reply.push({ text: `${good}\n`, split: r.int(1, bytes.length - 1) });
      else if (fate === 2) reply.push({ text: good.slice(0, r.int(0, good.length - 1)), exit: r.int(0, 3) });
      else reply.push({ text: "", exit: 9 });
      plan(start, reply);
      const out = await run();
      if (fate <= 1) expect(out).toMatchObject({ ok: true, data: { value } });
      else {
        expect(out.ok).toBe(false);
        expect(out.error).toMatch(/stopped|timed out/);
      }
    }
  }, 60000);
});
