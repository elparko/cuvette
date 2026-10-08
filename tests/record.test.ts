import { mkdtempSync, readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "vitest";
import { AnalysisRecord } from "../src/core/record.ts";
import type { NodeIn } from "../src/core/types.ts";

function tmp(): string {
  return mkdtempSync(join(tmpdir(), "ga-rec-"));
}

function nodeIn(over: Partial<NodeIn> = {}): NodeIn {
  return {
    entry: 1, adapter: "a", adapterVersion: "1", programVersion: "1", tool: "t", args: {}, decisions: {},
    codeHash: "", inputHashes: [], outputs: [], result: {}, parents: [], summary: "", model: "m",
    manualRoute: "", fidelity: "exact", ...over,
  };
}

test("append writes JSONL, makes folders and fires onAppend", () => {
  const dir = tmp();
  const r = new AnalysisRecord(dir, "s1");
  const seen: number[] = [];
  r.onAppend = (e) => seen.push(e.id);
  const e1 = r.append("user", { text: "hi" });
  const e2 = r.append("note", { text: "x" }, { refs: [1] });
  expect([e1.id, e2.id]).toEqual([1, 2]);
  expect(seen).toEqual([1, 2]);
  expect(e1.ts).toMatch(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/);
  expect(readFileSync(join(dir, "log.jsonl"), "utf8").trim().split("\n")).toHaveLength(2);
  for (const d of ["blobs", "work", "exports"]) expect(existsSync(join(dir, d))).toBe(true);
  expect(r.entries(["note"])).toHaveLength(1);
  expect(r.entry(2)?.refs).toEqual([1]);
  expect(r.correct(1, { text: "fixed" }).kind).toBe("correction");
});

test("putBlob stores a file once under its sha", () => {
  const dir = tmp();
  const r = new AnalysisRecord(dir, "s1");
  const src = join(dir, "pic.png");
  writeFileSync(src, "abc");
  const sha = r.putBlob(src);
  expect(sha).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  expect(r.putBlob(src)).toBe(sha);
  expect(readdirSync(join(dir, "blobs"))).toEqual([sha + ".png"]);
  expect(r.blobPath(sha)).toBe(join(dir, "blobs", sha + ".png"));
  expect(r.blobPath("00")).toBeUndefined();
  const sha2 = r.putBlob(Buffer.from("xyz"), ".txt");
  expect(readFileSync(r.blobPath(sha2)!, "utf8")).toBe("xyz");
});

test("nodes, edges, descendants and stale marks", () => {
  const r = new AnalysisRecord(tmp(), "s1");
  const n1 = r.addNode(nodeIn({ decisions: { thr: 1 } }));
  const n2 = r.addNode(nodeIn({ parents: [n1.id] }));
  const n3 = r.addNode(nodeIn({ parents: [n2.id], decisions: { thr: 1 } }));
  const n4 = r.addNode(nodeIn({ decisions: { other: 2 } }));
  expect([n1.id, n4.id]).toEqual(["n1", "n4"]);
  expect(r.edges()).toEqual([["n1", "n2"], ["n2", "n3"]]);
  expect(r.descendants("n1").sort()).toEqual(["n2", "n3"]);
  expect(r.markStale("thr", "changed").sort()).toEqual(["n1", "n2", "n3"]);
  expect(r.markStale("thr", "again")).toEqual([]);
  expect([...r.stale()].sort()).toEqual(["n1", "n2", "n3"]);
  expect(r.stale().has(n4.id)).toBe(false);
  expect(r.entries(["stale"])[0].data).toMatchObject({ key: "thr", reason: "changed" });
  void n3;
});

test("reopening a folder rebuilds nodes, stale marks and next ids", () => {
  const dir = tmp();
  const r = new AnalysisRecord(dir, "s1");
  r.addNode(nodeIn({ decisions: { k: 1 } }));
  r.markStale("k", "why");
  r.append("note", { text: "x" });
  const again = new AnalysisRecord(dir, "s1");
  expect(again.nodes()).toHaveLength(1);
  expect(again.stale().has("n1")).toBe(true);
  expect(again.addNode(nodeIn()).id).toBe("n2");
  expect(again.append("note", { text: "y" }).id).toBe(5);
});

test("numbers walks results with dotted paths and skips non-finite values", () => {
  const r = new AnalysisRecord(tmp(), "s1");
  r.addNode(nodeIn({ result: { metrics: { n: 14, p: 0.01 }, rows: [[1, 2], [3]], flag: true, bad: NaN, text: "5" } }));
  const got = r.numbers().map((x) => `${x.path}=${x.value}`);
  expect(got).toEqual(["metrics.n=14", "metrics.p=0.01", "rows[0][0]=1", "rows[0][1]=2", "rows[1][0]=3"]);
  const big = new AnalysisRecord(tmp(), "s2");
  big.addNode(nodeIn({ result: { v: Array.from({ length: 3000 }, (_, i) => i) } }));
  expect(big.numbers()).toHaveLength(2000);
});

test("messages returns messages, or the summary plus later messages after compaction", () => {
  const r = new AnalysisRecord(tmp(), "s1");
  const msg = (t: string) => ({ role: "user" as const, parts: [{ type: "text" as const, text: t }] });
  r.append("message", { message: msg("one") });
  r.append("message", { message: msg("two") });
  expect(r.messages()).toHaveLength(2);
  r.append("compaction", { summary: "short", upTo: 2 });
  r.append("message", { message: msg("three") });
  const m = r.messages();
  expect(m).toHaveLength(2);
  expect(m[0]).toEqual({ role: "user", parts: [{ type: "text", text: "short" }] });
  expect(m[1].parts[0]).toEqual({ type: "text", text: "three" });
});
