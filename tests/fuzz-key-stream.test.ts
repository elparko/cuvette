import { PassThrough } from "node:stream";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { keyStream, partialTail } from "../src/tui/key-stream.ts";
import { Rng, runs } from "./fuzz-rng.ts";
import { withinMs } from "./timing.ts";

const ESC_MS = 40;
const PASTE_MS = 500;
const PASTE_END = "\x1b[201~";

function rig() {
  const real = new PassThrough() as unknown as NodeJS.ReadStream & { setRawMode(on: boolean): unknown };
  Object.assign(real, { isTTY: true, setRawMode: () => real, ref: () => real, unref: () => real });
  const out = keyStream(real, undefined, ESC_MS, PASTE_MS) as NodeJS.ReadStream & { setRawMode(on: boolean): void };
  out.setEncoding("utf8");
  out.setRawMode(true);
  const got: string[] = [];
  const drain = () => {
    let c;
    while ((c = out.read()) !== null) got.push(c);
  };
  const feed = (chunk: string) => {
    real.emit("data", chunk);
    drain();
  };
  const wait = (ms: number) => {
    vi.advanceTimersByTime(ms);
    drain();
  };
  return { feed, wait, got, out, real };
}

const PIECES = ["a", "hello", " ", "é", "日本", "😀", "\r", "\x7f", "\x1b[A", "\x1b[1;3D", "\x1b[127;3u", "\x1b[13;2u", "\x1bb", "\x1bOH", "\x1b\x7f", "\x1b[<0;10;5M", "\x1b[<0;10;5m", "\x1b[I", "\x1b[O", "\x1b[?1;2c", "\x03", "\x04"];
const PASTE_BODY = ["line", "\r", "\n", "é", "😀", "日本語", "\x1b[31m", "\x1b", "\x1b[", "\t", "x".repeat(300)];

function script(r: Rng): string {
  let s = "";
  for (let n = r.int(1, 25); n > 0; n--) {
    if (r.bool(0.15)) s += `\x1b[200~${r.string(PASTE_BODY, 0, 15).replaceAll(PASTE_END, "")}${PASTE_END}`;
    else s += r.pick(PIECES);
  }
  return s;
}

function cuts(r: Rng, s: string): string[] {
  const out: string[] = [];
  for (let at = 0; at < s.length; ) {
    const n = r.bool(0.4) ? 1 : r.int(1, 12);
    let end = Math.min(s.length, at + n);
    if (end < s.length && s.charCodeAt(end - 1) >= 0xd800 && s.charCodeAt(end - 1) <= 0xdbff) end++;
    out.push(s.slice(at, end));
    at = end;
  }
  return out;
}

beforeEach(() => void vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] }));
afterEach(() => void vi.useRealTimers());

describe("fuzz: key stream", () => {
  test("any split of the input gives the same bytes, in order, with nothing held back", () => {
    const r = new Rng(32001);
    for (let i = 0; i < runs(400); i++) {
      const s = script(r);
      const { feed, wait, got } = rig();
      const parts = cuts(r, s);
      for (const p of parts) {
        feed(p);
        if (r.bool(0.1)) wait(ESC_MS + 1);
      }
      wait(ESC_MS + 1);
      expect(got.join(""), JSON.stringify(parts)).toBe(s);
    }
  });

  test("an escape sequence that arrives in pieces within the wait leaves as one chunk", () => {
    const r = new Rng(32002);
    const KEYS = ["\x1b[A", "\x1b[1;3D", "\x1b[127;3u", "\x1b[13;2u", "\x1bOH", "\x1b\x7f", "\x1bb", "\x1b[3~"];
    for (let i = 0; i < runs(200); i++) {
      const key = r.pick(KEYS);
      const { feed, wait, got } = rig();
      const parts = cuts(r, key);
      for (const p of parts) {
        feed(p);
        wait(ESC_MS - 5);
      }
      wait(ESC_MS + 1);
      expect(got.filter((x) => x.includes("\x1b")), JSON.stringify(parts)).toEqual([key]);
      expect(got.join("")).toBe(key);
    }
  });

  test("a paste that never ends is closed after the wait, and input after it is not lost", () => {
    const r = new Rng(32003);
    for (let i = 0; i < runs(100); i++) {
      const body = r.string(PASTE_BODY, 0, 20).replaceAll(PASTE_END, "");
      const { feed, wait, got } = rig();
      feed("\x1b[200~");
      for (const p of cuts(r, body)) {
        feed(p);
        wait(r.int(0, PASTE_MS - 50));
      }
      wait(PASTE_MS + 1);
      wait(ESC_MS + 1);
      expect(got.join("").endsWith(PASTE_END), JSON.stringify(body)).toBe(true);
      feed("\x03");
      expect(got.at(-1)).toBe("\x03");
    }
  });

  test("a Ctrl+C chunk during an open paste closes the paste first", () => {
    const { feed, got } = rig();
    feed("\x1b[200~abc");
    feed("\x03");
    expect(got.join("")).toBe(`\x1b[200~abc${PASTE_END}\x03`);
  });

  test("a paste that ends in time gets no extra end mark", () => {
    const { feed, wait, got } = rig();
    feed("\x1b[200~abc");
    wait(PASTE_MS - 10);
    feed("def\x1b[201~");
    wait(PASTE_MS * 3);
    expect(got.join("")).toBe(`\x1b[200~abcdef${PASTE_END}`);
  });

  test("a paste of 1 MB in small chunks arrives whole", () => {
    const body = "αβγ δεζ 0123456789\r\n".repeat(52429);
    const { feed, wait, got } = rig();
    const t0 = performance.now();
    feed("\x1b[200~");
    for (let at = 0; at < body.length; at += 4096) feed(body.slice(at, at + 4096));
    feed(PASTE_END);
    wait(ESC_MS + 1);
    expect(got.join("")).toBe(`\x1b[200~${body}${PASTE_END}`);
    withinMs(performance.now() - t0, 2000);
  });

  test("mouse reports of the old kind never reach the app as text, in any split", () => {
    const r = new Rng(32004);
    for (let i = 0; i < runs(200); i++) {
      const report = `\x1b[M${String.fromCharCode(32 + r.int(0, 3))}${String.fromCharCode(32 + r.int(1, 94))}${String.fromCharCode(32 + r.int(1, 40))}`;
      const before = r.string("abc ", 0, 3);
      const after = r.string("xyz ", 0, 3);
      const { feed, wait, got } = rig();
      for (const p of cuts(r, before + report + after)) feed(p);
      wait(ESC_MS + 1);
      expect(got.join(""), JSON.stringify(report)).toBe(before + after);
    }
  });

  test("a report of the SGR kind passes whole, for the app to drop", () => {
    const { feed, wait, got } = rig();
    feed("\x1b[<0;10;");
    feed("5M");
    wait(ESC_MS + 1);
    expect(got.join("")).toBe("\x1b[<0;10;5M");
  });

  test("random bytes in random chunks never throw and never lose a printable character", () => {
    const r = new Rng(32005);
    for (let i = 0; i < runs(300); i++) {
      const raw = r.bytes(r.int(0, 80)).toString("latin1").replace(/\x1b\[M/g, "").replace(/\x1b\[20[01]~/g, "");
      const { feed, wait, got } = rig();
      for (const p of cuts(r, raw)) feed(p);
      wait(ESC_MS + 1);
      expect(got.join(""), JSON.stringify(raw)).toBe(raw);
    }
  });

  test("partialTail holds only the end of the text, from an escape", () => {
    const r = new Rng(32006);
    for (let i = 0; i < runs(500); i++) {
      const s = r.string(["a", "\x1b", "[", "1", ";", "O", "M", "u", "~", "é"], 0, 12);
      const n = partialTail(s);
      expect(n >= 0 && n <= s.length, JSON.stringify(s)).toBe(true);
      if (n > 0) expect(s.slice(s.length - n).startsWith("\x1b"), JSON.stringify(s)).toBe(true);
    }
  });
});
