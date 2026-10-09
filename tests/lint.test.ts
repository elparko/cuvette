import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parse } from "yaml";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { loadAdapter, Manifest } from "../src/adapters/manifest.ts";
import { locate } from "../src/adapters/locate.ts";
import { checkAdapter } from "../src/onboarding/checker.ts";
import { runTests } from "../src/onboarding/kat.ts";
import { lint, numbersIn, readSources, RULES, scanErrors } from "../src/onboarding/lint.ts";
import type { Finding, LintTool } from "../src/onboarding/lint.ts";

const BASE = `adapter:
  name: lintfix
  field: statistics
  file_types: [".csv"]
  description: Test adapter.
program:
  name: meanstat
  install: "Install meanstat with uv tool install meanstat."
connection:
  kind: cli
locate:
  which: [meanstat-not-installed]
  version_command: ["{program_path}", "--version"]
  version_pattern: 'meanstat (\\S+)'
  identity: 'meanstat \\d'
decisions:
  - key: trim
    label: Trim fraction
    kind: float
    default: 0.1
    help: The share of values cut from each end before the mean.
    links: [{ tool: summarize, arg: trim }]
map:
  - { tool: summarize, route: "meanstat {path} {column}", fidelity: close, difference: route not tested, summary: "mean {metrics.mean}" }
tests:
  - id: mean
    data: [data/a.csv]
    calls: [{ tool: summarize, args: { path: "{adapter_dir}/data/a.csv", column: x } }]
    expect: [{ path: metrics.mean, approx: 12.75 }]
  - id: bad-column
    calls: [{ tool: summarize, args: { path: "{adapter_dir}/data/a.csv", column: zz } }]
    expect: [{ path: ok, equals: false }]
tools:
  - name: summarize
    description: Compute the mean of one column of a CSV file.
    params:
      path: { type: string, description: Absolute path of the CSV file. }
      column: { type: string, description: Name of the column. }
      trim: { type: number, description: Fraction of the values cut from each end. }
    required: [path, column]
    command: ["meanstat", "{path}", "{column}"]
    parse: keyvalue
`;

let tmp: string;
let n = 0;
beforeAll(() => {
  tmp = mkdtempSync(join(tmpdir(), "ga-lint-"));
  process.env.GA_HOME = join(tmp, "home");
});
afterAll(() => rmSync(tmp, { recursive: true, force: true }));

function make(edit: (y: string) => string = (y) => y, files: Record<string, string | null> = {}): string {
  const dir = join(tmp, `a${++n}`);
  mkdirSync(join(dir, "data"), { recursive: true });
  const all: Record<string, string | null> = {
    "adapter.yaml": edit(BASE),
    "STANDARDS.md": "Report the trim fraction with each mean.\n",
    "data/a.csv": "x\n10\n12\n14\n15\n",
    "data/SOURCES.md": "| File | Source | License |\n| --- | --- | --- |\n| a.csv | Written by hand. | synthetic, no third-party data |\n",
    ...files,
  };
  for (const [k, v] of Object.entries(all)) {
    if (v === null) continue;
    mkdirSync(join(dir, k, ".."), { recursive: true });
    writeFileSync(join(dir, k), v);
  }
  return dir;
}

async function findings(dir: string, rule?: string): Promise<Finding[]> {
  const r = await checkAdapter(dir);
  return r.findings.filter((f) => !rule || f.rule === rule);
}

const tool = (y: string, from: string, to: string) => y.replace(from, to);

describe("lint: the base adapter passes", () => {
  test("no finding at all", async () => {
    expect(await findings(make())).toEqual([]);
  });
});

describe("lint: program and install", () => {
  test("field", async () => {
    expect((await findings(make((y) => y.replace("  field: statistics\n", "")), "field"))[0].severity).toBe("error");
  });
  test("file-types: missing is an error, an explicit empty list passes", async () => {
    expect(await findings(make((y) => y.replace('  file_types: [".csv"]\n', "")), "file-types")).toHaveLength(1);
    expect(await findings(make((y) => y.replace('[".csv"]', "[]")), "file-types")).toHaveLength(0);
  });
  test("install-hint: needed for an external program, not for a self-contained adapter", async () => {
    expect(await findings(make((y) => y.replace(/  install: .*\n/, "")), "install-hint")).toHaveLength(1);
    const self = make((y) => y.replace(/  install: .*\n/, "").replace("  kind: cli", "  kind: files").replace(/locate:\n(  .*\n)+/, ""));
    expect(await findings(self, "install-hint")).toHaveLength(0);
  });
  test("locate-identity: missing identity and an identity with no name", async () => {
    const none = await findings(make((y) => y.replace(/  identity: .*\n/, "")), "locate-identity");
    expect(none[0].severity).toBe("error");
    expect(none[0].message).toMatch(/FileInfo/);
    expect(await findings(make((y) => y.replace("identity: 'meanstat \\d'", "identity: '(\\d+)'")), "locate-identity")).toHaveLength(1);
  });
});

describe("lint: tool descriptions and arguments", () => {
  test("tool-description", async () => {
    expect((await findings(make((y) => tool(y, "description: Compute the mean of one column of a CSV file.", 'description: ""')), "tool-description"))[0].severity).toBe("error");
  });
  test("tool-description-length", async () => {
    const long = `description: Compute the mean of one column of a CSV file. ${"More text here. ".repeat(45)}`;
    expect((await findings(make((y) => tool(y, "description: Compute the mean of one column of a CSV file.", long)), "tool-description-length"))[0].severity).toBe("warning");
  });
  test("tool-description-plain", async () => {
    const f = await findings(make((y) => tool(y, "description: Compute the mean of one column of a CSV file.", "description: Run np.nanmean on df_values.")), "tool-description-plain");
    expect(f).toHaveLength(1);
    expect(await findings(make((y) => tool(y, "of a CSV file.", "of a CSV file such as data.csv.")), "tool-description-plain")).toHaveLength(0);
  });
  test("advice-limits", async () => {
    expect(await findings(make((y) => tool(y, "description: Name of the column.", "description: Use x for a mean.")), "advice-limits")).toHaveLength(1);
    expect(await findings(make((y) => tool(y, "description: Name of the column.", "description: Use x for a mean only if the data has no gaps.")), "advice-limits")).toHaveLength(0);
  });
  test("arg-description: error for a required argument, warning for an optional one", async () => {
    const req = await findings(make((y) => tool(y, "column: { type: string, description: Name of the column. }", "column: { type: string }")), "arg-description");
    expect(req[0].severity).toBe("error");
    const opt = await findings(make((y) => tool(y, "trim: { type: number, description: Fraction of the values cut from each end. }", "trim: { type: number }")), "arg-description");
    expect(opt[0].severity).toBe("warning");
  });
  test("arg-schema: an unquoted comma cuts the description", async () => {
    const f = await findings(make((y) => tool(y, "description: Name of the column. }", "description: Name of the column, such as x. }")), "arg-schema");
    expect(f[0].severity).toBe("error");
    expect(f[0].message).toMatch(/"such as x\."/);
  });
  test("arg-units", async () => {
    expect(await findings(make((y) => tool(y, "description: Fraction of the values cut from each end.", "description: How much to trim.")), "arg-units")).toHaveLength(1);
    expect(await findings(make((y) => tool(y, "description: Fraction of the values cut from each end.", "description: Width in pixels.")), "arg-units")).toHaveLength(0);
  });
  test("array-min-items", async () => {
    const add = (extra: string) => (y: string) => y.replace("    required: [path, column]", `      covariates: { type: array, items: { type: string }, description: Column names.${extra} }\n    required: [path, column, covariates]`);
    expect(await findings(make(add("")), "array-min-items")).toHaveLength(1);
    expect(await findings(make(add(", minItems: 1")), "array-min-items")).toHaveLength(0);
  });
  test("approval-code", async () => {
    const y2 = (y: string) => y.replace("  - name: summarize", "  - name: run_script\n    description: Run a Python script that the model writes.\n    params: { code: { type: string, description: The script text. } }\n    required: [code]\n    command: [python3, -c, '{code}']\n  - name: summarize").replace("map:\n", "map:\n  - { tool: run_script, route: python3 script.py, fidelity: code_only, summary: ran }\n");
    expect((await findings(make(y2), "approval-code"))[0].severity).toBe("error");
    expect(await findings(make((y) => y2(y).replace("    command: [python3", "    approval: true\n    command: [python3")), "approval-code")).toHaveLength(0);
  });
});

describe("lint: batch, summaries and manual routes", () => {
  const folder = (y: string) => y.replace("      path: { type: string, description: Absolute path of the CSV file. }", "      folder: { type: string, description: Folder of CSV files. }\n      path: { type: string, description: Absolute path of the CSV file. }");
  test("batch-flag: a folder argument needs an explicit batch flag", async () => {
    expect((await findings(make(folder), "batch-flag"))[0].severity).toBe("error");
    expect(await findings(make((y) => folder(y).replace("    parse: keyvalue", "    parse: keyvalue\n    batch: false")), "batch-flag")).toHaveLength(0);
  });
  test("summary-template", async () => {
    expect(await findings(make((y) => y.replace(', summary: "mean {metrics.mean}"', "")), "summary-template")).toHaveLength(1);
  });
  test("manual-route: a code_only entry needs a route or a reason", async () => {
    const f = await findings(make((y) => y.replace('route: "meanstat {path} {column}", fidelity: close, difference: route not tested', 'route: "", fidelity: code_only')), "manual-route");
    expect(f[0].severity).toBe("error");
    expect(await findings(make((y) => y.replace('route: "meanstat {path} {column}", fidelity: close, difference: route not tested', 'route: "", fidelity: code_only, difference: The program has no menu for this.')), "manual-route")).toHaveLength(0);
  });
});

describe("lint: error texts", () => {
  test("bare raise, generic text, stderr only, raw library text, two causes", () => {
    const code = [
      "raise ValueError",
      'raise ValueError("failed")',
      'sys.exit("error: mafft failed: " + proc.stderr.strip())',
      "    return _fail(str(e))",
      'raise KeyError("dataset not found or not public")',
      "    raise",
      'raise FileNotFoundError("no file at %s" % path)',
    ].join("\n");
    const f = scanErrors(code, "tools.py");
    expect(f.map((x) => x.where)).toEqual(["tools.py:1", "tools.py:2", "tools.py:3", "tools.py:4", "tools.py:5"]);
    expect(f.every((x) => x.rule === "error-text" && x.severity === "warning")).toBe(true);
  });
  test("R and TypeScript", () => {
    expect(scanErrors('stop()\nfail(conditionMessage(e))\nstop(sprintf("no column %s in %s", col, path))', "lib.R").map((x) => x.where)).toEqual(["lib.R:1", "lib.R:2"]);
    expect(scanErrors('throw new Error();\nreturn { ok: false, error: "failed" };', "server.ts").map((x) => x.where)).toEqual(["server.ts:1", "server.ts:2"]);
  });
  test("fail-without-error", () => {
    expect(scanErrors('    return {"ok": False, "summary": "no rows"}', "a.py")[0].rule).toBe("fail-without-error");
    expect(scanErrors('    return {"ok": False, "error": "no rows in %s" % path}', "a.py")).toEqual([]);
  });
  test("the code files of the adapter are scanned", async () => {
    const f = await findings(make((y) => y, { "scripts/run.py": 'raise RuntimeError("error")\n' }), "error-text");
    expect(f[0].where).toBe("scripts/run.py:1");
  });
});

describe("lint: blinding", () => {
  test("a known-answer value in STANDARDS.md is an error", async () => {
    const f = await findings(make((y) => y, { "STANDARDS.md": "The example mean is 12.75.\n" }), "blinding-number");
    expect(f[0].severity).toBe("error");
    expect(f[0].where).toBe("STANDARDS.md:1");
  });
  test("a rounded known-answer value in a description is an error", async () => {
    expect(await findings(make((y) => y.replace("expect: [{ path: metrics.mean, approx: 12.75 }]", "expect: [{ path: metrics.mean, approx: 0.93788 }]").replace("Name of the column.", "\"Name of the column, such as the one with mean 0.938.\"")), "blinding-number")).toHaveLength(1);
  });
  test("a benchmark value counts for the adapters of its paper only", () => {
    const a = loadAdapter(make((y) => y.replace("Name of the column.", "\"Name of the column, such as ratio(4696, 5007).\"")));
    const raw = parse(readFileSync(join(a.root, "adapter.yaml"), "utf8"));
    const tools: LintTool[] = a.manifest.tools.map((t) => ({ name: t.name, description: t.description, params: t.params, required: t.required, source: "manifest" }));
    const hit = lint({ adapter: a, raw, tools, toolsKnown: true, benchmark: [{ value: 5007, source: "benchmark ljosa2012", adapters: ["lintfix"] }] });
    expect(hit.filter((f) => f.rule === "blinding-number").map((f) => f.message)).toEqual([expect.stringMatching(/5007 equals the value of benchmark ljosa2012/)]);
    const other = lint({ adapter: a, raw, tools, toolsKnown: true, benchmark: [{ value: 5007, source: "b", adapters: ["cellprofiler"] }] });
    expect(other.filter((f) => f.rule === "blinding-number")).toEqual([]);
  });
  test("short numbers, years, versions and common constants are not compared", () => {
    expect(numbersIn("Use 10 bins, 0.05, 1.96 and version 2.31.1 from 2019, with 255 levels.").map((x) => x.raw)).toEqual([]);
    expect(numbersIn("The answer was 4696 of 5007 (0.938).").map((x) => x.value)).toEqual([4696, 5007, 0.938]);
  });
});

describe("lint: decisions", () => {
  test("decision-type", async () => {
    expect((await findings(make((y) => y.replace("    kind: float\n", "")), "decision-type"))[0].severity).toBe("error");
  });
  test("decision-default: an agent decision needs a default", async () => {
    expect(await findings(make((y) => y.replace("    default: 0.1\n", "    owner: agent\n")), "decision-default")).toHaveLength(1);
    expect(await findings(make((y) => y.replace("    default: 0.1\n", "")), "decision-default")).toHaveLength(0);
  });
  test("decision-help", async () => {
    expect(await findings(make((y) => y.replace("    help: The share of values cut from each end before the mean.\n", "")), "decision-help")).toHaveLength(1);
  });
  test("sensitivity-compare", async () => {
    const s = (c: string) => (y: string) => y.replace("    links: [{ tool: summarize, arg: trim }]", `    links: [{ tool: summarize, arg: trim }]\n    sensitivity: { tool: summarize, options: [0, 0.2], compare: [${c}] }`);
    expect(await findings(make(s("mean")), "sensitivity-compare")).toHaveLength(1);
    expect(await findings(make(s("metrics.mean")), "sensitivity-compare")).toHaveLength(0);
  });
});

describe("lint: known-answer tests and data", () => {
  test("kat-present", async () => {
    expect((await findings(make((y) => y.replace(/^tests:[\s\S]*?^tools:/m, "tests: []\ntools:")), "kat-present"))[0].severity).toBe("error");
  });
  test("kat-coverage", async () => {
    const y2 = (y: string) => y.replace("  - name: summarize", "  - name: count_rows\n    description: Count the rows of a CSV file.\n    params: { path: { type: string, description: Absolute path of the CSV file. } }\n    required: [path]\n    command: [meanstat, count, '{path}']\n  - name: summarize").replace("map:\n", "map:\n  - { tool: count_rows, route: meanstat count file.csv, summary: '{metrics.n} rows', difference: route not tested }\n");
    const f = await findings(make(y2), "kat-coverage");
    expect(f.map((x) => x.where)).toEqual(['tool "count_rows"']);
  });
  test("kat-exact", async () => {
    expect(await findings(make((y) => y.replace("{ path: metrics.mean, approx: 12.75 }", "{ path: metrics.mean, min: 1 }")), "kat-exact")).toHaveLength(1);
  });
  test("kat-failure-path", async () => {
    expect(await findings(make((y) => y.replace(/  - id: bad-column[\s\S]*?equals: false \}\]\n/, "")), "kat-failure-path")).toHaveLength(1);
  });
  test("kat-data-license: missing file, missing row, unconfirmed license, folder row", async () => {
    expect((await findings(make((y) => y, { "data/SOURCES.md": null }), "kat-data-license"))[0].severity).toBe("error");
    expect(await findings(make((y) => y, { "data/SOURCES.md": "| File | Source | License |\n| --- | --- | --- |\n| b.csv | x | CC0 |\n" }), "kat-data-license")).toHaveLength(1);
    const unconfirmed = await findings(make((y) => y, { "data/SOURCES.md": "| File | Source | License |\n| --- | --- | --- |\n| a.csv | A tutorial | not confirmed |\n" }), "kat-data-license");
    expect(unconfirmed[0].severity).toBe("warning");
    const folder = make((y) => y.replaceAll("data/a.csv", "data/set/a.csv"), { "data/set/a.csv": "x\n1\n", "data/SOURCES.md": "| File | Source | License |\n| --- | --- | --- |\n| set/ | BBBC | CC0 |\n" });
    expect(await findings(folder, "kat-data-license")).toHaveLength(0);
    expect(readSources("| File | Source | License |\n| --- | --- | --- |\n| `data/a.csv` | s | MIT |")).toEqual([{ file: "a.csv", source: "s", license: "MIT" }]);
  });
  test("kat-gui: each test of a macro adapter states gui", async () => {
    const macro = (y: string) => y.replace("  kind: cli", "  kind: macro\n  command: [meanstat]");
    expect((await findings(make(macro), "kat-gui")).map((f) => f.where)).toEqual(['test "mean"', 'test "bad-column"']);
    expect(await findings(make((y) => macro(y).replaceAll("    calls:", "    gui: true\n    calls:")), "kat-gui")).toHaveLength(0);
  });
});

describe("the rule list", () => {
  test("each rule has a severity and a reason, and the onboarding guide names it", () => {
    const guide = readFileSync("docs/onboarding-guide.md", "utf8");
    for (const [id, r] of Object.entries(RULES)) {
      expect(["error", "warning"]).toContain(r.severity);
      expect(r.rule.length).toBeGreaterThan(10);
      expect(guide, id).toMatch(new RegExp(`\\[[^\\]]*\\b${id}\\b`));
    }
  });
});

describe("gui tests", () => {
  test("runTests skips gui tests unless gui is set", async () => {
    const dir = make((y) => y.replace("  - id: bad-column", "  - id: bad-column\n    gui: true"));
    const a = loadAdapter(dir);
    const rt = { tools: async () => [{ name: "summarize", description: "", inputSchema: {}, source: "adapter" as const, execute: async () => ({ ok: false, error: "no column zz" }) }] };
    expect((await runTests(a, rt)).map((t) => t.id)).toEqual(["mean"]);
    expect((await runTests(a, rt, { gui: true })).map((t) => t.id)).toEqual(["mean", "bad-column"]);
  });
});

describe.skipIf(process.platform === "win32")("locate checks the identity of the program", () => {
  function program(dir: string, name: string, out: string): string {
    mkdirSync(dir, { recursive: true });
    const p = join(dir, name);
    writeFileSync(p, `#!/bin/sh\necho "${out}"\n`);
    chmodSync(p, 0o755);
    return p;
  }
  const manifest = (paths: string[]) =>
    Manifest.parse({
      adapter: { name: "openms" },
      program: { name: "OpenMS", version: "3.5.0" },
      connection: { kind: "cli" },
      locate: { paths, version_command: ["{program_path}", "--help"], version_pattern: "Version: (\\S+)", identity: "FileInfo -- Shows basic information" },
    });

  test("a different program at a matching path is skipped, and the next candidate is taken", async () => {
    const wrong = program(join(tmp, "lepto"), "FileInfo", "fileinfo: leptonica image file information");
    const right = program(join(tmp, "openms"), "FileInfo", "FileInfo -- Shows basic information about the file. Version: 3.5.0-x");
    const r = await locate(manifest([wrong, right]));
    expect(r.path).toBe(right);
    expect(r.version).toBe("3.5.0-x");
  });

  test("with only the wrong program, the adapter is not found and the reason names it", async () => {
    const wrong = program(join(tmp, "lepto2"), "FileInfo", "fileinfo: leptonica image file information");
    const r = await locate(manifest([wrong]));
    expect(r.path).toBeUndefined();
    expect(r.how).toMatch(/did not identify as OpenMS/);
  });
});
