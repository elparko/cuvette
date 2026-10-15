import { appendFileSync, mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "vitest";
import { AnalysisRecord } from "../src/core/record.ts";
import { extractNumbers } from "../src/core/claims.ts";
import type { NodeIn } from "../src/core/types.ts";

function tmp(): string {
  return mkdtempSync(join(tmpdir(), "cuvette-rec-"));
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

test("blobPath refuses a sha that is not hexadecimal text", () => {
  const dir = tmp();
  const r = new AnalysisRecord(join(dir, "rec"), "s1");
  writeFileSync(join(dir, "secret.txt"), "private");
  writeFileSync(join(dir, "rec", "secret.txt"), "private");
  expect(r.blobPath("../secret.txt")).toBeUndefined();
  expect(r.blobPath("../../" + dir.split("/").pop() + "/secret.txt")).toBeUndefined();
  expect(r.blobPath("../secret")).toBeUndefined();
  expect(r.blobRef("../x")).toBeUndefined();
  expect(r.blobPath("")).toBeUndefined();
  expect(r.blobPath("a".repeat(65))).toBeUndefined();
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

test("numbers include numeric strings in table rows, not other strings", () => {
  const r = new AnalysisRecord(tmp(), "s1");
  r.addNode(nodeIn({ result: { table: { columns: ["gate", "flowjo_count"], rows: [["CD3+", "133860"], ["CD4+", "82636.5"]] }, data: { note: "7" } } }));
  expect(r.numbers().map((x) => x.value)).toEqual([133860, 82636.5]);
});

test("numbers include the values that a script printed", () => {
  const r = new AnalysisRecord(tmp(), "s1");
  const e = r.append("tool_result", { tool: "run_script", text: "n features 11432 AUC range 0.4295703244566881 0.5484182098765432" });
  r.addNode(nodeIn({ tool: "run_script", entry: e.id, result: { data: { duration_s: 1.5 } } }));
  r.addNode(nodeIn({ tool: "other", entry: e.id, result: {} }));
  const got = r.numbers().map((x) => `${x.node}:${x.path}=${x.value}`);
  expect(got).toEqual(["n1:data.duration_s=1.5", "n1:stdout=11432", "n1:stdout=0.4295703244566881", "n1:stdout=0.5484182098765432"]);
});

test("numbers include a file that the agent read, from the saved copy of that file", () => {
  const dir = tmp();
  const r = new AnalysisRecord(dir, "s1");
  const csv = join(dir, "table.csv");
  writeFileSync(csv, "mz,log2_fc\n" + Array.from({ length: 400 }, (_, i) => `${100 + i}.5,${(i / 7).toFixed(4)}`).join("\n"));
  const sha = r.putBlob(csv, ".csv");
  r.addNode(nodeIn({ tool: "run_analysis", result: {}, outputs: [{ path: csv, kind: "file", sha }] }));
  r.append("tool_result", { tool: "read_file", ok: true, text: "mz,log2_fc\n100.5,0.0000", effectiveArgs: { path: csv } });
  const vals = r.numbers().filter((x) => x.path === `file:${csv}`).map((x) => x.value);
  expect(vals).toContain(57);
  expect(vals).toContain(499.5);
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

test("a compaction entry holds the messages that it keeps, so a crash after it loses none", () => {
  const r = new AnalysisRecord(tmp(), "s1");
  const msg = (t: string) => ({ role: "user" as const, parts: [{ type: "text" as const, text: t }] });
  r.append("message", { message: msg("one") });
  r.append("message", { message: msg("two") });
  r.append("compaction", { summary: "short", upTo: 2, kept: [msg("two")] });
  expect(r.messages().map((m) => (m.parts[0] as { text: string }).text)).toEqual(["short", "two"]);
  r.append("message", { message: msg("three") });
  expect(r.messages().map((m) => (m.parts[0] as { text: string }).text)).toEqual(["short", "two", "three"]);
});

const said = (r: AnalysisRecord) => r.messages().map((m) => (m.parts[0] as { text: string }).text);
const textMsg = (t: string) => ({ message: { role: "user", parts: [{ type: "text", text: t }] } });

test("a cut last line does not swallow the next entry, also with no repair before the append", () => {
  const dir = tmp();
  const r = new AnalysisRecord(dir, "s1");
  r.append("message", textMsg("one"));
  appendFileSync(join(dir, "log.jsonl"), '{"id":2,"kind":"mess');
  const again = new AnalysisRecord(dir, "s1");
  expect(again.append("message", textMsg("two")).id).toBe(2);
  const third = new AnalysisRecord(dir, "s1");
  expect(said(third)).toEqual(["one", "two"]);
  expect(third.append("note", {}).id).toBe(3);
});

test("a bad line in the middle does not give two entries the same id", () => {
  const dir = tmp();
  const r = new AnalysisRecord(dir, "s1");
  for (const t of ["a", "b", "c"]) r.append("message", textMsg(t));
  const lines = readFileSync(join(dir, "log.jsonl"), "utf8").split("\n");
  lines.splice(1, 1, "{not json", "null");
  writeFileSync(join(dir, "log.jsonl"), lines.join("\n"));
  const again = new AnalysisRecord(dir, "s1");
  expect(again.entry(3)?.data.message).toMatchObject({ parts: [{ text: "c" }] });
  expect(again.append("note", {}).id).toBe(4);
});

test("messages after several rewinds are the same as the history at each rewind point", () => {
  const r = new AnalysisRecord(tmp(), "s1");
  for (const t of ["a", "b", "c"]) r.append("message", textMsg(t));
  r.append("rewind", { upTo: 2 });
  r.append("message", textMsg("d"));
  r.append("rewind", { upTo: 5 });
  r.append("message", textMsg("e"));
  r.append("rewind", { upTo: 0 });
  r.append("message", textMsg("f"));
  expect(said(r)).toEqual(["f"]);
  expect(r.messages(7).map((m) => (m.parts[0] as { text: string }).text)).toEqual(["a", "b", "d", "e"]);
  expect(r.messages(4).map((m) => (m.parts[0] as { text: string }).text)).toEqual(["a", "b"]);
});

test("a log with 100,000 entries loads, rebuilds the history and finds numbers in time", () => {
  const dir = tmp();
  const lines: string[] = [];
  const ts = new Date().toISOString();
  for (let i = 1; i <= 100_000; i++) {
    const kind = i % 500 === 0 ? "rewind" : i % 3 === 0 ? "node" : "message";
    const data = kind === "rewind" ? { upTo: i - 10 } : kind === "node" ? { ...nodeIn({ entry: i - 1, result: { v: i } }), id: `n${i}` } : { message: { role: "user", parts: [{ type: "text", text: `m${i}` }] } };
    lines.push(JSON.stringify({ id: i, ts, session: "s1", kind, data }));
    if (i % 7 === 0) lines.push(JSON.stringify({ id: ++i, ts, session: "s1", kind: "tool_result", data: { tool: "read_file", ok: true, text: "1 2", effectiveArgs: { path: "/x" } } }));
  }
  writeFileSync(join(dir, "log.jsonl"), lines.join("\n") + "\n");
  const t0 = Date.now();
  const r = new AnalysisRecord(dir, "s1");
  expect(r.messages().length).toBeGreaterThan(0);
  expect(r.numbers().length).toBeGreaterThan(1000);
  expect(Date.now() - t0).toBeLessThan(15_000);
}, 30_000);

function scriptNode(files: Record<string, string | Buffer>) {
  const dir = tmp();
  const r = new AnalysisRecord(dir, "s1");
  const e = r.append("tool_result", { tool: "run_script", ok: true, text: "done" });
  const outputs = Object.entries(files).map(([name, body]) => {
    const path = join(dir, name);
    writeFileSync(path, body);
    return { path, kind: "file" as const, sha: r.putBlob(path) };
  });
  r.addNode(nodeIn({ entry: e.id, tool: "run_script", outputs }));
  return { r, dir };
}

test("numbers from a script output file: a binary file with a .csv name gives none", () => {
  const { r, dir } = scriptNode({ "fake.csv": Buffer.from([0x50, 0x4b, 0x03, 0x04, 0, 0, 0x31, 0x32, 0x2e, 0x35, 0x20, 0x34, 0x37]), "ok.csv": "x\n12.5\n" });
  expect(r.numbers().map((n) => [n.path.split("/").pop(), n.value])).toEqual([["ok.csv", 12.5]]);
  rmSync(dir, { recursive: true, force: true });
});

test("numbers from a script output file come from the copy at the step, not from a later change", () => {
  const { r, dir } = scriptNode({ "out.csv": "x\n12.5\n" });
  writeFileSync(join(dir, "out.csv"), "x\n99.9\n");
  expect(r.numbers().map((n) => n.value)).toEqual([12.5]);
  rmSync(dir, { recursive: true, force: true });
});

test("numbers from script output files: a huge file gives none and many files stay fast", () => {
  const rows = Array.from({ length: 9000 }, (_, i) => `${i},${(i * 0.37).toFixed(3)},s${i % 5}`).join("\n");
  const files: Record<string, string> = { "huge.csv": "a,b\n" + "1.5,2.5\n".repeat(200_000) };
  for (let i = 0; i < 40; i++) files[`part${i}.csv`] = rows;
  const { r, dir } = scriptNode(files);
  const t = Date.now();
  const nums = r.numbers();
  expect(Date.now() - t).toBeLessThan(3000);
  expect(nums.length).toBe(2000);
  expect(nums.some((n) => n.path.endsWith("huge.csv"))).toBe(false);
  rmSync(dir, { recursive: true, force: true });
});

test("a long table in a file is read in linear time", () => {
  const rows = Array.from({ length: 20_000 }, (_, i) => `| ${i} | ${i % 7} | ${(i * 0.37).toFixed(3)} |`).join("\n");
  const t = Date.now();
  expect(extractNumbers(rows).length).toBeGreaterThan(40_000);
  expect(Date.now() - t).toBeLessThan(2000);
});

test("messages() matches a copy of the history after every entry, also after a reload from disk", () => {
  for (let seed = 1; seed <= 40; seed++) {
    let s = seed * 7919;
    const rnd = () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32);
    const dir = tmp();
    const r = new AnalysisRecord(dir, "s1");
    const msg = (text: string, role: "user" | "assistant" = "user") => ({ role, parts: [{ type: "text", text }] });
    let state: string[] = [];
    const snaps: string[][] = [[]];
    for (let i = 0; i < 60; i++) {
      const x = rnd();
      const id = r.entries().length + 1;
      if (x < 0.65) {
        r.append("message", { message: msg(`m${id}`) });
        state = [...state, `m${id}`];
      } else if (x < 0.8) {
        const kept = state.slice(-Math.floor(rnd() * 3)).map((t) => msg(t));
        r.append("compaction", { summary: `sum${id}`, upTo: id - 1, kept });
        state = [`sum${id}`, ...kept.map((m) => m.parts[0]!.text)];
      } else if (x < 0.9 && id > 2) {
        const upTo = Math.floor(rnd() * (id - 1));
        r.append("rewind", { upTo, entry: upTo + 1, kind: "message", point: "p", nodes: [] });
        state = [...snaps[upTo]!];
      } else r.append("notice", { text: "n" });
      snaps.push([...state]);
    }
    const texts = (m: { parts: unknown[] }[]) => m.map((x) => (x.parts[0] as { text: string }).text);
    const back = new AnalysisRecord(dir, "s1");
    for (const rec of [r, back]) {
      expect(texts(rec.messages())).toEqual(snaps.at(-1));
      for (let k = 0; k <= snaps.length - 1; k += 7) expect(texts(rec.messages(k))).toEqual(snaps[k]);
    }
  }
});
