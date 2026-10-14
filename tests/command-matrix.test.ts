import { appendFileSync, chmodSync, mkdtempSync } from "node:fs";
import { createServer, type Server } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { Session } from "../src/core/session.ts";
import { claudeWorkspace, saveElabftw } from "../src/core/credentials.ts";
import { checkText } from "../src/core/ste.ts";
import { FakeProvider } from "../src/providers/fake.ts";
import { WebView } from "../src/server/app-view.ts";
import { FakeSession } from "../src/ui/fake-session.ts";
import { commands, failureText, parseCommand, unknownCommand, type CommandCtx } from "../src/ui/commands.ts";
import { Mapper } from "../src/ui/items.ts";
import { CARDS, COMMANDS } from "../src/ui/parity.ts";
import type { Card } from "../src/ui/cards.ts";
import type { SessionLike } from "../src/ui/types.ts";
import { runTui } from "../src/tui/app.tsx";
import { makeHarness, sleep, until } from "../src/tui/testing.ts";

const LAB = join(__dirname, "fixtures/lab");
const WAIT = 15000;
const saved: Record<string, string | undefined> = {};

beforeAll(() => {
  const home = mkdtempSync(join(tmpdir(), "cuvette-matrix-home-"));
  for (const k of ["CUVETTE_HOME", "HOME", "USERPROFILE", "CUVETTE_NO_OPEN"]) saved[k] = process.env[k];
  Object.assign(process.env, { CUVETTE_HOME: home, HOME: home, USERPROFILE: home, CUVETTE_NO_OPEN: "1" });
});
afterAll(() => {
  for (const [k, v] of Object.entries(saved)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
});

type Out = { kind: "print" | "notice" | "error" | "card" | "refresh" | "clear" | "quit" | "start"; text: string };

interface Ran {
  out: Out[];
  threw?: string;
  cards: Card[];
}

function context(s: SessionLike, out: Out[], cards: Card[]): CommandCtx {
  const add = (kind: Out["kind"], text = "") => void out.push({ kind, text });
  return {
    session: s,
    print: (text, title) => add("print", `${title ?? ""}\n${text}`),
    notice: (text) => add("notice", text),
    error: (text) => add("error", text),
    openCard: (c) => {
      cards.push(c);
      add("card", c.t);
    },
    hasQuestionCard: (qid) => cards.some((c) => c.t === "question" && c.q.qid === qid),
    refresh: () => add("refresh"),
    clear: () => add("clear"),
    quit: () => add("quit"),
    outputs: () => [],
    toggleDetails: () => false,
    startWindow: async () => "http://127.0.0.1:1/graph/",
    startPanel: async () => ({ url: "http://127.0.0.1:1/graph/panel", opened: [], failed: [] }),
    startApp: async () => "http://127.0.0.1:1/",
  };
}

async function run(s: SessionLike, line: string, cards: Card[] = []): Promise<Ran> {
  const out: Out[] = [];
  const { head, args } = parseCommand(line);
  const cmd = commands.find((c) => c.name === head);
  if (!cmd) return { out: [{ kind: "error", text: unknownCommand(head) }], cards };
  let threw: string | undefined;
  const timer = new Promise<never>((_, reject) => setTimeout(() => reject(new Error("the command did not finish")), WAIT * 2));
  try {
    await Promise.race([cmd.run(args, context(s, out, cards)), timer]);
  } catch (e) {
    threw = (e as Error).message;
  }
  return { out, threw, cards };
}

const texts = (r: Ran, kinds: Out["kind"][]) => r.out.filter((o) => kinds.includes(o.kind)).map((o) => o.text);
const all = (r: Ran) => r.out.map((o) => o.text).join("\n");
const idle = (s: SessionLike) => until(() => !s.busy, WAIT);

class Gated extends FakeProvider {
  open!: () => void;
  private wait = new Promise<void>((r) => (this.open = r));
  async step(req: Parameters<FakeProvider["step"]>[0]) {
    await this.wait;
    return super.step(req);
  }
}

const count = (method: string) => ({ calls: [{ name: "count", args: { input: "/data/a.tif", method, min_size: 5 } }] });
const open: Session[] = [];
const gates: Gated[] = [];

async function make(script: ConstructorParameters<typeof FakeProvider>[0], mode?: "watch" | "follow" | "teach" | "plan", provider: FakeProvider = new FakeProvider(script)): Promise<Session> {
  const s = await Session.create({ adapters: [LAB], provider, cwd: mkdtempSync(join(tmpdir(), "cuvette-proj-")) });
  open.push(s);
  s.decisions.applySetup({ question: "How many particles?", method: "Otsu" });
  if (mode) s.setMode(mode);
  return s;
}

async function twoTurns(): Promise<Session> {
  const s = await make([count("Otsu"), { text: "The count with Otsu is done." }, count("Triangle"), { text: "The count with Triangle is done." }]);
  await s.send("Count the particles in a.tif");
  s.setDecision("method", "Triangle", "try another method");
  await s.send("Count them again with Triangle");
  return s;
}

const STATES: Record<string, () => Promise<{ s: Session; cards?: Card[] }>> = {
  "no activity": async () => ({ s: await make([{ text: "ok" }]) }),
  "after a step": async () => {
    const s = await make([count("Otsu"), { text: "Done." }]);
    await s.send("Count a.tif");
    return { s };
  },
  "after a failed step": async () => {
    const s = await make([{ calls: [{ name: "count", args: { input: 5, method: 7 } }] }, { text: "The step failed." }]);
    await s.send("Count a.tif");
    return { s };
  },
  "after a rewind": async () => {
    const s = await twoTurns();
    s.rewind(2);
    return { s };
  },
  "after a branch": async () => {
    const s = await twoTurns();
    s.branch("other method");
    return { s };
  },
  "while a turn runs": async () => {
    const g = new Gated([count("Otsu"), { text: "Done." }]);
    gates.push(g);
    const s = await make([], undefined, g);
    void s.send("Count a.tif").catch(() => {});
    await until(() => s.busy, WAIT);
    return { s };
  },
  "with an open question card": async () => {
    const s = await make([{ text: "ok" }]);
    const q = await s.questions.ask({ decisionKey: "min_size", title: "Smallest particle?", text: "Pick one.", options: [{ value: 2, label: "2" }, { value: 3, label: "3" }], evidence: "" });
    return { s, cards: [{ t: "question", q }, { t: "config" }] };
  },
  "with a damaged record entry": async () => {
    const s = await make([count("Otsu"), { text: "Done." }]);
    await s.send("Count a.tif");
    const dir = s.place.outDir;
    await s.close();
    appendFileSync(join(dir, ".record", "log.jsonl"), ['not json', '{"id":98,"kind":"step","data":null}', '{"id":99,"kind":"setup","data":{}}', '{"id":100,"kind":"decision","data":{"key":5}}', '{"id":101,"kind":"usage","data":{}}', '{"id":102,"kind":"tool_result","data":{}}', '{"id":103,"kind":"node","data":{"id":"n9","parents":[],"outputs":[]}}', ""].join("\n"));
    const back = await Session.resume(dir, { provider: new FakeProvider([{ text: "ok" }]) });
    open.push(back);
    return { s: back };
  },
  "in a read-only project folder": async () => {
    const cwd = mkdtempSync(join(tmpdir(), "cuvette-readonly-"));
    chmodSync(cwd, 0o555);
    const s = await Session.create({ adapters: [LAB], provider: new FakeProvider([count("Otsu"), { text: "Done." }]), cwd });
    open.push(s);
    s.decisions.applySetup({ question: "How many particles?", method: "Otsu" });
    await s.send("Count a.tif");
    return { s };
  },
  "in watch mode": async () => ({ s: await make([{ text: "ok" }], "watch") }),
  "in follow mode": async () => ({ s: await make([{ text: "ok" }], "follow") }),
  "in teach mode": async () => ({ s: await make([{ text: "ok" }], "teach") }),
  "in plan mode": async () => ({ s: await make([{ text: "ok" }], "plan") }),
};

const ARGS: [string, (name: string) => string][] = [
  ["none", (n) => `/${n}`],
  ["a wrong word", (n) => `/${n} zzz`],
  ["a number out of range", (n) => `/${n} 999`],
  ["a very long string", (n) => `/${n} ${"x".repeat(3000)}`],
  ["quotes, a slash, Unicode and a newline", (n) => `/${n} "q" /s é日本\nline2`],
  ["two arguments", (n) => `/${n} one two`],
  ["a name that does not exist", (n) => `/${n} nonexistent-name`],
];

const RAW = /\bat [\w$.<>]+ \(|\.tsx?:\d+|node_modules|\bE(?:ACCES|NOENT|PERM|ROFS|EXIST|NOSPC|ISDIR|NOTDIR)\b|\[object |\bundefined\b|\bNaN\b|\b(?:Type|Reference|Syntax|Range)Error\b|Cannot read propert|is not a function|is not iterable|Unexpected token|fetch failed/;
const TURN_STARTERS = new Set(["plan", "proposal", "rerun"]);
const SKIP = new Set(["quit"]);
const SLOW = new Set(["databook"]);

afterAll(async () => {
  for (const g of gates) g.open();
  for (const s of open.splice(0)) await s.close().catch(() => {});
});

describe("every command in every state, with every kind of argument", () => {
  for (const [state, build] of Object.entries(STATES)) {
    test(`${state}: no crash, no raw error, a next step in the text, and the STE rules`, async () => {
      const { s, cards: shown } = await build();
      const cards: Card[] = shown ? [...shown] : [];
      const problems: string[] = [];
      for (const name of COMMANDS) {
        if (SKIP.has(name)) continue;
        for (const [label, line] of ARGS) {
          if (SLOW.has(name) && !["no activity", "after a step"].includes(state) && label === "none") continue;
          const users = s.record.entries(["user"]).length;
          const r = await run(s as unknown as SessionLike, line(name), cards);
          const at = `${state} · ${label} · /${name}`;
          if (r.threw) problems.push(`${at}: threw "${r.threw}"`);
          let started = s.record.entries(["user"]).length > users;
          if (!r.out.length && TURN_STARTERS.has(name)) started = await until(() => s.record.entries(["user"]).length > users, WAIT).then(() => true, () => false);
          if (!r.out.length && !started) problems.push(`${at}: no output`);
          for (const o of r.out) {
            if (RAW.test(o.text)) problems.push(`${at}: raw text "${o.text.slice(0, 120)}"`);
            if ((o.kind === "notice" || o.kind === "error") && o.text.length > 600) problems.push(`${at}: ${o.text.length} characters in one line`);
            if (o.kind === "notice" || o.kind === "error") {
              const found = checkText(o.text.replace(/\S*[\\/]\S*\.\w+/g, "X")).filter((i) => i.rule !== "passive");
              if (found.length) problems.push(`${at}: ${found[0]!.message} in "${o.text.slice(0, 100)}"`);
            }
          }
          for (const c of r.cards) if (!CARDS.includes(c.t)) problems.push(`${at}: card type ${c.t} is not in CARDS`);
          if (TURN_STARTERS.has(name) && started) await idle(s as unknown as SessionLike).catch(() => problems.push(`${at}: the turn did not end`));
        }
      }
      const questions = cards.filter((c) => c.t === "question").map((c) => (c as Extract<Card, { t: "question" }>).q.qid);
      if (new Set(questions).size !== questions.length) problems.push(`${state}: a question card opened twice`);
      expect(problems).toEqual([]);
    }, 120000);
  }
});

describe("the text of the commands", () => {
  test("/help lists exactly the commands that exist, and each help text follows the STE rules", async () => {
    const s = new FakeSession();
    const r = await run(s as unknown as SessionLike, "/help");
    const listed = [...all(r).matchAll(/^\/([a-z-]+)/gm)].map((m) => m[1]);
    expect(listed.sort()).toEqual([...COMMANDS].sort());
    for (const c of commands) {
      expect(checkText(c.help).map((i) => i.message), `/${c.name}`).toEqual([]);
      expect(c.help.endsWith("."), `/${c.name}`).toBe(true);
    }
  });

  test("a command name does not depend on capital letters, and the web view and the terminal agree", async () => {
    expect(parseCommand("/HELP")).toEqual({ head: "help", args: [] });
    expect(parseCommand("/Mode  Teach\nnow")).toEqual({ head: "mode", args: ["Teach", "now"] });
    expect(unknownCommand("")).toBe("Type a command name after the slash. Type /help to see the list.");
    expect(unknownCommand("x".repeat(100)).length).toBeLessThan(70);

    const web = new FakeSession({ delayMs: 0 });
    const view = new WebView(web, { token: "t", env: {}, url: (p) => `http://127.0.0.1:1/${p}`, quit: async () => {} });
    await view.runCommand("/HELP");
    await view.runCommand("/ ");
    expect(view.recordHtml()).toContain("What it does");
    expect(view.recordHtml()).toContain("Type a command name after the slash.");
    view.close();

    const h = makeHarness();
    const done = runTui(new FakeSession({ delayMs: 0 }), { stdin: h.stdin, stdout: h.stdout, autoSetup: false, env: {} });
    await until(() => h.all().includes("Type /help for commands."));
    h.type("/Help");
    await until(() => h.last().includes("/Help"));
    h.type("\r");
    await until(() => h.all().includes("What it does"));
    h.type("/ ");
    await until(() => /\/ ?$/m.test(h.last().trimEnd()) || h.last().includes("/ "));
    h.type("\r");
    await until(() => h.all().includes("Type a command name after the slash."));
    h.type("\x03\x03");
    await done;
  }, 30000);

  test("a program error shows the short original message and the full error is in the record, in the web view and in the terminal", async () => {
    const TEXT = "Cannot read properties of undefined (reading 'x')";
    const s0 = new FakeSession({ delayMs: 0 });
    const text = failureText("status", new TypeError(TEXT), s0);
    expect(text).toBe(`/status failed. Cuvette hit a program error: TypeError: ${TEXT}. The full error is in the session record. Type /export jsonl to save a copy of the record, then report the problem.`);
    const kept = s0.record.entries(["error"]).at(-1)!.data;
    expect(kept).toMatchObject({ command: "status", name: "TypeError", message: TEXT });
    expect(String(kept.stack)).toContain("TypeError");
    expect(failureText("status", new TypeError("y".repeat(500))).length).toBeLessThan(420);
    expect(failureText("status", new Error("The disk is busy."), s0)).toBe("/status failed: The disk is busy.");
    expect(s0.record.entries(["error"])).toHaveLength(1);

    const web = new FakeSession({ delayMs: 0 });
    const view = new WebView(web, { token: "t", env: {}, url: (p) => `http://127.0.0.1:1/${p}`, quit: async () => {} });
    Object.defineProperty(web, "model", { get: () => { throw new TypeError(TEXT); } });
    await view.runCommand("/model");
    expect(view.recordHtml()).toContain("Cuvette hit a program error: TypeError: Cannot read properties of undefined");
    expect(view.recordHtml()).not.toContain("at Object");
    expect(web.record.entries(["error"]).at(-1)!.data).toMatchObject({ command: "model", message: TEXT });
    view.close();

    const tui = new FakeSession({ delayMs: 0 });
    const h = makeHarness();
    const done = runTui(tui, { stdin: h.stdin, stdout: h.stdout, autoSetup: false, env: {} });
    await until(() => h.all().includes("Type /help for commands."));
    tui.questions.open = () => { throw new TypeError(TEXT); };
    h.type("/questions");
    await until(() => h.last().includes("/questions"));
    h.type("\r");
    await until(() => h.all().includes("Cuvette hit a program error: TypeError: Cannot read properties"));
    expect(tui.record.entries(["error"]).at(-1)!.data).toMatchObject({ command: "questions", name: "TypeError", message: TEXT });
    h.type("\x03\x03");
    await done;
  }, 30000);

  test("the read-only commands give the same text in the web view and in the command code", async () => {
    const s = await make([count("Otsu"), { text: "Done." }]);
    await s.send("Count a.tif");
    const view = new WebView(s as unknown as SessionLike, { token: "t", env: {}, url: (p) => `http://127.0.0.1:1/${p}`, quit: async () => {} });
    const plain = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&").replace(/\s+/g, " ");
    for (const name of ["status", "graph", "trail", "tests", "power", "findings", "decisions", "model", "adapters", "skills", "lab", "branches", "method", "pilot", "plan", "samples", "cite", "usage"]) {
      const r = await run(s as unknown as SessionLike, `/${name}`);
      await view.runCommand(`/${name}`);
      const html = plain(view.recordHtml());
      for (const o of r.out) {
        const first = o.text.split("\n").find((l) => l.trim().length > 6 && !/^[-\s]+$/.test(l));
        if (first) expect(html, `/${name}`).toContain(first.replace(/\s+/g, " ").trim());
      }
    }
    view.close();
  }, 60000);
});

describe("a command that cannot run now says so and changes nothing", () => {
  test("while a turn runs", async () => {
    const { s } = await STATES["while a turn runs"]!();
    const me = s as unknown as SessionLike;
    const before = () => JSON.stringify([s.record.entries().length, s.mode, s.permissionMode, s.decisions.values()]);
    const start = before();
    for (const [line, said] of [["/plan check the data", /busy/], ["/compact", /busy/], ["/rewind", /busy/], ["/rewind 1", /busy/], ["/branch other", /busy/]] as const) {
      const r = await run(me, line);
      expect(all(r), line).toMatch(said);
      expect(texts(r, ["error", "notice"]).length, line).toBeGreaterThan(0);
      expect(before(), line).toBe(start);
    }
  }, 60000);
});

describe("a command that changes state has a second command that undoes it", () => {
  test("mode, permissions, owner, pilot, plan, workspace and trust", async () => {
    const s = await make([{ text: "ok" }]);
    const me = s as unknown as SessionLike;
    const owner = () => s.decisions.owner("method");
    await run(me, "/mode teach");
    expect(s.mode).toBe("teach");
    expect(texts(await run(me, "/mode teach"), ["notice"])).toEqual(["The mode is already teach."]);
    await run(me, "/mode watch");
    expect(s.mode).toBe("watch");

    await run(me, "/permissions bypass");
    expect(s.permissionMode).toBe("bypass");
    await run(me, "/permissions ask");
    expect(s.permissionMode).toBe("ask");

    const first = owner();
    await run(me, "/owner method agent");
    expect(owner()).toBe("agent");
    await run(me, `/owner method ${first}`);
    expect(owner()).toBe(first);

    expect(texts(await run(me, "/pilot on"), ["refresh"]).length).toBe(1);
    await run(me, "/pilot off");
    await run(me, "/plan off");
    expect(s.planFirst).toBe(false);
    await run(me, "/plan on");
    expect(s.planFirst).toBe(true);

    expect(all(await run(me, "/key workspace abc123"))).toContain("Saved the workspace ID abc123");
    expect(all(await run(me, "/key remove"))).toContain("There is no saved key.");
    expect(claudeWorkspace({})).toBe("abc123");
    expect(all(await run(me, "/key workspace"))).toContain("Removed the workspace ID");
    expect(claudeWorkspace({})).toBeUndefined();
    expect(all(await run(me, "/key remove"))).toContain("There is no saved key.");

    await run(me, "/trust once");
    expect(all(await run(me, "/trust off"))).toMatch(/user settings only|not trusted|ignores/i);
  }, 60000);

  test("/change sets a value and /change with the old value sets it back; a fixed decision says why it stays", async () => {
    const s = await make([count("Otsu"), { text: "Done." }]);
    const me = s as unknown as SessionLike;
    await s.send("Count a.tif");
    expect(all(await run(me, "/change method Triangle"))).toContain("1 step is out of date");
    expect(s.decisions.value("method")).toBe("Triangle");
    expect(all(await run(me, "/status"))).toContain("Out of date");
    await run(me, "/change method Otsu");
    expect(s.decisions.value("method")).toBe("Otsu");
    const bad = await run(me, "/change min_size 1e999");
    expect(bad.threw).toBeUndefined();
    expect(all(bad)).toContain("The value did not change.");
    expect(s.decisions.value("min_size")).toBe(5);
    await run(me, "/owner method fixed");
    const fixed = all(await run(me, "/change method Triangle"));
    expect(fixed).toContain("has the owner fixed");
    expect(fixed).not.toContain("lab profile fixes");
    expect(s.decisions.value("method")).toBe("Otsu");
    await run(me, "/owner method human");
    await run(me, "/change method Triangle");
    expect(s.decisions.value("method")).toBe("Triangle");
  }, 60000);

  test("/rewind and /branch: the second command refuses or makes a different folder, and says what to type", async () => {
    const s = await twoTurns();
    const me = s as unknown as SessionLike;
    const first = all(await run(me, "/rewind 1"));
    expect(first).toContain("Returned to:");
    const again = await run(me, "/rewind 1");
    expect(texts(again, ["error"])[0]).toBe("No point 1. Type /rewind to see the list.");
    expect(all(await run(me, "/rewind"))).toContain("No point to return to yet.");

    const t = await twoTurns();
    const him = t as unknown as SessionLike;
    const a = all(await run(him, "/branch same name"));
    const b = all(await run(him, "/branch same name"));
    expect(a).toContain("The branch same name is in");
    expect(b).toContain("The branch same name is in");
    expect(a.match(/is in (\S+)/)?.[1]).not.toBe(b.match(/is in (\S+)/)?.[1]);
    expect(all(await run(him, "/branch x at 99"))).toContain("Type /rewind");
    const wrong = await run(him, "/branch x at -1");
    expect(texts(wrong, ["error"])[0]).toContain("After at, type the number of a point from /rewind.");
  }, 60000);
});

describe("the text names the problem and the next step", () => {
  test("a number or a word that is not a choice gets an error, not a silent default", async () => {
    const s = await make([count("Otsu"), { text: "Done." }]);
    const me = s as unknown as SessionLike;
    await s.send("Count a.tif");
    for (const line of ["/trail 9", "/trail zzz", "/pilot zzz", "/model gpt"]) {
      const r = await run(me, line);
      expect(texts(r, ["error"]).length, line).toBe(1);
      expect(texts(r, ["print"]), line).toEqual([]);
    }
    expect(all(await run(me, "/model gpt"))).toContain("Type /config");
    expect(all(await run(me, "/trail 3"))).toContain("level 3");
    expect(texts(await run(me, "/program zzz"), ["error"])).toEqual(["No adapter named zzz. Type /programs to see the adapters."]);
    expect(all(await run(me, `/program ${"y".repeat(500)}`)).length).toBeLessThan(120);
    expect(all(await run(me, `/compare ${"z".repeat(500)}`)).length).toBeLessThan(160);
    expect(all(await run(me, `/change ${"k".repeat(500)} 1`)).length).toBeLessThan(120);
  }, 60000);

  test("/answer says which option it saved, and says when the text is not an option", async () => {
    const s = await make([{ text: "ok" }]);
    const me = s as unknown as SessionLike;
    const ask = (key: string) => s.questions.ask({ decisionKey: key, title: "Smallest particle?", text: "Pick one.", options: [{ value: 2, label: "two" }, { value: 3, label: "three" }], evidence: "" });
    const q1 = await ask("");
    expect(texts(await run(me, `/answer ${q1.qid} 2`), ["notice"])).toEqual([`Answered ${q1.qid}: three.`]);
    const q2 = await ask("");
    expect(texts(await run(me, `/answer ${q2.qid} 9`), ["notice"])).toEqual([`Answered ${q2.qid} with your own value: 9. It is not one of the options.`]);
    const q3 = await s.questions.ask({ decisionKey: "", title: "Notes?", text: "Say.", options: [], evidence: "" });
    expect(texts(await run(me, `/answer ${q3.qid} fine`), ["notice"])).toEqual([`Answered ${q3.qid}.`]);
    expect(texts(await run(me, `/answer ${q3.qid} again`), ["error"])[0]).toContain("Type /questions to see the open questions.");
  }, 60000);

  test("/databook names a folder that is read-only and tell what to do", async () => {
    if (process.platform === "win32" || process.getuid?.() === 0) return;
    const { s } = await STATES["after a step"]!();
    const dir = s.place.outDir;
    chmodSync(dir, 0o555);
    try {
      for (const line of ["/databook html", "/databook pdf"]) {
        const r = await run(s as unknown as SessionLike, line);
        const text = all(r);
        expect(text, line).not.toMatch(/EACCES|EPERM/);
        expect(text, line).toContain("read-only");
        expect(text, line).toContain("then type the command again");
      }
    } finally {
      chmodSync(dir, 0o755);
    }
  }, 60000);

  test("/review keeps working when a record entry misses fields", async () => {
    const { s } = await STATES["with a damaged record entry"]!();
    const r = await run(s as unknown as SessionLike, "/review");
    expect(r.threw).toBeUndefined();
    expect(texts(r, ["notice"])[0]).toBe("Reviewing the analysis.");
  }, 60000);

  test("a command that changes state refuses a word it does not use, and changes nothing", async () => {
    const s = await twoTurns();
    const me = s as unknown as SessionLike;
    const before = () => JSON.stringify([s.record.entries().length, s.mode, s.permissionMode, s.decisions.values()]);
    const start = before();
    for (const [line, use] of [
      ["/rewind 1 2", "/rewind [n]"],
      ["/mode teach now", "/mode <watch|follow|teach|plan>"],
      ["/permissions bypass now", "/permissions [bypass|ask]"],
      ["/owner method agent now", "/owner <key> <human|agent|fixed>"],
      ["/decisions agent now", "/decisions [agent|me]"],
      ["/key workspace abc now", "/key [status|remove|workspace <id>|help|open]"],
      ["/pilot on now", "/pilot [on|off]"],
      ["/trust once now", "/trust [on|once|off]"],
    ] as const) {
      const r = await run(me, line);
      expect(texts(r, ["error"]), line).toEqual([`Too many words. Use: ${use}`]);
      expect(before(), line).toBe(start);
    }
    expect(claudeWorkspace({})).toBeUndefined();
  }, 60000);

  test("/open takes only a whole number from the list", async () => {
    const out: Out[] = [];
    const ctx = { ...context(new FakeSession() as unknown as SessionLike, out, []), outputs: () => [{ path: "/tmp/a.png" }, { path: "/tmp/b.png" }] as never };
    const cmd = commands.find((c) => c.name === "open")!;
    for (const n of ["0x1", "1.5", "1e0", "0", "3"]) await cmd.run([n], ctx);
    expect(out.map((o) => o.text)).toEqual(Array(5).fill("Use a number from 1 to 2."));
    for (const n of ["2", "+2", "2.0", "02"]) {
      await cmd.run([n], ctx);
      expect(out.at(-1)).toEqual({ kind: "notice", text: "Opening /tmp/b.png" });
    }
  });

  test("a stale mark with no result in it shows no line", () => {
    const s = new FakeSession();
    const m = new Mapper(s);
    const entry = (nodes: string[]) => ({ id: 50, ts: "", kind: "stale", data: { key: "alpha", reason: "changed by the scientist", nodes } }) as never;
    expect(m.map(entry([]))).toEqual([]);
    expect(m.map(entry(["n1"]))).toHaveLength(1);
  });

  test("/samples reload names the missing file and tells what to do", async () => {
    const s = await make([{ text: "ok" }]);
    const me = s as unknown as SessionLike;
    (s as unknown as { sheet: unknown }).sheet = { rows: [{ sample: "A_01", group: "A", unit: "S1", batch: "", path: "A/S1/A_01.tif" }], from: "the file names" };
    const r = await run(me, "/samples reload");
    expect(texts(r, ["notice"])[0]).toMatch(/is not there\. Type \/samples to see the sheet\. Change one cell to write the file again\.$/);
    expect(texts(r, ["notice"])[0]).not.toContain("ENOENT");
  }, 60000);
});

describe("with no network", () => {
  let server: Server;
  let port = 0;
  beforeAll(async () => {
    server = createServer((req, res) => {
      if (req.url?.startsWith("/html/")) {
        res.setHeader("content-type", "text/html");
        res.end("<html>not eLabFTW</html>");
      } else {
        res.statusCode = 500;
        res.end("boom");
      }
    });
    await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
    port = (server.address() as { port: number }).port;
  });
  afterAll(() => void server.close());

  test("/eln link says that the server is not reachable, or does not answer like eLabFTW, and what to type", async () => {
    const s = await make([{ text: "ok" }]);
    const me = s as unknown as SessionLike;
    expect(texts(await run(me, "/eln push"), ["error"])[0]).toBe("eLabFTW has no saved address or key. Run `cuvette eln setup` or /eln setup.");
    const spare = createServer();
    await new Promise<void>((r) => spare.listen(0, "127.0.0.1", r));
    const closed = (spare.address() as { port: number }).port;
    await new Promise<void>((r) => spare.close(() => r()));
    saveElabftw(`http://127.0.0.1:${closed}`, "1-" + "a".repeat(40));
    const down = texts(await run(me, "/eln link 3"), ["error"])[0]!;
    expect(down).toContain(`Cuvette cannot reach the eLabFTW server http://127.0.0.1:${closed}. The server is not reachable (ECONNREFUSED).`);
    saveElabftw("https://no-such-host.invalid", "1-" + "a".repeat(40));
    expect(texts(await run(me, "/eln link 3"), ["error"])[0]).toMatch(/server https:\/\/no-such-host\.invalid\. The server is not reachable \((ENOTFOUND|EAI_AGAIN)\)\./);
    expect(down).toContain("Type /eln status");
    saveElabftw(`http://127.0.0.1:${port}/html`, "1-" + "a".repeat(40));
    const odd = texts(await run(me, "/eln link 3"), ["error"])[0]!;
    expect(odd).toContain("did not answer like eLabFTW");
    expect(odd).not.toContain("Unexpected token");
    saveElabftw(`http://127.0.0.1:${port}`, "1-" + "a".repeat(40));
    expect(texts(await run(me, "/eln link 3"), ["error"])[0]).toContain("answered 500");
    expect(texts(await run(me, "/eln link 99999999999999999999"), ["error"])[0]).toBe("Use: /eln link <experiment id>");
    expect(texts(await run(me, "/eln remove"), ["notice"])[0]).toContain("Removed");
    expect(texts(await run(me, "/eln remove"), ["notice"])[0]).toBe("There is no saved eLabFTW key.");
  }, 60000);
});
