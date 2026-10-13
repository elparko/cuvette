import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { loadAdapter } from "../src/adapters/manifest.ts";
import { approveAdapter, checkAdapter, installHint, missingDependencies, missingDependency } from "../src/onboarding/checker.ts";
import { runTests, substitute } from "../src/onboarding/kat.ts";
import { onboardCommand } from "../src/onboarding/agent.ts";
import type { Tool, ToolOutput } from "../src/core/types.ts";

const GOOD = "tests/fixtures/onboard/good";
let tmp: string;

beforeAll(() => {
  tmp = mkdtempSync(join(tmpdir(), "cuvette-onb-"));
  process.env.CUVETTE_HOME = join(tmp, "home");
});
afterAll(() => rmSync(tmp, { recursive: true, force: true }));

function broken(name: string, edit: (yaml: string) => string): string {
  const dir = join(tmp, name);
  cpSync(GOOD, dir, { recursive: true });
  const file = join(dir, "adapter.yaml");
  writeFileSync(file, edit(readFileSync(file, "utf8")));
  return dir;
}

describe("checker", () => {
  test("a good adapter passes", async () => {
    const r = await checkAdapter(GOOD);
    expect(r.errors).toEqual([]);
    expect(r.ok).toBe(true);
  });

  test("a bad schema gives plain lines", async () => {
    const dir = broken("schema", (y) => y.replace("kind: cli", "kind: telepathy"));
    const r = await checkAdapter(dir);
    expect(r.ok).toBe(false);
    expect(r.errors[0]).toMatch(/^connection\.kind: /);
  });

  test("an unknown field is an error", async () => {
    const dir = broken("unknown", (y) => y.replace("program:", "bogus: 1\nprogram:"));
    expect((await checkAdapter(dir)).errors.join("\n")).toMatch(/bogus/);
  });

  test("a link to a missing tool", async () => {
    const dir = broken("badlink", (y) => y.replace("{ tool: summarize, arg: column }", "{ tool: nope, arg: column }"));
    const r = await checkAdapter(dir);
    expect(r.errors).toContain('decision "column_name", link: no tool named "nope"');
  });

  test("a link to a missing argument, by first segment of a dotted path", async () => {
    const dir = broken("badarg", (y) => y.replace("options.trim }", "settings.trim }"));
    const r = await checkAdapter(dir);
    expect(r.errors).toContain('decision "trim_fraction", link: tool "summarize" has no argument "settings"');
  });

  test("a tool without a map entry", async () => {
    const dir = broken("nomap", (y) => y.replace(/^map:[\s\S]*?^checks:/m, "map: []\nchecks:"));
    const r = await checkAdapter(dir);
    expect(r.errors.join("\n")).toMatch(/tool "summarize" has no map entry/);
  });

  test("a map param that names no argument is a warning (a dialog field the tool fixes)", async () => {
    const dir = broken("badparam", (y) => y.replace("{ arg: column, label: Column }", "{ arg: colum, label: Column }"));
    expect((await checkAdapter(dir)).warnings.join("\n")).toMatch(/param "colum": the tool has no such argument/);
  });

  test("a check without rule, text or module function", async () => {
    const dir = broken("nofn", (y) => y.replace("id: outliers_dropped", "id: unknown_check"));
    expect((await checkAdapter(dir)).errors.join("\n")).toMatch(/check "unknown_check" has no rule/);
  });

  test("a skill without frontmatter name", async () => {
    const dir = broken("skill", (y) => y);
    writeFileSync(join(dir, "skills", "means.md"), "---\ndescription: x\n---\nbody");
    expect((await checkAdapter(dir)).errors).toContain('skills/means.md: frontmatter has no "name"');
  });

  test("a test that reads a saved result before it exists", async () => {
    const dir = broken("saved", (y) => y.replace("args: { column: a, options: { trim: 0 } }", "args: { column: '{saved.zed.data}' }"));
    expect((await checkAdapter(dir)).errors.join("\n")).toMatch(/uses saved result "zed"/);
  });

  test("a missing standards file is a warning; no tests is an error", async () => {
    const dir = broken("warn", (y) => y.replace(/^tests:[\s\S]*?^tools:/m, "tests: []\ntools:"));
    rmSync(join(dir, "STANDARDS.md"));
    const r = await checkAdapter(dir);
    expect(r.warnings.join("\n")).toMatch(/STANDARDS/);
    expect(r.ok).toBe(false);
    expect(r.errors.join("\n")).toMatch(/\[kat-present\]/);
  });

  test("a decision default outside lo and hi, or of the wrong type, is an error", async () => {
    const high = broken("defhigh", (y) => y.replace("default: 0.1\n", "default: 0.7\n"));
    expect((await checkAdapter(high)).errors).toContain('decision "trim_fraction": the default 0.7 is above "hi" (0.5)');
    const text = broken("deftext", (y) => y.replace("default: 0.1\n", "default: '0.1'\n"));
    expect((await checkAdapter(text)).errors).toContain('decision "trim_fraction": kind is "float" but the default "0.1" is not a number');
  });

  test("a static check does not call a tool of the module unknown", async () => {
    const dir = broken("static", (y) => y);
    writeFileSync(join(dir, "adapter.yaml"), readFileSync(join(dir, "adapter.yaml"), "utf8").replace(/^tests:\n/m, "tests:\n  - id: module-tool\n    calls: [{ tool: from_module }]\n    expect: [{ path: ok, equals: true }]\n"));
    expect((await checkAdapter(dir, { static: true })).errors.join("\n")).not.toMatch(/no tool named "from_module"/);
  });

  test("an approved adapter with no tested versions warns", async () => {
    const dir = broken("status", (y) => y.replace("description: Computes", "status: approved\n  description: Computes"));
    expect((await checkAdapter(dir)).warnings.join("\n")).toMatch(/tested_versions/);
  });

  test("a missing adapter", async () => {
    const r = await checkAdapter(join(tmp, "nothing"));
    expect(r.ok).toBe(false);
  });
});

describe("approve", () => {
  test("sets status and keeps comments", async () => {
    const dir = broken("approve", (y) => y);
    const out = await approveAdapter(dir, "Parker", { version: "1.0" });
    expect(out.tested_versions).toEqual(["1.0"]);
    const text = readFileSync(join(dir, "adapter.yaml"), "utf8");
    expect(text).toContain("# A small command-line adapter");
    const m = loadAdapter(dir).manifest;
    expect(m.adapter.status).toBe("approved");
    expect(m.adapter.approved_by).toBe("Parker");
    expect(m.adapter.approved_on).toBe(new Date().toISOString().slice(0, 10));
    expect(m.program.tested_versions).toEqual(["1.0"]);
    await approveAdapter(dir, "Parker", { version: "1.0" });
    expect(loadAdapter(dir).manifest.program.tested_versions).toEqual(["1.0"]);
  });

  test("refuses an adapter with errors", async () => {
    const dir = broken("approve-bad", (y) => y.replace("kind: cli", "kind: nope"));
    await expect(approveAdapter(dir, "Parker")).rejects.toThrow(/errors/);
  });
});

describe("known-answer runner", () => {
  function fake(fn: (args: Record<string, unknown>) => ToolOutput): { tools(): Promise<Tool[]> } {
    const tool: Tool = {
      name: "summarize",
      description: "",
      inputSchema: {},
      source: "adapter",
      execute: async (args) => fn(args),
    };
    return { tools: async () => [tool] };
  }

  test("passes when the numbers match", async () => {
    const a = loadAdapter(GOOD);
    const out = await runTests(a, fake(() => ({ ok: true, metrics: { mean: 2.0000001 } })));
    expect(out).toHaveLength(1);
    expect(out[0].failures).toEqual([]);
    expect(out[0].ok).toBe(true);
  });

  test("fails with a message when the number is off", async () => {
    const a = loadAdapter(GOOD);
    const out = await runTests(a, fake(() => ({ ok: true, metrics: { mean: 2.5 } })));
    expect(out[0].ok).toBe(false);
    expect(out[0].failures[0]).toMatch(/metrics\.mean: expected 2 within/);
  });

  test("fails when the tool fails", async () => {
    const a = loadAdapter(GOOD);
    const out = await runTests(a, fake(() => ({ ok: false, error: "boom" })));
    expect(out[0].failures[0]).toMatch(/the tool failed: boom/);
  });

  test("saved values and adapter_dir flow into later calls", async () => {
    const a = loadAdapter(GOOD);
    a.manifest.tests = [
      {
        id: "chain",
        description: "",
        data: [],
        manual_route_checked: false,
        fetch: "",
        self_test: false,
        source: "",
        calls: [
          { tool: "summarize", args: { column: "a" }, save_as: "first" },
          { tool: "summarize", args: { column: "{saved.first.outputs[0].path}", dir: "{adapter_dir}/data", n: "{saved.first.metrics.mean}", label: "m={saved.first.metrics.mean}" }, save_as: "" },
        ],
        expect: [
          { path: "data.column", equals: "/x.csv", rel: 1e-6, abs: 0 },
          { path: "data.n", equals: 3, rel: 1e-6, abs: 0 },
          { path: "data.label", equals: "m=3", rel: 1e-6, abs: 0 },
          { path: "data.dir", contains: "data", rel: 1e-6, abs: 0 },
          { path: "saved.first.metrics.mean", min: 2, max: 4, rel: 1e-6, abs: 0 },
          { path: "outputs[0].path", contains: "csv", rel: 1e-6, abs: 0 },
        ],
      },
    ];
    const seen: Record<string, unknown>[] = [];
    const out = await runTests(
      a,
      fake((args) => {
        seen.push(args);
        return { ok: true, metrics: { mean: 3 }, outputs: [{ path: "/x.csv", kind: "file" }], data: args };
      }),
    );
    expect(out[0].failures).toEqual([]);
    expect(seen[1].n).toBe(3);
    expect(String(seen[1].dir)).toContain("fixtures");
    expect(out[0].outputs).toHaveLength(2);
  });

  test("a tool from the adapter module runs in a known-answer test", async () => {
    const a = loadAdapter(GOOD);
    const tool = fake(() => ({ ok: true, metrics: { mean: 2 } }));
    a.module = async () => ({ tools: await tool.tools() });
    const out = await runTests(a, { tools: async () => [] });
    expect(out[0].failures).toEqual([]);
  });

  test("substitute reports a missing saved name", () => {
    expect(() => substitute("{saved.nope.x}", {}, "/a")).toThrow(/no saved result/);
  });
});

describe("onboard command", () => {
  test("names the program, docs, kind and draft env", () => {
    const o = onboardCommand("Pandoc 3", { model: "fake", docs: ["https://pandoc.org/MANUAL.html"], kind: "cli" });
    expect(o.adapters).toEqual(["onboarding"]);
    expect(o.firstMessage).toContain("Pandoc 3");
    expect(o.firstMessage).toContain("https://pandoc.org/MANUAL.html");
    expect(o.firstMessage).toContain("onboarding-guide.md");
    expect(o.env.CUVETTE_DRAFT_DIR).toBe(o.draftDir);
    expect(o.draftDir).toMatch(/pandoc-3$/);
  });

  test("tells the agent to use the checklist and to fix lint errors before it finishes", () => {
    const o = onboardCommand("seqkit", { model: "fake" });
    expect(o.firstMessage).toMatch(/Adapter checklist/);
    expect(o.firstMessage).toMatch(/run check_adapter\. Fix every checklist error before you finish/);
  });
});

describe("the onboarding adapter uses the lint", () => {
  test("the skill, the standards and the guide tell the agent to run the lint and fix errors", () => {
    const a = loadAdapter("catalog/onboarding");
    expect(a.standardsText()).toMatch(/Do not finish while `check_adapter` reports an error/);
    expect(readFileSync(a.skills()[0].path, "utf8")).toMatch(/Finish only when it reports no error/);
    expect(readFileSync("docs/onboarding-guide.md", "utf8")).toMatch(/## Adapter checklist/);
  });

  test("the draft_lint check blocks the answer while the draft has a lint error, and passes a clean draft", async () => {
    const { draftLint } = await import("../catalog/onboarding/adapter.ts");
    const bad = broken("draft-bad", (y) => y.replace("  field: statistics\n", ""));
    const f = await draftLint(bad);
    expect(f).toHaveLength(1);
    expect(f[0].severity).toBe("error");
    expect(f[0].message).toMatch(/\[field\]/);
    expect(await draftLint(broken("draft-good", (y) => y))).toEqual([]);
    expect(await draftLint(join(tmp, "no-draft"))).toEqual([]);
  });

  test("the onboarding manifest declares the check, so the review runs it", () => {
    const m = loadAdapter("catalog/onboarding").manifest;
    expect(m.checks.find((c) => c.id === "draft_lint")?.severity).toBe("error");
    expect(m.module).toBe("adapter.ts");
  });
});

describe("tests that cannot run because a package or program is missing", () => {
  const outcome = (id: string, failure?: string) => ({ id, ok: !failure, failures: failure ? [failure] : [], durationMs: 1, outputs: [] });

  test("missingDependency reads the name from R, Python, Julia and shell messages", () => {
    expect(missingDependency("x failed. R says: there is no package called ‘AMR’", "R")).toBe("AMR");
    expect(missingDependency("Error in loadNamespace(x) : there is no package called 'DESeq2'", "R")).toBe("DESeq2");
    expect(missingDependency("ModuleNotFoundError: No module named 'scanpy.pp'", "python")).toBe("scanpy");
    expect(missingDependency("ArgumentError: Package CSV not found in current path", "julia")).toBe("CSV");
    expect(missingDependency("spawn /usr/local/bin/mageck ENOENT", "MAGeCK")).toBe("mageck");
    expect(missingDependency("bash: samtools: command not found", "samtools")).toBe("samtools");
    expect(missingDependency("the tool failed: the program was not found. Set locate.env", "bfconvert")).toBe("bfconvert");
    expect(missingDependency("the tool failed: CellProfiler was not found. Set CELLPROFILER_PATH to the cp executable.", "CellProfiler")).toBe("CellProfiler");
    expect(missingDependency("the tool failed: SMILE MSI was not found. Set SMILE_MSI_PYTHON to its Python.", "SMILE")).toBe("SMILE MSI");
    expect(missingDependency("the tool failed: suite2p is not installed.", "suite2p")).toBe("suite2p");
    expect(missingDependency("file not found: /data/a.csv", "R")).toBeUndefined();
    expect(missingDependency('the column "dose" was not found. Columns: a, b', "R")).toBeUndefined();
    expect(missingDependency('expected to contain "EUCAST 2025", got "guideline is not known"', "R")).toBeUndefined();
  });

  test("missingDependencies groups the tests by the missing name and leaves other failures out", () => {
    const tests = [
      outcome("a", "R says: there is no package called ‘AMR’"),
      outcome("b", 'expected to contain "x", got "R says: there is no package called ‘AMR’"'),
      outcome("c", "metrics.n: expected 2, got 3"),
      outcome("d"),
      outcome("e", "R says: there is no package called ‘svglite’"),
    ];
    expect(missingDependencies(tests, "AMR")).toEqual([
      { name: "AMR", ids: ["a", "b"] },
      { name: "svglite", ids: ["e"] },
    ]);
  });

  test("installHint names cuvette doctor --fix only if the doctor can install the adapter", () => {
    expect(installHint("lme4", loadAdapter("catalog/lme4").manifest)).toBe("Run cuvette doctor --fix");
    expect(installHint("meanstat", loadAdapter(GOOD).manifest)).toBe("Install it with the steps in program.install of adapter.yaml");
  });

  test("the check gives one line at the top for the tests that could not run, and no FAIL line for each", async () => {
    const dir = join(tmp, "missing-pkg");
    mkdirSync(join(dir, "scripts"), { recursive: true });
    writeFileSync(
      join(dir, "scripts", "run.sh"),
      `case "$1$(cat "$1" 2>/dev/null)" in *bad*) echo '{"ok": false, "error": "run failed. R says: the value is wrong"}' ;; *) echo '{"ok": false, "error": "run failed. R says: there is no package called Fakepkg"}' ;; esac\n`,
    );
    writeFileSync(
      join(dir, "adapter.yaml"),
      [
        "adapter: { name: missingpkg, title: Missing package, version: 0.1.0, description: A test adapter with a missing package., field: statistics, file_types: ['.csv'] }",
        "program: { name: Fakepkg, version: '1.0', install: Install Fakepkg. }",
        "connection: { kind: script, interpreter: ['{program_path}'] }",
        "locate: { which: [sh] }",
        "tests:",
        "  - { id: one, calls: [{ tool: run, args: { x: good } }], expect: [{ path: metrics.n, equals: 1 }] }",
        "  - { id: two, calls: [{ tool: run, args: { x: good } }], expect: [{ path: ok, equals: false }, { path: error, contains: 'Fakepkg says no' }] }",
        "  - { id: three, calls: [{ tool: run, args: { x: bad } }], expect: [{ path: metrics.n, equals: 1 }] }",
        "tools:",
        "  - { name: run, title: Run, description: Runs the step., params: { x: { type: string, description: The input. } }, script: scripts/run.sh, parse: json }",
      ].join("\n"),
    );
    const r = await checkAdapter(dir, { runTests: true });
    expect(r.errors[0]).toBe("2 of 3 tests could not run: Fakepkg is not installed. Install it with the steps in program.install of adapter.yaml");
    expect(r.notInstalled).toEqual([{ name: "Fakepkg", ids: ["one", "two"] }]);
    expect(r.tests?.map((t) => t.id)).toEqual(["three"]);
    expect(r.errors.some((e) => /test "(one|two)"/.test(e))).toBe(false);
    expect(r.errors.join("\n")).toMatch(/test "three" failed: .*the value is wrong/);
  });
});
