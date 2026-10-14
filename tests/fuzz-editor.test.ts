import stringWidth from "string-width";
import { describe, expect, test } from "vitest";
import { INPUT_KEYS, cleanPaste, emptyEd, layout, press, rowOf, snap, type Ed, type InputKeys, type Stroke } from "../src/tui/editor.ts";
import { Rng, runs } from "./fuzz-rng.ts";

const PIECES = ["a", "b", " ", "é", "é", "日", "本", "😀", "👩‍🔬", "🇩🇪", "👍🏽", "\ud83d", "\ude00", "ạ̈", "µg", "\t", "\r\n", "\n", "\x1b[31m", "​", "\\"];
const KEYS: Stroke[] = [
  ...["left", "right", "up", "down", "home", "end", "backspace", "delete", "enter", "escape"].map((key) => ({ key })),
  { key: "left", alt: true },
  { key: "right", alt: true },
  { key: "backspace", alt: true },
  { key: "delete", alt: true },
  { key: "backspace", cmd: true },
  { key: "enter", shift: true },
  { key: "home", ctrl: true },
  { key: "end", ctrl: true },
  ...["a", "e", "b", "f", "d", "k", "u", "w", "y", "z", "_"].map((text) => ({ key: "char", text, ctrl: true })),
  ...["b", "f", "d", "i", "a", "o", "h", "l", "w", "x", "0", "$", "u", "I", "A", "O", "j", "k"].map((text) => ({ key: "char", text })),
];

const wellFormed = (s: string) => !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/.test(s);
const clusters = (s: string) => new Set([...new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(s)].map((g) => g.index).concat(s.length));

function check(st: Ed, why: unknown) {
  const ctx = JSON.stringify({ text: st.text, cur: st.cur, why });
  expect(st.cur >= 0 && st.cur <= st.text.length, `cursor outside the text ${ctx}`).toBe(true);
  expect(wellFormed(st.text), `lone surrogate ${ctx}`).toBe(true);
  expect(clusters(st.text).has(st.cur), `cursor inside a character ${ctx}`).toBe(true);
  expect(st.undo.length).toBeLessThanOrEqual(100);
}

describe("fuzz: editor", () => {
  test("random keys and text keep the cursor on a character boundary and the text well formed", () => {
    const r = new Rng(31001);
    for (let i = 0; i < runs(300); i++) {
      const style: InputKeys = r.pick(INPUT_KEYS);
      const width = r.int(10, 30);
      let st = emptyEd(r.bool(0.3) ? r.string(PIECES, 0, 12) : "");
      st = { ...st, text: cleanPaste(st.text), cur: 0 };
      const trail: string[] = [];
      for (let n = r.int(5, 60); n > 0; n--) {
        const k: Stroke = r.bool(0.4) ? { key: "text", text: r.string(PIECES, 1, 6) } : r.pick(KEYS);
        trail.push(JSON.stringify(k));
        st = press(st, k, style, width, r.bool(0.1)).st;
        check(st, { style, width, trail });
      }
    }
  });

  test("typing and moving by one character matches a plain model", () => {
    const r = new Rng(31002);
    const seg = (s: string) => [...new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(s)].map((g) => g.index);
    for (let i = 0; i < runs(300); i++) {
      let st = emptyEd();
      let text = "";
      let cur = 0;
      const trail: string[] = [];
      for (let n = r.int(5, 50); n > 0; n--) {
        const op = r.pick(["type", "type", "left", "right", "back", "fwd"] as const);
        trail.push(op);
        if (op === "type") {
          const s = cleanPaste(r.string(PIECES.filter((x) => x !== "\\"), 1, 3));
          st = press(st, { key: "text", text: s }, "emacs", 40).st;
          text = text.slice(0, cur) + s + text.slice(cur);
          cur += s.length;
          cur = [...seg(text), text.length].filter((x) => x <= cur).at(-1)!;
          continue;
        }
        const k: Stroke = op === "left" ? { key: "left" } : op === "right" ? { key: "right" } : op === "back" ? { key: "backspace" } : { key: "delete" };
        st = press(st, k, "emacs", 40).st;
        const starts = [...seg(text), text.length];
        const at = starts.indexOf(cur);
        if (op === "left" && at > 0) cur = starts[at - 1]!;
        else if (op === "right" && at < starts.length - 1) cur = starts[at + 1]!;
        else if (op === "back" && at > 0) (text = text.slice(0, starts[at - 1]) + text.slice(cur)), (cur = starts[at - 1]!);
        else if (op === "fwd" && at < starts.length - 1) text = text.slice(0, cur) + text.slice(starts[at + 1]);
        expect({ text: st.text, cur: st.cur }, JSON.stringify(trail)).toEqual({ text, cur });
      }
    }
  });

  test("the layout covers the text, and each row fits the width", () => {
    const r = new Rng(31003);
    for (let i = 0; i < runs(400); i++) {
      const t = cleanPaste(Array.from({ length: r.int(0, 4) }, () => r.string(PIECES, 0, 40)).join("\n"));
      const w = r.int(10, 40);
      const rows = layout(t, w);
      const why = JSON.stringify({ t, w });
      expect(rows.length, why).toBeGreaterThan(0);
      let prevEnd = 0;
      for (const row of rows) {
        expect(row.start >= prevEnd && row.end >= row.start && row.end <= t.length, why).toBe(true);
        const piece = t.slice(row.start, row.end);
        expect(piece.includes("\n"), why).toBe(false);
        expect(stringWidth(piece.replace(/\t/g, " ")) <= w || [...new Intl.Segmenter().segment(piece)].length === 1, `${why} row ${JSON.stringify(piece)}`).toBe(true);
        expect(wellFormed(piece), why).toBe(true);
        prevEnd = row.end;
      }
      expect(rows.at(-1)!.last, why).toBe(true);
      expect(rows.at(-1)!.end, why).toBe(t.length);
      for (const p of clusters(t)) expect(rowOf(rows, p), `${why} at ${p}`).toBeGreaterThanOrEqual(0);
    }
  });

  test("the cursor snaps to the start of a character", () => {
    const r = new Rng(31004);
    for (let i = 0; i < runs(300); i++) {
      const t = cleanPaste(r.string(PIECES, 0, 30));
      const marks = clusters(t);
      for (let p = 0; p <= t.length; p++) {
        const q = snap(t, p);
        expect(marks.has(q) && q <= p, JSON.stringify({ t, p, q })).toBe(true);
        if (marks.has(p)) expect(q).toBe(p);
      }
    }
  });

  test("a paste of 1 MB inserts once, keeps the cursor at the end, and takes under 1 s", () => {
    const line = "αβγ δεζ 0123456789 abcdefghij\n";
    const big = line.repeat(Math.ceil(1_000_000 / line.length));
    const t0 = performance.now();
    let st = press(emptyEd(), { key: "text", text: big }, "mac", 100).st;
    const rows = layout(st.text, 100);
    const r = rowOf(rows, st.cur);
    expect(performance.now() - t0).toBeLessThan(1000);
    expect(st.text).toBe(big);
    expect(st.cur).toBe(big.length);
    expect(r).toBe(rows.length - 1);
    st = press(st, { key: "left" }, "mac", 100).st;
    expect(st.cur).toBe(big.length - 1);
  });
});
