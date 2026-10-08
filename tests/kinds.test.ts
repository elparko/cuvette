import { createServer, type Server } from "node:http";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, expect, test } from "vitest";
import type { Args, Tool, ToolContext, ToolOutput } from "../src/core/types.ts";
import { loadAdapter } from "../src/adapters/manifest.ts";
import { startAdapter, type AdapterRuntime } from "../src/adapters/runtime.ts";
import { parseCsv, parseKeyValue, renderArgv, solidPng, tablePreview, validateArgs } from "../src/adapters/kinds/common.ts";

const root = mkdtempSync(join(tmpdir(), "ga-kinds-"));
const started: AdapterRuntime[] = [];
let counter = 0;

function ctx(workDir: string, sessionDir: string, signal: AbortSignal = new AbortController().signal): ToolContext {
  return { session: "s", callId: "c", workDir, sessionDir, signal, log: () => { throw new Error("no log"); }, callTool: async () => ({ ok: true }) };
}

async function start(adapterDir: string) {
  const n = ++counter;
  const dirs = { workDir: join(root, `work${n}`), sessionDir: join(root, `session${n}`) };
  const rt = await startAdapter(loadAdapter(adapterDir), dirs);
  started.push(rt);
  const tools: Record<string, Tool> = Object.fromEntries((await rt.tools()).map((t) => [t.name, t]));
  const run = (name: string, args: Args = {}, signal?: AbortSignal): Promise<ToolOutput> => tools[name].execute(args, ctx(dirs.workDir, dirs.sessionDir, signal));
  return { rt, tools, run, dirs };
}

function adapter(yaml: string, files: Record<string, string> = {}): string {
  const dir = mkdtempSync(join(root, "adapter-"));
  writeFileSync(join(dir, "adapter.yaml"), yaml);
  for (const [name, text] of Object.entries(files)) writeFileSync(join(dir, name), text);
  return dir;
}

afterAll(async () => {
  for (const rt of started) await rt.close();
});

const head = (kind: string, extra = "") => `adapter: { name: t-${kind} }\nprogram: { name: t }\nconnection:\n  kind: ${kind}\n${extra}`;

test("argument templates: one value is one argv item, optional flags drop", () => {
  const scope = { ph: { node: "/n" }, args: { text: "a b; $(rm -rf x)", list: ["1", "2"], n: 3 }, outputs: { out: "/o.csv" }, declared: new Set(["text", "list", "n", "sep"]) };
  expect(renderArgv(["{node}", "{text}", "--n={n}", "{list}", "--sep", "{sep}", "--out={output.out}", "--x={sep}"], scope)).toEqual(["/n", "a b; $(rm -rf x)", "--n=3", "1", "2", "--out=/o.csv"]);
});

test("schema check: type, enum, range, pattern, defaults, unknown keys", () => {
  const schema = { type: "object", properties: { a: { type: "integer", minimum: 1, maximum: 5 }, m: { type: "string", enum: ["x", "y"], default: "x" }, p: { type: "string", pattern: "^[a-z]+$" } }, required: ["a"], additionalProperties: false };
  expect(validateArgs(schema, { a: 2 }).args).toEqual({ a: 2, m: "x" });
  expect(validateArgs(schema, { a: "3" }).args.a).toBe(3);
  expect(validateArgs(schema, {}).error).toMatch(/missing required argument a/);
  expect(validateArgs(schema, { a: 9 }).error).toMatch(/at most 5/);
  expect(validateArgs(schema, { a: 1.5 }).error).toMatch(/integer/);
  expect(validateArgs(schema, { a: 1, m: "z" }).error).toMatch(/one of/);
  expect(validateArgs(schema, { a: 1, p: "A1" }).error).toMatch(/pattern/);
  expect(validateArgs(schema, { a: 1, q: 1 }).error).toMatch(/unknown argument q\. The arguments of this tool are: a/);
});

test("parsers: csv, table preview, key-value", () => {
  expect(parseCsv('a,b\n1,"x,y"\n2,"say ""hi"""\n')).toEqual([["a", "b"], ["1", "x,y"], ["2", 'say "hi"']]);
  const rows = Array.from({ length: 20 }, (_, i) => `${i},${i * 2}`).join("\n");
  const t = tablePreview(`a,b\n${rows}\n`, "/x.csv");
  expect(t).toMatchObject({ columns: ["a", "b"], n_rows: 20, path: "/x.csv" });
  expect(t.rows).toHaveLength(12);
  expect(t.rows[1]).toEqual([1, 2]);
  expect(parseKeyValue("mean: 2.5\nname = bob\nbad line\nn=3")).toEqual({ data: { mean: 2.5, name: "bob", n: 3 }, metrics: { mean: 2.5, n: 3 } });
});

const cliYaml = `${head("cli", "  call_timeout_s: 2\n")}tools:
  - name: argv
    description: Show the argv.
    params: { text: { type: string }, n: { type: integer, minimum: 0, maximum: 9, default: 1 }, mode: { type: string, enum: [a, b] } }
    required: [text]
    command: ["{node}", "-e", "console.log(JSON.stringify(process.argv.slice(1)))", "{text}", "--n={n}", "--mode", "{mode}"]
    parse: json
  - name: fail
    description: Exit 3.
    command: ["{node}", "-e", "console.error('a'.repeat(3000)+'THE-END'); process.exit(3)"]
  - name: sleep
    description: Sleep.
    command: ["{node}", "-e", "setTimeout(()=>{}, 30000)"]
  - name: make_files
    description: Write a CSV and an image.
    outputs: { table: { kind: table, ext: .csv } }
    command: ["{node}", "-e", "require('fs').writeFileSync(process.argv[1], 'x,y\\\\n1,2\\\\n3,4\\\\n'); require('fs').writeFileSync('extra.png', 'png'); console.log('mean: 2.5')", "{output.table}"]
    parse: keyvalue
  - name: csv_out
    description: Print a CSV.
    command: ["{node}", "-e", "console.log('a,b\\\\n1,2\\\\n5,6')"]
    parse: csv
  - name: bad_json
    description: Print text.
    command: ["{node}", "-e", "console.log('not json')"]
    parse: json
  - name: nope
    description: Missing program.
    command: ["/no/such/program"]
map:
  - tool: argv
    route: x
    fidelity: exact
    summary: "Got {text} with n={n}."
`;

test("cli: safe argv, route, summary, validation", async () => {
  const { run, tools } = await start(adapter(cliYaml));
  expect(tools.argv.permission).toBeUndefined();
  const nasty = "a b; $(touch /tmp/ga-pwned) `x`";
  const r = await run("argv", { text: nasty, n: 4 });
  expect(r.ok).toBe(true);
  expect(r.data).toEqual([nasty, "--n=4"]);
  expect(r.summary).toBe(`Got ${nasty} with n=4.`);
  expect(r.manualRoute).toContain("--n=4");
  expect(r.fidelity).toBe("exact");
  expect(existsSync("/tmp/ga-pwned")).toBe(false);
  expect((await run("argv", { text: "q", mode: "b" })).data).toEqual(["q", "--n=1", "--mode", "b"]);
  expect(await run("argv", { text: "q", mode: "c" })).toMatchObject({ ok: false, error: expect.stringMatching(/one of/) });
  expect(await run("argv", { text: "q", n: 99 })).toMatchObject({ ok: false, error: expect.stringMatching(/at most 9/) });
  expect(await run("argv", {})).toMatchObject({ ok: false });
});

test("cli: failures", async () => {
  const { run } = await start(adapter(cliYaml));
  const f = await run("fail");
  expect(f.ok).toBe(false);
  expect(f.error).toMatch(/exited with code 3/);
  expect(f.error).toContain("THE-END");
  expect(f.error!.length).toBeLessThan(2200);
  expect(await run("sleep")).toMatchObject({ ok: false, error: expect.stringMatching(/timed out after 2 s/) });
  expect((await run("nope")).error).toMatch(/cannot start/);
  expect((await run("bad_json")).error).toMatch(/not valid json/);
  const ac = new AbortController();
  const p = run("sleep", {}, ac.signal);
  setTimeout(() => ac.abort(), 300);
  expect((await p).error).toMatch(/cancelled/);
});

test("cli: output files, new files, csv and key-value parsing", async () => {
  const { run } = await start(adapter(cliYaml));
  const r = await run("make_files");
  expect(r.metrics).toEqual({ mean: 2.5 });
  const names = r.outputs!.map((o) => `${o.kind}:${o.name}`).sort();
  expect(names).toEqual(["image:extra.png", "table:table"]);
  expect(readFileSync(r.outputs!.find((o) => o.kind === "table")!.path, "utf8")).toBe("x,y\n1,2\n3,4\n");
  const second = await run("make_files");
  expect(second.outputs![0].path).not.toBe(r.outputs![0].path);
  const c = await run("csv_out");
  expect(c.table).toMatchObject({ columns: ["a", "b"], rows: [[1, 2], [5, 6]], n_rows: 2 });
});

test("python: handles, errors, restart, route", async () => {
  const dir = adapter(
    `${head("python", "  call_timeout_s: 5\n")}tools:
  - { name: make, description: d, function: "m.py:make", params: { n: { type: integer } }, required: [n] }
  - { name: total, description: d, function: "m:total", params: { obj: { type: object } }, required: [obj] }
  - { name: boom, description: d, function: "m:boom" }
  - { name: die, description: d, function: "m:die" }
  - { name: noisy, description: d, function: "m:noisy" }
  - { name: writes, description: d, function: "m:writes", outputs: {} }
  - { name: hang, description: d, function: "m:hang" }
`,
    {
      "m.py": `import os, time
class Box:
    def __init__(self, n): self.items = list(range(n))
def make(n): return Box(n)
def total(obj): return {"sum": sum(obj.items), "metrics": {"count": len(obj.items)}}
def boom(): raise ValueError("bad input")
def die(): os._exit(7)
def noisy():
    print("noise on stdout")
    return {"ok": True}
def writes():
    open("out.txt", "w").write("hi")
    return 1
def hang(): time.sleep(60)
`,
    },
  );
  const { run, rt } = await start(dir);
  const made = await run("make", { n: 4 });
  expect(made.ok).toBe(true);
  const d = made.data as { handle: string; type: string; repr: string };
  expect(d).toMatchObject({ type: "Box" });
  expect(d.repr).toContain("Box");
  expect(made.manualRoute).toBe("m.make(n=4)");
  const t = await run("total", { obj: { handle: d.handle } });
  expect(t).toMatchObject({ ok: true, data: { sum: 6 }, metrics: { count: 4 }, manualRoute: `m.total(obj=${d.handle})` });
  expect(await run("total", { obj: { handle: "h99" } })).toMatchObject({ ok: false, error: expect.stringMatching(/unknown handle/) });
  const b = await run("boom");
  expect(b).toMatchObject({ ok: false, error: "ValueError: bad input" });
  expect(b.text).toContain("Traceback");
  expect((await run("noisy")).ok).toBe(true);
  expect((await run("writes")).outputs?.map((o) => o.name)).toEqual(["out.txt"]);
  const died = await run("die");
  expect(died.ok).toBe(false);
  expect(died.error).toMatch(/^the adapter process stopped: /);
  expect((await run("make", { n: 2 })).ok).toBe(true);
  const ac = new AbortController();
  const p = run("hang", {}, ac.signal);
  setTimeout(() => ac.abort(), 400);
  expect((await p).ok).toBe(false);
  expect((await run("make", { n: 1 })).ok).toBe(true);
  expect(rt.running).toBe(true);
}, 60000);

test("python: numpy arrays are saved as .npy with metrics", async () => {
  const hasNumpy = await import("node:child_process").then(({ spawnSync }) => spawnSync("python3", ["-c", "import numpy"]).status === 0);
  if (!hasNumpy) return;
  const dir = adapter(`${head("python")}tools:\n  - { name: arr, description: d, function: "m:arr" }\n  - { name: back, description: d, function: "m:back", params: { a: { type: object } }, required: [a] }\n`, {
    "m.py": "import numpy as np\ndef arr(): return np.arange(6, dtype=float).reshape(2, 3)\ndef back(a): return float(a.sum())\n",
  });
  const { run } = await start(dir);
  const r = await run("arr");
  const d = r.data as { handle: string; shape: number[]; dtype: string; path: string };
  expect(d).toMatchObject({ type: "ndarray", shape: [2, 3], dtype: "float64" });
  expect(r.metrics).toMatchObject({ min: 0, max: 5, mean: 2.5, size: 6 });
  expect(r.outputs?.[0].path.endsWith(".npy")).toBe(true);
  expect((await run("back", { a: { handle: d.handle } })).data).toBe(15);
});

test("script: params file and GA_PARAMS", async () => {
  const dir = adapter(
    `${head("script", '  interpreter: ["{node}"]\n')}tools:
  - name: sq
    description: d
    script: sq.js
    params: { x: { type: number } }
    required: [x]
    parse: json
`,
    { "sq.js": "const p = JSON.parse(require('fs').readFileSync(process.argv[2], 'utf8'));\nconst same = process.env.GA_PARAMS === process.argv[2];\nconsole.log(JSON.stringify({ square: p.x * p.x, same }));\n" },
  );
  const { run } = await start(dir);
  const r = await run("sq", { x: 7 });
  expect(r).toMatchObject({ ok: true, data: { square: 49, same: true }, metrics: { square: 49 } });
  expect(r.manualRoute).toContain("sq.js");
  expect(r.manualRoute).toContain('{"x":7}');
});

test("http: refuses without network, then calls a local server", async () => {
  const seen: { method?: string; url?: string; body?: string; auth?: string }[] = [];
  const server: Server = createServer((req, res) => {
    let body = "";
    req.on("data", (d) => (body += d));
    req.on("end", () => {
      seen.push({ method: req.method, url: req.url, body, auth: req.headers.authorization });
      if (req.url?.startsWith("/api/missing")) {
        res.writeHead(404, { "content-type": "text/plain" });
        res.end("no such thing");
      } else if (req.url?.startsWith("/api/bin")) {
        res.writeHead(200, { "content-type": "application/octet-stream" });
        res.end(Buffer.from([1, 2, 3]));
      } else {
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ summary: "served", metrics: { size: 12 }, echo: req.url }));
      }
    });
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const port = (server.address() as { port: number }).port;
  process.env.GA_TEST_TOKEN = "tok";
  const yaml = (network: boolean) => `${head("http", `  base_url: http://127.0.0.1:${port}/api\n  network: ${network}\n  headers: { authorization: "Bearer {env:GA_TEST_TOKEN}" }\n`)}tools:
  - name: get_item
    description: d
    params: { id: { type: string }, limit: { type: integer } }
    required: [id]
    request: { method: GET, path: "/items/{id}", query: { limit: "{limit}", fixed: "1" } }
  - name: post_item
    description: d
    params: { n: { type: number }, tags: { type: array } }
    required: [n]
    request: { method: POST, path: /items, body: { count: "{n}", tags: "{tags}", label: "n={n}" } }
  - name: missing
    description: d
    request: { path: /missing }
  - name: bin
    description: d
    outputs: { file: { kind: file, ext: .dat } }
    request: { path: /bin }
`;
  try {
    const off = await start(adapter(yaml(false)));
    expect(await off.run("get_item", { id: "1" })).toMatchObject({ ok: false, error: expect.stringMatching(/network access is off/) });
    expect(seen).toHaveLength(0);
    const on = await start(adapter(yaml(true)));
    const g = await on.run("get_item", { id: "a b/c", limit: 5 });
    expect(g).toMatchObject({ ok: true, summary: "served", metrics: { size: 12 } });
    expect(seen[0]).toMatchObject({ method: "GET", url: "/api/items/a%20b%2Fc?limit=5&fixed=1", auth: "Bearer tok" });
    expect(g.manualRoute).toBe(`GET http://127.0.0.1:${port}/api/items/a%20b%2Fc?limit=5&fixed=1`);
    await on.run("get_item", { id: "z" });
    expect(seen[1].url).toBe("/api/items/z?fixed=1");
    const p = await on.run("post_item", { n: 2.5, tags: ["a", "b"] });
    expect(p.ok).toBe(true);
    expect(JSON.parse(seen[2].body!)).toEqual({ count: 2.5, tags: ["a", "b"], label: "n=2.5" });
    expect(seen[2].method).toBe("POST");
    expect(await on.run("missing")).toMatchObject({ ok: false, error: expect.stringMatching(/HTTP 404: no such thing/) });
    const b = await on.run("bin");
    expect(readFileSync(b.outputs![0].path)).toEqual(Buffer.from([1, 2, 3]));
  } finally {
    server.close();
  }
});

test("files: list_files, read_table, image_info, wait_for_file", async () => {
  const folder = join(root, "data");
  mkdirSync(join(folder, "sub"), { recursive: true });
  writeFileSync(join(folder, "a.csv"), "x,y\n1,2\n3,4\n5,6\n");
  writeFileSync(join(folder, "b.txt"), "b");
  writeFileSync(join(folder, "sub", "c.csv"), "q\n1\n");
  writeFileSync(join(folder, "img.png"), solidPng(5, 3));
  const tiff = Buffer.alloc(8 + 2 + 4 * 12 + 4);
  tiff.write("II", 0);
  tiff.writeUInt16LE(42, 2);
  tiff.writeUInt32LE(8, 4);
  tiff.writeUInt16LE(4, 8);
  [[256, 7], [257, 5], [258, 16], [277, 1]].forEach(([tag, val], i) => {
    const o = 10 + i * 12;
    tiff.writeUInt16LE(tag, o);
    tiff.writeUInt16LE(3, o + 2);
    tiff.writeUInt32LE(1, o + 4);
    tiff.writeUInt16LE(val, o + 8);
  });
  writeFileSync(join(folder, "img.tif"), tiff);
  const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 4, 0, 0, 0xff, 0xc0, 0, 11, 8, 0, 9, 0, 12, 1, 1, 0x11, 0]);
  writeFileSync(join(folder, "img.jpg"), jpeg);

  const { run, tools } = await start(adapter(head("files")));
  expect(Object.keys(tools).sort()).toEqual(["image_info", "list_files", "read_table", "wait_for_file"]);
  expect(tools.list_files.readOnly).toBe(true);

  const l = await run("list_files", { folder, pattern: "*.csv" });
  expect(l.metrics).toEqual({ n_files: 1 });
  expect((await run("list_files", { folder, pattern: "**.csv" })).metrics).toEqual({ n_files: 2 });
  expect((await run("list_files", { folder })).metrics).toEqual({ n_files: 6 - 1 });

  const t = await run("read_table", { path: join(folder, "a.csv"), max_rows: 2 });
  expect(t.table).toMatchObject({ columns: ["x", "y"], rows: [[1, 2], [3, 4]], n_rows: 3 });

  expect((await run("image_info", { path: join(folder, "img.png") })).data).toEqual({ format: "PNG", width: 5, height: 3, bit_depth: 8, channels: 3 });
  expect((await run("image_info", { path: join(folder, "img.tif") })).data).toEqual({ format: "TIFF", width: 7, height: 5, bit_depth: 16, channels: 1, pages: 1 });
  expect((await run("image_info", { path: join(folder, "img.jpg") })).data).toEqual({ format: "JPEG", width: 12, height: 9, bit_depth: 8, channels: 1 });
  expect(await run("image_info", { path: join(folder, "b.txt") })).toMatchObject({ ok: false });

  setTimeout(() => writeFileSync(join(folder, "export-1.dat"), "x"), 400);
  const w = await run("wait_for_file", { folder, pattern: "export-*.dat", timeout_s: 10 });
  expect(w).toMatchObject({ ok: true, data: { path: join(folder, "export-1.dat") } });
  expect(await run("wait_for_file", { folder, pattern: "never-*", timeout_s: 0.5 })).toMatchObject({ ok: false, error: expect.stringMatching(/within 0.5 s/) });
});

test("screen: dry run records actions and gives routes", async () => {
  process.env.GA_SCREEN_DRY_RUN = "1";
  try {
    const { run, tools, dirs } = await start(adapter(head("screen")));
    expect(Object.keys(tools).sort()).toEqual(["click", "focus_app", "key", "screenshot", "type_text"]);
    const c = await run("click", { x: 10, y: 20, app: "Preview" });
    expect(c).toMatchObject({ ok: true, fidelity: "close", manualRoute: "Click at (10, 20) in Preview" });
    expect(await run("type_text", { text: "hello" })).toMatchObject({ ok: true, manualRoute: 'Type "hello"' });
    expect((await run("key", { key: "s", modifiers: ["command"] })).manualRoute).toBe("Press command+s");
    expect((await run("key", { key: "s", modifiers: ["hyper"] })).ok).toBe(false);
    expect((await run("focus_app", { app: "Fiji" })).manualRoute).toBe("Bring Fiji to the front");
    const s = await run("screenshot");
    expect(s.ok).toBe(true);
    expect(readFileSync(s.images![0]).subarray(1, 4).toString()).toBe("PNG");
    const log = readFileSync(join(dirs.sessionDir, "screen-actions.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l));
    expect(log.map((l) => l.action)).toEqual(["click", "type_text", "key", "focus_app", "screenshot"]);
    expect(log[0]).toMatchObject({ x: 10, y: 20, app: "Preview" });
  } finally {
    delete process.env.GA_SCREEN_DRY_RUN;
  }
});

const exampleArgs = (a: Args, dir: string): Args => JSON.parse(JSON.stringify(a).replaceAll("{adapter_dir}", dir.replaceAll("\\", "/")));

test.skipIf(process.platform === "win32")("example wc-text: known answer (uses /usr/bin/wc)", async () => {
  const dir = join("examples", "adapters", "wc-text");
  const { run, rt } = await start(dir);
  expect(rt.programVersion).toBe("");
  const test1 = loadAdapter(dir).manifest.tests[0];
  const r = await run("count_text", exampleArgs(test1.calls[0].args, loadAdapter(dir).root));
  expect(r).toMatchObject({ ok: true, metrics: { lines: 3, words: 9 }, fidelity: "exact" });
  expect(r.summary).toMatch(/three-lines.txt has 3 lines and 9 words\./);
  expect(r.manualRoute).toContain("sh -c");
});

test("example stats-py: known answer through a handle", async () => {
  const dir = join("examples", "adapters", "stats-py");
  const { run } = await start(dir);
  const root1 = loadAdapter(dir).root;
  const col = await run("load_csv_column", { path: join(root1, "data", "scores.csv"), column: "score" });
  expect(col.ok).toBe(true);
  const handle = (col.data as { handle: string }).handle;
  const d = await run("describe", { values: { handle } });
  expect(d.metrics).toMatchObject({ n: 8, mean: 5, median: 4.5, min: 2, max: 9 });
  expect(d.metrics!.sd).toBeCloseTo(2.138089935, 6);
  expect(d.summary).toBe("n=8, mean=5, sd=2.13809.");
  const th = await run("threshold", { values: { handle }, cutoff: 4.5 });
  expect(th.metrics).toEqual({ n_above: 4, fraction_above: 0.5 });
  expect(th.summary).toBe("4 values are above 4.5.");
  expect(th.manualRoute).toBe(`stats.threshold(values=${handle}, cutoff=4.5)`);
  expect(await run("describe", { values: [1, 2, 3] })).toMatchObject({ metrics: { mean: 2 } });
});

const hasPandoc = await import("node:child_process").then(({ spawnSync }) => spawnSync("pandoc", ["--version"]).status === 0);

test.skipIf(!hasPandoc)("example pandoc-md: known answer", async () => {
  const dir = join("examples", "adapters", "pandoc-md");
  const { run, rt } = await start(dir);
  expect(rt.programVersion).toMatch(/^\d+\.\d+/);
  const r = await run("convert_markdown", { path: join(loadAdapter(dir).root, "data", "hello.md") });
  expect(r.ok).toBe(true);
  expect(r.text).toContain("<strong>world</strong>");
  expect(r.text).toContain("<h1");
  expect(r.outputs?.[0]).toMatchObject({ name: "html" });
  expect(r.manualRoute).toContain("--to=html5");
  expect(r.summary).toMatch(/to html5\.$/);
});

test("a map summary can include the tool's own summary", async () => {
  const { makeSummary } = await import("../src/adapters/kinds/common.ts");
  const entry = { summary: "{summary} Route checked." } as never;
  expect(makeSummary(entry, "T", {}, { summary: "Fitted the model." })).toBe("Fitted the model. Route checked.");
  expect(makeSummary(entry, "T", {}, { metrics: { n: 3 } })).toBe("T finished. n=3.");
});

test("samePath joins the two names of one file", async () => {
  const { samePath } = await import("../src/adapters/kinds/common.ts");
  const d = mkdtempSync(join(tmpdir(), "same-"));
  writeFileSync(join(d, "a.png"), "x");
  expect(samePath(join(d, "a.png"))).toBe(samePath(join(d, ".", "a.png")));
  if (process.platform === "darwin" && d.startsWith("/var/")) expect(samePath(join("/private", d, "a.png"))).toBe(samePath(join(d, "a.png")));
});

test("fmtNumber keeps integers exact and rounds fractions to 6 significant digits", async () => {
  const { fmtNumber } = await import("../src/adapters/kinds/common.ts");
  expect(fmtNumber(3258788)).toBe("3258788");
  expect(fmtNumber(0.123456789)).toBe("0.123457");
  expect(fmtNumber(384.478123)).toBe("384.478");
  expect(fmtNumber(1234567.891)).toBe("1234567.9");
});
