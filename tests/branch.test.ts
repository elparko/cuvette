import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, beforeEach, expect, test } from "vitest";
import { Session } from "../src/core/session.ts";
import { rewindPoints } from "../src/core/rewind.ts";
import { FakeProvider } from "../src/providers/fake.ts";
import { commands, type CommandCtx } from "../src/ui/commands.ts";
import type { SessionLike } from "../src/ui/types.ts";

const LAB = join(__dirname, "fixtures/lab");
const open: Session[] = [];
beforeEach(() => {
  process.env.CUVETTE_HOME = mkdtempSync(join(tmpdir(), "cuvette-branch-"));
});
afterEach(async () => {
  for (const s of open.splice(0)) await s.close();
});

async function counted(method: string): Promise<Session> {
  const p = new FakeProvider([{ calls: [{ name: "count", args: { input: "/data/a.tif", method, min_size: 5 } }] }, { text: `The count with ${method} is done.` }]);
  const s = await Session.create({ adapters: [LAB], provider: p, cwd: mkdtempSync(join(tmpdir(), "cuvette-proj-")) });
  open.push(s);
  s.decisions.applySetup({ question: "How many particles?", method });
  await s.send("Count the particles in a.tif");
  return s;
}

const logOf = (folder: string) => readFileSync(join(folder, ".record", "log.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l));

function printCtx(s: Session, out: string[]): CommandCtx {
  return { session: s as unknown as SessionLike, print: (t, title) => out.push(`${title}\n${t}`), notice: (t) => out.push(t), error: (t) => out.push(`ERROR ${t}`), openCard: () => {}, hasQuestionCard: () => false, refresh: () => {}, clear: () => {}, quit: () => {}, outputs: () => [], toggleDetails: () => false, startWindow: async () => "", startPanel: async () => ({ url: "", opened: [], failed: [] }), startApp: async () => "" };
}

test("/branch copies the session into a linked folder next to it, and /branches lists both with a result", async () => {
  const s = await counted("Otsu");
  const last = s.record.entries().at(-1)!.id;
  const r = s.branch("triangle method");
  expect(dirname(r.folder)).toBe(dirname(s.place.outDir));
  expect(r.folder).toMatch(/\d{4}-\d{2}-\d{2}-triangle-method$/);
  expect(r.upTo).toBe(last);
  const child = logOf(r.folder);
  expect(child.slice(0, last).map((e) => e.id)).toEqual(s.record.entries().slice(0, last).map((e) => e.id));
  expect(child.at(-1)).toMatchObject({ kind: "fork", session: r.id, data: { parent: { id: s.id }, upTo: last, name: "triangle method" } });
  expect(s.record.entries(["branch"])[0]!.data).toEqual({ child: { id: r.id, folder: r.folder, name: "triangle method" }, upTo: last });
  expect(existsSync(join(r.folder, "README.txt"))).toBe(true);

  const b = await Session.resume(r.folder, { addAdapters: [LAB], provider: new FakeProvider([{ calls: [{ name: "count", args: { input: "/data/a.tif", method: "Triangle", min_size: 5 } }] }, { text: "The count with Triangle is done." }]) });
  open.push(b);
  expect(b.id).toBe(r.id);
  expect(b.history).toEqual(s.history);
  expect(b.record.entries(["fork"])[0]!.data.parent).toEqual({ id: s.id, folder: s.place.outDir, title: s.place.title });
  b.setDecision("method", "Triangle", "try Triangle in the branch");
  await b.send("Count again with Triangle");
  expect(b.branches().map((x) => [x.role, x.name])).toEqual([["this", "triangle method"], ["parent", s.place.title]]);

  const list = s.branches();
  expect(list.map((x) => [x.n, x.role, x.name, x.result])).toEqual([
    [1, "this", s.place.title, "The count with Otsu is done."],
    [2, "branch", "triangle method", "The count with Triangle is done."],
  ]);
  const out: string[] = [];
  await commands.find((c) => c.name === "branches")!.run([], printCtx(s, out));
  expect(out[0]).toContain(" 2. triangle method (branch)\n    The count with Triangle is done.\n    " + r.folder);
});

test("/branch at <n> copies up to a rewind point, and /compare shows the key numbers side by side", async () => {
  const s = await counted("Otsu");
  const point = rewindPoints(s.record)[0]!;
  const early = s.branch("from the start", 1);
  expect(early.upTo).toBe(point.upTo);
  expect(logOf(early.folder).filter((e) => e.kind === "node")).toEqual([]);

  const r = s.branch("triangle");
  const b = await Session.resume(r.folder, { addAdapters: [LAB], provider: new FakeProvider([{ calls: [{ name: "count", args: { input: "/data/a.tif", method: "Triangle", min_size: 5 } }] }, { text: "Done." }]) });
  open.push(b);
  b.setDecision("method", "Triangle", "try Triangle");
  await b.send("Count again with Triangle");

  const cmp = s.compareBranches("this", "triangle");
  const row = (k: string) => cmp.rows.find((x) => x[0] === k);
  expect(row("Decision: method")).toEqual(["Decision: method", "Otsu", "Triangle", "differs"]);
  expect(row("Decision: min_size")).toEqual(["Decision: min_size", "5", "5", ""]);
  expect(row("count: count")![3]).toMatch(/^[+-]\d/);
  const out: string[] = [];
  await commands.find((c) => c.name === "compare")!.run(["3"], printCtx(s, out));
  expect(out[0]).toMatch(/^Compare: .* and triangle\nNumber +.* +triangle +Change/);
  expect(out[0]).toMatch(/Decision: method +Otsu +Triangle +differs/);
  expect(out[0]).toMatch(/\d+ of \d+ rows differ\.$/);
  await commands.find((c) => c.name === "compare")!.run(["nothing"], printCtx(s, out));
  expect(out.at(-1)).toBe("ERROR No branch named nothing. Type /branches to see the list.");
});
