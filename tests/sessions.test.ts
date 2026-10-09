import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "vitest";
import { ageText, defaultSession, listSessions, sessionLine } from "../src/core/sessions.ts";

function home(): string {
  const h = mkdtempSync(join(tmpdir(), "ga-sessions-"));
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
  expect(defaultSession(list, "/lab/sleep")).toMatchObject({ info: { id: "20261007-100000-cccc" }, here: true });
  expect(defaultSession(list, "/lab/other")).toMatchObject({ info: { id: "20261008-100000-bbbb" }, here: false });
  expect(defaultSession([], "/lab")).toBeUndefined();
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

test("ga sessions prints the newest first", () => {
  const r = spawnSync("node", [join(__dirname, "..", "bin/ga.js"), "sessions"], { env: { ...process.env, GA_HOME: home() }, encoding: "utf8" });
  const lines = r.stdout.trim().split("\n").filter((l) => /^\d{8}-/.test(l));
  expect(lines.map((l) => l.slice(0, 20))).toEqual(["20261008-100000-bbbb", "20261007-100000-cccc", "20261001-090000-aaaa"]);
  expect(lines[0]).toContain("12 min ago");
});

test("sessions in project folders come from the home index; a missing folder is moved", () => {
  const h = mkdtempSync(join(tmpdir(), "ga-sessions-index-"));
  const project = mkdtempSync(join(tmpdir(), "ga-sessions-proj-"));
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
  expect(sessionLine(list[1]!)).toContain("moved: run ga open <new folder>");
  expect(defaultSession(list, join(folder, "figures"))?.info.id).toBe("20261008-100000-dddd");
  expect(defaultSession(list, project)).toMatchObject({ here: true, info: { id: "20261008-100000-dddd" } });
});

test("a session shows its title, its sentence and its status", () => {
  const h = mkdtempSync(join(tmpdir(), "ga-sessions-"));
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
