import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, expect, test } from "vitest";
import { Session } from "../src/core/session.ts";
import { rewindPoints } from "../src/core/rewind.ts";
import { trail } from "../src/core/trail.ts";
import { FakeProvider } from "../src/providers/fake.ts";
import { commands, renderGraph, type CommandCtx } from "../src/ui/commands.ts";
import type { Card } from "../src/ui/cards.ts";
import type { SessionLike } from "../src/ui/types.ts";
import { WebView } from "../src/server/app-view.ts";
import { runTui } from "../src/tui/app.tsx";
import { makeHarness, sleep, until } from "../src/tui/testing.ts";

const LAB = join(__dirname, "fixtures/lab");
let session: Session | undefined;
beforeEach(() => {
  process.env.CUVETTE_HOME = mkdtempSync(join(tmpdir(), "cuvette-rewind-"));
});
afterEach(async () => {
  await session?.close();
  session = undefined;
});

async function twoTurns(): Promise<{ s: Session; p: FakeProvider }> {
  const p = new FakeProvider([
    { calls: [{ name: "count", args: { input: "/data/a.tif", method: "Otsu", min_size: 5 } }] },
    { text: "The count with Otsu is done." },
    { calls: [{ name: "count", args: { input: "/data/a.tif", method: "Triangle", min_size: 5 } }] },
    { text: "The count with Triangle is done." },
  ]);
  const s = await Session.create({ adapters: [LAB], provider: p, cwd: mkdtempSync(join(tmpdir(), "cuvette-proj-")) });
  s.decisions.applySetup({ question: "How many particles?", method: "Otsu" });
  await s.send("Count the particles in a.tif");
  s.setDecision("method", "Triangle", "try another method");
  await s.send("Count them again with Triangle");
  return { s, p };
}

function fakeCtx(s: SessionLike, out: { cards: Card[]; text: string[] }): CommandCtx {
  return {
    session: s,
    print: (t) => out.text.push(t),
    notice: (t) => out.text.push(t),
    error: (t) => out.text.push(`ERROR ${t}`),
    openCard: (c) => out.cards.push(c),
    hasQuestionCard: () => false,
    refresh: () => {},
    clear: () => {},
    quit: () => {},
    outputs: () => [],
    toggleDetails: () => false,
    startWindow: async () => "",
    startPanel: async () => ({ url: "", opened: [], failed: [] }),
    startApp: async () => "",
  };
}

test("rewind rebuilds the model history from the record and marks the later results rewound", async () => {
  const { s, p } = await twoTurns();
  session = s;
  const before = readFileSync(s.record.logPath, "utf8");
  const points = rewindPoints(s.record);
  expect(points.map((x) => x.label)).toEqual(["You wrote: Count the particles in a.tif", "You wrote: Count them again with Triangle"]);
  const historyAfterTurn1 = s.record.messages(points[1]!.upTo);

  const r = s.rewind(2);
  expect(r.nodes).toEqual(["n2"]);
  expect(r.text).toBe("Count them again with Triangle");
  expect(readFileSync(s.record.logPath, "utf8").startsWith(before)).toBe(true);
  expect(s.record.entries(["rewind"])[0]!.data).toMatchObject({ upTo: points[1]!.upTo, nodes: ["n2"], point: "You wrote: Count them again with Triangle" });
  expect(s.history).toEqual(historyAfterTurn1);
  expect(s.record.nodes().map((n) => n.id)).toEqual(["n1", "n2"]);
  expect([...s.record.rewound()]).toEqual(["n2"]);
  expect(s.record.numbers().some((x) => x.node === "n2")).toBe(false);
  const view = s.record.liveView();
  expect(view.nodes().map((n) => n.id)).toEqual(["n1"]);
  expect(view.entries(["user"]).map((e) => e.data.text)).toEqual(["Count the particles in a.tif"]);
  expect(s.record.entries(["user"])).toHaveLength(2);
  expect(renderGraph(s as unknown as SessionLike)).toMatch(/Step 2 .*\[rewound\]/);
  expect(trail(s.record).filter((l) => l.badges.includes("rewound")).length).toBeGreaterThan(0);
  expect(rewindPoints(s.record).map((x) => x.n)).toEqual([1]);

  await s.send("Count them with Default");
  const sent = p.requests.at(-1)!.messages.flatMap((m) => m.parts).filter((x) => x.type === "text").map((x) => (x as { text: string }).text).join("\n");
  expect(sent).not.toMatch(/(^|\n)Count them again with Triangle(\n|$)/);
  expect(sent).not.toContain("The count with Triangle is done.");
  expect(sent).toContain("These results are set aside and must not be used: n2");

  const id = s.id;
  const folder = s.place.outDir;
  const history = s.history;
  await s.close();
  session = await Session.resume(folder, { addAdapters: [LAB], provider: new FakeProvider([]) });
  expect(session.id).toBe(id);
  expect(session.history).toEqual(history);
  expect([...session.record.rewound()]).toEqual(["n2"]);
});

test("rewind returns the decisions made after the point to their earlier values and logs the change", async () => {
  const { s } = await twoTurns();
  session = s;
  expect(s.decisions.value("method")).toBe("Triangle");
  const r = s.rewind(1);
  expect(r.nodes).toEqual(["n1", "n2"]);
  expect(r.decisions).toEqual([{ key: "method", from: "Triangle", to: "Otsu" }]);
  expect(s.decisions.value("method")).toBe("Otsu");
  const logged = s.record.entries(["decision"]).at(-1)!.data;
  expect(logged).toMatchObject({ key: "method", old: "Triangle", new: "Otsu", by: "human", rewind: true, reason: "rewind to You wrote: Count the particles in a.tif" });
  expect(s.history).toEqual([]);
  await s.close();
  session = await Session.resume(s.place.outDir, { addAdapters: [LAB], provider: new FakeProvider([]) });
  expect(session.decisions.value("method")).toBe("Otsu");
});

test("/rewind opens the list card in the shared command layer, and /rewind <n> returns to the point", async () => {
  const { s } = await twoTurns();
  session = s;
  const out = { cards: [] as Card[], text: [] as string[] };
  const ctx = fakeCtx(s as unknown as SessionLike, out);
  const rewind = commands.find((c) => c.name === "rewind")!;
  await rewind.run([], ctx);
  expect(out.cards[0]).toMatchObject({ t: "rewind" });
  expect((out.cards[0] as Extract<Card, { t: "rewind" }>).points).toHaveLength(2);
  await rewind.run(["2"], ctx);
  expect(out.text.at(-1)).toMatch(/^Returned to: You wrote: Count them again with Triangle\. One result is marked rewound: step 2\. The files stay in the folder\. Your message was: "Count them again with Triangle"\./);
  await rewind.run(["9"], ctx);
  expect(out.text.at(-1)).toBe("ERROR No point 9. Type /rewind to see the list.");
});

test("the terminal shows the rewind list; Enter returns to the chosen point and puts the message back in the input box", async () => {
  const { s } = await twoTurns();
  session = s;
  const h = makeHarness(110, 40);
  const done = runTui(s as unknown as SessionLike, { stdin: h.stdin, stdout: h.stdout, autoSetup: false, env: {} });
  await until(() => h.all().includes("Type /help"));
  h.type("/rewind");
  await sleep(60);
  h.type("\r");
  await until(() => h.last().includes("Return to an earlier point"));
  expect(h.last()).toContain("2. ");
  expect(h.last()).toContain("You wrote: Count them again with Triangle");
  h.type("\r");
  await until(() => h.all().includes("Returned to: You wrote: Count them again with Triangle."));
  expect(s.record.entries(["rewind"])).toHaveLength(1);
  await until(() => h.last().includes("> Count them again with Triangle"));
  h.type("\x03");
  await sleep(20);
  h.type("\x03");
  await Promise.race([done, sleep(500)]);
});

test("the browser app shows the rewind list as buttons, and a button returns to that point", async () => {
  const { s } = await twoTurns();
  session = s;
  const view = new WebView(s as unknown as SessionLike, { token: "t", env: {}, url: (p) => p, quit: async () => {} });
  await view.runCommand("/rewind");
  const slot = view.slots.find((x) => x.card.t === "rewind")!;
  const html = view.cardsHtml();
  expect(html).toContain("Return to an earlier point");
  expect(html).toContain('data-act="rewind" data-value="1"');
  expect(html).toContain("You wrote: Count the particles in a.tif");
  await view.act(slot.id, { act: "rewind", value: "1" });
  expect(s.record.entries(["rewind"])[0]!.data.point).toBe("You wrote: Count the particles in a.tif");
  expect(view.slots.some((x) => x.card.t === "rewind")).toBe(false);
  expect(view.recordHtml()).toContain("Returned to: You wrote: Count the particles in a.tif.");
  view.close();
});

test("review after a rewind does not check the answer that the rewind set aside", async () => {
  const { s } = await twoTurns();
  session = s;
  const seen: string[] = [];
  const spy = new FakeProvider([]);
  spy.complete = async (_system?: string, text?: string) => {
    seen.push(String(text));
    return "None";
  };
  (s as unknown as { refereeProvider: FakeProvider }).refereeProvider = spy;
  await s.review();
  expect(seen.join("\n")).toContain("The count with Triangle is done.");
  seen.length = 0;
  s.rewind(2);
  await s.review();
  expect(seen.join("\n")).not.toContain("The count with Triangle is done.");
  seen.length = 0;
  s.rewind(1);
  await s.review();
  expect(seen.join("\n")).not.toContain("The count with Otsu is done.");
});
