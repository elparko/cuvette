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
  expect(sessionLine(a!, now)).toMatch(/^20261008-100000-bbbb {2}12 min ago +\/lab\/cells +Count the cells$/);
  expect(sessionLine(c!, now)).toContain("3 days ago");
  expect(sessionLine(c!, now)).toContain("Compare the sleep of the two drug groups in sleep.csv with…");
  expect(sessionLine(listSessions(home())[1]!, now)).toContain("(no request)");
  expect([ageText(20000), ageText(3 * 3600000), ageText(86400000)]).toEqual(["just now", "3 h ago", "1 day ago"]);
});

test("ga sessions prints the newest first", () => {
  const r = spawnSync("node", [join(__dirname, "..", "bin/ga.js"), "sessions"], { env: { ...process.env, GA_HOME: home() }, encoding: "utf8" });
  const lines = r.stdout.trim().split("\n");
  expect(lines.map((l) => l.slice(0, 20))).toEqual(["20261008-100000-bbbb", "20261007-100000-cccc", "20261001-090000-aaaa"]);
  expect(lines[0]).toContain("12 min ago");
});
