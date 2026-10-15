import { expect, test } from "vitest";
import type { SessionInfo } from "../src/core/sessions.ts";
import { pickSession } from "../src/tui/picker.tsx";
import { makeHarness, sleep, until } from "../src/tui/testing.ts";

const list: SessionInfo[] = [
  { id: "20261008-100000-bbbb", cwd: "/lab/cells", used: Date.now() - 60000 * 12, ask: "Count the cells" },
  { id: "20261007-100000-cccc", cwd: "/lab/sleep", used: Date.now() - 60000 * 90, ask: "Compare sleep" },
  { id: "20261001-090000-aaaa", cwd: "/lab/sleep", used: Date.now() - 86400000 * 3, ask: "Paired test" },
];

test("arrow keys move the selection and Enter opens the session", async () => {
  const h = makeHarness();
  const done = pickSession(list, 1, "No session was started in /lab/other.", { stdin: h.stdin, stdout: h.stdout });
  await until(() => h.all().includes("Enter opens"));
  expect(h.all()).toContain("▸ 1 h ago · /lab/sleep");
  expect(h.all()).toContain("No session was started in /lab/other.");
  h.type("\x1b[B");
  await sleep(50);
  h.type("\r");
  expect((await done)?.id).toBe("20261001-090000-aaaa");
});

test("Esc opens nothing", async () => {
  const h = makeHarness();
  const done = pickSession(list, 0, undefined, { stdin: h.stdin, stdout: h.stdout });
  await until(() => h.all().includes("Enter opens"));
  h.type("\x1b[A");
  await sleep(50);
  h.type("\x1b");
  expect(await done).toBeUndefined();
});

test("a long folder and a status fit on one line at 80 columns", async () => {
  const h = makeHarness(80, 24);
  const long: SessionInfo[] = [{ id: "20261008-100000-dddd", cwd: "/Users/someone/Code/guided-analysis/projects/a/very/long/folder/name/for/the/data", used: Date.now(), ask: "Count", status: "waiting for you" }];
  const done = pickSession(long, 0, undefined, { stdin: h.stdin, stdout: h.stdout });
  await until(() => h.all().includes("Enter opens"));
  const line = h.term.view().split("\n").find((l) => l.includes("just now"))!;
  expect(line).toContain("waiting for you");
  expect(line.length).toBeLessThanOrEqual(80);
  h.type("\x1b");
  await done;
});

test("a moved session shows how to open it, and Enter does not open it", async () => {
  const h = makeHarness(100, 24);
  const moved: SessionInfo[] = [
    { id: "20261009-100000-bbbb", cwd: "/gone", used: Date.now(), ask: "Newer", moved: true },
    { id: "20261008-100000-aaaa", cwd: "/lab", used: Date.now() - 3600000, ask: "Older" },
  ];
  const done = pickSession(moved, 0, undefined, { stdin: h.stdin, stdout: h.stdout });
  await until(() => h.all().includes("Enter opens"));
  expect(h.all()).toContain("moved: run cuvette open <new folder>");
  h.type("\r");
  await sleep(80);
  h.type("\x1b[B");
  await sleep(50);
  h.type("\r");
  expect((await done)?.id).toBe("20261008-100000-aaaa");
});
