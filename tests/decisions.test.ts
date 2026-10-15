import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach, describe, expect, test } from "vitest";
import { Decision } from "../src/adapters/manifest.ts";
import { ADAPTER_DECISION, DecisionRecord, decisionHook } from "../src/core/decisions.ts";

class FakeRecord {
  items: any[] = [];
  stale: [string, string][] = [];
  append(kind: string, data: any) {
    const e = { id: this.items.length + 1, ts: new Date().toISOString(), session: "s", kind, data };
    this.items.push(e);
    return e;
  }
  entries(kinds?: string[]) {
    return this.items.filter((e) => !kinds || kinds.includes(e.kind));
  }
  markStale(key: string, reason: string) {
    this.stale.push([key, reason]);
    return ["n1"];
  }
}

function adapter(name: string, decisions: any[]) {
  const defs = decisions.map((d) => Decision.parse(d));
  return {
    name,
    manifest: { decisions: defs },
    linksFor(tool: string) {
      const out: Record<string, string> = {};
      for (const d of defs) for (const l of d.links) if (l.tool === tool) out[l.arg] = d.key;
      return out;
    },
  } as any;
}

const defs = [
  { key: "tol", label: "Tolerance", kind: "float", lo: 0, hi: 100, default: 5, owner: "human", links: [{ tool: "run", arg: "params.tol" }] },
  { key: "method", label: "Method", kind: "choice", choices: ["a", "b"], default: "a", owner: "fixed", links: [{ tool: "run", arg: "method" }] },
  { key: "bins", label: "Bins", kind: "int", owner: "agent", stage: "when_needed", links: [{ tool: "run", arg: "bins" }] },
  { key: "groups", label: "Groups", kind: "text", owner: "human", stage: "when_needed", links: [{ tool: "run", arg: "groups" }] },
  { key: "flag", label: "Flag", kind: "bool" },
];

let home: string;
let rec: FakeRecord;
let dr: DecisionRecord;
beforeEach(() => {
  home = mkdtempSync(join(tmpdir(), "cuvette-"));
  process.env.CUVETTE_HOME = home;
  rec = new FakeRecord();
  dr = new DecisionRecord([adapter("x", defs)], rec as any);
});

describe("coercion", () => {
  test("range and kinds", () => {
    expect(() => dr.applySetup({ tol: 500 })).toThrow(/at most 100/);
    expect(() => dr.applySetup({ method: "zzz" })).toThrow(/one of/);
    dr.applySetup({ tol: "7.5", flag: "yes", question: `  ${"x".repeat(600)} ` });
    expect(dr.value("tol")).toBe(7.5);
    expect(dr.value("flag")).toBe(true);
    expect((dr.value("question") as string).length).toBe(500);
  });

  test("setup skips a field with no value instead of failing", () => {
    expect(() => dr.applySetup({ tol: 3, method: undefined, flag: null })).not.toThrow();
    expect(dr.value("tol")).toBe(3);
  });
});

describe("setup", () => {
  test("defaults accepted and logged", () => {
    dr.applySetup({ tol: 3 });
    const e = rec.entries(["setup"])[0];
    expect(e.data.defaultsAccepted).toEqual(["method"]);
    expect(dr.value("method")).toBe("a");
    expect(dr.isSet("bins")).toBe(false);
  });

  test("second call logs decisions with stale nodes", () => {
    dr.applySetup({ tol: 3 });
    dr.applySetup({ tol: 4 });
    const d = rec.entries(["decision"]);
    expect(d).toHaveLength(1);
    expect(d[0].data).toMatchObject({ key: "tol", old: 3, new: 4, by: "human", reason: "setup edited", staleNodes: ["n1"] });
  });

  test("profile save, load and resume", () => {
    dr.applySetup({ tol: 9 });
    dr.setOwner("tol", "fixed");
    expect(dr.saveProfile("lab")).toEqual({ name: "lab", version: 1 });
    expect(dr.saveProfile("lab").version).toBe(2);
    expect(DecisionRecord.listProfiles()).toEqual([{ name: "lab", version: 2 }]);
    const rec2 = new FakeRecord();
    const dr2 = new DecisionRecord([adapter("x", defs)], rec2 as any);
    dr2.applySetup({}, { profile: "lab@1" });
    expect(dr2.value("tol")).toBe(9);
    expect(dr2.owner("tol")).toBe("fixed");
    expect((rec2.entries(["setup"])[0].data.profile as any).hash).toMatch(/^[0-9a-f]{64}$/);
    const dr3 = new DecisionRecord([adapter("x", defs)], rec as any);
    expect(dr3.value("tol")).toBe(9);
    expect(dr3.owner("tol")).toBe("fixed");
  });
});

describe("enforce", () => {
  beforeEach(() => dr.applySetup({ tol: 5 }));

  test("fills missing nested arg", () => {
    const e = dr.enforce("x", "run", { method: "a" });
    expect((e.args.params as any).tol).toBe(5);
    expect(e.applied).toMatchObject({ tol: 5, method: "a" });
  });

  test("a scientist-owned value wins over the model value; numeric string equal", () => {
    expect(dr.enforce("x", "run", { params: { tol: "5" } }).deviations).toEqual([]);
    const e = dr.enforce("x", "run", { params: { tol: 8 } });
    expect(e.deviations).toEqual([{ arg: "params.tol", key: "tol", setup: 5, requested: 8, used: 5, overwritten: true }]);
    expect((e.args.params as any).tol).toBe(5);
  });

  test("fixed owner overwrites", () => {
    const e = dr.enforce("x", "run", { method: "b" });
    expect(e.args.method).toBe("a");
    expect(e.deviations[0]).toMatchObject({ overwritten: true, requested: "b", used: "a", setup: "a" });
  });

  test("human when_needed waits; agent records first use", () => {
    const e = dr.enforce("x", "run", { bins: 12 });
    expect(e.waiting).toEqual(["groups"]);
    expect(e.args.groups).toBeUndefined();
    expect(dr.value("bins")).toBe(12);
    expect(rec.entries(["decision"]).at(-1)!.data).toMatchObject({ key: "bins", by: "agent" });
    dr.change("groups", "ctrl vs trt");
    expect(dr.enforce("x", "run", {}).args.groups).toBe("ctrl vs trt");
  });

  test("a text value that differs only by leading zeros is a change", () => {
    dr.change("groups", "123");
    expect(dr.change("groups", "123")).toEqual([]);
    expect(dr.change("groups", "0123")).toEqual(["n1"]);
    expect(dr.value("groups")).toBe("0123");
    expect(dr.change("groups", "1e2")).toEqual(["n1"]);
  });

  test("does not mutate input", () => {
    const args = { params: {} };
    dr.enforce("x", "run", args);
    expect(args).toEqual({ params: {} });
  });
});

test("hook blocks when waiting, ignores non-adapter tools", async () => {
  dr.applySetup({});
  const hook = decisionHook(dr);
  expect(await hook.run({ tool: "read_file", args: {} })).toEqual({});
  const r = await hook.run({ adapter: "x", tool: "run", args: {} });
  expect(r.decision).toBe("block");
  expect(r.waitingOn).toEqual(["groups"]);
  expect(r.updatedArgs).toBeDefined();
});

test("shared key and brief", () => {
  const a = adapter("a", [{ key: "question", label: "Q", kind: "text", owner: "agent" }]);
  const b = adapter("b", [{ key: "question", label: "Q", kind: "text" }]);
  const d = new DecisionRecord([a, b], rec as any);
  const f = d.fields().find((f) => f.key === "question")!;
  expect(f.adapters).toEqual(["a", "b"]);
  expect(f.owner).toBe("agent");
  dr.applySetup({ tol: 5 });
  const text = dr.brief();
  expect(text).toMatch(/You choose: Bins/);
  expect(text).toMatch(/Ask the scientist: Groups/);
  expect(text).toMatch(/Fixed by the lab: Method/);
  expect(text).toMatch(/deviation/);
});

test("an empty setup value means no fixed value: the model's value stays and no deviation is logged", async () => {
  const { DecisionRecord } = await import("../src/core/decisions.ts");
  const adapter: any = { name: "a", manifest: { decisions: [{ key: "region", label: "Region", kind: "text", owner: "human", stage: "setup", links: [{ tool: "stats", arg: "region" }], choices: [], help: "", group: "Method", essential: false, changes_conclusion: true }] }, linksFor: () => ({ region: "region" }) };
  const appended: any[] = [];
  const record: any = { append: (kind: string, data: any) => appended.push({ kind, data }), markStale: () => [], entries: () => [] };
  const dr = new DecisionRecord([adapter], record);
  dr.applySetup({ region: "" });
  const e = dr.enforce("a", "stats", { region: "chr20:1-100" });
  expect(e.args.region).toBe("chr20:1-100");
  expect(e.deviations).toEqual([]);
  expect(dr.enforce("a", "stats", {}).args).toEqual({});
});

test("an empty value for a number decision means no limit", async () => {
  const { DecisionRecord } = await import("../src/core/decisions.ts");
  const adapter: any = { name: "a", manifest: { decisions: [{ key: "px", label: "Pixel size", kind: "float", owner: "human", stage: "setup", links: [{ tool: "warp", arg: "px" }], choices: [], help: "", group: "Method", essential: false, changes_conclusion: true }] }, linksFor: () => ({ px: "px" }) };
  const record: any = { append: () => {}, markStale: () => [], entries: () => [] };
  const dr = new DecisionRecord([adapter], record);
  dr.applySetup({ px: "" });
  expect(dr.enforce("a", "warp", { px: 0.001 }).args.px).toBe(0.001);
  expect(() => dr.applySetup({ px: "abc" })).toThrow(/must be a number/);
});

test("an adapter added after the setup records its setup defaults and the answers-file values in a new setup entry", () => {
  dr.applySetup({ question: "q" });
  const added = dr.addAdapter(adapter("y", [
    { key: "tol", label: "Tolerance", kind: "float", default: 9 },
    { key: "alpha", label: "Alpha", kind: "float", default: 0.05 },
    { key: "test", label: "Test", kind: "choice", choices: ["t", "w"], default: "t" },
    { key: "pairs", label: "Pairs", kind: "text", stage: "when_needed" },
  ]), { test: "w", unrelated: 1 });
  expect(added).toEqual(["alpha", "test", "pairs"]);
  expect(dr.value("alpha")).toBe(0.05);
  expect(dr.value("test")).toBe("w");
  expect(dr.isSet("pairs")).toBe(false);
  expect(dr.fields().find((f) => f.key === "tol")!.adapters).toEqual(["x", "y"]);
  const setup = rec.entries(["setup"]).at(-1).data;
  expect(setup).toMatchObject({ values: { alpha: 0.05, test: "w" }, defaultsAccepted: ["alpha"], adapter: "y" });
  expect(dr.brief(added)).toMatch(/Alpha \(alpha\): 0\.05/);
  expect(dr.brief(added)).not.toMatch(/Tolerance/);
});

test("before the setup, an added adapter only registers its decisions; the program decision stays out of the brief", () => {
  const d2 = new DecisionRecord([], rec as any, [ADAPTER_DECISION]);
  expect(d2.addAdapter(adapter("z", [{ key: "k", label: "K", kind: "int", default: 3 }]))).toEqual(["k"]);
  expect(d2.isSet("k")).toBe(false);
  expect(rec.entries(["setup"])).toHaveLength(0);
  expect(d2.has("adapter")).toBe(true);
  expect(d2.brief()).not.toMatch(/Program/);
});
