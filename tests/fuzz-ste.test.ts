import { describe, expect, test } from "vitest";
import { checkText, sentences, uiStrings } from "../src/core/ste.ts";
import { linear as once, Rng, runs } from "./fuzz-rng.ts";

// A busy machine can slow one timing. A real quadratic cost fails all three tries.
function linear(make: (n: number) => string, run: (s: string) => void, n: number) {
  let res = once(make, run, n);
  for (let k = 0; k < 2 && !res.ok; k++) res = once(make, run, n);
  return res;
}

const TOKENS = ["The", "script", "deletes", "the", "file.", "Run", "tests.", "is", "was", "removed", "utilize", "e.g.", "and/or", "should", "may", "5", "leverage", "Fig.", "Dr.", "i.e.", "<b>", "</b>", "<", ">", "[", "]", "(", ")", "[link](https://x.org)", "![img](a.png)", "`code`", "`", "*", "**", "_", "__", "#", "##", "-", "1.", "|", "```", "~~~", "<!--", "-->", "\"", "'", "${x}", "\\", "日本語", "🧪", "\u0000", "\t", "    ", "carry out", "prior to", "x".repeat(300)];

function text(r: Rng): string {
  return Array.from({ length: r.int(1, 30) }, () => Array.from({ length: r.int(0, 25) }, () => r.pick(TOKENS)).join(r.pick([" ", "", "  "]))).join("\n");
}

describe("fuzz: STE text checker", () => {
  test("random text: no crash, and each issue points at a real line", () => {
    const r = new Rng(12001);
    for (let i = 0; i < runs(800); i++) {
      const t = text(r);
      const lines = t.split(/\r?\n/).length;
      for (const issue of checkText(t)) {
        expect(issue.line).toBeGreaterThanOrEqual(1);
        expect(issue.line).toBeLessThanOrEqual(lines);
        expect(issue.message).toMatch(/^Sentence \d+ /);
      }
      for (const s of sentences(t)) expect(s.text.trim().length).toBeGreaterThan(0);
      expect(sentences("See [the guide](https://x.org/a_(b)) for more.")[0]!.text).toBe("See the guide for more.");
      const code = `const a = "${t.replace(/["\\\n]/g, " ")}";\nconst b = \`${t.replace(/[`\\]/g, " ")}\`;\n`;
      for (const s of uiStrings(code)) expect(s.line).toBeGreaterThanOrEqual(1);
    }
  });

  test("the checker runs in linear time", () => {
    const cases: [string, (n: number) => string][] = [
      ["words", (n) => "The script deletes the file and the file is removed ".repeat(n / 50)],
      ["one long line of less-than signs", (n) => "a < b ".repeat(n / 6)],
      ["one long line of open brackets", (n) => "[a ![b ".repeat(n / 7)],
      ["one long line of stars", (n) => "*a _b ".repeat(n / 6)],
      ["many sentences", (n) => "Run the tests. ".repeat(n / 15)],
      ["many lines", (n) => "Run the tests\n- item\n# head\n".repeat(n / 28)],
    ];
    for (const [name, make] of cases) {
      const res = linear(make, (s) => checkText(s), 20000);
      expect(res.ok, `${name}: ${JSON.stringify(res)}`).toBe(true);
    }
    const code = (n: number) => 'const a = "The script deletes the file now.";\n'.repeat(n / 42);
    const res = linear(code, (s) => uiStrings(s), 200000);
    expect(res.ok, `uiStrings: ${JSON.stringify(res)}`).toBe(true);
  });
});
