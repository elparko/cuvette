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
  process.env.GA_HOME = mkdtempSync(join(tmpdir(), "ga-eln-"));
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
  expect(exp.keywords).toBe("guided-analysis, lab");
  expect(exp.variableMeasured.length).toBeGreaterThan(0);
});

test("the archive has the approved plan as plan.md and at the top of the body", async () => {
  s.record.append("plan_approved", { version: 1, text: "Question: How many particles?", plan: { steps: [] } });
  const { files, top } = await exported();
  expect(files.get(`${top}analysis/plan.md`)!.toString()).toMatch(/^# Confirmed analysis \(version 1, confirmed .*\)\n\nQuestion: How many particles\?/);
  expect(files.get(`${top}analysis/protocol.md`)!.toString()).toContain("## Confirmed analysis (version 1");
  const { collect } = await import("../src/eln/export.ts");
  expect(collect(s).bodyHtml.startsWith("<h2>Confirmed analysis (version 1)</h2><pre>Question: How many particles?</pre>")).toBe(true);
});
