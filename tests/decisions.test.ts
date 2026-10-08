import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach, describe, expect, test } from "vitest";
import { Decision } from "../src/adapters/manifest.ts";
import { DecisionRecord, decisionHook } from "../src/core/decisions.ts";

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
  home = mkdtempSync(join(tmpdir(), "ga-"));
  process.env.GA_HOME = home;
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
    expect(e.deviations).toEqual([{ arg: "params.tol", key: "tol", setup: 5, used: 8, overwritten: true }]);
    expect((e.args.params as any).tol).toBe(5);
  });

  test("fixed owner overwrites", () => {
    const e = dr.enforce("x", "run", { method: "b" });
    expect(e.args.method).toBe("a");
    expect(e.deviations[0]).toMatchObject({ overwritten: true, used: "b", setup: "a" });
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
