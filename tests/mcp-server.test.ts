import { spawn } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { ToolListChangedNotificationSchema } from "@modelcontextprotocol/sdk/types.js";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

const root = resolve(__dirname, "..");
const ga = join(root, "bin/ga.js");
const lab = join(__dirname, "fixtures/lab");
const live = process.env.GA_LIVE ? test : test.skip;

let client: Client | undefined;
let home = "";
const transportErrors: Error[] = [];
const stderr: string[] = [];

async function connect(adapter?: string) {
  const transport = new StdioClientTransport({
    command: "node",
    args: [ga, "mcp", ...(adapter ? ["--adapter", adapter] : [])],
    env: { ...(process.env as Record<string, string>), GA_HOME: home },
    cwd: home,
    stderr: "pipe",
  });
  transport.onerror = (e) => transportErrors.push(e);
  transport.stderr?.on("data", (d) => stderr.push(String(d)));
  client = new Client({ name: "test-client", version: "1.0" });
  await client.connect(transport);
  return client;
}

async function call(name: string, args: Record<string, unknown> = {}) {
  const r = (await client!.callTool({ name, arguments: args })) as { content: { type: string; text: string }[]; isError?: boolean };
  return { text: r.content.map((c) => c.text).join("\n"), isError: !!r.isError };
}

beforeEach(() => {
  home = mkdtempSync(join(tmpdir(), "ga-mcp-"));
  transportErrors.length = 0;
  stderr.length = 0;
});
afterEach(async () => {
  await client?.close();
  client = undefined;
});

test("lists adapter tools with their schemas and the ga tools", async () => {
  const c = await connect(lab);
  expect(c.getServerCapabilities()?.tools).toBeDefined();
  expect(c.getInstructions()).toMatch(/ga_setup/);
  const { tools } = await c.listTools();
  const names = tools.map((t) => t.name);
  for (const n of ["count", "blur", "ga_setup", "ga_questions", "ga_answer", "ga_trail", "ga_export"]) expect(names).toContain(n);
  const count = tools.find((t) => t.name === "count")!;
  expect(count.inputSchema.type).toBe("object");
  expect(Object.keys(count.inputSchema.properties as object).sort()).toEqual(["input", "method", "min_size"]);
  expect((count.inputSchema.properties as any).min_size.type).toBe("number");
  expect(count.inputSchema.required).toContain("input");
  for (const t of tools) {
    expect(t.inputSchema.type).toBe("object");
    expect(t.description).toBeTruthy();
  }
  expect(transportErrors).toEqual([]);
});

test("with no adapter, the client lists the adapters, the scientist answers the program card, and the tool list grows", async () => {
  mkdirSync(join(home, "adapters"), { recursive: true });
  symlinkSync(lab, join(home, "adapters", "lab"));
  const c = await connect();
  const changed: number[] = [];
  c.setNotificationHandler(ToolListChangedNotificationSchema, async () => void changed.push(1));
  expect(c.getInstructions()).toMatch(/list_adapters/);
  const names = (await c.listTools()).tools.map((t) => t.name);
  expect(names).toEqual(expect.arrayContaining(["list_adapters", "use_adapter", "ga_setup"]));
  expect(names).not.toContain("count");
  expect((await call("list_adapters", { filter: "lab" })).text).toMatch(/- lab \| Lab counter/);
  await call("ga_setup", { values: { question: "q" } });
  const blocked = await call("use_adapter", { name: "lab", reason: "it counts particles" });
  expect(blocked.isError).toBe(true);
  expect(blocked.text).toMatch(/BLOCKED: the choice of program belongs to the scientist/);
  const open = JSON.parse((await call("ga_questions")).text) as { qid: string; text: string }[];
  expect(open[0].text).toBe("The agent wants to use Lab counter through the lab adapter: it counts particles.");
  await call("ga_answer", { qid: open[0].qid, value: "lab" });
  const ok = await call("use_adapter", { name: "lab", reason: "it counts particles" });
  expect(ok.isError).toBe(false);
  expect(ok.text).toMatch(/Loaded the adapter lab/);
  const after = (await c.listTools()).tools.map((t) => t.name);
  expect(after.slice(0, names.length)).toEqual(names);
  expect(after).toEqual(expect.arrayContaining(["count", "blur"]));
  await vi.waitFor(() => expect(changed.length).toBeGreaterThan(0));
  expect(transportErrors).toEqual([]);
});

test("setup, a blocked call, an answer, a good call, the trail and the export", async () => {
  const c = await connect(lab);
  const setup = await call("ga_setup", { values: { question: "How many particles?" } });
  expect(setup.isError).toBe(false);
  const fields = JSON.parse(setup.text).fields as { key: string }[];
  expect(fields.map((f) => f.key)).toContain("method");

  const blocked = await call("count", { input: "/data/a.tif" });
  expect(blocked.text).toMatch(/BLOCKED/);
  const open = JSON.parse((await call("ga_questions")).text) as { qid: string; title: string }[];
  expect(open).toHaveLength(1);
  expect(open[0].title).toMatch(/Threshold method/i);

  const ans = await call("ga_answer", { qid: open[0].qid, value: "Otsu", note: "scientist said so" });
  expect(ans.text).toBe(`Recorded the answer to ${open[0].qid}.`);
  expect(JSON.parse((await call("ga_questions")).text)).toEqual([]);

  const ok = await call("count", { input: "/data/a.tif" });
  expect(ok.isError).toBe(false);
  expect(ok.text).not.toMatch(/BLOCKED/);
  expect(ok.text).toMatch(/41/);

  const trail = await call("ga_trail", { level: 1 });
  expect(trail.text).toMatch(/count/i);

  const bad = await call("ga_answer", { qid: "q99", value: "x" });
  expect(bad.isError).toBe(true);

  const exp = await call("ga_export", { format: "protocol" });
  expect(exp.isError).toBe(false);
  const path = exp.text.trim();
  expect(existsSync(path)).toBe(true);
  expect(readFileSync(path, "utf8")).toMatch(/count/i);
  expect(await call("no_such_tool")).toMatchObject({ isError: true });
  expect(transportErrors).toEqual([]);
});

test("ga_eln_push refuses because the MCP client cannot approve, and ga_export offers eln", async () => {
  const { writeFileSync } = await import("node:fs");
  writeFileSync(join(home, "credentials.json"), JSON.stringify({ elabftw_url: "http://127.0.0.1:9", elabftw_api_key: "k-secret" }), { mode: 0o600 });
  const c = await connect(lab);
  const { tools } = await c.listTools();
  expect(tools.map((t) => t.name)).toContain("ga_eln_push");
  expect((tools.find((t) => t.name === "ga_export")!.inputSchema.properties as any).format.enum).toContain("eln");
  await call("ga_setup", { values: { question: "q" } });
  const r = await call("ga_eln_push");
  expect(r.isError).toBe(true);
  expect(r.text).toMatch(/did not approve/);
  expect(r.text).not.toMatch(/k-secret/);
  const eln = await call("ga_export", { format: "eln" });
  expect(eln.isError).toBe(false);
  expect(eln.text.trim().endsWith(".eln")).toBe(true);
});

test("stdout carries only protocol lines", async () => {
  const child = spawn("node", [ga, "mcp", "--adapter", lab], { cwd: home, env: { ...process.env, GA_HOME: home }, stdio: ["pipe", "pipe", "pipe"] });
  let out = "";
  child.stdout.on("data", (d) => (out += d));
  const send = (m: unknown) => child.stdin.write(JSON.stringify(m) + "\n");
  send({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-03-26", capabilities: {}, clientInfo: { name: "t", version: "1" } } });
  send({ jsonrpc: "2.0", method: "notifications/initialized" });
  send({ jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "ga_setup", arguments: { values: { question: "q" } } } });
  send({ jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "count", arguments: { input: "/x" } } });
  send({ jsonrpc: "2.0", id: 4, method: "tools/call", params: { name: "blur", arguments: { input: "/x", sigma: 2 } } });
  const deadline = Date.now() + 20000;
  while (!/"id":4/.test(out) && Date.now() < deadline) await new Promise((r) => setTimeout(r, 100));
  const exited = new Promise<number | null>((ok) => child.on("exit", ok));
  child.stdin.end();
  const code = await Promise.race([exited, new Promise<string>((ok) => setTimeout(() => ok("running"), 5000))]);
  if (code === "running") child.kill();
  const lines = out.split("\n").filter(Boolean);
  expect(lines.length).toBeGreaterThanOrEqual(4);
  for (const l of lines) expect(JSON.parse(l).jsonrpc).toBe("2.0");
  expect(code).not.toBe("running");
});

live("ImageJ through ga mcp: open_image then threshold_and_count", { timeout: 240000 }, async () => {
  const c = await connect("imagej");
  const { tools } = await c.listTools();
  expect(tools.map((t) => t.name)).toEqual(expect.arrayContaining(["open_image", "threshold_and_count", "ga_setup"]));
  const image = join(root, "catalog/imagej/data/blobs.gif");
  const setup = await call("ga_setup", {
    values: { question: "How many blobs are there?", replicate: "images or fields", pixel_size: "uncalibrated", alpha: 0.05, threshold_method: "Otsu", particle_size_min: 10, background_subtraction: 0 },
  });
  expect(setup.isError).toBe(false);
  const opened = await call("open_image", { path: image });
  expect(opened.isError).toBe(false);
  expect(opened.text).toMatch(/256 by 254/);
  const counted = await call("threshold_and_count", { input: image });
  expect(counted.text).not.toMatch(/BLOCKED/);
  expect(counted.isError).toBe(false);
  expect(counted.text).toMatch(/"count"/);
  expect(JSON.parse((await call("ga_questions")).text)).toEqual([]);
  const trail = await call("ga_trail", { level: 1 });
  expect(trail.text).toMatch(/Counted 44 particles with the Otsu threshold/);
  expect(transportErrors).toEqual([]);
});
