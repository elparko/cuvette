import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "vitest";
import { readIndex, removeIndexRow, renameIndexRow, saveIndexRow } from "../src/core/places.ts";
import { ageText, claimLock, cleanSessions, clip, clipStart, defaultSession, listSessions, lockAlive, logLimits, openLock, scanLog, sessionLine } from "../src/core/sessions.ts";
import { TSX_CLI } from "../src/adapters/kinds/common.ts";

function home(): string {
  const h = mkdtempSync(join(tmpdir(), "cuvette-sessions-"));
  const add = (id: string, cwd: string, ask: string | undefined, minutesAgo: number) => {
    const dir = join(h, "sessions", id);
    mkdirSync(dir, { recursive: true });
    const lines = [{ id: 1, kind: "session", data: { cwd, adapters: [{ name: "biostats" }], model: "m" } }, ...(ask ? [{ id: 2, kind: "user", data: { text: ask } }] : [])];
    writeFileSync(join(dir, "log.jsonl"), lines.map((l) => JSON.stringify(l)).join("\n") + "\n");
    const t = new Date(Date.now() - minutesAgo * 60000);
    utimesSync(join(dir, "log.jsonl"), t, t);
  };
  add("20261001-090000-aaaa", "/lab/sleep", "Compare the sleep of the two drug groups in sleep.csv with a paired test and give the effect size", 3 * 24 * 60);
  add("20261008-100000-bbbb", "/lab/cells", "Count the cells", 12);
  add("20261007-100000-cccc", "/lab/sleep", undefined, 90);
  return h;
}

test("the list is newest first by last use", () => {
  expect(listSessions(home()).map((s) => s.id)).toEqual(["20261008-100000-bbbb", "20261007-100000-cccc", "20261001-090000-aaaa"]);
});

test("the default is the newest session of this folder, else the newest overall", () => {
  const list = listSessions(home());
  expect(defaultSession(list, "/lab/sleep")).toMatchObject({ info: { id: "20261001-090000-aaaa" }, here: true });
  expect(defaultSession(list, "/lab/other")).toMatchObject({ info: { id: "20261008-100000-bbbb" }, here: false });
  expect(defaultSession([], "/lab")).toBeUndefined();
});

test("the default skips a session that has no request, even if it is newer", () => {
  const list = listSessions(home());
  expect(list[1]!.id).toBe("20261007-100000-cccc");
  expect(defaultSession(list, "/lab/sleep")?.info.id).not.toBe("20261007-100000-cccc");
  expect(defaultSession(list.filter((s) => !s.ask), "/lab/sleep")).toBeUndefined();
});

test("the default keeps a session that has work but no request, and skips one with only a notice", () => {
  const h = home();
  const add = (id: string, kinds: string[]) => {
    const dir = join(h, "sessions", id);
    mkdirSync(dir, { recursive: true });
    const lines = [{ id: 1, kind: "session", data: { cwd: "/lab/new", adapters: [], model: "m" } }, ...kinds.map((kind, i) => ({ id: i + 2, kind, data: {} }))];
    writeFileSync(join(dir, "log.jsonl"), lines.map((l) => JSON.stringify(l)).join("\n") + "\n");
  };
  add("20261009-100000-dddd", ["notice"]);
  add("20261009-110000-eeee", ["notice", "decision"]);
  add("20261009-120000-ffff", ["notice", "permission_mode", "setting", "self_test"]);
  const list = listSessions(h);
  expect(defaultSession(list, "/lab/new")?.info.id).toBe("20261009-110000-eeee");
  expect(defaultSession(list.filter((s) => s.id !== "20261009-110000-eeee"), "/lab/new")?.info.id).toBe("20261008-100000-bbbb");
  expect(list.find((s) => s.id === "20261009-120000-ffff")?.worked).toBe(false);
});

test("each line has the id, the age, the folder and the first request, shortened", () => {
  const [a, , c] = listSessions(home());
  const now = Date.now();
  expect(sessionLine(a!, now).split("\n")[0]).toMatch(/^20261008-100000-bbbb {2}12 min ago +\/lab\/cells +Count the cells$/);
  expect(sessionLine(c!, now)).toContain("3 days ago");
  expect(sessionLine(c!, now)).toContain("Compare the sleep of the two drug groups in sleep.csv with…");
  expect(sessionLine(listSessions(home())[1]!, now)).toContain("(no request)");
  expect([ageText(20000), ageText(3 * 3600000), ageText(86400000)]).toEqual(["just now", "3 h ago", "1 day ago"]);
});

test("cuvette sessions prints the newest first", () => {
  const r = spawnSync("node", [join(__dirname, "..", "bin/cuvette.js"), "sessions"], { env: { ...process.env, CUVETTE_HOME: home() }, encoding: "utf8" });
  const lines = r.stdout.trim().split("\n").filter((l) => /^\d{8}-/.test(l));
  expect(lines.map((l) => l.slice(0, 20))).toEqual(["20261008-100000-bbbb", "20261007-100000-cccc", "20261001-090000-aaaa"]);
  expect(lines[0]).toContain("12 min ago");
});

test("sessions in project folders come from the home index; a missing folder is moved", () => {
  const h = mkdtempSync(join(tmpdir(), "cuvette-sessions-index-"));
  const project = mkdtempSync(join(tmpdir(), "cuvette-sessions-proj-"));
  const folder = join(project, "cuvette", "2026-10-08-count-cells");
  mkdirSync(join(folder, ".record"), { recursive: true });
  writeFileSync(join(folder, ".record", "log.jsonl"), [{ id: 1, kind: "session", data: { cwd: "{project}" } }, { id: 2, kind: "user", data: { text: "Count the cells" } }].map((l) => JSON.stringify(l)).join("\n") + "\n");
  const rows = [
    { id: "20261008-100000-dddd", project, folder, title: "Count the cells", date: new Date().toISOString() },
    { id: "20261008-090000-eeee", project: "/gone", folder: "/gone/cuvette/x", title: "Old request", date: new Date(Date.now() - 3600_000).toISOString() },
  ];
  writeFileSync(join(h, "sessions-index.json"), JSON.stringify(rows));
  const list = listSessions(h);
  expect(list.map((s) => [s.id, s.cwd, s.ask, !!s.moved])).toEqual([
    ["20261008-100000-dddd", project, "Count the cells", false],
    ["20261008-090000-eeee", "/gone", "Old request", true],
  ]);
  expect(sessionLine(list[1]!)).toContain("moved: run cuvette open <new folder>");
  expect(defaultSession(list, join(folder, "figures"))?.info.id).toBe("20261008-100000-dddd");
  expect(defaultSession(list, project)).toMatchObject({ here: true, info: { id: "20261008-100000-dddd" } });
});

test("a damaged index does not stop the list: the good rows and the old sessions still show", () => {
  const folder = mkdtempSync(join(tmpdir(), "cuvette-sessions-bad-"));
  mkdirSync(join(folder, ".record"));
  writeFileSync(join(folder, ".record", "log.jsonl"), ["null", "5", "{cut", JSON.stringify({ id: 2, kind: "user", data: { text: "Count the cells" } }), JSON.stringify({ id: 3, kind: "title", data: null })].join("\n") + "\n");
  const good = { id: "20261008-100000-ffff", project: "/lab", folder, title: "Count", date: new Date().toISOString() };
  for (const body of ["{cut", "null", "{}", '"text"', JSON.stringify([null, 5, { id: 7, folder }, { id: "x" }, { id: "y", folder: 3 }, good])]) {
    const h = home();
    writeFileSync(join(h, "sessions-index.json"), body);
    const ids = listSessions(h).map((s) => s.id);
    expect(ids).toContain("20261008-100000-bbbb");
    if (body.startsWith("[")) expect(listSessions(h).find((s) => s.id === good.id)).toMatchObject({ ask: "Count the cells", cwd: "/lab" });
    const r = spawnSync("node", [join(__dirname, "..", "bin/cuvette.js"), "sessions"], { env: { ...process.env, CUVETTE_HOME: h }, encoding: "utf8" });
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("20261008-100000-bbbb");
  }
});

test("a write leaves a damaged old index as it is and a damaged row file moves aside", () => {
  const h = mkdtempSync(join(tmpdir(), "cuvette-sessions-keep-"));
  const old = process.env.CUVETTE_HOME;
  process.env.CUVETTE_HOME = h;
  try {
    const damaged = '[{"id":"20261001-000000-aaaa","folder":"/p/cuvette/a"},';
    writeFileSync(join(h, "sessions-index.json"), damaged);
    saveIndexRow({ id: "20261002-000000-bbbb", recordDir: "/p/cuvette/b/.record", outDir: "/p/cuvette/b", project: "/p", title: "b", created: "2026-10-02T00:00:00Z", legacy: false, fallback: false });
    expect(readFileSync(join(h, "sessions-index.json"), "utf8")).toBe(damaged);
    expect(readIndex().map((r) => r.id)).toEqual(["20261002-000000-bbbb"]);
    expect(readdirSync(join(h, "sessions-index")).filter((f) => f.endsWith(".tmp"))).toEqual([]);
    writeFileSync(join(h, "sessions-index", "20261003-000000-cccc.json"), '{"id":"20261003-000000-cccc","folder":"/p/c"');
    expect(readIndex().map((r) => r.id)).toEqual(["20261002-000000-bbbb"]);
    writeFileSync(join(h, "sessions-index.json"), JSON.stringify([{ id: "20261003-000000-cccc", folder: "/p/c", extra: 1 }, { id: 5 }]));
    expect(renameIndexRow("20261003-000000-cccc", "named")).toBe(true);
    expect(readIndex().find((r) => r.id === "20261003-000000-cccc")).toMatchObject({ custom: "named", extra: 1 });
    const kept = readdirSync(join(h, "sessions-index")).filter((f) => f.includes(".json.damaged-"));
    expect(kept).toHaveLength(1);
    expect(readFileSync(join(h, "sessions-index", kept[0]!), "utf8")).toContain('"folder":"/p/c"');
  } finally {
    if (old === undefined) delete process.env.CUVETTE_HOME;
    else process.env.CUVETTE_HOME = old;
  }
});

test("a session shows its title, its sentence and its status", () => {
  const h = mkdtempSync(join(tmpdir(), "cuvette-sessions-"));
  const dir = join(h, "sessions", "20261009-090000-dddd");
  mkdirSync(dir, { recursive: true });
  const lines = [
    { id: 1, kind: "session", data: { cwd: "/lab/sleep" } },
    { id: 2, kind: "user", data: { text: "Compare the drugs" } },
    { id: 3, kind: "assistant", data: { text: "Drug 2 gave 1.58 h more sleep.", final: true } },
    { id: 4, kind: "title", data: { title: "Extra sleep, drug 2 vs drug 1", description: "Ran a paired t test on 10 patients; drug 2 gave 1.58 h more sleep." } },
  ];
  writeFileSync(join(dir, "log.jsonl"), lines.map((l) => JSON.stringify(l)).join("\n") + "\n");
  const [s] = listSessions(h);
  expect(s).toMatchObject({ name: "Extra sleep, drug 2 vs drug 1", status: "answered" });
  expect(sessionLine(s!)).toContain("Extra sleep, drug 2 vs drug 1");
  expect(sessionLine(s!)).toContain("answered · Ran a paired t test");
  writeFileSync(join(dir, "log.jsonl"), [...lines, { id: 5, kind: "user", data: { text: "Now by sex" } }, { id: 6, kind: "question", data: { qid: "q1" } }].map((l) => JSON.stringify(l)).join("\n") + "\n");
  writeFileSync(join(dir, "open.json"), JSON.stringify({ pid: process.pid }));
  expect(listSessions(h)[0]!.status).toBe("waiting for you");
});

test("a session with work and no question has the status in progress", () => {
  const h = mkdtempSync(join(tmpdir(), "cuvette-sessions-"));
  const dir = join(h, "sessions", "20261009-090000-eeee");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "log.jsonl"), [{ id: 1, kind: "session", data: { cwd: "/lab" } }, { id: 2, kind: "node", data: { outputs: [] } }].map((l) => JSON.stringify(l)).join("\n") + "\n");
  expect(listSessions(h)[0]!.status).toBe("in progress");
});

test("the list reads a log again only after it changes, and the running status stays current", () => {
  const h = mkdtempSync(join(tmpdir(), "cuvette-sessions-cache-"));
  const dir = join(h, "sessions", "20261012-100000-dddd");
  mkdirSync(dir, { recursive: true });
  const log = join(dir, "log.jsonl");
  const body = [{ id: 1, kind: "session", data: { cwd: "/lab" } }, { id: 2, kind: "user", data: { text: "Count the cells" } }].map((l) => JSON.stringify(l)).join("\n") + "\n";
  writeFileSync(log, body);
  const t = new Date(Date.now() - 60000);
  utimesSync(log, t, t);
  expect(listSessions(h)[0]).toMatchObject({ ask: "Count the cells", status: "in progress" });
  writeFileSync(log, body.replace("Count the cells", "Xxxxx xxx xxxxx"));
  utimesSync(log, t, t);
  expect(listSessions(h)[0]!.ask).toBe("Count the cells");
  writeFileSync(log, body + JSON.stringify({ id: 3, kind: "assistant", data: { text: "12 cells.", final: true } }) + "\n");
  expect(listSessions(h)[0]).toMatchObject({ ask: "Count the cells", status: "answered" });
  writeFileSync(log, body + JSON.stringify({ id: 3, kind: "tool", data: {} }) + "\n");
  expect(listSessions(h)[0]!.status).toBe("in progress");
  writeFileSync(join(dir, "open.json"), JSON.stringify({ pid: process.pid }));
  expect(listSessions(h)[0]!.status).toBe("running");
});

test("a deleted log leaves no old data: a new log at the same path and a deleted figure show at once", () => {
  const h = mkdtempSync(join(tmpdir(), "cuvette-sessions-gone-"));
  const dir = join(h, "sessions", "20261012-110000-eeee");
  const log = join(dir, "log.jsonl");
  const fig = (n: string) => join(h, n);
  writeFileSync(fig("a.png"), "x");
  writeFileSync(fig("b.png"), "x");
  const write = (ask: string) => {
    mkdirSync(dir, { recursive: true });
    const lines = [{ id: 1, kind: "session", data: { cwd: "/lab" } }, { id: 2, kind: "user", data: { text: ask } }, { id: 3, kind: "node", data: { outputs: [{ path: fig("a.png") }] } }, { id: 4, kind: "node", data: { outputs: [{ path: fig("b.png") }] } }];
    writeFileSync(log, lines.map((l) => JSON.stringify(l)).join("\n") + "\n");
    const t = new Date(Date.now() - 60000);
    utimesSync(log, t, t);
  };
  write("Count the cells");
  expect(listSessions(h)[0]).toMatchObject({ ask: "Count the cells", figure: fig("a.png") });
  rmSync(fig("a.png"));
  expect(listSessions(h)[0]!.figure).toBe(fig("b.png"));
  rmSync(dir, { recursive: true });
  expect(listSessions(h)).toEqual([]);
  write("Xxxxx xxx xxxxx");
  expect(listSessions(h)[0]!.ask).toBe("Xxxxx xxx xxxxx");
  rmSync(log);
  write("Count the cells");
  expect(listSessions(h)[0]!.ask).toBe("Count the cells");
});

test("a custom name wins over the automatic title, and a removed session leaves the list", () => {
  const h = mkdtempSync(join(tmpdir(), "cuvette-sessions-rename-"));
  const folder = join(h, "proj", "cuvette", "2026-10-08-count");
  mkdirSync(join(folder, ".record"), { recursive: true });
  const lines = [{ id: 1, kind: "session", data: { cwd: "/p" } }, { id: 2, kind: "user", data: { text: "Count" } }, { id: 3, kind: "title", data: { title: "Auto title", description: "" } }];
  writeFileSync(join(folder, ".record", "log.jsonl"), lines.map((l) => JSON.stringify(l)).join("\n") + "\n");
  writeFileSync(join(h, "sessions-index.json"), JSON.stringify([{ id: "a1", project: "/p", folder, title: "Count", date: new Date().toISOString() }]));
  const old = process.env.CUVETTE_HOME;
  process.env.CUVETTE_HOME = h;
  try {
    expect(renameIndexRow("a1", "  Oct  11 ")).toBe(true);
    expect(listSessions(h)[0]?.name).toBe("Oct 11");
    expect(renameIndexRow("a1", "a".repeat(59) + "😀 and more")).toBe(true);
    expect(() => encodeURIComponent(listSessions(h)[0]?.name!)).not.toThrow();
    renameIndexRow("a1", "");
    expect(listSessions(h)[0]?.name).toBe("Auto title");
    expect(removeIndexRow("a1")).toBe(true);
    expect(listSessions(h)).toEqual([]);
    expect(removeIndexRow("a1")).toBe(false);
  } finally {
    if (old === undefined) delete process.env.CUVETTE_HOME;
    else process.env.CUVETTE_HOME = old;
  }
});

test("claimLock takes a free or dead lock, and refuses a live lock of another process", () => {
  const dir = mkdtempSync(join(tmpdir(), "cuvette-lock-"));
  const lock = join(dir, "open.json");
  expect(claimLock(dir)).toBeUndefined();
  expect(JSON.parse(readFileSync(lock, "utf8"))).toMatchObject({ pid: process.pid });
  expect(claimLock(dir)).toBeUndefined();
  const other = process.ppid;
  writeFileSync(lock, JSON.stringify({ pid: other, procStart: 1000 }));
  expect(claimLock(dir, {}, () => 1000)).toMatchObject({ pid: other });
  expect(openLock(dir, () => 1000)).toMatchObject({ pid: other });
  expect(openLock(dir, () => 999_000)).toBeUndefined();
  expect(claimLock(dir, {}, () => 999_000)).toBeUndefined();
  expect(JSON.parse(readFileSync(lock, "utf8")).pid).toBe(process.pid);
  writeFileSync(lock, JSON.stringify({ pid: 2 ** 22 + 7 }));
  expect(claimLock(dir)).toBeUndefined();
  expect(lockAlive({ pid: process.pid, procStart: Date.now() - 86_400_000 * 400 })).toBe(false);
});

test("claimLock does not take an empty lock file that is new, and takes one that is old", () => {
  const dir = mkdtempSync(join(tmpdir(), "cuvette-lock-empty-"));
  const lock = join(dir, "open.json");
  writeFileSync(lock, "");
  expect(claimLock(dir)).toMatchObject({ pid: 0 });
  expect(readFileSync(lock, "utf8")).toBe("");
  const old = new Date(Date.now() - 60_000);
  utimesSync(lock, old, old);
  expect(claimLock(dir)).toBeUndefined();
  expect(JSON.parse(readFileSync(lock, "utf8"))).toMatchObject({ pid: process.pid });
  expect(readdirSync(dir)).toEqual(["open.json"]);
});

test("of many processes that claim one lock at the same time, exactly one gets it", async () => {
  const dir = mkdtempSync(join(tmpdir(), "cuvette-lock-race-"));
  const code = `import { claimLock } from ${JSON.stringify(join(__dirname, "../src/core/sessions.ts"))}; const at = Number(process.env.AT); while (Date.now() < at) {} const held = claimLock(${JSON.stringify(dir)}); console.log(held ? "lost" : "won"); process.stdin.resume();`;
  const at = Date.now() + 2500;
  const children = Array.from({ length: 6 }, () => spawn(process.execPath, [TSX_CLI, "--eval", code], { env: { ...process.env, AT: String(at) }, stdio: ["pipe", "pipe", "inherit"] }));
  const runs = children.map((c) => new Promise<string>((done) => {
    c.stdout.once("data", (d) => done(String(d).trim()));
  }));
  const results = await Promise.all(runs);
  for (const c of children) c.stdin.end();
  expect(results.filter((r) => r === "won").length).toBe(1);
  expect(results.filter((r) => r === "lost").length).toBe(5);
}, 30_000);

test("a clip does not cut an emoji in two", () => {
  expect(() => encodeURIComponent(clip("a".repeat(78) + "😀 and more text", 80))).not.toThrow();
  expect(() => encodeURIComponent(clipStart("😀".repeat(5), 4))).not.toThrow();
  expect(clip("short", 80)).toBe("short");
});

function staleHome() {
  const h = mkdtempSync(join(tmpdir(), "cuvette-sessions-stale-"));
  process.env.CUVETTE_HOME = h;
  const day = 24 * 3600_000;
  const session = { id: 1, kind: "session", data: { cwd: "/x" } };
  const make = (id: string, ageMs: number, log: object[] | undefined, extra: (record: string, folder: string) => void = () => {}) => {
    const folder = join(h, "proj", `.new-${id}`);
    mkdirSync(join(folder, ".record"), { recursive: true });
    if (log) writeFileSync(join(folder, ".record", "log.jsonl"), log.map((l) => JSON.stringify(l)).join("\n") + "\n");
    extra(join(folder, ".record"), folder);
    saveIndexRow({ id, project: join(h, "proj"), outDir: folder, recordDir: join(folder, ".record"), title: "", created: new Date(Date.now() - ageMs).toISOString(), legacy: false, fallback: false });
    return folder;
  };
  const folders = {
    empty: make("20260101-000000-old1", 2 * day, [session, { id: 2, kind: "notice", data: { text: "x" } }]),
    never: make("20260101-000000-old2", 2 * day, undefined),
    young: make("20260101-000000-new1", 3600_000, [session]),
    live: make("20260101-000000-old3", 2 * day, [session], (r) => writeFileSync(join(r, "open.json"), JSON.stringify({ pid: process.pid }))),
    asked: make("20260101-000000-old4", 2 * day, [session, { id: 2, kind: "user", data: { text: "Count" } }]),
    method: make("20260101-000000-old5", 2 * day, [session, { id: 2, kind: "setting", data: { name: "mode", new: "plan" } }]),
    files: make("20260101-000000-old6", 2 * day, [session], (_, f) => writeFileSync(join(f, "result.csv"), "x")),
  };
  return { h, folders };
}

test("the list hides an old empty session but never deletes anything", () => {
  const prev = process.env.CUVETTE_HOME;
  try {
    const { h, folders } = staleHome();
    const ids = listSessions(h).map((s) => s.id).sort();
    expect(ids).toEqual(["20260101-000000-new1", "20260101-000000-old3", "20260101-000000-old4", "20260101-000000-old5", "20260101-000000-old6"]);
    expect(Object.values(folders).every(existsSync)).toBe(true);
    expect(readIndex()).toHaveLength(7);
  } finally {
    if (prev === undefined) delete process.env.CUVETTE_HOME;
    else process.env.CUVETTE_HOME = prev;
  }
});

test("cleanSessions removes only an old session with start entries, no lock and no output files", () => {
  const prev = process.env.CUVETTE_HOME;
  try {
    const { folders } = staleHome();
    const removed = cleanSessions();
    expect(removed.map((r) => r.split(" ")[0]).sort()).toEqual(["20260101-000000-old1", "20260101-000000-old2"]);
    expect([folders.empty, folders.never].map(existsSync)).toEqual([false, false]);
    expect([folders.young, folders.live, folders.asked, folders.method, folders.files].every(existsSync)).toBe(true);
    expect(readIndex()).toHaveLength(5);
    expect(existsSync(join(folders.files, ".record", "open.json"))).toBe(false);
  } finally {
    if (prev === undefined) delete process.env.CUVETTE_HOME;
    else process.env.CUVETTE_HOME = prev;
  }
});

test("cuvette sessions --clean prints what it removes", () => {
  const prev = process.env.CUVETTE_HOME;
  try {
    const { h, folders } = staleHome();
    const r = spawnSync("node", [join(__dirname, "..", "bin/cuvette.js"), "sessions", "--clean"], { env: { ...process.env, CUVETTE_HOME: h }, encoding: "utf8" });
    expect(r.stdout).toContain("Removed 2 empty sessions that never started:");
    expect(r.stdout).toContain("20260101-000000-old1");
    expect(existsSync(folders.empty)).toBe(false);
    expect(existsSync(folders.method)).toBe(true);
  } finally {
    if (prev === undefined) delete process.env.CUVETTE_HOME;
    else process.env.CUVETTE_HOME = prev;
  }
});

test("the default and the picker skip a moved session, and the line marks it", () => {
  const h = mkdtempSync(join(tmpdir(), "cuvette-sessions-moved-"));
  const folder = mkdtempSync(join(tmpdir(), "cuvette-sessions-moved-ok-"));
  mkdirSync(join(folder, ".record"));
  writeFileSync(join(folder, ".record", "log.jsonl"), [{ id: 1, kind: "session", data: { cwd: "/lab" } }, { id: 2, kind: "user", data: { text: "Count the cells" } }].map((l) => JSON.stringify(l)).join("\n") + "\n");
  const past = new Date(Date.now() - 3 * 3600_000);
  utimesSync(join(folder, ".record", "log.jsonl"), past, past);
  const rows = [
    { id: "20261008-100000-aaaa", project: "/lab", folder, title: "Count the cells", date: new Date(Date.now() - 3600_000).toISOString() },
    { id: "20261009-100000-bbbb", project: "/lab", folder: "/gone/cuvette/x", title: "Newer but moved", date: new Date().toISOString() },
  ];
  writeFileSync(join(h, "sessions-index.json"), JSON.stringify(rows));
  const list = listSessions(h);
  expect(list[0]).toMatchObject({ id: "20261009-100000-bbbb", moved: true });
  expect(defaultSession(list, "/elsewhere")).toMatchObject({ info: { id: "20261008-100000-aaaa" } });
  expect(defaultSession(list.filter((s) => s.moved), "/lab")).toBeUndefined();
});

test("a session with a request and no answer is in progress, also after the first turn stopped", () => {
  const h = mkdtempSync(join(tmpdir(), "cuvette-sessions-progress-"));
  const dir = join(h, "sessions", "20261013-100000-aaaa");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "log.jsonl"), [{ id: 1, kind: "session", data: { cwd: "/lab" } }, { id: 2, kind: "user", data: { text: "Count the cells" } }].map((l) => JSON.stringify(l)).join("\n") + "\n");
  expect(listSessions(h)[0]!.status).toBe("in progress");
});

test("a session in the old sessions folder can be renamed and removed from the list", () => {
  const h = home();
  const old = process.env.CUVETTE_HOME;
  process.env.CUVETTE_HOME = h;
  try {
    const id = "20261008-100000-bbbb";
    expect(renameIndexRow(id, "  Cell   counts ")).toBe(true);
    expect(listSessions(h).find((s) => s.id === id)).toMatchObject({ name: "Cell counts", ask: "Count the cells" });
    expect(readIndex().map((r) => r.id)).toEqual([]);
    expect(renameIndexRow(id, "")).toBe(true);
    expect(listSessions(h).find((s) => s.id === id)!.name).toBeUndefined();
    expect(removeIndexRow(id)).toBe(true);
    expect(listSessions(h).map((s) => s.id)).not.toContain(id);
    expect(existsSync(join(h, "sessions", id, "log.jsonl"))).toBe(true);
    expect(renameIndexRow(id, "again")).toBe(false);
    expect(removeIndexRow(id)).toBe(false);
    expect(removeIndexRow("20261001-090000-zzzz")).toBe(false);
  } finally {
    if (old === undefined) delete process.env.CUVETTE_HOME;
    else process.env.CUVETTE_HOME = old;
  }
});

test("a log over the read limit is read at both ends, and the status says that the log is too large", () => {
  const h = mkdtempSync(join(tmpdir(), "cuvette-sessions-big-"));
  const dir = join(h, "sessions", "20261009-100000-dddd");
  mkdirSync(dir, { recursive: true });
  const filler = Array.from({ length: 40 }, (_, i) => JSON.stringify({ id: i + 3, kind: "note", data: { text: "x".repeat(60) } }));
  const lines = [{ id: 1, kind: "session", data: { cwd: "/lab/big", adapters: [], model: "m" } }, { id: 2, kind: "user", data: { text: "Count the cells" } }].map((l) => JSON.stringify(l));
  writeFileSync(join(dir, "log.jsonl"), [...lines, ...filler, JSON.stringify({ id: 99, kind: "assistant", data: { text: "Done.", final: true } })].join("\n") + "\n");
  const before = { ...logLimits };
  try {
    logLimits.read = 1000;
    logLimits.edge = 400;
    expect(scanLog(join(dir, "log.jsonl"))).toMatchObject({ partial: true, status: "log too large to read", first: { data: { cwd: "/lab/big" } }, ask: { data: { text: "Count the cells" } } });
    const list = listSessions(h);
    expect(list.map((x) => x.id)).toEqual(["20261009-100000-dddd"]);
    expect(list[0]).toMatchObject({ cwd: "/lab/big", ask: "Count the cells", status: "log too large to read" });
    logLimits.read = before.read;
    const whole = scanLog(join(dir, "log.jsonl"));
    expect(whole.status).toBe("answered");
    expect(whole.partial).toBeUndefined();
  } finally {
    Object.assign(logLimits, before);
  }
});
