import { describe, expect, test } from "vitest";
import { inline, md } from "../src/core/markdown.ts";
import { liveHtml } from "../src/ui-web/lib/markdown.ts";
import { linear, Rng, runs } from "./fuzz-rng.ts";

const CARET = `<span class="caret" aria-hidden="true"></span>`;
const TAGS = new Set(["p", "br", "strong", "em", "del", "code", "pre", "a", "ul", "ol", "li", "h4", "hr", "blockquote", "table", "thead", "tbody", "tr", "th", "td", "span"]);
const VOID = new Set(["br", "hr"]);
const ATTRS = new Set(["href", "target", "rel", "class", "role", "data-label", "title", "start", "aria-hidden"]);
const TOKEN = /<(\/?)([a-z0-9]+)((?:\s+[a-z-]+="[^"<>]*")*)\s*>|<|>/g;

// Returns the problems in one HTML string: an unknown tag or attribute, an unsafe link, a bare < or >, or an unbalanced tag.
function audit(html: string): string[] {
  const out: string[] = [];
  const stack: string[] = [];
  for (const m of html.matchAll(TOKEN)) {
    if (!m[2]) {
      out.push(`bare ${m[0]} at ${m.index}`);
      continue;
    }
    const [, close, tag, attrs] = m;
    if (!TAGS.has(tag!)) out.push(`tag ${tag}`);
    for (const a of attrs!.matchAll(/([a-z-]+)="([^"]*)"/g)) {
      if (!ATTRS.has(a[1]!)) out.push(`attribute ${a[1]}`);
      if (a[1] === "href" && !/^https?:\/\/[^\s\x00-\x1f<>"']+$/.test(a[2]!)) out.push(`href ${a[2]}`);
      if (/&(?![a-z]+;|#\d+;)/.test(a[2]!)) out.push(`bare & in ${a[1]}`);
    }
    if (VOID.has(tag!)) continue;
    if (close) {
      if (stack.at(-1) !== tag) out.push(`close ${tag} with ${stack.join(">")} open`);
      else stack.pop();
    } else stack.push(tag!);
  }
  if (stack.length) out.push(`unclosed ${stack.join(">")}`);
  return out;
}

const PIECES = [
  "<script>alert(1)</script>", "<img src=x onerror=alert(1)>", "<a href='javascript:x'>", "\"><svg onload=1>", "' onmouseover='x", "&lt;b&gt;", "&amp;", "&", "&#60;", "javascript:alert(1)",
  "[link](https://example.com/a?b=1&c=2)", "[x](javascript:alert(1))", "[x](http://a\" onclick=\"y)", "[**b**](http://x/**y**)", "[a](http://x/~~y~~)", "[", "]", "(", ")", "](http://", "[a](",
  "**", "*", "***", "~~", "`", "``", "_", "**bold**", "*em*", "~~del~~", "`code`", "**a [b](http://x) c**", "**a", "b**", "*a ", " a*",
  "- ", "* ", "+ ", "1. ", "2) ", "  - ", "    - ", "\t- ", "# ", "### ", "####### ", "> ", ">", ">> ", "---", "***", "___", "```", "```py", "~~~",
  "| a | b |", "|---|---|", "|", "||", "| :-: |", " | ",
  "/Users/someone/a/very/long/path/to/a/file/that/goes/on/and/on.csv", "~/x/y", "/a/b", "C:\\a\\b",
  "word", "two words", "12.5", "\n", "\n", "\n\n", " ", "  ", "\t", "é", "µ", "<", ">", "\"", "'", "\u0000", "\r",
];

function randomMd(r: Rng): string {
  return Array.from({ length: r.int(1, 40) }, () => (r.bool(0.85) ? r.pick(PIECES) : r.string("ab *_`~[]()<>|#-\n\"'&/:", 1, 6))).join(r.pick(["", " ", ""]));
}

describe("fuzz: markdown renderer", () => {
  test("random markdown and raw HTML give safe, balanced HTML", () => {
    const r = new Rng(505);
    const bad: string[] = [];
    for (let i = 0; i < runs(2000); i++) {
      const src = randomMd(r);
      for (const html of [md(src), md(src, { code: true }), inline(src)]) {
        const problems = audit(html);
        if (problems.length) bad.push(`${JSON.stringify(src)} -> ${problems.slice(0, 3).join("; ")}`);
      }
    }
    expect(bad.slice(0, 6)).toEqual([]);
  });

  test("the live caret is outside every tag and is never inside code", () => {
    const r = new Rng(606);
    const bad: string[] = [];
    for (let i = 0; i < runs(2000); i++) {
      const src = randomMd(r);
      const html = liveHtml(src);
      const at = html.indexOf(CARET);
      if (at < 0 || html.indexOf(CARET, at + 1) >= 0) {
        bad.push(`${JSON.stringify(src)}: caret count`);
        continue;
      }
      if (html.slice(0, at) + html.slice(at + CARET.length) !== md(src)) bad.push(`${JSON.stringify(src)}: html changed`);
      const before = html.slice(0, at);
      if (before.lastIndexOf("<") > before.lastIndexOf(">")) bad.push(`${JSON.stringify(src)}: inside a tag`);
      const open: string[] = [];
      for (const m of before.matchAll(/<(\/?)([a-z0-9]+)[^>]*>/g)) {
        if (VOID.has(m[2]!)) continue;
        if (m[1]) open.pop();
        else open.push(m[2]!);
      }
      if (open.some((t) => t === "code" || t === "pre" || t === "a")) bad.push(`${JSON.stringify(src)}: inside ${open.join(">")}`);
      if (/<\/(?:ul|ol|table|blockquote)>$/.test(before) && !/(?:<hr>|<blockquote>)(?:<\/blockquote>)+$/.test(before)) bad.push(`${JSON.stringify(src)}: the caret is after a finished block`);
      const rest = html.slice(at + CARET.length);
      if (/<[a-z]/.test(rest.replace(/<tbody[^>]*><\/tbody>/, ""))) bad.push(`${JSON.stringify(src)}: content after the caret: ${rest.slice(0, 60)}`);
    }
    expect(bad.slice(0, 6)).toEqual([]);
  });

  test("deep nesting does not overflow the stack", () => {
    for (const src of [">".repeat(20000) + " a", "> ".repeat(5000) + "a", Array.from({ length: 3000 }, (_, i) => " ".repeat(i) + "- a").join("\n"), "- ".repeat(5000) + "a"]) {
      expect(() => md(src)).not.toThrow();
      expect(audit(md(src))).toEqual([]);
      expect(() => liveHtml(src)).not.toThrow();
    }
  });

  test("the run time grows about linearly with the text length", () => {
    const shapes: [string, (n: number) => string][] = [
      ["open brackets", (n) => "[1,".repeat(n / 3)],
      ["unclosed links", (n) => "[a](http://".repeat(n / 11)],
      ["bold openers", (n) => "**a ".repeat(n / 4)],
      ["strike openers", (n) => "~~a ".repeat(n / 4)],
      ["star openers", (n) => "*a ".repeat(n / 3)],
      ["paths", (n) => " /a/b".repeat(n / 5)],
      ["one long path", (n) => ` /${"a/".repeat(n / 2)}`],
      ["list lines", (n) => "- a\n".repeat(n / 4)],
      ["quote lines", (n) => "> a\n".repeat(n / 4)],
      ["table lines", (n) => "| a | b |\n".repeat(n / 10)],
      ["backticks", (n) => "`a".repeat(n / 2)],
    ];
    const slow = shapes.map(([name, make]) => ({ name, ...linear(make, (s) => liveHtml(s), 5000) })).filter((x) => !x.ok);
    expect(slow).toEqual([]);
  });
});
