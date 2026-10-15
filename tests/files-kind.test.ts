import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, expect, test, vi } from "vitest";
import type { ToolContext } from "../src/core/types.ts";
import { loadAdapter } from "../src/adapters/manifest.ts";
import { startAdapter, type AdapterRuntime } from "../src/adapters/runtime.ts";

const order = vi.hoisted(() => ({ reverse: false }));

vi.mock("node:fs", async (original) => {
  const fs = await original<typeof import("node:fs")>();
  const readdirSync = ((...a: Parameters<typeof fs.readdirSync>) => {
    const r = (fs.readdirSync as (...x: unknown[]) => unknown[])(...a);
    return order.reverse ? [...r].reverse() : r;
  }) as typeof fs.readdirSync;
  return { ...fs, default: { ...fs, readdirSync }, readdirSync };
});

const root = mkdtempSync(join(tmpdir(), "cuvette-files-"));
let rt: AdapterRuntime | undefined;

afterAll(async () => {
  await rt?.close();
});

async function tools() {
  const dir = mkdtempSync(join(root, "adapter-"));
  writeFileSync(join(dir, "adapter.yaml"), "adapter: { name: t-files }\nprogram: { name: t }\nconnection:\n  kind: files\n");
  await rt?.close();
  const dirs = { workDir: mkdtempSync(join(root, "work-")), sessionDir: mkdtempSync(join(root, "session-")) };
  rt = await startAdapter(loadAdapter(dir), dirs);
  const ctx: ToolContext = { session: "s", callId: "c", workDir: dirs.workDir, sessionDir: dirs.sessionDir, signal: new AbortController().signal, log: () => { throw new Error("no log"); }, callTool: async () => ({ ok: true }) };
  return (name: string, args: Record<string, unknown>) => Promise.resolve(rt!.tools()).then((all) => all.find((t) => t.name === name)!.execute(args, ctx));
}

test("list_files: a search with ** stops at 2000 entries with a note", async () => {
  const run = await tools();
  const folder = join(root, "many");
  mkdirSync(join(folder, "sub"), { recursive: true });
  for (let i = 0; i < 2100; i++) writeFileSync(join(folder, i % 2 ? "sub" : "", `f${i}.txt`), "");
  const r = await run("list_files", { folder, pattern: "**.txt" });
  expect(r.metrics).toEqual({ n_files: 2000 });
  expect(r.summary).toContain("stops at 2000");
  const few = join(root, "few");
  mkdirSync(few);
  writeFileSync(join(few, "a.txt"), "");
  const f = await run("list_files", { folder: few, pattern: "**.txt" });
  expect(f.metrics).toEqual({ n_files: 1 });
  expect(f.summary).not.toContain("stops at");
});

test("list_files: a flat folder lists all entries sorted, and caps after the sort", async () => {
  const run = await tools();
  const folder = join(root, "flat");
  mkdirSync(folder);
  const names = Array.from({ length: 2100 }, (_, i) => `f${String(i).padStart(4, "0")}.txt`);
  for (const n of names) writeFileSync(join(folder, n), "");
  order.reverse = true;
  const r = await run("list_files", { folder, pattern: "*.txt" }).finally(() => { order.reverse = false; });
  const listed = (r.data as { files: { path: string }[] }).files.map((f) => f.path);
  expect(listed).toEqual(names.slice(0, 2000).map((n) => join(folder, n)));
  expect(r.summary).toContain("stops at 2000");
  const small = join(root, "flat-small");
  mkdirSync(small);
  for (let i = 0; i < 1500; i++) writeFileSync(join(small, `g${i}.txt`), "");
  const s = await run("list_files", { folder: small, pattern: "*.txt" });
  expect(s.metrics).toEqual({ n_files: 1500 });
  expect(s.summary).not.toContain("stops at");
});

test("read_table: reads a prefix of a large file and says so", async () => {
  const run = await tools();
  const path = join(root, "big.csv");
  const row = "1,2,3,4,5,6,7,8,9,10\n";
  writeFileSync(path, `a,b,c,d,e,f,g,h,i,j\n${row.repeat(Math.ceil((9 * 1024 * 1024) / row.length))}`);
  const r = await run("read_table", { path, max_rows: 2 });
  expect(r.ok).toBe(true);
  expect(r.summary).toContain("only the first 8 MB");
  expect(r.table!.rows).toHaveLength(2);
  expect(r.table!.n_rows).toBeLessThan(Math.ceil((9 * 1024 * 1024) / row.length));
  expect(r.table!.n_rows).toBeGreaterThan(300000);
  const small = join(root, "small.csv");
  writeFileSync(small, "x,y\n1,2\n3,4\n");
  const s = await run("read_table", { path: small });
  expect(s.table).toMatchObject({ rows: [[1, 2], [3, 4]], n_rows: 2 });
  expect(s.summary).not.toContain("only the first");
});
