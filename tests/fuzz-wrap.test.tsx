import React from "react";
import { render } from "ink";
import stringWidth from "string-width";
import { describe, expect, test } from "vitest";
import { hangLines, hangWrap, ItemView, type StaticItem } from "../src/tui/view.tsx";
import { tableLines } from "../src/tui/markdown.tsx";
import { InstructionCard, PhiCard } from "../src/tui/cards.tsx";
import { makeHarness, plain, sleep } from "../src/tui/testing.ts";
import { Rng, runs } from "./fuzz-rng.ts";

const PIECES = ["word", "a", "µg/mL", "naïve", "日本語のテキスト", "全角", "🧪", "👩‍🔬", "🇩🇪", "é", "ạ̈", "\t", "  ", " ", "x".repeat(60), "https://example.org/a/very/long/path/that/never/breaks", "\x1b[31mred\x1b[0m", "\x1b[1mbold\x1b[22m", "한국어", "Ünïcödé", "→", "—", "​", "‮RTL‬"];

function text(r: Rng, lines = 3): string {
  return Array.from({ length: r.int(1, lines) }, () => Array.from({ length: r.int(0, 30) }, () => r.pick(PIECES)).join(r.pick([" ", " ", "", "  "]))).join("\n");
}

const ink = (s: string) => s.replace(/\x1b\[[0-9;]*m/g, "");
// Ink drops format characters, such as U+200B and the bidi marks. The check ignores them and the spaces.
const solid = (s: string) => ink(s).normalize("NFC").replace(/[\s\p{Cf}]+/gu, "");
const sorted = (s: string) => [...solid(s)].sort().join("");

function fits(lines: string[], width: number, why: object): void {
  const wide = lines.find((l) => stringWidth(l) > width);
  if (wide !== undefined) expect.fail(`${JSON.stringify({ ...why, line: wide })}: width ${stringWidth(wide)} > ${width}`);
}

describe("fuzz: terminal wrap", () => {
  test("hangLines keeps each line in the room and loses no text", () => {
    const r = new Rng(9001);
    for (let i = 0; i < runs(1500); i++) {
      const t = text(r);
      const room = r.int(10, 200);
      const out = hangLines(t, room);
      fits(out, room, { t, room });
      expect(out.join("")).not.toContain("\t");
      expect(solid(out.join("\n"))).toBe(solid(t));
      expect(out.join("").match(/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/), "a split surrogate pair").toBeNull();
    }
  });

  test("hangWrap keeps each line in the width and loses no text", () => {
    const r = new Rng(9002);
    for (let i = 0; i < runs(500); i++) {
      const cols = r.int(1, 4);
      const t = Array.from({ length: r.int(1, 6) }, () => Array.from({ length: cols }, () => text(r, 1).replace(/\n/g, " ")).join(" ".repeat(r.int(2, 4)))).join("\n");
      const width = r.int(20, 200);
      const out = hangWrap(t, width);
      fits(out.split("\n"), width, { t, width });
      expect(out).not.toContain("\t");
      expect(solid(out)).toBe(solid(t));
    }
  });

  test("a markdown table fits the width and keeps each cell", () => {
    const r = new Rng(9003);
    for (let i = 0; i < runs(400); i++) {
      const cols = r.int(1, 5);
      const rows = Array.from({ length: r.int(1, 5) }, () => Array.from({ length: cols }, () => Array.from({ length: r.int(0, 8) }, () => r.pick(PIECES).replace(/\s+/g, "")).join(" ")));
      const width = r.int(Math.max(20, cols * 3 + 3 * (cols - 1)), 200);
      const lines = tableLines(rows, width);
      fits(lines.map((l) => l.text), width, { rows, width });
      expect(sorted(lines.filter((l) => !l.rule).map((l) => l.text).join("").replace(/│/g, ""))).toBe(sorted(rows.map((row) => row.join("")).join("")));
    }
  });

  test("a very long line wraps in linear time", () => {
    const t = Array.from({ length: 20000 }, (_, i) => (i % 7 ? "word" : "日本語🧪")).join(" ");
    const start = performance.now();
    hangLines(t, 40);
    hangWrap(t, 40);
    expect(performance.now() - start).toBeLessThan(process.env.CI && process.platform === "win32" ? 5000 : 1500);
  });
});

async function frame(node: React.ReactElement, columns: number): Promise<string[]> {
  const h = makeHarness(columns, 200);
  const app = render(node, { stdout: h.stdout, stdin: h.stdin, debug: true, exitOnCtrlC: false, patchConsole: false });
  await sleep(5);
  app.unmount();
  const last = h.frames.filter((f) => plain(f).trim()).at(-1) ?? "";
  return plain(last).split("\n");
}

describe("fuzz: rendered items and cards", () => {
  test("the transcript items and cards fit the width and keep the text", async () => {
    const r = new Rng(9101);
    for (let i = 0; i < runs(40); i++) {
      const columns = r.int(20, 200);
      const t = text(r, 2);
      const k = r.int(0, 5);
      const item = (x: object) => <ItemView item={{ key: "k", ...x } as unknown as StaticItem} />;
      const node =
        k === 0 ? item({ t: "user", text: t })
        : k === 1 ? item({ t: "line", sym: "●", text: t })
        : k === 2 ? item({ t: "block", title: "Title", text: t })
        : k === 3 ? item({ t: "step", n: 1, ok: r.bool(), summary: t, error: t, tool: "count", outputs: [] })
        : k === 4 ? <InstructionCard card={{ t: "instruction", step: 2, tool: "count", text: t }} program="Fiji" onDone={() => {}} onAgent={() => {}} onInterrupt={() => {}} />
        : <PhiCard card={{ t: "phi", hits: [], shown: [{ kind: "name", label: t.slice(0, 40), where: t.slice(0, 30), count: 1 }] } as never} onAction={() => {}} />;
      const lines = await frame(node, columns);
      fits(lines, columns, { k, columns, t });
      if (k <= 4) expect(solid(lines.join("\n").replace(/[│╭╮╰╯─]/g, "")), JSON.stringify({ k, columns, t })).toContain(solid(t).slice(0, 200));
    }
  }, 30000);
});
