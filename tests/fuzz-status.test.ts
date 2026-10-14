import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { AnalysisRecord } from "../src/core/record.ts";
import { rewindPoints } from "../src/core/rewind.ts";
import { Session } from "../src/core/session.ts";
import { currentNodes, stepStatus } from "../src/core/status.ts";
import { FakeProvider } from "../src/providers/fake.ts";
import type { NodeIn } from "../src/core/types.ts";
import { Rng, runs } from "./fuzz-rng.ts";

const root = mkdtempSync(join(tmpdir(), "cuvette-fuzz-status-"));
const saved = { home: process.env.HOME, cuvette: process.env.CUVETTE_HOME };
beforeAll(() => {
  process.env.HOME = join(root, "home");
  process.env.CUVETTE_HOME = join(root, "cuvette");
});
afterAll(() => {
  process.env.HOME = saved.home;
  if (saved.cuvette === undefined) delete process.env.CUVETTE_HOME;
  else process.env.CUVETTE_HOME = saved.cuvette;
  rmSync(root, { recursive: true, force: true });
});

let dirs = 0;
const freshDir = () => join(root, `s${dirs++}`);
const KEYS = ["method", "size", "mode"];

interface Model {
  nodes: Map<string, { parents: string[]; keys: string[] }>;
  stale: Set<string>;
  replaced: Map<string, string>;
  messages: string[];
}

const clone = (m: Model): Model => ({
  nodes: new Map([...m.nodes].map(([k, v]) => [k, { parents: [...v.parents], keys: [...v.keys] }])),
  stale: new Set(m.stale),
  replaced: new Map(m.replaced),
  messages: [...m.messages],
});

function nodeIn(rec: AnalysisRecord, parents: string[], keys: string[], tool = "count"): NodeIn {
  return {
    entry: rec.entries().length,
    adapter: "lab",
    adapterVersion: "1",
    programVersion: "1",
    tool,
    args: {},
    decisions: Object.fromEntries(keys.map((k) => [k, "v"])),
    codeHash: "h",
    inputHashes: [],
    outputs: [],
    result: { n: 1 },
    parents,
    summary: "s",
    model: "m",
    manualRoute: "",
    fidelity: "exact",
  };
}

function expectedCurrent(m: Model): Map<string, boolean> {
  const out = new Map<string, boolean>();
  for (const [id, n] of m.nodes) {
    if (m.replaced.has(id)) continue;
    let ok = !m.stale.has(id);
    for (const p of n.parents) {
      if (m.replaced.has(p)) ok = false;
      else if (out.get(p) === false) ok = false;
    }
    out.set(id, ok);
  }
  return out;
}

function check(rec: AnalysisRecord, m: Model, what: string): void {
  const states = stepStatus(rec);
  const want = expectedCurrent(m);
  expect(new Map(states.map((s) => [s.node, s.current])), what).toEqual(want);
  for (const s of states) {
    expect(s.current, `${what}: ${s.node} reasons`).toBe(s.reasons.length === 0);
    expect(m.nodes.has(s.node), `${what}: ${s.node} is rewound`).toBe(true);
  }
  expect([...rec.stale()].filter((id) => m.nodes.has(id)).sort(), what).toEqual([...m.stale].sort());
  expect(rec.messages().map((x) => (x.parts[0] as { text: string }).text), `${what}: history`).toEqual(m.messages);
  const rewound = rec.rewound();
  for (const n of currentNodes(rec)) for (const p of n.parents) expect(rewound.has(p), `${what}: ${n.id} has a rewound parent ${p}`).toBe(false);
  for (const n of rec.nodes()) if (!rewound.has(n.id)) for (const p of n.parents) expect(rec.node(p), `${what}: ${n.id} parent ${p}`).toBeDefined();
}

function descendants(m: Model, id: string): string[] {
  const out = new Set<string>();
  const walk = (x: string) => {
    for (const [c, n] of m.nodes) if (n.parents.includes(x) && !out.has(c)) (out.add(c), walk(c));
  };
  walk(id);
  return [...out];
}

function play(seed: number, steps: number): { rec: AnalysisRecord; dir: string; model: Model } {
  const r = new Rng(seed);
  const dir = freshDir();
  const rec = new AnalysisRecord(dir, "s");
  let cur: Model = { nodes: new Map(), stale: new Set(), replaced: new Map(), messages: [] };
  const states = new Map<number, Model>();
  const snap = () => states.set(rec.entries().at(-1)!.id, clone(cur));
  let sentences = 0;
  for (let i = 0; i < steps; i++) {
    const k = r.int(0, 11);
    const ids = [...cur.nodes.keys()];
    if (k <= 2) {
      const parents = ids.length && r.bool(0.6) ? [r.pick(ids)] : [];
      const keys = KEYS.filter(() => r.bool(0.4));
      const n = rec.addNode(nodeIn(rec, parents, keys));
      cur.nodes.set(n.id, { parents, keys });
      snap();
    } else if (k === 3 || k === 4) {
      const text = `u${sentences++}`;
      rec.append("user", { text });
      snap();
      rec.append("message", { message: { role: "user", parts: [{ type: "text", text }] } });
      cur.messages.push(text);
      snap();
      const reply = `a${sentences++}`;
      rec.append("message", { message: { role: "assistant", parts: [{ type: "text", text: reply }] } });
      cur.messages.push(reply);
      snap();
    } else if (k === 5) {
      const key = r.pick(KEYS);
      rec.markStale(key, "changed");
      const hit = new Set<string>();
      for (const [id, n] of cur.nodes) if (n.keys.includes(key)) (hit.add(id), descendants(cur, id).forEach((d) => hit.add(d)));
      hit.forEach((id) => cur.stale.add(id));
      snap();
    } else if (k === 6) {
      const open = ids.filter((id) => !cur.replaced.has(id));
      if (!open.length) continue;
      const old = r.pick(open);
      const parents = cur.nodes.get(old)!.parents;
      const n = rec.addNode(nodeIn(rec, parents, cur.nodes.get(old)!.keys));
      cur.nodes.set(n.id, { parents: [...parents], keys: [...cur.nodes.get(old)!.keys] });
      snap();
      rec.append("rerun", { old, node: n.id }, { node: n.id });
      cur.replaced.set(old, n.id);
      snap();
    } else if (k === 7) {
      rec.append("plan_approved", { version: 1, text: "plan", plan: { steps: [] } });
      snap();
    } else if (k === 8) {
      rec.append("compaction", { summary: `c${sentences++}`, kept: [] });
      cur.messages = [`c${sentences - 1}`];
      snap();
    } else if (k === 9 || k === 10) {
      const points = rewindPoints(rec);
      if (!points.length) continue;
      const p = r.pick(points);
      rec.append("rewind", { upTo: p.upTo, entry: p.entry, kind: p.kind, point: p.label, nodes: [] });
      cur = clone(states.get(p.upTo) ?? { nodes: new Map(), stale: new Set(), replaced: new Map(), messages: [] });
      snap();
      check(rec, cur, `seed ${seed} step ${i} after a rewind to ${p.label}`);
    } else {
      rec.append("note", { text: "n" });
      snap();
    }
  }
  return { rec, dir, model: cur };
}

describe("fuzz: status and rewind", () => {
  test("after any sequence of actions the status, the stale marks and the history match a model", () => {
    for (let seed = 1; seed <= runs(120); seed++) {
      const { rec, dir, model } = play(seed, 40);
      check(rec, model, `seed ${seed}`);
      check(new AnalysisRecord(dir, "s"), model, `seed ${seed} after a reload`);
    }
  });

  test("without a change or a rerun every step is up to date, also after a rewind", () => {
    for (let seed = 1000; seed < 1000 + runs(60); seed++) {
      const r = new Rng(seed);
      const rec = new AnalysisRecord(freshDir(), "s");
      const ids: string[] = [];
      for (let i = 0; i < 25; i++) {
        const k = r.int(0, 4);
        if (k <= 1) ids.push(rec.addNode(nodeIn(rec, ids.length && r.bool() ? [r.pick(ids)] : [], KEYS.filter(() => r.bool()))).id);
        else if (k === 2) {
          const text = `u${i}`;
          rec.append("user", { text });
          rec.append("message", { message: { role: "user", parts: [{ type: "text", text }] } });
        } else {
          const points = rewindPoints(rec);
          if (points.length) {
            const p = r.pick(points);
            rec.append("rewind", { upTo: p.upTo, entry: p.entry, kind: p.kind, point: p.label, nodes: [] });
          }
        }
        expect(stepStatus(rec).filter((s) => !s.current)).toEqual([]);
      }
    }
  });

  test("a change that a rewind undoes does not leave a step out of date, and a new change marks it again", () => {
    const rec = new AnalysisRecord(freshDir(), "s");
    rec.append("user", { text: "one" });
    const a = rec.addNode(nodeIn(rec, [], ["method"]));
    rec.append("user", { text: "two" });
    rec.markStale("method", "changed");
    expect(stepStatus(rec).map((s) => s.current)).toEqual([false]);
    const p = rewindPoints(rec).find((x) => x.label.endsWith("two"))!;
    rec.append("rewind", { upTo: p.upTo, entry: p.entry, kind: p.kind, point: p.label, nodes: [] });
    expect(stepStatus(rec).map((s) => s.current)).toEqual([true]);
    expect(rec.stale().size).toBe(0);
    expect(rec.markStale("method", "changed again")).toEqual([a.id]);
    expect(stepStatus(rec).map((s) => s.current)).toEqual([false]);
  });

  test("a step that a rewind sets aside is not in the status, and the step that it replaced is back", () => {
    const rec = new AnalysisRecord(freshDir(), "s");
    rec.append("user", { text: "one" });
    const a = rec.addNode(nodeIn(rec, [], ["method"]));
    rec.append("user", { text: "two" });
    const b = rec.addNode(nodeIn(rec, [], ["method"]));
    rec.append("rerun", { old: a.id, node: b.id }, { node: b.id });
    expect(stepStatus(rec).map((s) => s.node)).toEqual([b.id]);
    const p = rewindPoints(rec).find((x) => x.label.endsWith("two"))!;
    rec.append("rewind", { upTo: p.upTo, entry: p.entry, kind: p.kind, point: p.label, nodes: [b.id] });
    expect(stepStatus(rec).map((s) => s.node)).toEqual([a.id]);
    expect(rec.replacedBy(a.id)).toBeUndefined();
    expect(rec.latest(a.id)).toBe(a.id);
  });
});

describe("rewind and the marks from the disk", () => {
  const rewindTo = (rec: AnalysisRecord, label: string) => {
    const p = rewindPoints(rec).find((x) => x.label.endsWith(label))!;
    rec.append("rewind", { upTo: p.upTo, entry: p.entry, kind: p.kind, point: p.label, nodes: [] });
  };

  test("a rewind keeps the mark of a changed input file, and clears the mark of a decision change", () => {
    const rec = new AnalysisRecord(freshDir(), "s");
    rec.append("user", { text: "one" });
    const a = rec.addNode(nodeIn(rec, [], ["method"]));
    const b = rec.addNode(nodeIn(rec, [], []));
    rec.append("user", { text: "two" });
    rec.append("stale", { kind: "input", reason: "The input file x changed after this step ran.", nodes: [b.id], direct: [b.id] });
    rec.markStale("method", "changed");
    expect(stepStatus(rec).map((s) => s.current)).toEqual([false, false]);
    rewindTo(rec, "two");
    expect(rec.stale()).toEqual(new Set([b.id]));
    const states = stepStatus(rec);
    expect(states.map((s) => [s.node, s.current])).toEqual([[a.id, true], [b.id, false]]);
    expect(states[1]!.reasons[0]!.text).toContain("input file x");
    expect(new AnalysisRecord(rec.dir, "s").stale()).toEqual(new Set([b.id]));
  });
});

describe("stale marks through the live view", () => {
  const rewindTo = (rec: AnalysisRecord, label: string) => {
    const p = rewindPoints(rec).find((x) => x.label.endsWith(label))!;
    rec.append("rewind", { upTo: p.upTo, entry: p.entry, kind: p.kind, point: p.label, nodes: [] });
  };
  const stale = (rec: AnalysisRecord) => {
    const a = [...rec.stale()].sort();
    expect([...rec.liveView().stale()].sort()).toEqual(a);
    return a;
  };

  test("two rewinds in a row keep the mark of a changed input file and drop the marks of decisions", () => {
    const rec = new AnalysisRecord(freshDir(), "s");
    rec.append("user", { text: "one" });
    const a = rec.addNode(nodeIn(rec, [], ["method"]));
    const b = rec.addNode(nodeIn(rec, [], []));
    rec.append("user", { text: "two" });
    rec.append("stale", { kind: "input", reason: "The input file x changed after this step ran.", nodes: [b.id], direct: [b.id] });
    rec.append("user", { text: "three" });
    rec.markStale("method", "changed");
    expect(stale(rec)).toEqual([a.id, b.id]);
    rewindTo(rec, "three");
    expect(stale(rec)).toEqual([b.id]);
    rewindTo(rec, "two");
    expect(stale(rec)).toEqual([b.id]);
    rec.append("user", { text: "four" });
    rec.append("stale", { kind: "program", reason: "The program changed after this step ran.", nodes: [a.id], direct: [a.id] });
    rewindTo(rec, "four");
    expect(stale(rec)).toEqual([a.id, b.id]);
    expect(stepStatus(rec).map((x) => x.current)).toEqual([false, false]);
  });

  test("a rewind past a rerun of a step whose input changed leaves that step stale", () => {
    const rec = new AnalysisRecord(freshDir(), "s");
    rec.append("user", { text: "one" });
    const a = rec.addNode(nodeIn(rec, [], []));
    rec.append("stale", { kind: "input", reason: "The input file x changed after this step ran.", nodes: [a.id], direct: [a.id] });
    rec.append("user", { text: "two" });
    const a2 = rec.addNode(nodeIn(rec, [], []));
    rec.append("rerun", { old: a.id, node: a2.id }, { node: a2.id });
    expect(stepStatus(rec).map((x) => [x.node, x.current])).toEqual([[a2.id, true]]);
    rewindTo(rec, "two");
    expect(stale(rec)).toEqual([a.id]);
    expect(stepStatus(rec).map((x) => [x.node, x.current])).toEqual([[a.id, false]]);
  });

  test("a decision change, a rewind past it, and the same change again give the right marks", () => {
    const rec = new AnalysisRecord(freshDir(), "s");
    rec.append("user", { text: "one" });
    const a = rec.addNode(nodeIn(rec, [], ["method"]));
    rec.append("user", { text: "two" });
    rec.markStale("method", "changed");
    expect(stale(rec)).toEqual([a.id]);
    rewindTo(rec, "two");
    expect(stale(rec)).toEqual([]);
    expect(stepStatus(rec.liveView()).map((x) => x.current)).toEqual([true]);
    rec.markStale("method", "changed again");
    expect(stale(rec)).toEqual([a.id]);
    expect(stepStatus(rec.liveView()).map((x) => x.current)).toEqual([false]);
  });
});

describe("fuzz: branch", () => {
  test("a branch has the history, the steps and the parents up to the branch point", async () => {
    for (let seed = 1; seed <= runs(3); seed++) {
      const r = new Rng(seed + 5000);
      const cwd = mkdtempSync(join(root, "proj-"));
      const s = await Session.create({ adapters: [join(__dirname, "fixtures/lab")], provider: new FakeProvider([{ text: "one" }]), cwd, settings: { guidance: false } });
      try {
        await s.send("first");
        const rec = s.record;
        const ids: string[] = [];
        for (let i = 0; i < 30; i++) {
          const k = r.int(0, 5);
          if (k <= 1) ids.push(rec.addNode(nodeIn(rec, ids.length && r.bool() ? [r.pick(ids)] : [], KEYS.filter(() => r.bool()))).id);
          else if (k === 2) {
            const text = `u${i}`;
            rec.append("user", { text });
            rec.append("message", { message: { role: "user", parts: [{ type: "text", text }] } });
          } else if (k === 3) rec.markStale(r.pick(KEYS), "changed");
          else if (k === 4) {
            const points = rewindPoints(rec);
            if (points.length) {
              const p = r.pick(points);
              rec.append("rewind", { upTo: p.upTo, entry: p.entry, kind: p.kind, point: p.label, nodes: [] });
            }
          }
          if (i % 6 !== 5 || !rec.live(["user"]).length) continue;
          const points = rewindPoints(rec);
          const at = points.length && r.bool() ? r.pick(points) : undefined;
          const last = rec.entries().at(-1)!.id;
          const made = s.branch(`b${seed}-${i}`, at?.n);
          const cut = made.upTo;
          expect(cut).toBe(at ? at.upTo : last);
          const child = new AnalysisRecord(join(made.folder, ".record"), made.id);
          const disk = new AnalysisRecord(rec.dir, rec.sessionId);
          const mine = disk.entries().filter((e) => e.id <= cut);
          expect(child.entries().filter((e) => e.kind !== "fork").map((e) => e.id)).toEqual(mine.map((e) => e.id));
          expect(JSON.parse(JSON.stringify(child.entries().filter((e) => e.kind !== "fork")))).toEqual(JSON.parse(JSON.stringify(mine)));
          expect(child.messages()).toEqual(rec.messages(cut));
          const kept = new Set(child.nodes().map((n) => n.id));
          expect([...kept].sort()).toEqual(rec.entries(["node"]).filter((e) => e.id <= cut).map((e) => String(e.data.id)).sort());
          for (const n of child.nodes()) for (const p of n.parents) expect(kept.has(p), `parent ${p} of ${n.id} is in the branch`).toBe(true);
          expect(readFileSync(child.logPath, "utf8").endsWith("\n")).toBe(true);
        }
      } finally {
        await s.close();
      }
    }
  });
});
