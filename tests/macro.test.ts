import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeAll, describe, expect, test } from "vitest";
import { loadAdapter } from "../src/adapters/manifest.ts";
import { macroString, parseStdout, renderMacro, startMacro } from "../src/adapters/kinds/macro.ts";
import type { Tool, ToolContext } from "../src/core/types.ts";
import { withinMs } from "./timing.ts";

const FAKE = `
import { readFileSync, writeFileSync } from "node:fs";
const lines = readFileSync(process.argv[2], "utf8").split("\\n");
for (const line of lines) {
  const [cmd, ...rest] = line.split(" ");
  const arg = rest.join(" ");
  if (cmd === "print") console.log(arg);
  else if (cmd === "write") writeFileSync(arg, "a,b\\n1,2\\n3,4\\n");
  else if (cmd === "sleep") await new Promise((r) => setTimeout(r, 30000));
  else if (cmd === "exit") process.exit(Number(arg));
}
`;

const YAML = `
adapter: { name: fake, version: 0.2.0 }
program: { name: Fake }
connection:
  kind: macro
  interpreter: ["{node}", "{adapter_dir}/fake.mjs", "{macro_file}"]
  macro_ext: ".fake"
  call_timeout_s: 8
locate:
  paths: ["${process.execPath.replace(/\\/g, "\\\\")}"]
module: adapter.mjs
map:
  - { tool: echo, route: Fake > Echo, fidelity: exact, summary: "Got {metrics.width} wide, name {data.values.name}, flag {flag}." }
  - { tool: bad, route: Fake > Bad }
  - { tool: partial, route: Fake > Partial }
  - { tool: slow, route: Fake > Slow }
  - { tool: crash, route: Fake > Crash }
  - { tool: plain, route: Fake > Plain }
  - { tool: raw, route: Fake > Raw }
tools:
  - name: echo
    description: Echo values.
    params:
      width: { type: integer, minimum: 1 }
      name: { type: string }
      flag: { type: boolean, default: false }
    required: [width, name]
    outputs:
      table: { kind: table, ext: .csv }
      extra: { kind: file, ext: .dat }
    parse: keyvalue
    macro: |
      print width={width}
      print name={name}
      print flag={flag}
      print ratio=0.25
      print table={output.table}
      write {output.table}
      write {output.extra}
      print output={output.extra}
      print warning=careful
  - name: bad
    description: Prints an error line.
    parse: keyvalue
    macro: |
      print a=1
      print error=Something went wrong
  - name: partial
    description: Does not write the declared output.
    outputs:
      table: { kind: table, ext: .csv }
    parse: keyvalue
    macro: |
      print a=1
  - name: slow
    description: Does not finish.
    macro: |
      sleep
  - name: crash
    description: Exits with code 3.
    macro: |
      exit 3
  - name: plain
    description: Has no map summary and writes an extra file.
    parse: text
    macro: |
      print hello
      write {call_dir}/extra.csv
  - name: raw
    description: Raw and included text.
    params:
      code: { type: string }
    required: [code]
    macro: |
      {include:part.txt}
      {raw:code}
      print q={code}
`;

const MODULE = `
export default {
  manualRoute: (tool, args) => tool === "echo" ? "Fake > Echo > width " + args.width : undefined,
  fidelity: (tool) => tool === "raw" ? "code_only" : undefined,
  tools: [{ name: "extra", description: "Extra.", inputSchema: { type: "object", properties: {} }, source: "adapter", execute: async () => ({ ok: true }) }],
};
`;

let dir: string;
let byName: Record<string, Tool>;
const ctx = (signal = new AbortController().signal) => ({ signal }) as unknown as ToolContext;

beforeAll(async () => {
  dir = mkdtempSync(join(tmpdir(), "cuvette-macro-"));
  const root = join(dir, "adapter");
  mkdirSync(root);
  writeFileSync(join(root, "adapter.yaml"), YAML);
  writeFileSync(join(root, "fake.mjs"), FAKE);
  writeFileSync(join(root, "adapter.mjs"), MODULE);
  writeFileSync(join(root, "part.txt"), "print included={not_a_token_here}");
  const rt = await startMacro(loadAdapter(root), { workDir: join(dir, "work"), sessionDir: dir });
  byName = Object.fromEntries((await rt.tools()).map((t) => [t.name, t]));
});

describe("macro templates", () => {
  const scope = (args: Record<string, unknown>) => ({
    args,
    outputs: { out: "C:\\work\\out.csv" },
    ph: { work_dir: "/w" },
    declared: new Set(["a", "b", "opt"]),
    adapterDir: dir,
  });

  test("escapes backslash, quote and newline in string values", () => {
    expect(macroString('a\\b"c\nd')).toBe('a\\\\b\\"c\\nd');
    const out = renderMacro('open("{a}");', scope({ a: 'C:\\data\\"x".tif' }));
    expect(out).toBe('open("C:\\\\data\\\\\\"x\\".tif");');
  });

  test("numbers and booleans stay bare, an absent optional value is empty", () => {
    const out = renderMacro("f({a}, {b}, [{opt}]);", scope({ a: 2.5, b: true }));
    expect(out).toBe("f(2.5, true, []);");
  });

  test("output paths and placeholders are escaped, unknown names stay", () => {
    const out = renderMacro('s("{output.out}", "{work_dir}", {nope});', scope({}));
    expect(out).toBe('s("C:\\\\work\\\\out.csv", "/w", {nope});');
  });

  test("raw keeps the text, include is not rendered again", () => {
    const out = renderMacro("{raw:a}", scope({ a: 'say("hi");' }));
    expect(out).toBe('say("hi");');
  });
});

describe("stdout parsing", () => {
  test("splits numbers, strings and reserved keys", () => {
    const p = parseStdout("n=3\nratio= 0.5\nunit=um\ntable=/t.csv\noutput=/o.png\nwarning=w\nerror=e\nnot a pair\n1\t2\t3\n");
    expect(p.metrics).toEqual({ n: 3, ratio: 0.5 });
    expect(p.values.unit).toBe("um");
    expect(p.tables).toEqual(["/t.csv"]);
    expect(p.outputs).toEqual(["/o.png"]);
    expect(p.warnings).toEqual(["w"]);
    expect(p.errors).toEqual(["e"]);
  });
});

describe("macro runtime", () => {
  test("lists the manifest tools and the module tools", () => {
    expect(Object.keys(byName).sort()).toEqual(["bad", "crash", "echo", "extra", "partial", "plain", "raw", "slow"]);
    expect(byName.echo.source).toBe("adapter");
    expect(byName.echo.adapter).toBe("fake");
    expect(byName.echo.inputSchema).toMatchObject({ required: ["width", "name"], additionalProperties: false });
  });

  test("runs the macro, parses values, collects outputs and builds the summary", async () => {
    const o = await byName.echo.execute({ width: 7, name: "a b" }, ctx());
    expect(o.ok).toBe(true);
    expect(o.metrics).toEqual({ width: 7, ratio: 0.25 });
    expect((o.data as { values: Record<string, unknown> }).values.name).toBe("a b");
    expect(o.summary).toBe("Got 7 wide, name a b, flag false.");
    expect(o.fidelity).toBe("exact");
    expect(o.table?.columns).toEqual(["a", "b"]);
    expect(o.table?.n_rows).toBe(2);
    expect(o.outputs?.map((f) => f.name).sort()).toEqual(["extra", "table"]);
    expect(o.text).toContain("table:");
    expect(o.text).toContain("Warning: careful");
  });

  test("uses the module manual route, else the macro text", async () => {
    const a = await byName.echo.execute({ width: 3, name: "x" }, ctx());
    expect(a.manualRoute).toBe("Fake > Echo > width 3");
    const b = await byName.plain.execute({}, ctx());
    expect(b.manualRoute).toContain("print hello");
  });

  test("gives each call its own folder and unique output paths", async () => {
    const a = await byName.echo.execute({ width: 1, name: "a" }, ctx());
    const b = await byName.echo.execute({ width: 2, name: "b" }, ctx());
    const pa = a.outputs![0].path;
    const pb = b.outputs![0].path;
    expect(pa).not.toBe(pb);
    expect(readFileSync(pa, "utf8")).toContain("1,2");
  });

  test("lists new files that the macro wrote in the call folder", async () => {
    const o = await byName.plain.execute({}, ctx());
    expect(o.outputs?.some((f) => f.path.endsWith("extra.csv"))).toBe(true);
    expect(o.outputs?.some((f) => f.path.endsWith(".fake"))).toBe(false);
    expect(o.text).toContain("hello");
  });

  test("rejects bad arguments before it starts the program", async () => {
    expect((await byName.echo.execute({ name: "x" }, ctx())).error).toMatch(/missing required argument width/);
    expect((await byName.echo.execute({ width: 0, name: "x" }, ctx())).error).toMatch(/at least 1/);
    expect((await byName.echo.execute({ width: 1, name: "x", other: 1 }, ctx())).error).toMatch(/unknown argument other/);
  });

  test("an error line fails the call", async () => {
    const o = await byName.bad.execute({}, ctx());
    expect(o.ok).toBe(false);
    expect(o.error).toBe("Something went wrong");
  });

  test("a missing declared output fails the call", async () => {
    const o = await byName.partial.execute({}, ctx());
    expect(o.ok).toBe(false);
    expect(o.error).toMatch(/did not write: table/);
  });

  test("a non-zero exit code fails the call", async () => {
    const o = await byName.crash.execute({}, ctx());
    expect(o.ok).toBe(false);
    expect(o.error).toMatch(/exited with code 3/);
  });

  test("the time limit stops the program", async () => {
    const t0 = Date.now();
    const o = await byName.slow.execute({}, ctx());
    expect(o.ok).toBe(false);
    expect(o.error).toMatch(/timed out after 8 s/);
    withinMs(Date.now() - t0, 30000);
  });

  test("the abort signal stops the program", async () => {
    const c = new AbortController();
    const run = byName.slow.execute({}, ctx(c.signal));
    setTimeout(() => c.abort(), 200);
    const o = await run;
    expect(o.ok).toBe(false);
    expect(o.error).toMatch(/cancelled/);
  });

  test("raw text, includes and the fidelity from the module", async () => {
    const o = await byName.raw.execute({ code: "print z=1" }, ctx());
    expect(o.ok).toBe(true);
    expect(o.metrics).toEqual({ z: 1 });
    expect(o.fidelity).toBe("code_only");
    expect((o.data as { macro: string }).macro).toContain("print included={not_a_token_here}");
  });
});
