import { existsSync, mkdirSync, mkdtempSync, statSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, expect, test } from "vitest";
import { lockHash, type EnvLock } from "../src/core/envlock.ts";
import { checkAnswer } from "../src/core/claims.ts";
import { AnalysisRecord } from "../src/core/record.ts";
import { buildWorkbook } from "../src/core/results.ts";
import { runChecks } from "../src/core/review.ts";
import { Session } from "../src/core/session.ts";
import { currentFromDisk, outOfDateNodes, changeRows, changeTable, fileSha, liveReasons, rerunBody, stepStatus, statusText, type Current, type RerunData } from "../src/core/status.ts";
import type { NodeIn } from "../src/core/types.ts";
import { FakeProvider } from "../src/providers/fake.ts";
import { commands, rerunText } from "../src/ui/commands.ts";
import { Mapper } from "../src/ui/items.ts";
import type { SessionLike } from "../src/ui/types.ts";

let session: Session | undefined;
beforeEach(() => {
  process.env.CUVETTE_HOME = mkdtempSync(join(tmpdir(), "cuvette-status-home-"));
});
afterEach(async () => {
  await session?.close();
  session = undefined;
});

const env = (packages: [string, string][]): EnvLock => {
  const base = { kind: "python" as const, language: "Python 3.12.4", packages: packages.map(([name, version]) => ({ name, version })) };
  return { hash: lockHash(base), path: "/envs/sc/bin/python", ...base };
};

async function nodeWithInput(record: AnalysisRecord, extra: Partial<NodeIn> = {}) {
  const dir = mkdtempSync(join(tmpdir(), "cuvette-status-in-"));
  const path = join(dir, "sleep.csv");
  writeFileSync(path, "id,stage\n1,N2\n");
  const st = statSync(path);
  const n = record.addNode({
    entry: 1, adapter: "biostats", adapterVersion: "1.0.0", programVersion: "0.30.3", tool: "fit", args: { input: path }, decisions: { alpha: 0.05 }, codeHash: "c",
    inputHashes: [await fileSha(path)], inputFiles: [{ path, size: st.size, mtime: st.mtime.toISOString(), sha256: await fileSha(path) }],
    outputs: [], result: { ok: true, metrics: { n: 12 } }, parents: [], summary: "Fitted a mixed model.", model: "fake", manualRoute: "", fidelity: "none", ...extra,
  });
  return { n, path };
}

const current = (o: Partial<{ version: string; programVersion: string; env: EnvLock }> = {}): Current => new Map([["biostats", { version: "1.0.0", programVersion: "0.30.3", program: "lifelines", ...o }]]);

test("each reason for out of date has a plain sentence", async () => {
  const record = new AnalysisRecord(mkdtempSync(join(tmpdir(), "cuvette-status-")), "s1");
  const old = env([["numpy", "1.26.4"], ["pandas", "2.2.2"]]);
  record.addEnvironment(old, "biostats");
  const { n, path } = await nodeWithInput(record, { envHash: old.hash });
  const child = record.addNode({ ...n, parents: [n.id], inputFiles: [], inputHashes: [], summary: "Plotted the fit." });

  expect((await liveReasons(record, current({ env: old }))).size).toBe(0);
  expect(stepStatus(record).every((s) => s.current)).toBe(true);

  const t = new Date(Date.now() + 10_000);
  utimesSync(path, t, t);
  expect((await liveReasons(record, current({ env: old }))).size).toBe(0);

  writeFileSync(path, "id,stage\n1,N3\n");
  const text = (cur: Current) => liveReasons(record, cur).then((m) => (m.get(n.id) ?? []).map((r) => r.text));
  expect(await text(current({ env: old }))).toEqual(["The input file sleep.csv changed after this step ran."]);
  writeFileSync(path, "id,stage\n1,N2\n");
  utimesSync(path, statSync(path).atime, new Date(n.inputFiles![0]!.mtime));

  expect(await text(current({ version: "1.1.0", env: old }))).toEqual(["The adapter biostats changed from version 1.0.0 to 1.1.0 after this step ran."]);
  expect(await text(current({ programVersion: "0.31.0", env: old }))).toEqual(["The program lifelines changed from version 0.30.3 to 0.31.0 after this step ran."]);
  expect(await text(current({ env: env([["numpy", "2.0.0"], ["pandas", "2.2.2"], ["scipy", "1.13.1"]]) }))).toEqual([
    "The packages in the biostats environment changed after this step ran: numpy 1.26.4 to 2.0.0, scipy 1.13.1 added.",
  ]);

  const live = await liveReasons(record, current({ version: "1.1.0", env: old }));
  const states = stepStatus(record, { live });
  expect(states.map((s) => s.current)).toEqual([false, false]);
  expect(states[1]!.reasons.map((r) => r.text)).toContain("It uses the result of step 1, which is out of date.");

  record.markStale("alpha", "changed by the scientist");
  const byDecision = stepStatus(record, { labels: { alpha: "Significance level" } });
  expect(byDecision[0]!.reasons.map((r) => r.text)).toEqual(['The decision "Significance level" changed after this step ran.']);
  expect(byDecision[0]!.reasons[0]!.kind).toBe("decision");
  expect(child.id).toBe(byDecision[1]!.node);
});

test("/status lists each step as up to date or out of date, with the reason", async () => {
  const record = new AnalysisRecord(mkdtempSync(join(tmpdir(), "cuvette-status-")), "s1");
  await nodeWithInput(record);
  await nodeWithInput(record, { decisions: {}, summary: "Counted the epochs." });
  record.markStale("alpha", "changed");
  let printed = "";
  let title = "";
  const fake = { record, labels: () => ({ alpha: "Significance level" }) } as unknown as SessionLike;
  const ctx = { session: fake, print: (t: string, h?: string) => ((printed = t), (title = h ?? "")), notice: () => {}, error: () => {} } as never;
  await commands.find((c) => c.name === "status")!.run([], ctx);
  expect(title).toBe("Status");
  expect(printed).toBe(
    [
      "Step 1  Out of date  Fitted a mixed model.",
      '        The decision "Significance level" changed after this step ran.',
      "Step 2  Up to date   Counted the epochs.",
      "",
      "1 of 2 steps is out of date. Type /rerun to run the out-of-date steps again.",
    ].join("\n"),
  );
  expect(rerunText(fake)).toContain('- Step 1 (fit): The decision "Significance level" changed after this step ran.');
  expect(statusText([])).toBe("No steps yet.");
});

test("the before and after table shows each number that changed, with the difference", () => {
  const before = { metrics: { count: 41, area: 12.5 }, table: { columns: ["group", "mean"], rows: [["control", 10], ["treated", 14]], n_rows: 2 } };
  const after = { metrics: { count: 66, area: 12.5 }, table: { columns: ["group", "mean"], rows: [["control", 10], ["treated", 12.25]], n_rows: 2 } };
  const d = changeRows(before, after);
  expect(d.changed).toBe(2);
  expect(d.unchanged).toBe(2);
  expect(d.rows[0]).toEqual({ name: "count", before: 41, after: 66, change: 25 });
  expect(changeTable(d.rows)).toBe(
    ["Number          Before  After          Change", "count               41     66      +25 (+61%)", "treated · mean      14  12.25  -1.75 (-12.5%)"].join("\n"),
  );
  const data: RerunData = { old: "n1", node: "n2", oldStep: 1, step: 2, tool: "count", reasons: ['The decision "Threshold method" changed after this step ran.'], ...d };
  expect(rerunBody(data)).toContain("2 numbers did not change.");
});

test("a rerun after /change replaces the old step, records the before and after table, and the status is up to date again; a changed input file makes it out of date", async () => {
  const dir = mkdtempSync(join(tmpdir(), "cuvette-status-data-"));
  const input = join(dir, "a.tif");
  writeFileSync(input, "image 1");
  const count = (method: string) => ({ calls: [{ name: "count", args: { input, method, min_size: 5 } }] });
  const provider = new FakeProvider([count("Otsu"), { text: "41 particles (step 1)." }, count("Triangle"), { text: "66 particles (step 2)." }, count("Triangle"), { text: "66 particles (step 3)." }]);
  session = await Session.create({ adapters: [join(__dirname, "fixtures/lab")], provider, cwd: mkdtempSync(join(tmpdir(), "cuvette-proj-")) });
  session.decisions.applySetup({ question: "How many particles?", method: "Otsu" });
  await session.send("Count the particles in a.tif");
  const first = session.record.nodes().filter((n) => !n.sensitivityOf);
  expect(first).toHaveLength(1);
  expect(first[0]!.envHash).toBe(session.record.environments()[0]!.hash);

  session.setDecision("method", "Triangle", "changed by the scientist");
  const states = await session.checkStatus();
  expect(states[0]!.reasons.map((r) => r.text)).toEqual(['The decision "Threshold method" changed after this step ran.']);
  await session.send(rerunText(session as unknown as SessionLike, states)!);

  const rerun = session.record.entries(["rerun"]);
  expect(rerun).toHaveLength(1);
  const d = rerun[0]!.data as unknown as RerunData;
  expect(d).toMatchObject({ old: "n1", oldStep: 1, step: 2, tool: "count" });
  expect(d.rows[0]).toEqual({ name: "count", before: 41, after: 66, change: 25 });
  expect(d.reasons).toEqual(['The decision "Threshold method" changed after this step ran.']);
  expect((await session.checkStatus()).map((s) => [s.step, s.current])).toEqual([[2, true]]);

  const items = new Mapper(session as unknown as SessionLike).map(rerun[0]!);
  expect(items[0]).toMatchObject({ t: "block", title: "Before and after: step 2 repeats step 1" });
  expect((items[0] as { text: string }).text).toContain("count       41     66  +25 (+61%)");

  const sheets = buildWorkbook({ record: session.record, adapters: session.adapters, fields: session.decisions.fields(), programs: [], dir: session.outputDir, figures: [] });
  expect(sheets.find((s) => s.name === "Changes")!.rows[0]).toEqual([2, 1, "count", "count", 41, 66, 25, "+25 (+61%)", 'The decision "Threshold method" changed after this step ran.']);
  const steps = sheets.find((s) => s.name === "Steps")!;
  expect(steps.rows.map((r) => r[11])).toEqual(["replaced by step 2", "current"]);

  writeFileSync(input, "image 1, corrected");
  let printed = "";
  const ctx = { session, print: (t: string) => (printed = t), notice: () => {}, error: () => {} } as never;
  await commands.find((c) => c.name === "status")!.run([], ctx);
  expect(printed).toContain("Step 2  Out of date  Counted 66 particles with Triangle.");
  expect(printed).toContain("The input file a.tif changed after this step ran.");
  expect(session.record.entries(["stale"]).at(-1)!.data).toMatchObject({ kind: "input", direct: ["n2"] });

  await session.send(rerunText(session as unknown as SessionLike)!);
  const last = session.record.entries(["rerun"]).at(-1)!.data as unknown as RerunData;
  expect(last).toMatchObject({ old: "n2", step: 3, reasons: ["The input file a.tif changed after this step ran."], changed: 0 });
  expect(rerunBody(last)).toContain("No number changed.");
  expect((await session.checkStatus()).every((s) => s.current)).toBe(true);
});

function chainNode(record: AnalysisRecord, parents: string[], extra: Partial<NodeIn> = {}) {
  return record.addNode({
    entry: 1, adapter: "biostats", adapterVersion: "1.0.0", programVersion: "0.30.3", tool: "fit", args: {}, decisions: {}, codeHash: "c",
    inputHashes: [], inputFiles: [], outputs: [], result: { ok: true, metrics: { effect_size: 0.5 } }, parents, summary: "A step.", model: "fake", manualRoute: "", fidelity: "none", ...extra,
  });
}

const staleFindings = async (record: AnalysisRecord, node: string) => {
  const claims = [{ text: "The effect is 0.5.", value: 0.5, label: "measured" as const, node }];
  const out = await runChecks({ record, decisions: { values: () => ({}) } as never, adapters: [], answer: "The effect is 0.5.", claims });
  return out.filter((f) => f.check === "stale_used");
};

test("an answer that uses a child of a stale step gives the stale_used finding", async () => {
  const record = new AnalysisRecord(mkdtempSync(join(tmpdir(), "cuvette-status-")), "s1");
  const a = chainNode(record, [], { decisions: { alpha: 0.05 } });
  const b = chainNode(record, [a.id]);
  const c = chainNode(record, [b.id]);
  expect(await staleFindings(record, c.id)).toHaveLength(0);
  record.append("stale", { key: "alpha", reason: "changed", nodes: [a.id] });
  expect([...record.stale()]).toEqual([a.id]);
  const found = await staleFindings(record, c.id);
  expect(found).toHaveLength(1);
  expect(found[0]!.nodes).toEqual([c.id]);
  expect((await staleFindings(record, a.id))[0]!.nodes).toEqual([a.id]);
});

test("an answer that uses a step that a rerun replaced gives the stale_used finding", async () => {
  const record = new AnalysisRecord(mkdtempSync(join(tmpdir(), "cuvette-status-")), "s1");
  const a = chainNode(record, []);
  const b = chainNode(record, [a.id]);
  const a2 = chainNode(record, []);
  record.append("rerun", { old: a.id, node: a2.id });
  expect((await staleFindings(record, a.id))[0]!.nodes).toEqual([a.id]);
  expect((await staleFindings(record, b.id))[0]!.nodes).toEqual([b.id]);
  expect(await staleFindings(record, a2.id)).toHaveLength(0);
});

test("a step that a rewind set aside does not count as stale", async () => {
  const record = new AnalysisRecord(mkdtempSync(join(tmpdir(), "cuvette-status-")), "s1");
  const a = chainNode(record, [], { decisions: { alpha: 0.05 } });
  const mark = record.append("stale", { key: "alpha", reason: "changed", nodes: [a.id] });
  const b = chainNode(record, [a.id]);
  record.append("rewind", { upTo: mark.id - 1 });
  expect(outOfDateNodes(record.liveView()).size).toBe(0);
  expect(await staleFindings(record.liveView(), b.id)).toHaveLength(0);
  expect(outOfDateNodes(record).has(b.id)).toBe(false);
});

test("a clean chain gives no stale_used finding", async () => {
  const record = new AnalysisRecord(mkdtempSync(join(tmpdir(), "cuvette-status-")), "s1");
  const a = chainNode(record, []);
  const b = chainNode(record, [a.id]);
  const c = chainNode(record, [b.id]);
  expect(outOfDateNodes(record).size).toBe(0);
  expect(await staleFindings(record, c.id)).toHaveLength(0);
});

test("the answer check reads the step status once for a record with 500 steps", () => {
  const record = new AnalysisRecord(mkdtempSync(join(tmpdir(), "cuvette-status-")), "s1");
  let prev: string[] = [];
  for (let i = 0; i < 500; i++) prev = [chainNode(record, prev, { result: { ok: true, metrics: { effect_size: i + 0.5 } } }).id];
  const text = Array.from({ length: 40 }, (_, i) => `The effect is ${i + 0.5}.`).join(" ");
  const start = Date.now();
  const claims = checkAnswer(text, record);
  expect(claims.length).toBeGreaterThan(0);
  expect(Date.now() - start).toBeLessThan(20_000);
});

test.skipIf(process.platform === "win32")("cuvette status does not run the version command of a recorded adapter path outside the adapter folders", async () => {
  const root = mkdtempSync(join(tmpdir(), "cuvette-status-evil-"));
  const marker = join(root, "marker");
  const dir = join(root, "evil");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "adapter.yaml"), `adapter: { name: evil, title: Evil, version: "1.0.0" }\nprogram: { name: Evil, version: "1.0" }\nconnection: { kind: cli }\nlocate: { which: [sh], version_command: ["{program_path}", "-c", "touch ${marker}"] }\n`);
  const record = new AnalysisRecord(join(root, "rec"), "s1");
  record.append("session", { adapters: [{ name: "evil", version: "1.0.0", programVersion: "1.0", path: dir }], model: "m" });
  record.addNode({ entry: 1, adapter: "evil", adapterVersion: "1.0.0", programVersion: "1.0", tool: "run", args: {}, decisions: {}, codeHash: "c", inputHashes: [], outputs: [], result: { ok: true, metrics: {} }, parents: [], summary: "Ran.", model: "fake", manualRoute: "", fidelity: "none" });
  const { current, unchecked } = await currentFromDisk(record, root);
  expect(existsSync(marker)).toBe(false);
  expect(current.has("evil")).toBe(false);
  expect([...unchecked]).toEqual(["evil"]);
  expect(statusText(stepStatus(record, { unchecked }))).toMatch(/Up to date .*\n\s+not checked: adapter outside the trusted folders/);
});

test("cuvette status checks an adapter folder that the user gives for this run", async () => {
  const root = mkdtempSync(join(tmpdir(), "cuvette-status-user-"));
  const dir = join(root, "mine");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "adapter.yaml"), `adapter: { name: mine, title: Mine, version: "2.0.0" }\nprogram: { name: Mine, version: "1.0" }\nconnection: { kind: cli }\n`);
  const record = new AnalysisRecord(join(root, "rec"), "s1");
  record.append("session", { adapters: [{ name: "mine", version: "1.0.0", programVersion: "1.0", path: dir }], model: "m" });
  record.addNode({ entry: 1, adapter: "mine", adapterVersion: "1.0.0", programVersion: "1.0", tool: "run", args: {}, decisions: {}, codeHash: "c", inputHashes: [], outputs: [], result: { ok: true, metrics: {} }, parents: [], summary: "Ran.", model: "fake", manualRoute: "", fidelity: "none" });
  const without = await currentFromDisk(record, root);
  expect([...without.unchecked]).toEqual(["mine"]);
  const given = await currentFromDisk(record, root, [dir]);
  expect([...given.unchecked]).toEqual([]);
  expect(given.current.get("mine")?.version).toBe("2.0.0");
});
