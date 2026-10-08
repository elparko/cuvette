import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { parse } from "yaml";
import { adapterDirs } from "../src/adapters/manifest.ts";
import { fillPrompt, loadPaper, PAPERS_DIR, paperIds, PaperSpec, readValues } from "../src/bench/papers-spec.ts";

function expectedPairs(x: unknown, out: { value: number; tolerance?: number }[] = []) {
  if (Array.isArray(x)) x.forEach((y) => expectedPairs(y, out));
  else if (x && typeof x === "object") {
    const o = x as { value?: unknown; tolerance?: number };
    if (typeof o.value === "number") out.push({ value: o.value, tolerance: o.tolerance });
    Object.values(x).forEach((y) => expectedPairs(y, out));
  }
  return out;
}

const ids = paperIds();

test("at least 20 papers have a bench.yaml", () => {
  expect(ids.length).toBeGreaterThanOrEqual(20);
});

describe.each(ids)("bench.yaml of %s", (id) => {
  const paper = loadPaper(id);

  test("matches the schema", () => {
    expect(paper.items.length).toBeGreaterThan(0);
  });

  test("uses adapters from the catalog", () => {
    for (const a of paper.adapters) expect(a in adapterDirs() || existsSync(a), a).toBe(true);
  });

  test("copies values and tolerances from expected.yaml", () => {
    const expected = expectedPairs(parse(readFileSync(join(PAPERS_DIR, id, "expected.yaml"), "utf8")));
    for (const i of paper.items) {
      const hit = expected.find((e) => e.value === i.value && (i.exact ? (e.tolerance ?? 0) === 0 : e.tolerance === i.tolerance));
      expect(hit, `${i.key} ${i.value}`).toBeDefined();
    }
  });

  test("has at least one item the answer must contain", () => {
    expect(paper.items.some((i) => i.in_answer)).toBe(true);
  });

  test("leaves no placeholder in the prompt or values", () => {
    const text = fillPrompt(paper.prompt) + JSON.stringify([readValues(paper, "setup"), readValues(paper, "answers")]);
    expect(text).not.toContain("{data}");
  });
});

describe("schema", () => {
  const base = { adapters: ["lab"], prompt: "Count the particles in the image please.", items: [{ key: "n", value: 1, tolerance: 0.1 }] };

  test("accepts a minimal spec and fills defaults", () => {
    const s = PaperSpec.parse(base);
    expect(s.allow).toBe("all");
    expect(s.items[0].in_answer).toBe(true);
  });

  test("rejects an item with both tolerance and exact", () => {
    expect(PaperSpec.safeParse({ ...base, items: [{ key: "n", value: 1, tolerance: 0, exact: true }] }).success).toBe(false);
  });

  test("rejects an item with neither tolerance nor exact", () => {
    expect(PaperSpec.safeParse({ ...base, items: [{ key: "n", value: 1 }] }).success).toBe(false);
  });

  test("rejects duplicate keys and unknown fields", () => {
    expect(PaperSpec.safeParse({ ...base, items: [base.items[0], base.items[0]] }).success).toBe(false);
    expect(PaperSpec.safeParse({ ...base, extra: 1 }).success).toBe(false);
  });
});
