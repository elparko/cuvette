import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach, describe, expect, test } from "vitest";
import { applyOverlay, approve, labText, pending, propose, reject } from "../src/core/labmemory.ts";

let home: string;
beforeEach(() => {
  home = mkdtempSync(join(tmpdir(), "ga-lab-"));
  process.env.GA_HOME = home;
});

function adapter() {
  return {
    name: "demo",
    root: "/x",
    manifest: {
      adapter: { name: "demo" },
      decisions: [{ key: "tol", label: "Tolerance", default: 5, links: [] }],
      checks: [{ id: "old", severity: "info", description: "", text: "t" }],
      tests: [],
    },
    standardsText: () => "Base standards.",
    skills: () => [],
    mapEntry: () => undefined,
    linksFor: () => ({}),
    module: async () => ({}),
  } as any;
}

describe("lab memory", () => {
  test("propose, list, approve, reject keep an append-only file", () => {
    const appended: any[] = [];
    const record: any = { append: (k: string, d: any) => appended.push({ k, d }) };
    const a = propose("demo", "default", { key: "tol", value: 3 }, "lab habit", record);
    const b = propose("demo", "standard", { text: "Use three animals." }, "rule");
    expect([a.pid, b.pid]).toEqual(["lm-demo-1", "lm-demo-2"]);
    expect(appended[0]).toMatchObject({ k: "lab_memory", d: { pid: "lm-demo-1", status: "pending" } });
    expect(pending()).toHaveLength(2);
    expect(approve(a.pid, "pi").status).toBe("approved");
    const r = reject(b.pid, "pi", "too strict");
    expect(r).toMatchObject({ status: "rejected", rejectReason: "too strict" });
    expect(pending("demo")).toHaveLength(0);
    expect(readFileSync(join(home, "labmemory", "demo", "changes.jsonl"), "utf8").trim().split("\n")).toHaveLength(4);
    expect(() => approve(a.pid, "pi")).toThrow();
  });

  test("overlay applies approved changes only", () => {
    const d1 = propose("demo", "default", { key: "tol", value: 3 }, "r");
    const d2 = propose("demo", "default", { key: "tol", value: 2 }, "r");
    const c = propose("demo", "check", { id: "pix", rule: { tool: "s", arg: "u", op: "==", value: "pixel", message: "no" } }, "r");
    const s = propose("demo", "standard", { text: "Use three animals." }, "r");
    const t = propose("demo", "test", { id: "kat", calls: [{ tool: "s", args: {} }], expect: [] }, "r");
    const skipped = propose("demo", "check", { id: "skip", text: "x" }, "r");
    for (const x of [d1, d2, c, s, t]) approve(x.pid, "pi");
    reject(skipped.pid, "pi", "no");
    const out = applyOverlay(adapter());
    expect(out.manifest.decisions[0].default).toBe(2);
    expect(out.manifest.checks.map((x) => x.id)).toEqual(["old", "pix"]);
    expect(out.manifest.tests.map((x) => x.id)).toEqual(["kat"]);
    expect(out.standardsText()).toBe("Base standards.\n\n## Lab rules\n- Use three animals. (lab rule v4)");
    expect(out.name).toBe("demo");
  });

  test("overlay returns the adapter when nothing is approved", () => {
    const a = adapter();
    expect(applyOverlay(a)).toBe(a);
  });

  test("labText reads home and project LAB.md", () => {
    const cwd = mkdtempSync(join(tmpdir(), "ga-cwd-"));
    expect(labText(cwd)).toBe("");
    writeFileSync(join(home, "LAB.md"), "Home rule.\n");
    writeFileSync(join(cwd, "LAB.md"), "Project rule.\n");
    expect(labText(cwd)).toBe("Home rule.\n\nProject rule.");
  });
});
