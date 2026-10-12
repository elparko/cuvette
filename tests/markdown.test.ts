import { describe, expect, test } from "vitest";
import { md } from "../src/core/markdown.ts";
import { liveHtml } from "../src/ui-web/lib/markdown.ts";

describe("md", () => {
  test("bold, italic and code in one line", () => {
    expect(md("A **bold** and *slanted* word with `code`.")).toBe("<p>A <strong>bold</strong> and <em>slanted</em> word with <code>code</code>.</p>");
  });

  test("a star between spaces and a star inside code stay as text", () => {
    expect(md("2 * 3 * 4 and `a*b*c`")).toBe("<p>2 * 3 * 4 and <code>a*b*c</code></p>");
  });

  test("a link needs an http address and gets safe attributes", () => {
    expect(md("See [docs](https://example.com/a?b=1) and [x](javascript:alert(1)).")).toContain('<a href="https://example.com/a?b=1" target="_blank" rel="noopener noreferrer">docs</a>');
    expect(md("[x](javascript:alert(1))")).not.toContain("<a ");
  });

  test("html in the text is escaped", () => {
    expect(md("<img src=x onerror=1> **a**")).toBe("<p>&lt;img src=x onerror=1&gt; <strong>a</strong></p>");
  });

  test("headings, rules and quotes", () => {
    expect(md("## Title\n\n---\n\n> one\n> two")).toBe("<h4>Title</h4><hr><blockquote><p>one<br>two</p></blockquote>");
  });

  test("nested lists", () => {
    expect(md("- a\n  - b\n  - c\n- d")).toBe("<ul><li>a<ul><li>b</li><li>c</li></ul></li><li>d</li></ul>");
  });

  test("a numbered list with blank lines keeps one list and its numbers", () => {
    expect(md("3. a\n\n4. b")).toBe('<ol start="3"><li>a</li><li>b</li></ol>');
  });

  test("a list directly after a paragraph line starts a list", () => {
    expect(md("Intro:\n- a\n- b")).toBe("<p>Intro:</p><ul><li>a</li><li>b</li></ul>");
  });

  test("a table with a separator row", () => {
    const html = md("| A | B |\n|---|:-:|\n| 1 | **2** |");
    expect(html).toContain("<th>A</th><th>B</th>");
    expect(html).toContain("<strong>2</strong>");
    expect(html).not.toContain("---");
  });

  test("a half-written table does not throw", () => {
    expect(md("| A | B |\n|---|")).toContain("<table");
    expect(md("| A | B |\n|---|---|\n| 1 | 2")).toContain("<td");
  });

  test("code is hidden unless the caller asks for it", () => {
    expect(md("```py\nx=1\n```")).toContain("Record tab");
    expect(md("```py\nx=1\n```", { code: true })).toBe("<pre>x=1</pre>");
    expect(md("```py\nx=1")).toContain("Record tab");
  });
});

describe("liveHtml", () => {
  test("the cursor goes inside the last table cell, not on a line of its own", () => {
    const html = liveHtml("a\n\n| g | n |\n|---|---|\n| c | 12 |");
    expect(html).toMatch(/12<span class="caret" aria-hidden="true"><\/span><\/td><\/tr><\/tbody><\/table>$/);
  });

  test("the caret sits inside the last paragraph", () => {
    expect(liveHtml("Hello **wor")).toBe('<p>Hello **wor<span class="caret" aria-hidden="true"></span></p>');
  });

  test("the caret sits inside the last list item", () => {
    expect(liveHtml("- a\n- b")).toBe('<ul><li>a</li><li>b<span class="caret" aria-hidden="true"></span></li></ul>');
  });

  test("the caret shows for empty text", () => {
    expect(liveHtml("")).toBe('<span class="caret" aria-hidden="true"></span>');
  });
});
