import { afterEach, describe, expect, test, vi } from "vitest";
import { runTui } from "../src/tui/app.tsx";
import { keyStream } from "../src/tui/key-stream.ts";
import { makeHarness, sleep, until, type Harness } from "../src/tui/testing.ts";
import { FakeSession } from "../src/ui/fake-session.ts";
import { Rng, runs } from "./fuzz-rng.ts";

interface Rig {
  h: Harness;
  s: FakeSession;
  done: Promise<void>;
  calls: Record<"permission" | "answer" | "followDone" | "close" | "send", ReturnType<typeof vi.spyOn>>;
  write(data: string): Promise<void>;
  input(): string;
}

let rig: Rig | undefined;

function boot(o: { mode?: "follow"; wrap?: boolean; delayMs?: number } = {}): Rig {
  const h = makeHarness();
  const s = new FakeSession({ delayMs: o.delayMs ?? 0, mode: o.mode });
  const calls = {
    permission: vi.spyOn(s, "respondPermission"),
    answer: vi.spyOn(s, "answer"),
    followDone: vi.spyOn(s, "followDone"),
    close: vi.spyOn(s, "close"),
    send: vi.spyOn(s, "send"),
  };
  const stdin = o.wrap ? keyStream(h.stdin as never, undefined, 20, 150) : h.stdin;
  const done = runTui(s, { stdin, stdout: h.stdout, autoSetup: false, env: {} });
  rig = {
    h,
    s,
    done,
    calls,
    write: async (data) => {
      h.stdin.write(data);
      await sleep(30);
    },
    input: () => {
      const rows = h.last().split("\n");
      const top = rows.findIndex((l) => l.startsWith("│ > "));
      if (top < 0) return "";
      const end = rows.findIndex((l, i) => i > top && l.startsWith("╰"));
      return rows
        .slice(top, end < 0 ? rows.length : end)
        .filter((l) => !/^│\s+\d+ more lines?\s*│$/.test(l))
        .map((l) => l.slice(4).replace(/\s*│$/, ""))
        .join("\n");
    },
  };
  return rig;
}

afterEach(async () => {
  if (!rig) return;
  const { h, done } = rig;
  rig = undefined;
  h.stdin.write("\x03");
  await sleep(10);
  h.stdin.write("\x03");
  await Promise.race([done, sleep(500)]);
});

const shows = (r: Rig, text: string) => until(() => r.h.last().includes(text), 3000);

async function reach(r: Rig, state: string) {
  await sleep(120);
  if (state === "idle") return;
  await r.write("go\r");
  if (state === "working") return;
  await shows(r, "Permission needed");
  if (state === "permission") return;
  await r.write("y");
  await shows(r, "Which AUC cutoff");
  if (state === "question") return;
  await r.write("1");
  await shows(r, "Do this step in");
}

const STATES = ["idle", "working", "permission", "question", "instruction"];
const boots = (state: string) => boot({ mode: state === "instruction" ? "follow" : undefined, delayMs: state === "working" ? 400 : 0 });

describe("fuzz: terminal input in the app", () => {
  test("lines that arrive in one write are separate messages, and no text joins them", async () => {
    const r = boot();
    await sleep(120);
    await r.write("first\rsecond\rthird\r");
    await until(() => r.s.record.entries(["user"]).length === 3, 3000);
    expect(r.s.record.entries(["user"]).map((e) => e.data.text)).toEqual(["first", "second", "third"]);
  });

  test("a command and the text after it in one write: the text stays in the box", async () => {
    const r = boot();
    await sleep(120);
    await r.write("/mode follow\r/mode watch\rtail");
    expect(r.input()).toBe("tail");
    expect(r.s.mode).toBe("watch");
    await r.write("\x1b[A");
    expect(r.input()).toBe("/mode watch");
  });

  test.each(STATES)("Ctrl+C in the %s state quits once, even if pressed many times", async (state) => {
    const r = boots(state);
    await reach(r, state);
    await r.write("\x03");
    expect(r.h.last()).toContain("Press Ctrl+C again to quit.");
    for (let i = 0; i < 4; i++) r.h.stdin.write("\x03");
    await Promise.race([r.done, sleep(1500)]);
    expect(r.calls.close).toHaveBeenCalledTimes(1);
    await r.done;
  });

  test("Ctrl+C quits while a paste has no end mark", async () => {
    const r = boot({ wrap: true });
    await sleep(120);
    await r.write("\x1b[200~half a paste");
    await r.write("\x03");
    await r.write("\x03");
    await Promise.race([r.done, sleep(1500)]);
    expect(r.calls.close).toHaveBeenCalledTimes(1);
    await r.done;
  });

  test("a session that cannot close does not stop the app from quitting", async () => {
    const r = boot();
    r.calls.close.mockRejectedValue(new Error("disk full"));
    const err = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    await sleep(120);
    await r.write("\x03");
    await r.write("\x03");
    await Promise.race([r.done, sleep(1500)]);
    await r.done;
    await sleep(30);
    expect(err.mock.calls.join("")).toContain("disk full");
    err.mockRestore();
  });

  test.each(STATES)("Ctrl+D in the %s state answers nothing and keeps the app open", async (state) => {
    const r = boots(state);
    await reach(r, state);
    const sent = r.calls.send.mock.calls.length;
    const before = r.h.last();
    for (let i = 0; i < 3; i++) await r.write("\x04");
    expect(r.calls.close).not.toHaveBeenCalled();
    expect(r.calls.send.mock.calls.length).toBe(sent);
    expect(r.calls.permission).toHaveBeenCalledTimes(state === "question" || state === "instruction" ? 1 : 0);
    expect(r.calls.answer).toHaveBeenCalledTimes(state === "instruction" ? 1 : 0);
    expect(r.calls.followDone).not.toHaveBeenCalled();
    const card = /Permission needed|Which AUC cutoff|Do this step in/.exec(before)?.[0];
    if (card) expect(r.h.last()).toContain(card);
  });

  test.each([
    ["permission", "y"],
    ["question", "1"],
    ["instruction", "\r"],
  ])("a paste of %s-card keys does not answer the card", async (state, text) => {
    const r = boots(state);
    await reach(r, state);
    const title = { permission: "Permission needed", question: "Which AUC cutoff", instruction: "Do this step in" }[state]!;
    await r.write(`\x1b[200~${text}\x1b[201~`);
    expect(r.calls.permission).toHaveBeenCalledTimes(state === "permission" ? 0 : 1);
    expect(r.calls.answer).toHaveBeenCalledTimes(state === "instruction" ? 1 : 0);
    expect(r.calls.followDone).not.toHaveBeenCalled();
    expect(r.h.last()).toContain(title);
    await r.write(text);
    await until(() => (state === "permission" ? r.calls.permission.mock.calls.length === 1 : state === "question" ? r.calls.answer.mock.calls.length === 1 : r.calls.followDone.mock.calls.length === 1), 3000);
  });

  test.each([
    ["permission", ["y", "n", "a", "c", "\x1b[A", "\x1b[B", "\x1b", "\r"]],
    ["question", ["1", "2", "\r", "\x1b[A", "\x1b[B", "o", "\x1b[Z", "\x1b[D"]],
    ["instruction", ["\r", "s", "\x1b[A", "\x1b[B", "\x1b"]],
  ] as [string, string[]][])("%s card: keys that arrive together answer once", async (state, tokens) => {
    const r = boots(state);
    await reach(r, state);
    const rng = new Rng(33001 + state.length);
    for (let i = 0; i < runs(6); i++) {
      const chunk = Array.from({ length: rng.int(2, 4) }, () => rng.pick(tokens)).join("");
      await r.write(chunk);
    }
    const calls = state === "permission" ? r.calls.permission : state === "question" ? r.calls.answer : r.calls.followDone;
    const ids = (calls.mock.calls as unknown[][]).map((c) => c[0]);
    expect(new Set(ids).size, `answers for ${JSON.stringify(ids)}`).toBe(ids.length);
  });

  test("a y, an arrow and a y in one write allow the permission once", async () => {
    const r = boot();
    await reach(r, "permission");
    await r.write("y\x1b[Ay");
    expect(r.calls.permission).toHaveBeenCalledTimes(1);
    await shows(r, "Which AUC cutoff");
    expect(r.calls.answer).not.toHaveBeenCalled();
  });

  test("mouse reports at a card do not answer it", async () => {
    const r = boot({ wrap: true });
    await reach(r, "permission");
    await r.write("\x1b[<0;89;5M\x1b[<0;89;5m\x1b[M y%\x1b[<64;1;1M");
    expect(r.calls.permission).not.toHaveBeenCalled();
    expect(r.h.last()).toContain("Permission needed");
  });

  test("a mouse report in the input box adds no text", async () => {
    const r = boot({ wrap: true });
    await sleep(120);
    await r.write("ab\x1b[M y%\x1b[<0;10;5Mcd");
    expect(r.input()).toBe("abcd");
  });

  test("Up and Down go through past messages and bring back the line that was being typed", async () => {
    const r = boot();
    await sleep(120);
    await r.write("/mode watch\r");
    await r.write("/mode follow\r");
    await r.write("dra");
    await r.write("\x1b[A");
    expect(r.input()).toBe("/mode follow");
    await r.write("\x1b[A");
    expect(r.input()).toBe("/mode watch");
    await r.write("\x1b[A");
    expect(r.input()).toBe("/mode watch");
    await r.write("\x1b[B");
    expect(r.input()).toBe("/mode follow");
    await r.write("!");
    expect(r.input()).toBe("/mode follow!");
    await r.write("\x1b[B");
    expect(r.input()).toBe("dra");
    await r.write("\x1b[B");
    expect(r.input()).toBe("dra");
    await r.write("n");
    expect(r.input()).toBe("dran");
  });

  test("the cursor is at the end after a paste with line breaks, and typing continues there", async () => {
    const r = boot();
    await sleep(120);
    await r.write("\x1b[200~one\ntwo\r\nthree\x1b[201~");
    await r.write("!");
    expect(r.input()).toBe("one\ntwo\nthree!");
    await r.write("\x1b[A");
    await r.write("<");
    expect(r.input()).toBe("one\ntwo<\nthree!");
  });

  test("a resize while a card is open keeps the card and the answer works", async () => {
    const r = boot();
    await reach(r, "question");
    for (const [c, rows] of [[40, 12], [20, 6], [120, 40], [12, 3], [80, 24]] as const) {
      r.h.resize(c, rows);
      await sleep(180);
      expect(r.h.last().split("\n").length).toBeLessThanOrEqual(rows);
    }
    await shows(r, "Which AUC cutoff");
    await r.write("2");
    await until(() => r.calls.answer.mock.calls.length === 1, 3000);
    expect(r.calls.answer.mock.calls[0]![1]).toBe(0.8);
  });

  test("random bytes, partial escape sequences and open pastes never stick the app", async () => {
    const r = boot({ wrap: true });
    await sleep(120);
    const rng = new Rng(33002);
    const TOKENS = ["a", "word ", "é", "日本", "😀", "\ud83d", "\x1b", "\x1b[", "\x1b[1;", "\x1b[200~", "\x1b[201~", "\x1b[M", "\x1b[<0;1;1M", "\x7f", "\x1b\x7f", "\x1b[A", "\x1b[B", "\x1b[D", "\x1b[C", "\x01", "\x05", "\x0b", "\x15", "\x17", "\x19", "\x1a", "\x04", "\t", "\x1b[Z", "\x00", "\x1b[13;2u", "\x1b[99;5u".replace("99", "120")];
    for (let i = 0; i < runs(60); i++) {
      r.h.stdin.write(Array.from({ length: rng.int(1, 4) }, () => rng.pick(TOKENS)).join(""));
      if (rng.bool(0.3)) await sleep(rng.int(1, 30));
    }
    await sleep(400);
    const text = r.input();
    expect(text).not.toMatch(/[\x00-\x08\x0b-\x1f\x7f]|[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/);
    expect(r.calls.send).not.toHaveBeenCalled();
    r.h.stdin.write("\x03");
    await sleep(10);
    r.h.stdin.write("\x03");
    await Promise.race([r.done, sleep(1500)]);
    expect(r.calls.close).toHaveBeenCalledTimes(1);
    await r.done;
  });

  test("a paste of 1 MB shows the end of the text, and the next key goes in at once", async () => {
    const r = boot({ wrap: true });
    await sleep(120);
    const line = "αβγ δεζ 0123456789 abc\n";
    const body = line.repeat(Math.ceil(1_000_000 / line.length));
    r.h.stdin.write("\x1b[200~");
    for (let at = 0; at < body.length; at += 65536) {
      r.h.stdin.write(body.slice(at, at + 65536));
      await sleep(0);
    }
    r.h.stdin.write("\x1b[201~");
    await until(() => /\d+ more lines/.test(r.h.last()), 3000);
    await r.write("z");
    expect(r.input()).toContain("z");
    expect(r.calls.send).not.toHaveBeenCalled();
  });
});
