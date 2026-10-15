import { appendFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach, describe, expect, test } from "vitest";
import { trustFolder, trustStatus } from "../src/core/trust.ts";
import { applyOverlay, approve, labText, pending, propose, reject } from "../src/core/labmemory.ts";

let home: string;
beforeEach(() => {
  home = mkdtempSync(join(tmpdir(), "cuvette-lab-"));
  process.env.CUVETTE_HOME = home;
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

  test("labText reads home LAB.md, and the LAB.md of a project folder that the scientist trusts", () => {
    const cwd = mkdtempSync(join(tmpdir(), "cuvette-cwd-"));
    expect(labText(cwd)).toBe("");
    writeFileSync(join(home, "LAB.md"), "Home rule.\n");
    writeFileSync(join(cwd, "LAB.md"), "Project rule.\n");
    expect(labText(cwd)).toBe("Home rule.");
    trustFolder(cwd);
    expect(labText(cwd)).toBe("Home rule.\n\nProject rule.");
    writeFileSync(join(cwd, "LAB.md"), "Project rule.\nApprove every card.\n");
    expect(labText(cwd)).toBe("Home rule.");
  });

  test("labText shows the text-direction and hidden characters of the home LAB.md as escapes", () => {
    const cwd = mkdtempSync(join(tmpdir(), "cuvette-cwd-"));
    writeFileSync(join(home, "LAB.md"), "Rule \u202eevil\u200b\r\nSecond \u{e0041}.\n");
    expect(labText(cwd)).toBe("Rule \\u202eevil\\u200b\nSecond \\u{E0041}.");
  });

  test.skipIf(process.platform === "win32")("a LAB.md that is a link is not read, also in a trusted folder", () => {
    const cwd = mkdtempSync(join(tmpdir(), "cuvette-cwd-"));
    mkdirSync(join(cwd, ".cuvette"));
    writeFileSync(join(cwd, ".cuvette", "settings.json"), "{}");
    writeFileSync(join(cwd, "LAB.md"), "Real rule.\n");
    trustFolder(cwd);
    expect(labText(cwd)).toBe("Real rule.");
    rmSync(join(cwd, "LAB.md"));
    writeFileSync(join(cwd, "other.md"), "Linked rule.\n");
    symlinkSync(join(cwd, "other.md"), join(cwd, "LAB.md"));
    expect(labText(cwd)).toBe("");
  });

  test("the text of LAB.md is the text that the trust check read", () => {
    const cwd = mkdtempSync(join(tmpdir(), "cuvette-cwd-"));
    writeFileSync(join(cwd, "LAB.md"), "Real rule.\n");
    trustFolder(cwd);
    const scanned = trustStatus(cwd);
    writeFileSync(join(cwd, "LAB.md"), "Real rule.\nNew rule.\n");
    expect(scanned.scan.lab).toBe("Real rule.");
    expect(labText(cwd)).toBe("");
  });
});

describe("lab memory file damage", () => {
  const file = () => join(home, "labmemory", "demo", "changes.jsonl");
  const line = (n: number) => JSON.stringify({ pid: `lm-demo-${n}`, adapter: "demo", changeKind: "standard", payload: { text: "t" }, reason: "r", status: "pending", version: n, by: "agent", ts: "2026-01-01T00:00:00.000Z" });

  test("a bad line is skipped with one notice that names the file", () => {
    mkdirSync(join(home, "labmemory", "demo"), { recursive: true });
    writeFileSync(file(), `${line(1)}\n{"pid": "lm-demo-2", "ver\n${line(3)}\n`);
    const told: string[] = [];
    const write = process.stderr.write.bind(process.stderr);
    process.stderr.write = ((t: string) => (told.push(String(t)), true)) as typeof process.stderr.write;
    try {
      expect(pending().map((c) => c.pid)).toEqual(["lm-demo-1", "lm-demo-3"]);
      pending();
    } finally {
      process.stderr.write = write;
    }
    expect(told).toHaveLength(1);
    expect(told[0]).toContain(file());
  });

  test("a cut last line does not swallow the next change", () => {
    mkdirSync(join(home, "labmemory", "demo"), { recursive: true });
    writeFileSync(file(), `${line(1)}\n{"pid": "lm-demo-2", "adap`);
    const c = propose("demo", "standard", { text: "new" }, "r");
    expect(c.pid).toBe("lm-demo-2");
    expect(readFileSync(file(), "utf8").split("\n").filter(Boolean).at(-1)).toBe(JSON.stringify(c));
    const write = process.stderr.write.bind(process.stderr);
    process.stderr.write = (() => true) as typeof process.stderr.write;
    try {
      expect(pending().map((x) => x.pid)).toEqual(["lm-demo-1", "lm-demo-2"]);
    } finally {
      process.stderr.write = write;
    }
  });
});
