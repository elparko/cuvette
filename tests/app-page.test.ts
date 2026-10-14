import { expect, test } from "vitest";
import { noBidi } from "../src/core/markdown.ts";
import { appPageHtml } from "../src/server/app-page.ts";

const marks = "a‏b‎c؜d‮e⁦f";

test("the shared filter removes the text-direction marks and controls", () => {
  expect(noBidi(marks)).toBe("abcdef");
});

test("the folder code of the page uses the same filter for the tooltip and the button text", () => {
  const html = appPageHtml("tok");
  const filters = [...html.matchAll(/replace\(\/\[([^\]]*u200f[^\]]*)\]\/g, ""\)/g)];
  expect(filters.length).toBeGreaterThanOrEqual(2);
  for (const f of filters) expect(marks.replace(new RegExp(`[${f[1]}]`, "g"), "")).toBe("abcdef");
  expect(html).not.toMatch(/\[\\u202a-\\u202e\\u2066-\\u2069\]/);
  expect(html).toContain("b.dataset.path = path");
  expect(html).not.toContain("b.title = path;");
});
