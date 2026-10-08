import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { loadAdapter } from "../src/adapters/manifest.ts";
import { approveAdapter, checkAdapter } from "../src/onboarding/checker.ts";
import { runTests, substitute } from "../src/onboarding/kat.ts";
import { onboardCommand } from "../src/onboarding/agent.ts";
import type { Tool, ToolOutput } from "../src/core/types.ts";

const GOOD = "tests/fixtures/onboard/good";
let tmp: string;

beforeAll(() => {
  tmp = mkdtempSync(join(tmpdir(), "ga-onb-"));
  process.env.GA_HOME = join(tmp, "home");
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

  test("a map param that names no argument", async () => {
    const dir = broken("badparam", (y) => y.replace("{ arg: column, label: Column }", "{ arg: colum, label: Column }"));
    expect((await checkAdapter(dir)).errors.join("\n")).toMatch(/param "colum": tool "summarize" has no argument "colum"/);
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

  test("warnings for a missing standards file and no tests", async () => {
    const dir = broken("warn", (y) => y.replace(/^tests:[\s\S]*?^tools:/m, "tests: []\ntools:"));
    rmSync(join(dir, "STANDARDS.md"));
    const r = await checkAdapter(dir);
    expect(r.ok).toBe(true);
    expect(r.warnings.join("\n")).toMatch(/STANDARDS/);
    expect(r.warnings).toContain("no known-answer tests");
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
        calls: [
          { tool: "summarize", args: { column: "a" }, save_as: "first" },
          { tool: "summarize", args: { column: "{saved.first.outputs[0].path}", dir: "{adapter_dir}/data", n: "{saved.first.metrics.mean}", label: "m={saved.first.metrics.mean}" } },
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
    expect(o.env.GA_DRAFT_DIR).toBe(o.draftDir);
    expect(o.draftDir).toMatch(/pandoc-3$/);
  });
});
