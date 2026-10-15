import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { afterEach, beforeEach, expect, test } from "vitest";
import type { Session } from "../src/core/session.ts";
import { analysedSession } from "./fixtures/eln-session.ts";
import { unzip } from "./fixtures/unzip.ts";

let s: Session;
beforeEach(async () => {
  process.env.CUVETTE_HOME = mkdtempSync(join(tmpdir(), "cuvette-eln-"));
  s = await analysedSession();
});
afterEach(() => s.close());

async function exported() {
  const path = await s.exportAs("eln");
  const files = unzip(readFileSync(path));
  const top = `${s.id}/`;
  const meta = JSON.parse(files.get(`${top}ro-crate-metadata.json`)!.toString());
  return { path, files, top, meta, graph: meta["@graph"] as Record<string, any>[] };
}

test("the archive has one top folder with ro-crate-metadata.json", async () => {
  const { path, files, top } = await exported();
  expect(path.endsWith(".eln")).toBe(true);
  for (const name of files.keys()) expect(name.startsWith(top)).toBe(true);
  expect(files.has(`${top}ro-crate-metadata.json`)).toBe(true);
});

test("answer.md holds the assumptions as text of the harness", async () => {
  s.record.append("assistant", { text: "There are 41 particles.", final: true, assumed: "Assumed because no answer was given:\n- Which sigma?: used sigma 2." });
  const { files, top } = await exported();
  const text = files.get(`${top}analysis/answer.md`)!.toString();
  expect(text).toMatch(/Text of the harness, not of the model:\n\nAssumed because no answer was given:\n- Which sigma\?: used sigma 2\./);
});

test("answer.md holds the last final answer that a rewind did not set aside", async () => {
  const upTo = s.record.entries(["assistant"]).filter((e) => e.data.final).at(-1)!.id;
  s.record.append("assistant", { text: "A wrong answer from an undone turn.", final: true });
  s.record.append("rewind", { upTo });
  const { files, top } = await exported();
  const text = files.get(`${top}analysis/answer.md`)!.toString();
  expect(text).toContain("There are 41 particles");
  expect(text).not.toContain("wrong answer");
});

test("the metadata has the descriptor, the root dataset, hasPart and a person", async () => {
  const { meta, graph } = await exported();
  expect(meta["@context"]).toBe("https://w3id.org/ro/crate/1.2/context");
  const byId = new Map(graph.map((n) => [n["@id"], n]));
  const d = byId.get("ro-crate-metadata.json")!;
  expect(d["@type"]).toBe("CreativeWork");
  expect(d.about).toEqual({ "@id": "./" });
  expect(d.conformsTo).toEqual({ "@id": "https://w3id.org/ro/crate/1.2" });
  expect(byId.get(d.sdPublisher["@id"])!["@type"]).toBe("Organization");
  const root = byId.get("./")!;
  expect(root["@type"]).toBe("Dataset");
  expect(root.hasPart.length).toBeGreaterThan(0);
  expect(graph.filter((n) => n["@type"] === "Person").length).toBe(1);
  for (const part of root.hasPart) expect(byId.get(part["@id"])!["@type"]).toBe("Dataset");
});

test("every File has encodingFormat and contentSize that match the archive", async () => {
  const { files, top, graph } = await exported();
  const fileNodes = graph.filter((n) => n["@type"] === "File");
  expect(fileNodes.length).toBeGreaterThan(7);
  for (const n of fileNodes) {
    const data = files.get(top + String(n["@id"]).replace(/^\.\//, ""));
    expect(data, n["@id"]).toBeDefined();
    expect(n.encodingFormat).toMatch(/\//);
    expect(n.contentSize).toBe(String(data!.length));
    expect(n.author).toBeDefined();
  }
  for (const name of files.keys()) {
    if (name.endsWith("/") || name.endsWith("ro-crate-metadata.json")) continue;
    expect(graph.some((n) => n["@id"] === "./" + name.slice(top.length)), name).toBe(true);
  }
});

test("every hasPart entry exists as a node", async () => {
  const { graph } = await exported();
  const ids = new Set(graph.map((n) => n["@id"]));
  for (const n of graph) for (const p of n.hasPart ?? []) expect(ids.has(p["@id"]), p["@id"]).toBe(true);
});

test("the content covers the question, answer, decisions, steps, findings, figure and log", async () => {
  const { files, top, graph } = await exported();
  const text = (p: string) => files.get(`${top}analysis/${p}`)!.toString();
  expect(text("question.md")).toMatch(/How many particles\?/);
  expect(text("answer.md")).toMatch(/41 particles/);
  expect(text("answer.md")).toMatch(/Settings:.*Threshold method Otsu/);
  expect(text("protocol.md")).toMatch(/Analyze > Count/);
  expect(text("trail.html")).toMatch(/<html/);
  expect(text("decisions.csv")).toMatch(/method,Threshold method,Otsu,human,/);
  expect(text("findings.md")).toMatch(/sample size is one image/);
  const steps = [...files.keys()].filter((k) => /analysis\/steps\/\d+-[a-z-]+\/step\.md$/.test(k));
  expect(steps.length).toBe(2);
  expect(files.get(steps.find((k) => /blur/.test(k))!)!.toString()).toMatch(/Process > Blur/);
  expect([...files.keys()].some((k) => k.endsWith("/blur.png"))).toBe(true);
  const logNode = graph.find((n) => n["@id"] === "./analysis/log.jsonl")!;
  expect(logNode.sha256).toBe(createHash("sha256").update(files.get(`${top}analysis/log.jsonl`)!).digest("hex"));
  const exp = graph.find((n) => n["@id"] === "./analysis/")!;
  expect(exp.keywords).toBe("cuvette, lab");
  expect(exp.variableMeasured.length).toBeGreaterThan(0);
});

test("the archive has the approved plan as plan.md and at the top of the body", async () => {
  s.record.append("plan_approved", { version: 1, text: "Question: How many particles?", plan: { steps: [] } });
  const { files, top } = await exported();
  expect(files.get(`${top}analysis/plan.md`)!.toString()).toMatch(/^# Proposed analysis \(version 1, confirmed .*\)\n\n### Proposed metrics\n\nQuestion: How many particles\?/);
  expect(files.get(`${top}analysis/protocol.md`)!.toString()).toContain("## Proposed analysis (version 1");
  const { collect } = await import("../src/eln/export.ts");
  expect(collect(s).bodyHtml.startsWith("<h2>Proposed analysis, confirmed (version 1)</h2><h3>Proposed metrics</h3><pre>Question: How many particles?</pre>")).toBe(true);
});

test("the archive leaves out the saved key file, folders and keys in the log, and gives each output a safe name", async () => {
  const { saveClaudeKey } = await import("../src/core/credentials.ts");
  const key = "sk-ant-api03-Zx9_abcdefghijklmnopqrstuvwxyz0123456789";
  const cred = saveClaudeKey(key);
  s.record.append("notice", { text: `old text with ${key}` });
  s.record.addNode({
    entry: 0, adapter: "lab", adapterVersion: "0.2.0", programVersion: "1.0", tool: "leak", args: {},
    decisions: {}, codeHash: "c", inputHashes: [], outputs: [{ path: cred, kind: "table" }, { path: tmpdir(), kind: "table" }],
    result: {}, parents: [], summary: "Leak.", model: "m", manualRoute: "", fidelity: "exact",
  });
  const sha = s.record.putBlob(Buffer.from("x"), ".csv");
  s.record.addNode({
    entry: 0, adapter: "lab", adapterVersion: "0.2.0", programVersion: "1.0", tool: "dots", args: {},
    decisions: {}, codeHash: "c", inputHashes: [], outputs: [{ path: "/work/..", name: "..", kind: "table", sha }],
    result: {}, parents: [], summary: "Dots.", model: "m", manualRoute: "", fidelity: "exact",
  });
  const { files } = await exported();
  for (const [name, data] of files) {
    expect(data.toString("latin1")).not.toContain(key);
    expect(name.split("/")).not.toContain("..");
    expect(name.endsWith("credentials.json")).toBe(false);
  }
});

test("after a rewind the step folders keep the step numbers of the trail, and protocol.md names the missing steps", async () => {
  const upTo = s.record.entries(["assistant"]).filter((e) => e.data.final).at(-1)!.id;
  s.record.append("rewind", { upTo });
  s.record.addNode({
    entry: 0, adapter: "lab", adapterVersion: "0.2.0", programVersion: "1.0", tool: "sharpen", args: { input: "/data/a.tif" },
    decisions: {}, codeHash: "c", inputHashes: [], outputs: [], result: {}, parents: [], summary: "Sharpened.", model: "m", manualRoute: "", fidelity: "exact",
  });
  const { files, top } = await exported();
  const folders = [...files.keys()].filter((k) => /\/steps\/\d+-[^/]+\/step\.md$/.test(k)).map((k) => k.split("/steps/")[1]!.split("/")[0]);
  expect(folders).toEqual(["01-count", "03-sharpen"]);
  expect(files.get(`${top}analysis/steps/03-sharpen/step.md`)!.toString()).toMatch(/^# Step 3: Sharpened\./);
  expect(files.get(`${top}analysis/protocol.md`)!.toString()).toContain("A rewind set aside step 2 of the trail.");
});
