import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { AnalysisRecord } from "../src/core/record.ts";
import { rewindPoints } from "../src/core/rewind.ts";
import { Session } from "../src/core/session.ts";
import { FakeProvider } from "../src/providers/fake.ts";
import type { EntryKind, NodeIn } from "../src/core/types.ts";
import { Rng, runs } from "./fuzz-rng.ts";

const root = mkdtempSync(join(tmpdir(), "cuvette-fuzz-record-"));
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

function node(r: Rng, rec: AnalysisRecord): NodeIn {
  const ids = rec.nodes().map((n) => n.id);
  return {
    entry: rec.entries().length,
    adapter: "lab",
    adapterVersion: "1",
    programVersion: "1",
    tool: r.pick(["count", "measure", "run_script"]),
    args: { x: r.int(0, 9) },
    decisions: r.bool() ? { method: r.pick(["Otsu", "Triangle"]) } : {},
    codeHash: "h",
    inputHashes: [],
    outputs: [],
    result: { value: r.logUniform(0.01, 1000), n: r.int(1, 50), label: r.string("ab 12.5", 0, 6) },
    parents: ids.length && r.bool() ? [r.pick(ids)] : [],
    summary: "s",
    model: "m",
    manualRoute: "",
    fidelity: "exact",
  };
}

function fill(r: Rng, rec: AnalysisRecord, n: number): void {
  for (let i = 0; i < n; i++) {
    const k = r.int(0, 9);
    if (k === 0) rec.addNode(node(r, rec));
    else if (k === 1) rec.append("user", { text: r.string("abc 12.5\n\"\\é", 0, 30) });
    else if (k === 2) rec.append("message", { message: { role: r.pick(["user", "assistant"]), parts: [{ type: "text", text: r.string("xyz ", 1, 10) }] } });
    else if (k === 3 && rec.entries().length > 2) rec.append("rewind", { upTo: r.int(0, rec.entries().length), point: "p" });
    else if (k === 4 && rec.nodes().length) rec.append("rerun", { old: r.pick(rec.nodes()).id, node: r.pick(rec.nodes()).id });
    else if (k === 5) rec.markStale("method", "changed");
    else if (k === 6) rec.append("compaction", { summary: "sum", kept: [] });
    else if (k === 7) rec.append("plan_approved", { version: 1, text: "plan", plan: { steps: [] } });
    else rec.append(r.pick(["note", "assistant", "notice", "tool_call"] as EntryKind[]), { text: r.string("abc 1.5", 0, 20) });
  }
}

const JUNK = ["null", "[]", "5", '"x"', "{}", '{"kind":"node"}', '{"id":3,"kind":"node","data":null}', '{"id":3,"kind":"node","data":{}}', '{"id":3,"kind":"node","data":{"id":"n99"}}', '{"id":4,"kind":"stale","data":{"nodes":"n1"}}', '{"id":4,"kind":"stale"}', '{"id":5,"kind":"rewind"}', '{"id":5,"kind":"rewind","data":{"upTo":"x"}}', '{"id":6,"kind":"rerun","data":null}', '{"id":7,"kind":"environment","data":{}}', '{"id":8,"kind":"message","data":{}}', '{"id":8,"kind":"message","data":{"message":null}}', '{"id":9,"kind":"compaction","data":{"kept":"x"}}', '{"kind":"user","data":{"text":5}}', '{"id":"x","kind":"user","data":{}}', '{"id":10,"kind":"mode","data":null}', '{"id":11,"kind":"plan_approved","data":{"plan":null}}'];

// Each damage keeps a list of the original lines that it did not touch.
function damage(r: Rng, lines: string[]): { text: Buffer; kept: number[] } {
  const out: Buffer[] = [];
  const kept: number[] = [];
  const ends = new Map<number, number>();
  const size = () => out.reduce((a, b) => a + b.length, 0);
  const nl = r.bool(0.2) ? "\r\n" : "\n";
  if (r.bool(0.1)) out.push(Buffer.from([0xef, 0xbb, 0xbf]));
  lines.forEach((line, i) => {
    const roll = r.next();
    if (roll < 0.05) out.push(Buffer.from(line.slice(0, r.int(0, line.length - 1)) + nl));
    else if (roll < 0.08) out.push(Buffer.concat([r.bytes(r.int(1, 30)).filter((b) => b !== 10), Buffer.from(nl)]));
    else {
      kept.push(i);
      ends.set(i, size() + Buffer.byteLength(line));
      out.push(Buffer.from(line + nl));
    }
    if (r.bool(0.08)) out.push(Buffer.from(r.pick(JUNK) + nl));
    if (r.bool(0.05)) out.push(Buffer.from(nl));
  });
  if (r.bool(0.3)) {
    const last = Buffer.concat(out);
    const cutAt = last.length - r.int(1, Math.min(40, last.length));
    return { text: last.subarray(0, cutAt), kept: kept.filter((k) => ends.get(k)! <= cutAt) };
  }
  return { text: Buffer.concat(out), kept };
}

function use(rec: AnalysisRecord): void {
  rec.entries();
  rec.live();
  rec.rewound();
  rec.nodes();
  rec.edges();
  rec.comparisons();
  rec.stale();
  rec.numbers();
  rec.messages();
  rec.liveView().nodes();
  rewindPoints(rec);
  for (const n of rec.nodes()) {
    rec.descendants(n.id);
    rec.latest(n.id);
  }
}

describe("fuzz: the record", () => {
  test("a valid log loads back with every entry", () => {
    const r = new Rng(707);
    for (let i = 0; i < runs(40); i++) {
      const dir = freshDir();
      const rec = new AnalysisRecord(dir, "s");
      fill(r, rec, r.int(1, 40));
      const back = new AnalysisRecord(dir, "s");
      expect(JSON.parse(JSON.stringify(back.entries()))).toEqual(JSON.parse(JSON.stringify(rec.entries())));
      expect(back.nodes().map((n) => n.id)).toEqual(rec.nodes().map((n) => n.id));
      expect(back.messages()).toEqual(rec.messages());
      expect([...back.rewound()]).toEqual([...rec.rewound()]);
      use(back);
    }
  });

  test("a damaged log loads without a crash and keeps each line that is intact", () => {
    const r = new Rng(808);
    const bad: string[] = [];
    for (let i = 0; i < runs(150); i++) {
      const dir = freshDir();
      const rec = new AnalysisRecord(dir, "s");
      fill(r, rec, r.int(1, 30));
      const lines = readFileSync(rec.logPath, "utf8").split("\n").filter(Boolean);
      const { text, kept } = damage(r, lines);
      writeFileSync(rec.logPath, text);
      let back: AnalysisRecord;
      try {
        back = new AnalysisRecord(dir, "s");
        use(back);
      } catch (e) {
        bad.push(`load: ${(e as Error).message}`);
        continue;
      }
      const ids = new Set(back.entries().map((e) => e.id));
      const lost = kept.map((k) => JSON.parse(lines[k]!).id).filter((id) => !ids.has(id));
      if (lost.length) bad.push(`lost ${lost.join(",")}`);
      const before = back.entries().length;
      const added = back.append("note", { text: "after the damage" });
      const again = new AnalysisRecord(dir, "s");
      if (again.entries().length !== before + 1 || again.entries().at(-1)?.data.text !== "after the damage") bad.push(`append after the damage lost entries: ${before + 1} -> ${again.entries().length}`);
      if (back.entries().filter((e) => e.id === added.id).length !== 1) bad.push(`duplicate id ${added.id}`);
      try {
        use(again);
      } catch (e) {
        bad.push(`reload: ${(e as Error).message}`);
      }
    }
    expect([...new Set(bad)].slice(0, 6)).toEqual([]);
  });

  test("a session resumes from a damaged log", async () => {
    const r = new Rng(909);
    const bad: string[] = [];
    for (let i = 0; i < runs(4); i++) {
      const cwd = mkdtempSync(join(root, "proj-"));
      const s = await Session.create({ adapters: [join(__dirname, "fixtures/lab")], provider: new FakeProvider([{ text: "one" }, { text: "two" }]), cwd, settings: { guidance: false } });
      await s.send("first");
      await s.send("second");
      const id = s.id;
      const log = s.record.logPath;
      await s.close();
      const lines = readFileSync(log, "utf8").split("\n").filter(Boolean);
      const { text } = damage(r, lines);
      writeFileSync(log, text);
      try {
        const back = await Session.resume(id, { provider: new FakeProvider([{ text: "three" }]), cwd });
        await back.send("third");
        await back.close();
      } catch (e) {
        bad.push((e as Error).message);
      }
    }
    expect(bad).toEqual([]);
  });
});
