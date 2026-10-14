import { appendFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, realpathSync, renameSync, rmSync, statSync, truncateSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { Session } from "../src/core/session.ts";
import { AnalysisRecord } from "../src/core/record.ts";
import { findPlace, listPlaces, placeAt, readIndex, saveIndexRow } from "../src/core/places.ts";
import { claimLock, listSessions, lockAlive, openLock } from "../src/core/sessions.ts";
import { exportMethod, importMethod, listMethods, loadMethod, methodText } from "../src/core/methods.ts";
import { loadSettings } from "../src/core/config.ts";
import { changeSetting } from "../src/core/settings.ts";
import { readSpend, recordSpend, totalSpend } from "../src/core/spend.ts";
import { moveOldHome } from "../src/core/old-names.ts";
import { readInstalled, saveInstalled, type InstalledEntry } from "../src/adapters/source.ts";
import { trustFolder } from "../src/core/trust.ts";
import { credentialsPath, removeClaudeKey, saveClaudeKey, saveClaudeWorkspace, saveElabftw, removeElabftw, claudeKey } from "../src/core/credentials.ts";
import { openRecord as openBookRecord, projectSessions as bookSessions } from "../src/core/databook.ts";
import { rewindPoints } from "../src/core/rewind.ts";
import { Mapper } from "../src/ui/items.ts";
import { FakeProvider } from "../src/providers/fake.ts";
import { ClaudeProvider } from "../src/providers/claude.ts";
import { OpenAIProvider } from "../src/providers/openai.ts";
import { OllamaProvider } from "../src/providers/ollama.ts";
import { commands, type CommandCtx } from "../src/ui/commands.ts";
import type { SessionLike } from "../src/ui/types.ts";

const FIXTURES = join(__dirname, "fixtures", "old-data");
const LAB = join(__dirname, "fixtures", "lab");
const TEXT = /\.(json|jsonl|csv|txt)$/;

const PROJECT_FORMATS = ["v3-project-folder", "v4-package-lock", "v5-rewind-branch-method", "v6-cuvette-rename", "v7-agent-loop"];
const HOME_FORMATS = ["v1-first-build", "v2-home-sessions"];

let root = "";
const open: Session[] = [];

beforeEach(() => {
  root = realpathSync(mkdtempSync(join(tmpdir(), "cuvette-old-data-")));
  process.env.CUVETTE_HOME = join(root, "home");
});
afterEach(async () => {
  for (const s of open.splice(0)) await s.close();
  rmSync(root, { recursive: true, force: true, maxRetries: 5 });
});

function copyTree(from: string, to: string): void {
  mkdirSync(to, { recursive: true });
  for (const name of readdirSync(from)) {
    const src = join(from, name);
    const dest = join(to, name);
    if (statSync(src).isDirectory()) copyTree(src, dest);
    else writeFileSync(dest, TEXT.test(name) ? readFileSync(src, "utf8").split("@@ROOT@@").join(root).split("@@LAB@@").join(LAB) : readFileSync(src));
  }
}

function install(format: string): void {
  copyTree(join(FIXTURES, format), root);
}

const logLines = (folder: string) => readFileSync(join(folder, ".record", "log.jsonl"), "utf8");

function printCtx(s: Session, out: string[]): CommandCtx {
  return { session: s as unknown as SessionLike, print: (t, title) => out.push(`${title}\n${t}`), notice: (t) => out.push(t), error: (t) => out.push(`ERROR ${t}`), openCard: () => {}, hasQuestionCard: () => false, refresh: () => {}, clear: () => {}, quit: () => {}, outputs: () => [], toggleDetails: () => false, startWindow: async () => "", startPanel: async () => ({ url: "", opened: [], failed: [] }), startApp: async () => "" };
}

async function run(s: Session, name: string, args: string[] = []): Promise<string> {
  const out: string[] = [];
  await commands.find((c) => c.name === name)!.run(args, printCtx(s, out));
  return out.join("\n");
}

async function resume(ref: string, script: ConstructorParameters<typeof FakeProvider>[0] = [{ text: "Noted." }]): Promise<Session> {
  const s = await Session.resume(ref, { provider: new FakeProvider(script), cwd: join(root, "project") });
  open.push(s);
  return s;
}

function projectSessions(): { id: string; folder: string }[] {
  return listPlaces().filter((p) => !p.legacy).map((p) => ({ id: p.id, folder: p.folder }));
}

describe.each(PROJECT_FORMATS)("session folder written by %s", (format) => {
  beforeEach(() => install(format));

  test("the sessions lists show each session as found", () => {
    const places = listPlaces();
    expect(places.length).toBeGreaterThan(0);
    for (const p of places) expect(p.moved).toBe(false);
    const sessions = listSessions();
    expect(sessions.map((s) => s.id).sort()).toEqual(places.map((p) => p.id).sort());
    for (const s of sessions) {
      expect(s.moved).toBeFalsy();
      expect(s.ask).not.toBe("");
    }
  });

  test("resume loads the record, keeps every old line, and a new turn only adds lines", async () => {
    const [first] = projectSessions();
    const before = logLines(first!.folder);
    const s = await resume(first!.id);
    expect(s.id).toBe(first!.id);
    expect(s.history.length).toBeGreaterThan(0);
    expect(s.record.nodes().length).toBeGreaterThan(0);
    await s.send("Thanks.");
    const after = logLines(first!.folder);
    expect(after.startsWith(before)).toBe(true);
    expect(after.length).toBeGreaterThan(before.length);
  });

  test("status, tests and trail commands print for the old record", async () => {
    const [first] = projectSessions();
    const s = await resume(first!.id);
    expect(await run(s, "status")).toContain("Status");
    expect(await run(s, "tests")).toContain("Tests in this session");
    for (const level of ["1", "2", "3"]) expect(await run(s, "trail", [level])).toContain(`Audit trail, level ${level}`);
  });

  test("the protocol, the notebook and the trail export from the old record", async () => {
    const [first] = projectSessions();
    const s = await resume(first!.id);
    for (const [fmt, name] of [["protocol", "protocol.md"], ["notebook", "analysis.ipynb"], ["html", "trail.html"], ["md", "trail.md"], ["jsonl", "log.jsonl"], ["flow", "flow.json"], ["script", "replay.mts"]] as const) {
      const path = await s.exportAs(fmt);
      expect(path).toBe(join(first!.folder, name));
      expect(statSync(path).size).toBeGreaterThan(0);
    }
    expect(JSON.parse(readFileSync(join(first!.folder, "analysis.ipynb"), "utf8")).cells.length).toBeGreaterThan(0);
  });

  test("a session found by its folder, its record folder and its id is the same session", () => {
    const [first] = projectSessions();
    const byId = findPlace(first!.id, { cwd: root });
    expect(byId?.outDir).toBe(first!.folder);
    expect(findPlace(first!.folder, { cwd: root })?.id).toBe(first!.id);
    expect(findPlace(join(first!.folder, ".record"), { cwd: root })?.id).toBe(first!.id);
    expect(placeAt(join(first!.folder, ".record"))?.project).toBe(join(root, "project"));
  });
});

describe.each(HOME_FORMATS)("home session written by %s", (format) => {
  beforeEach(() => install(format));

  test("the session lists and resumes from the home folder", async () => {
    const [info] = listSessions();
    expect(info!.id).toMatch(/^\d{8}-\d{6}-[0-9a-f]{4}$/);
    expect(info!.ask).toBe("Count the particles in a.tif");
    expect(listPlaces().map((p) => [p.id, p.legacy])).toEqual([[info!.id, true]]);
    const dir = join(root, "home", "sessions", info!.id);
    const before = readFileSync(join(dir, "log.jsonl"), "utf8");
    const s = await resume(info!.id);
    expect(s.place.legacy).toBe(true);
    expect(s.history.length).toBeGreaterThan(0);
    await s.send("Thanks.");
    expect(readFileSync(join(dir, "log.jsonl"), "utf8").startsWith(before)).toBe(true);
    expect(await run(s, "status")).toContain("Status");
    expect(await run(s, "tests")).toContain("Tests in this session");
    expect(await run(s, "trail", ["2"])).toContain("Audit trail");
    for (const fmt of ["protocol", "notebook", "html"] as const) expect(statSync(await s.exportAs(fmt)).size).toBeGreaterThan(0);
  });
});

test("a record opened without a session loads the nodes of an old format", () => {
  install("v3-project-folder");
  const [first] = projectSessions();
  const place = placeAt(join(first!.folder, ".record"))!;
  const record = new AnalysisRecord(place.recordDir, place.id, { workDir: place.outDir, exportDir: place.outDir, project: place.project });
  expect(record.nodes().length).toBeGreaterThan(0);
  expect(existsSync(dirname(record.logPath))).toBe(true);
});

async function counted(method = "Otsu"): Promise<Session> {
  const p = new FakeProvider([{ calls: [{ name: "count", args: { input: "/data/a.tif", method, min_size: 5 } }] }, { text: `The count with ${method} is done.` }]);
  const s = await Session.create({ adapters: [LAB], provider: p, cwd: join(root, "project") });
  open.push(s);
  s.decisions.applySetup({ question: "How many particles?", method });
  await s.send("Count the particles in a.tif");
  return s;
}

describe("a branch of a session", () => {
  beforeEach(() => mkdirSync(join(root, "project"), { recursive: true }));

  test("shows in the session list and in the place list, with its parent", async () => {
    const parent = await counted();
    const child = parent.branch("triangle");
    const second = parent.branch("second");
    const ids = listSessions().map((s) => s.id);
    expect(ids).toEqual(expect.arrayContaining([parent.id, child.id, second.id]));
    expect(listSessions().find((s) => s.id === child.id)?.moved).toBeFalsy();
    const grand = await Session.resume(child.folder, { provider: new FakeProvider([{ text: "Done." }]) });
    open.push(grand);
    const grandChild = grand.branch("deeper");
    expect(listSessions().map((s) => s.id)).toContain(grandChild.id);
  });
});

const idsOf = (folder: string) => logLines(folder).split("\n").filter(Boolean).flatMap((l) => { try { return [JSON.parse(l).id as number]; } catch { return []; } });

describe.each(PROJECT_FORMATS)("rewind, branches and methods on the record of %s", (format) => {
  beforeEach(() => install(format));

  test("a rewind sets the later steps aside, and a second resume keeps it", async () => {
    const [first] = projectSessions();
    const s = await resume(first!.id);
    const points = rewindPoints(s.record);
    expect(points.length).toBeGreaterThan(0);
    const rewinds = s.record.entries(["rewind"]).length;
    const r = s.rewind(points[0]!.n);
    expect(r.point.n).toBe(points[0]!.n);
    await s.close();
    open.splice(open.indexOf(s), 1);
    const again = await resume(first!.id);
    expect(again.record.entries(["rewind"]).length).toBe(rewinds + 1);
    expect(again.record.rewound().size).toBeGreaterThanOrEqual(r.nodes.length);
    expect(await run(again, "status")).toContain("Status");
    expect(await run(again, "trail", ["2"])).toContain("Audit trail");
  });

  test("the branches list names the parent and the branch of the old session", async () => {
    const branched = projectSessions().length > 1;
    const sessions = projectSessions();
    for (const info of sessions) {
      const s = await resume(info.id);
      const list = s.branches();
      expect(list[0]!.role).toBe("this");
      if (branched) expect(list.length).toBe(2);
      for (const b of list) expect(b.result).not.toBe("The folder is missing or moved.");
      await s.close();
      open.splice(open.indexOf(s), 1);
    }
  });

  test("an old session saves its confirmed analysis as a method, unless a rewind set the confirmation aside", async () => {
    const [first] = projectSessions();
    const s = await resume(first!.id);
    if (s.record.entries(["rewind"]).length) return expect(() => s.saveMethod("again")).toThrow("No confirmed analysis yet");
    const { method, path } = s.saveMethod("again");
    expect(loadMethod("again").name).toBe("again");
    expect(path).toBe(join(root, "home", "methods", "again.json"));
    expect(methodText(method)).toContain("Method: again");
  });
});

describe.each(["v5-rewind-branch-method", "v6-cuvette-rename", "v7-agent-loop"])("method file written by %s", (format) => {
  beforeEach(() => install(format));

  test("the method file lists, loads and prints with the current code", () => {
    const rows = listMethods();
    expect(rows.map((r) => r.name)).toEqual(["count-particles"]);
    const m = loadMethod("count-particles");
    expect(m).toMatchObject({ cuvette_method: 1, name: "count-particles", request: "Count the particles in a.tif" });
    expect(m.pilot.required).toBe(true);
    expect(methodText(m)).toContain("Questions and answers");
    expect(m.analysis.steps[0]!.decisions!.map((d) => d.key)).toEqual(["method", "min_size"]);
  });
});

test("the p values of an old record show in /tests", async () => {
  install("v7-agent-loop");
  const [first] = projectSessions();
  const file = join(first!.folder, ".record", "log.jsonl");
  const lines = readFileSync(file, "utf8").trim().split("\n").map((l) => JSON.parse(l));
  const node = lines.find((e) => e.kind === "node");
  const next = lines.at(-1).id + 1;
  const clone = { ...node, id: next, node: "n9", data: { ...node.data, id: "n9", tool: "t_test", result: { ok: true, summary: "t test", metrics: { p_value: 0.031 } } } };
  appendFileSync(file, JSON.stringify(clone) + "\n");
  const s = await resume(first!.id);
  const text = await run(s, "tests");
  expect(text).toContain("t test");
  expect(text).toContain("0.031");
});

describe("a record with a cut last line", () => {
  test.each([...HOME_FORMATS, ...PROJECT_FORMATS])("%s resumes, and the next entry starts on a new line", async (format) => {
    install(format);
    const legacy = HOME_FORMATS.includes(format);
    const folder = legacy ? join(root, "home", "sessions", readdirSync(join(root, "home", "sessions"))[0]!) : projectSessions()[0]!.folder;
    const file = legacy ? join(folder, "log.jsonl") : join(folder, ".record", "log.jsonl");
    const before = readFileSync(file, "utf8").trim().split("\n");
    truncateSync(file, readFileSync(file).length - 30);
    const kept = before.slice(0, -1);
    const s = await resume(legacy ? readdirSync(join(root, "home", "sessions"))[0]! : projectSessions()[0]!.id);
    await s.send("Thanks.");
    const lines = readFileSync(file, "utf8").split("\n").filter(Boolean);
    expect(lines.slice(0, kept.length)).toEqual(kept);
    const parsed = lines.flatMap((l) => { try { return [JSON.parse(l)]; } catch { return []; } });
    expect(parsed.length).toBeGreaterThanOrEqual(kept.length + 2);
    expect(parsed.at(-1).kind).not.toBeUndefined();
    const reload = new AnalysisRecord(dirname(file), s.id, legacy ? {} : { workDir: folder, exportDir: folder, project: join(root, "project") });
    expect(reload.entries().length).toBe(parsed.length);
    const ids = reload.entries().map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(reload.skipped).toBe(1);
  });
});

describe("a record from a newer version", () => {
  const future = (id: number, session: string) => [
    JSON.stringify({ id, ts: "2027-01-01T00:00:00.000Z", session, kind: "lab_bench_scan", schema: 2, data: { barcode: "A12", extra: { list: [1, 2, { deep: true }] } } }),
    JSON.stringify({ id: id + 1, ts: "2027-01-01T00:00:01.000Z", session, kind: "note", flag: "new", data: { text: "A note with a new field.", colour: "teal" } }),
    JSON.stringify({ id: id + 2, ts: "2027-01-01T00:00:02.000Z", session, kind: "node_v2", data: ["not", "an", "object"] }),
  ];

  async function newer() {
    install("v7-agent-loop");
    const [first] = projectSessions();
    const file = join(first!.folder, ".record", "log.jsonl");
    const last = idsOf(first!.folder).at(-1)!;
    appendFileSync(file, future(last + 1, first!.id).join("\n") + "\n");
    return { first: first!, file, last, before: readFileSync(file, "utf8") };
  }

  test("loads with a notice, keeps every old byte, and adds only new lines", async () => {
    const { first, file, before } = await newer();
    const s = await resume(first.id);
    expect(s.record.unknownKinds()).toEqual(["lab_bench_scan"]);
    expect(s.record.skipped).toBe(1);
    const notices = s.record.entries(["notice"]).map((n) => String(n.data.text));
    expect(notices.some((t) => t.includes("lab_bench_scan") && t.includes("newer version"))).toBe(true);
    expect(notices.some((t) => t.includes("cannot read"))).toBe(true);
    await s.send("Thanks.");
    const after = readFileSync(file, "utf8");
    expect(after.startsWith(before)).toBe(true);
    expect(after).toContain('"colour":"teal"');
    expect(after).toContain('"deep":true');
  });

  test("the notice appears once, however often the session resumes", async () => {
    const { first, file } = await newer();
    for (let i = 0; i < 3; i++) {
      const s = await resume(first.id);
      await s.close();
      open.splice(open.indexOf(s), 1);
    }
    const count = readFileSync(file, "utf8").split("\n").filter((l) => l.includes("A newer version of Cuvette wrote entries")).length;
    expect(count).toBe(1);
  });

  test("the unknown entries keep their fields in the exported log and map to no screen item error", async () => {
    const { first } = await newer();
    const s = await resume(first.id);
    const out = readFileSync(await s.exportAs("jsonl"), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
    const scan = out.find((e) => e.kind === "lab_bench_scan");
    expect(scan).toMatchObject({ schema: 2, data: { barcode: "A12", extra: { list: [1, 2, { deep: true }] } } });
    expect(out.find((e) => e.kind === "note" && e.flag === "new")?.data.colour).toBe("teal");
    const mapper = new Mapper(s as unknown as SessionLike);
    for (const e of s.record.entries()) expect(() => mapper.map(e)).not.toThrow();
    for (const name of ["status", "tests"]) expect(await run(s, name)).not.toContain("ERROR");
    for (const level of ["1", "2", "3"]) expect(await run(s, "trail", [level])).toContain("Audit trail");
    for (const fmt of ["protocol", "notebook", "html", "md", "flow", "script"] as const) expect(statSync(await s.exportAs(fmt)).size).toBeGreaterThan(0);
  });

  test("a branch copies the unknown entries as they are", async () => {
    const { first } = await newer();
    const s = await resume(first.id);
    const b = s.branch("copy");
    const copy = readFileSync(join(b.folder, ".record", "log.jsonl"), "utf8");
    expect(copy).toContain('"kind":"lab_bench_scan","schema":2');
    expect(copy).toContain('"colour":"teal"');
  });
});

describe("an open.json lock from an older version", () => {
  const old = (pid: number, started?: string) => ({ pid, ...(started ? { started } : {}) });

  test("a lock without a process start time is stale if the process with this number began after the lock", () => {
    const longAgo = new Date(Date.now() - 3_600_000).toISOString();
    expect(lockAlive(old(process.ppid, longAgo), () => Date.now() - 60_000)).toBe(false);
    expect(lockAlive(old(process.ppid, longAgo), () => Date.now() - 7_200_000)).toBe(true);
    expect(lockAlive(old(process.ppid, longAgo), () => undefined)).toBe(true);
    expect(lockAlive(old(process.ppid), () => Date.now())).toBe(true);
    expect(lockAlive(old(2_000_000_000, longAgo), () => 0)).toBe(false);
  });

  test("a session resumes if its old lock names a process that began later", async () => {
    install("v7-agent-loop");
    const [first] = projectSessions();
    const record = join(first!.folder, ".record");
    writeFileSync(join(record, "open.json"), JSON.stringify(old(process.ppid, "2026-10-09T00:00:00.000Z")));
    expect(openLock(record, () => Date.now())).toBeUndefined();
    expect(claimLock(record, {}, () => Date.now())).toBeUndefined();
    rmSync(join(record, "open.json"));
    writeFileSync(join(record, "open.json"), JSON.stringify(old(2_000_000_000, "2026-10-09T00:00:00.000Z")));
    const s = await resume(first!.id);
    expect(s.id).toBe(first!.id);
  });
});

describe("a session folder that moved or changed its name", () => {
  const FORMATS = ["v3-project-folder", "v6-cuvette-rename", "v7-agent-loop"];

  test.each(FORMATS)("%s: the project moved, and a resume by folder finds the session and updates the index", async (format) => {
    install(format);
    const before = projectSessions();
    const moved = join(root, "renamed-project");
    renameSync(join(root, "project"), moved);
    expect(listPlaces().every((p) => p.moved)).toBe(true);
    await expect(Session.resume(before[0]!.id, { provider: new FakeProvider([]) })).rejects.toThrow("is gone");
    const folder = join(moved, "cuvette", before[0]!.folder.split("/").at(-1)!);
    const s = await resume(folder);
    expect(s.id).toBe(before[0]!.id);
    expect(s.cwd).toBe(moved);
    expect(readIndex().find((r) => r.id === s.id)?.folder).toBe(folder);
    for (const n of s.record.nodes()) for (const o of n.outputs) expect(o.path.startsWith(moved)).toBe(true);
    for (const fmt of ["protocol", "notebook", "html"] as const) expect(statSync(await s.exportAs(fmt)).size).toBeGreaterThan(0);
    await s.send("Thanks.");
  });

  test.each(FORMATS)("%s: the results folder has a new name, and the blobs still give the output files", async (format) => {
    install(format);
    const [first] = projectSessions();
    const renamed = join(dirname(first!.folder), "my results");
    renameSync(first!.folder, renamed);
    const s = await resume(renamed);
    expect(s.workDir).toBe(renamed);
    expect(readIndex().find((r) => r.id === s.id)?.folder).toBe(renamed);
    expect(s.record.exportDir).toBe(renamed);
    const outputs = s.record.nodes().flatMap((n) => n.outputs);
    for (const o of outputs) if (o.sha) expect(s.record.blobPath(o.sha)).toBeDefined();
    const protocol = readFileSync(await s.exportAs("protocol"), "utf8");
    expect(protocol.length).toBeGreaterThan(100);
    expect(statSync(await s.exportAs("notebook")).size).toBeGreaterThan(0);
    expect(existsSync(join(renamed, "trail.html"))).toBe(false);
    await s.exportAs("html");
    expect(existsSync(join(renamed, "trail.html"))).toBe(true);
    await s.send("Thanks.");
    expect(readFileSync(join(renamed, ".record", "log.jsonl"), "utf8")).toContain("Thanks.");
  });

  test("the session folder moved to another depth: the session opens and keeps its old lines", async () => {
    install("v7-agent-loop");
    const [first] = projectSessions();
    const away = join(root, "archive", "disk2");
    mkdirSync(away, { recursive: true });
    const dest = join(away, "kept");
    renameSync(first!.folder, dest);
    const before = readFileSync(join(dest, ".record", "log.jsonl"), "utf8");
    const s = await resume(dest);
    expect(s.id).toBe(first!.id);
    await s.send("Thanks.");
    expect(readFileSync(join(dest, ".record", "log.jsonl"), "utf8").startsWith(before)).toBe(true);
    expect((await s.exportAs("protocol")).startsWith(dest)).toBe(true);
  });
});

describe("two index rows for one folder", () => {
  test("the list shows the session once, and the record stays intact", async () => {
    install("v7-agent-loop");
    const [first] = projectSessions();
    const indexFile = join(root, "home", "sessions-index.json");
    const rows = JSON.parse(readFileSync(indexFile, "utf8"));
    rows.push({ ...rows[0], id: "20260101-000000-dead", title: "A copy" });
    writeFileSync(indexFile, JSON.stringify(rows));
    const ids = listSessions().filter((x) => !x.moved).map((x) => x.id);
    expect(ids).toContain(first!.id);
    expect(ids).not.toContain("20260101-000000-dead");
    const s = await resume(first!.id);
    await s.send("Thanks.");
    expect(idsOf(first!.folder)).toEqual([...new Set(idsOf(first!.folder))]);
  });
});

describe("the index of sessions", () => {
  test("a row with a field from a newer version keeps the field after the app updates the row", async () => {
    install("v7-agent-loop");
    const [first] = projectSessions();
    const indexFile = join(root, "home", "sessions-index.json");
    const rows = JSON.parse(readFileSync(indexFile, "utf8"));
    rows[0].pinned = true;
    rows[0].tags = ["a", { b: 1 }];
    writeFileSync(indexFile, JSON.stringify(rows));
    const s = await resume(first!.id);
    saveIndexRow(s.place);
    const after = JSON.parse(readFileSync(indexFile, "utf8")).find((r: { id: string }) => r.id === first!.id);
    expect(after).toMatchObject({ pinned: true, tags: ["a", { b: 1 }], id: first!.id });
  });

  test("a row from the first index format (no name, no custom name) lists and resumes", async () => {
    install("v3-project-folder");
    const rows = JSON.parse(readFileSync(join(root, "home", "sessions-index.json"), "utf8"));
    for (const r of rows) expect(Object.keys(r).sort()).toEqual(["date", "folder", "id", "project", "title"]);
    expect(listSessions().length).toBe(rows.length);
    const s = await resume(rows[0].id);
    expect(s.id).toBe(rows[0].id);
  });
});

describe("settings files from older versions", () => {
  const FIRST_BUILD = { model: "ollama:qwen3", referee: "claude", mode: "follow", maxSteps: 30, guidance: false, autoResume: true, reviseOnFindings: false, effort: "high", numCtx: 16384, think: true, maxResultChars: 10000, toolExposure: "search", networkForScripts: true, askWaits: false, permissions: { "run_script": "allow", "write_file": "deny" }, hooks: { PostToolUse: [{ matcher: "count", command: ["echo", "done"] }] }, notify: { ntfy: "http://localhost:8080/topic" } };

  test("the settings of the first build load with every value", () => {
    mkdirSync(join(root, "home"), { recursive: true });
    writeFileSync(join(root, "home", "settings.json"), JSON.stringify(FIRST_BUILD));
    const notes: string[] = [];
    const s = loadSettings(root, {}, notes);
    expect(notes).toEqual([]);
    expect(s).toMatchObject({ model: "ollama:qwen3", referee: "claude", mode: "follow", maxSteps: 30, guidance: false, reviseOnFindings: false, numCtx: 16384, think: true, maxResultChars: 10000, toolExposure: "search", networkForScripts: true, askWaits: false, permissions: { run_script: "allow", write_file: "deny" }, notify: { ntfy: "http://localhost:8080/topic" } });
    expect(s.hooks.PostToolUse).toHaveLength(1);
  });

  test('the old text form "permissions": "bypass" sets the permission mode, in the home file and in a .ga project file', () => {
    mkdirSync(join(root, "home"), { recursive: true });
    mkdirSync(join(root, "project", ".ga"), { recursive: true });
    writeFileSync(join(root, "home", "settings.json"), JSON.stringify({ permissions: "bypass" }));
    expect(loadSettings(join(root, "project")).permissionMode).toBe("bypass");
    writeFileSync(join(root, "home", "settings.json"), "{}");
    writeFileSync(join(root, "project", ".ga", "settings.json"), JSON.stringify({ permissions: "bypass", effort: "low" }));
    trustFolder(join(root, "project"));
    const s = loadSettings(join(root, "project"));
    expect(s).toMatchObject({ permissionMode: "bypass", effort: "low" });
  });

  test("a .ga project file and its settings.local.json both apply, and the .cuvette file wins", () => {
    mkdirSync(join(root, "home"), { recursive: true });
    const project = join(root, "project");
    mkdirSync(join(project, ".ga"), { recursive: true });
    mkdirSync(join(project, ".cuvette"), { recursive: true });
    writeFileSync(join(project, ".ga", "settings.json"), JSON.stringify({ effort: "low", maxSteps: 12, figure_formats: "png" }));
    writeFileSync(join(project, ".ga", "settings.local.json"), JSON.stringify({ maxSteps: 7 }));
    writeFileSync(join(project, ".cuvette", "settings.json"), JSON.stringify({ effort: "max" }));
    trustFolder(project);
    expect(loadSettings(project)).toMatchObject({ effort: "max", maxSteps: 7, figure_formats: "png" });
  });

  test("a change in the settings panel keeps the keys that the panel does not know", async () => {
    mkdirSync(join(root, "home"), { recursive: true });
    const file = join(root, "home", "settings.json");
    writeFileSync(file, JSON.stringify({ effort: "low", from_a_newer_version: { list: [1, 2], flag: true }, permissions: "bypass" }));
    await changeSetting({ cwd: root, env: {} }, "effort", "high", "user");
    expect(JSON.parse(readFileSync(file, "utf8"))).toEqual({ effort: "high", from_a_newer_version: { list: [1, 2], flag: true }, permissions: "bypass" });
  });

  test("keys from a newer version load without a note and stay out of the settings that the code uses", () => {
    mkdirSync(join(root, "home"), { recursive: true });
    writeFileSync(join(root, "home", "settings.json"), JSON.stringify({ effort: "low", color_theme: "teal" }));
    const notes: string[] = [];
    expect(loadSettings(root, {}, notes).effort).toBe("low");
    expect(notes).toEqual([]);
  });
});

describe("the spend file", () => {
  const FIRST = [
    { t: "2026-10-08T10:00:00.000Z", model: "claude-opus-5-5", session: "20261008-100000-aaaa", usd: 1.5, inputTokens: 300000, outputTokens: 10000 },
    { t: "2026-10-08T11:00:00.000Z", model: "claude-sonnet-5-5", usd: 0.25, inputTokens: 100000, outputTokens: 5000, cacheRead: 2000, cacheWrite: 1000 },
  ];

  test("rows of the first format add up, and a row of a newer version with extra fields counts", () => {
    const file = join(root, "spend.jsonl");
    process.env.CUVETTE_SPEND_FILE = file;
    writeFileSync(file, [...FIRST, { t: "2027-01-01T00:00:00.000Z", model: "claude-future-9", usd: 2, region: "eu", tokens: { in: 1 } }].map((r) => JSON.stringify(r)).join("\n") + "\n");
    expect(readSpend().map((r) => r.usd)).toEqual([1.5, 0.25, 2]);
    expect(totalSpend("2026-10-08T10:30:00.000Z")).toBeCloseTo(2.25, 6);
  });

  test("after a cut last line, the next row starts on a new line and counts", () => {
    const file = join(root, "spend.jsonl");
    process.env.CUVETTE_SPEND_FILE = file;
    writeFileSync(file, FIRST.map((r) => JSON.stringify(r)).join("\n") + '\n{"t":"2026-10-09T10:00:00.000Z","model":"claude-opus');
    const usd = recordSpend("claude-opus-5-5", { inputTokens: 1_000_000, outputTokens: 0 }, "s1");
    expect(usd).toBeCloseTo(4, 6);
    expect(readSpend().map((r) => r.usd)).toEqual([1.5, 0.25, 4]);
    expect(totalSpend()).toBeCloseTo(5.75, 6);
  });
});

describe("the list of installed adapters", () => {
  const entry = (name: string): InstalledEntry => ({ name, kind: "folder", source: `/src/${name}`, version: "1.0.0", sha256: "a".repeat(64), installed_on: "2026-10-09T00:00:00.000Z" });

  test("the first format (no confirmed list) loads, and a save keeps the other adapters and the other keys", () => {
    mkdirSync(join(root, "home"), { recursive: true });
    const file = join(root, "home", "installed-adapters.json");
    writeFileSync(file, JSON.stringify({ version: 1, adapters: { one: entry("one") } }));
    expect(Object.keys(readInstalled())).toEqual(["one"]);
    writeFileSync(file, JSON.stringify({ version: 2, registries: ["https://example.org/index.json"], adapters: { one: { ...entry("one"), signed_by: "lab" } }, confirmed: {} }));
    saveInstalled(entry("two"));
    const after = JSON.parse(readFileSync(file, "utf8"));
    expect(after.version).toBe(2);
    expect(after.registries).toEqual(["https://example.org/index.json"]);
    expect(Object.keys(after.adapters).sort()).toEqual(["one", "two"]);
    expect(after.adapters.one.signed_by).toBe("lab");
  });
});

describe.skipIf(process.platform === "win32")("the old home folder ~/.guided-analysis", () => {
  const saved = { HOME: process.env.HOME, CUVETTE_HOME: process.env.CUVETTE_HOME, USERPROFILE: process.env.USERPROFILE };
  afterEach(() => {
    for (const [k, v] of Object.entries(saved)) if (v === undefined) delete process.env[k]; else process.env[k] = v;
  });

  test.each(["v2-home-sessions", "v3-project-folder", "v5-rewind-branch-method"])("%s: sessions, methods and settings in the old home list and resume, before and after the move", async (format) => {
    copyTree(join(FIXTURES, format), root);
    const old = join(root, ".guided-analysis");
    renameSync(join(root, "home"), old);
    writeFileSync(join(old, "settings.json"), JSON.stringify({ effort: "low", budgetUsd: 12 }));
    delete process.env.CUVETTE_HOME;
    process.env.HOME = root;
    process.env.USERPROFILE = root;
    expect(listSessions().length).toBeGreaterThan(0);
    expect(loadSettings(join(root, "project")).effort).toBe("low");
    const id = listSessions()[0]!.id;
    const first = await resume(id);
    expect(first.id).toBe(id);
    await first.close();
    open.splice(open.indexOf(first), 1);
    expect(moveOldHome(root)).toContain(".cuvette");
    expect(existsSync(join(root, ".cuvette", "settings.json"))).toBe(true);
    expect(listSessions().map((x) => x.id)).toContain(id);
    expect(loadSettings(join(root, "project")).effort).toBe("low");
    const second = await resume(id);
    expect(second.id).toBe(id);
    await second.send("Thanks.");
  });
});

describe.each([...HOME_FORMATS, ...PROJECT_FORMATS])("the model history of %s", (format) => {
  test("each tool call has its result in the messages that go to Claude, OpenAI-compatible and Ollama servers", async () => {
    install(format);
    const legacy = HOME_FORMATS.includes(format);
    const id = legacy ? readdirSync(join(root, "home", "sessions"))[0]! : projectSessions()[0]!.id;
    const s = await resume(id);
    expect(s.history.length).toBeGreaterThan(2);
    const claude = new ClaudeProvider("claude-opus-5-5", { client: {} }).toNative(s.history) as { role: string; content: { type: string; id?: string; tool_use_id?: string }[] }[];
    claude.forEach((m, i) => {
      expect(m.content.length).toBeGreaterThan(0);
      const uses = m.content.filter((b) => b.type === "tool_use").map((b) => b.id);
      if (!uses.length) return;
      const next = claude[i + 1]!;
      expect(next.role).toBe("user");
      expect(next.content.filter((b) => b.type === "tool_result").map((b) => b.tool_use_id).sort()).toEqual([...uses].sort());
    });
    const openai = new OpenAIProvider("http://127.0.0.1:1/v1", "m").toNative("SYS", s.history) as { role: string; tool_calls?: { id: string }[]; tool_call_id?: string }[];
    const ids = new Set(openai.flatMap((m) => (m.tool_calls ?? []).map((c) => c.id)));
    for (const m of openai) if (m.role === "tool") expect(ids.has(m.tool_call_id!)).toBe(true);
    expect(openai.filter((m) => m.role === "tool").length).toBe(ids.size);
    expect((new OllamaProvider("m", { capabilities: [] } as never).toNative("SYS", s.history) as unknown[]).length).toBeGreaterThan(2);
  });
});

describe("the data book of a project with a branch", () => {
  test.each(["v5-rewind-branch-method", "v7-agent-loop"])("%s: the parent and the branch are two sessions, each with its own id", (format) => {
    install(format);
    const project = join(root, "project");
    const found = bookSessions(project);
    expect(found.length).toBe(2);
    const ids = found.map((f) => openBookRecord(f).sessionId).sort();
    expect(ids).toEqual(readIndex().map((r) => r.id).sort());
    const branch = readIndex().find((r) => r.name === "triangle branch")!;
    const only = bookSessions(project, [branch.id]);
    expect(only.length).toBe(1);
    expect(openBookRecord(only[0]!).sessionId).toBe(branch.id);
  });
});

describe("the exports of a branch", () => {
  test.each(["v5-rewind-branch-method", "v7-agent-loop"])("%s: they name the branch, not the parent", async (format) => {
    install(format);
    const rows = readIndex();
    const branch = rows.find((r) => r.name === "triangle branch")!;
    const parent = rows.find((r) => r.id !== branch.id)!;
    const s = await resume(branch.id);
    expect(s.record.entries()[0]!.session).toBe(parent.id);
    for (const fmt of ["protocol", "md", "html"] as const) {
      const text = readFileSync(await s.exportAs(fmt), "utf8");
      expect(text).toContain(branch.id);
      if (fmt === "md") expect(/- Session: (\S+)/.exec(text)?.[1]).toBe(branch.id);
    }
    expect(readFileSync(join(s.workDir, "protocol.md"), "utf8")).not.toContain(`Session ${parent.id}`);
    s.saveResults(0, true);
    const bib = join(s.workDir, "references.bib");
    if (existsSync(bib)) expect(readFileSync(bib, "utf8")).toContain(branch.id);
  });
});

describe("the cuvette command on old data", () => {
  const CUVETTE = join(__dirname, "..", "bin/cuvette.js");

  function cli(args: string[]) {
    const env = { ...process.env, CUVETTE_HOME: join(root, "home"), HOME: root, USERPROFILE: root, CUVETTE_NO_OPEN: "1", ANTHROPIC_API_KEY: "" };
    const r = spawnSync("node", [CUVETTE, ...args], { cwd: join(root, "project"), env, encoding: "utf8", timeout: 120_000 });
    return { code: r.status, out: r.stdout, err: r.stderr };
  }

  test.each(["v2-home-sessions", "v3-project-folder", "v7-agent-loop"])("%s: sessions, status and export work", (format) => {
    install(format);
    const list = cli(["sessions"]);
    expect(list.code, list.err).toBe(0);
    expect(list.out).toContain("Count the particles in a.tif");
    const id = list.out.match(/\d{8}-\d{6}-[0-9a-f]{4}/)![0];
    const status = cli(["status", id]);
    expect(status.code, status.err).toBe(0);
    expect(status.out).toContain(`Session ${id}`);
    const exported = cli(["export", id, "--format", "protocol"]);
    expect(exported.code, exported.err).toBe(0);
    expect(statSync(exported.out.trim().split("\n").at(-1)!).size).toBeGreaterThan(0);
  });
});

describe("a log with a byte order mark and Windows line ends", () => {
  test("the record, the session list and the status load the same entries", async () => {
    install("v2-home-sessions");
    const id = readdirSync(join(root, "home", "sessions"))[0]!;
    const file = join(root, "home", "sessions", id, "log.jsonl");
    const plain = readFileSync(file, "utf8");
    const before = new AnalysisRecord(dirname(file), id).entries().length;
    writeFileSync(file, "\uFEFF" + plain.split("\n").join("\r\n"));
    const record = new AnalysisRecord(dirname(file), id);
    expect(record.entries().length).toBe(before);
    expect(record.messages().length).toBeGreaterThan(0);
    const [info] = listSessions();
    expect(info!.cwd).toBe(join(root, "project"));
    expect(info!.ask).toBe("Count the particles in a.tif");
    const s = await resume(id);
    expect(s.history.length).toBe(record.messages().length);
    await s.send("Thanks.");
    expect(new AnalysisRecord(dirname(file), id).entries().length).toBeGreaterThan(before);
  });
});

describe("a session whose adapter is not on this computer", () => {
  function removeAdapter(): void {
    const moved = join(root, "gone-adapter");
    const walk = (d: string) => {
      for (const n of readdirSync(d)) {
        const p = join(d, n);
        if (statSync(p).isDirectory()) walk(p);
        else if (/\.(json|jsonl)$/.test(n)) writeFileSync(p, readFileSync(p, "utf8").split(LAB).join(moved));
      }
    };
    walk(root);
  }

  test.each(["v3-project-folder", "v7-agent-loop"])("%s: it resumes without the adapter, with one notice, and it exports", async (format) => {
    install(format);
    removeAdapter();
    const [first] = projectSessions();
    const before = logLines(first!.folder);
    for (let i = 0; i < 2; i++) {
      const s = await resume(first!.id);
      expect(s.adapters.length).toBe(0);
      expect(s.record.entries(["notice"]).filter((n) => String(n.data.text).includes("The adapter lab is not installed here")).length).toBe(1);
      expect(statSync(await s.exportAs("protocol")).size).toBeGreaterThan(0);
      expect(statSync(await s.exportAs("notebook")).size).toBeGreaterThan(0);
      expect(await run(s, "status")).toContain("Status");
      await s.close();
      open.splice(open.indexOf(s), 1);
    }
    expect(logLines(first!.folder).startsWith(before)).toBe(true);
  });

  test("an adapter that the user names on the command line must exist", async () => {
    install("v7-agent-loop");
    const [first] = projectSessions();
    await expect(Session.resume(first!.id, { provider: new FakeProvider([]), adapters: ["not-an-adapter"] })).rejects.toThrow('no adapter named "not-an-adapter"');
  });
});

describe("the credentials file", () => {
  test("a save and a remove keep the entries that this version does not know", () => {
    mkdirSync(join(root, "home"), { recursive: true });
    const file = credentialsPath();
    writeFileSync(file, JSON.stringify({ anthropic_api_key: "sk-ant-old-key-0000000000", from_a_newer_version: { token: { a: [1, 2] } }, retries: 3 }));
    saveElabftw("https://elab.example.org", "elab-key-0000000000000");
    saveClaudeWorkspace("wrkspc_1");
    const kept = { from_a_newer_version: { token: { a: [1, 2] } }, retries: 3 };
    expect(JSON.parse(readFileSync(file, "utf8"))).toMatchObject({ ...kept, anthropic_api_key: "sk-ant-old-key-0000000000", elabftw_url: "https://elab.example.org", anthropic_workspace_id: "wrkspc_1" });
    saveClaudeKey("sk-ant-new-key-0000000000");
    expect(claudeKey({}).key).toBe("sk-ant-new-key-0000000000");
    expect(removeElabftw()).toBe(true);
    expect(removeClaudeKey()).toBe(true);
    const after = JSON.parse(readFileSync(file, "utf8"));
    expect(after).toMatchObject(kept);
    expect(after.anthropic_api_key).toBeUndefined();
    expect(after.elabftw_url).toBeUndefined();
  });
});

describe("a method file from a newer version", () => {
  test("it keeps unknown fields through an export and an import, and a newer format gives a plain message", () => {
    install("v7-agent-loop");
    const file = join(root, "home", "methods", "count-particles.json");
    const m = JSON.parse(readFileSync(file, "utf8"));
    m.lab_extra = { signed: true, steps: [1, 2] };
    m.analysis.steps[0].new_field = "kept";
    writeFileSync(file, JSON.stringify(m));
    const out = exportMethod("count-particles", root);
    expect(JSON.parse(readFileSync(out, "utf8"))).toMatchObject({ lab_extra: { signed: true, steps: [1, 2] } });
    const copy = importMethod(out, "copy");
    const saved = JSON.parse(readFileSync(copy, "utf8"));
    expect(saved.lab_extra).toEqual({ signed: true, steps: [1, 2] });
    expect(saved.analysis.steps[0].new_field).toBe("kept");
    writeFileSync(join(root, "home", "methods", "later.json"), JSON.stringify({ ...m, name: "later", cuvette_method: 2 }));
    expect(() => loadMethod("later")).toThrow("format 2. This version of Cuvette reads format 1. Update Cuvette to use it.");
  });
});
