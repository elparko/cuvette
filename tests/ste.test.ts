import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { systemPrompt } from "../src/core/prompt.ts";
import { runChecks } from "../src/core/review.ts";
import { find } from "../src/core/settings.ts";
import { checkSentence, checkText, countByRule, lintRepo, sentences, uiStrings } from "../src/core/ste.ts";

const rules = (s: string) => checkSentence(s).map((i) => i.rule);

describe("the STE checker", () => {
  test("sentence length: 25 words for a description, 20 for an instruction", () => {
    const words = (n: number) => Array.from({ length: n }, () => "cells").join(" ");
    expect(rules(`The ${words(24)}.`)).toEqual([]);
    expect(rules(`The ${words(25)}.`)).toEqual(["sentence-length"]);
    expect(rules(`Count the ${words(18)}.`)).toEqual([]);
    expect(rules(`Count the ${words(19)}.`)).toEqual(["sentence-length"]);
    expect(checkSentence(`The ${words(30)}.`, 3)[0].message).toBe("Sentence 3 has 31 words. The limit is 25.");
  });
  test("passive voice", () => {
    expect(rules("The file is read by the script.")).toEqual(["passive"]);
    expect(rules("The cells were counted in each field.")).toEqual(["passive"]);
    expect(rules("The script reads the file.")).toEqual([]);
    expect(rules("The spot is red.")).toEqual([]);
    expect(rules("The test is based on ranks.")).toEqual([]);
  });
  test("filler, word choice and phrases", () => {
    expect(rules("We leverage a robust pipeline.")).toEqual(["filler", "filler"]);
    expect(rules("Utilize the data.")).toEqual(["word"]);
    expect(checkSentence("Utilize the data.")[0].message).toMatch(/Use "use"/);
    expect(rules("Load the files, e.g. the TIFF files.")).toEqual(["phrase"]);
    expect(rules("Report the mean and/or the median.")).toEqual(["phrase"]);
    expect(rules("Report the mean and the median.")).toEqual([]);
  });
  test("should, may and might; the month May is not a modal", () => {
    expect(rules("You should run the test.")).toEqual(["modal"]);
    expect(rules("The result may change.")).toEqual(["modal"]);
    expect(rules("You must run the test.")).toEqual([]);
    expect(rules("The data is from May 2024.")).toEqual([]);
  });
  test("sentences joins wrapped lines, skips code, tables and headings, and keeps line numbers", () => {
    const text = "# Title\n\nThe first sentence\nwraps here. The second one.\n\n```\ncode is skipped.\n```\n| a | b |\n- An item with `code`.\n";
    expect(sentences(text)).toEqual([
      { text: "The first sentence wraps here.", line: 3 },
      { text: "The second one.", line: 4 },
      { text: "An item with X.", line: 10 },
    ]);
  });
  test("checkText numbers the sentences and countByRule counts them", () => {
    const issues = checkText("The cells are counted. You should stop. The run ends.");
    expect(issues.map((i) => [i.rule, i.sentence])).toEqual([["passive", 1], ["modal", 2]]);
    expect(countByRule(issues)).toEqual({ passive: 1, modal: 1 });
  });
  test("uiStrings takes sentences from string literals and HTML text, not code", () => {
    const code = 'const a = "The agent stopped the run.";\nconst b = "key_name";\nconst c = `<p>The cells are counted here.</p>`;\nconst d = "x => y";';
    expect(uiStrings(code).map((s) => [s.text, s.line])).toEqual([["The agent stopped the run.", 1], ["The cells are counted here.", 3]]);
  });
});

describe("the prompt", () => {
  const big = { provider: "claude" as const, model: "m", contextWindow: 1, vision: true, small: false };
  const small = { provider: "ollama" as const, model: "m", contextWindow: 1, vision: false, small: true };
  const base = { adapters: [], mode: "watch" as const, lab: "", guidance: true };
  test("has the STE rules for ste and the default, and none for plain", () => {
    expect(systemPrompt({ ...base, model: big, textStyle: "ste" })).toContain("Simplified Technical English (ASD-STE100)");
    expect(systemPrompt({ ...base, model: big })).toContain("Instructions: 20 words or fewer");
    expect(systemPrompt({ ...base, model: small })).toContain("20 words or fewer");
    expect(systemPrompt({ ...base, model: big, textStyle: "plain" })).not.toMatch(/ASD-STE100|20 words or fewer/);
    expect(systemPrompt({ ...base, model: small, textStyle: "plain" })).not.toMatch(/20 words or fewer/);
  });
  test("the setting text_style is in the registry with ste and plain", () => {
    const d = find("text_style")!;
    expect(d.choices!()).toEqual(["ste", "plain"]);
    expect(["Session", "Display"]).toContain(d.group);
  });
});

describe("the review", () => {
  const record: any = { entries: () => [], nodes: () => [], node: () => undefined, stale: () => new Set() };
  const ctx = (answer: string, textStyle?: "ste" | "plain") => ({ record, decisions: { values: () => ({}) } as any, adapters: [], answer, claims: [], textStyle });
  const long = "The mean area of the cells in the treated group was larger than the mean area of the cells in the control group in each of the three fields that we counted.";
  test("adds one info finding for an answer that breaks the rules", async () => {
    const f = (await runChecks(ctx(`We counted 40 cells. ${long}`, "ste"))).filter((x) => x.check === "text_style");
    expect(f).toHaveLength(1);
    expect(f[0].severity).toBe("info");
    expect(f[0].message).toMatch(/Sentence 2 has 32 words. The limit is 25./);
  });
  test("no finding for a plain answer, for text_style plain, or with no style", async () => {
    expect((await runChecks(ctx("We counted 40 cells. The mean area is 12 µm².", "ste"))).filter((x) => x.check === "text_style")).toEqual([]);
    expect((await runChecks(ctx(long, "plain"))).filter((x) => x.check === "text_style")).toEqual([]);
    expect((await runChecks(ctx(long))).filter((x) => x.check === "text_style")).toEqual([]);
  });
});

describe("the docs lint", () => {
  const root = mkdtempSync(join(tmpdir(), "cuvette-ste-"));
  mkdirSync(join(root, "docs"));
  mkdirSync(join(root, "src", "ui"), { recursive: true });
  writeFileSync(join(root, "README.md"), "# Tool\n\nThe file is read by the tool.\n");
  writeFileSync(join(root, "docs", "guide.md"), "You should run the tests.\n");
  writeFileSync(join(root, "docs", "handoff-2026-10-08.md"), "The file is read by the tool.\n");
  writeFileSync(join(root, "src", "ui", "a.ts"), 'export const t = "We leverage the record for each step.";\n');
  test("checks README, docs and UI strings, skips dated records, and counts by rule", () => {
    const { files, issues } = lintRepo(root);
    expect(files).toBe(3);
    expect(issues.map((i) => [i.file, i.rule, i.line])).toEqual([
      ["README.md", "passive", 3],
      ["docs/guide.md", "modal", 1],
      ["src/ui/a.ts", "filler", 1],
    ]);
  });
  test("npm run lint:text prints the count by rule and exits 0", () => {
    const out = execFileSync(process.execPath, [join(process.cwd(), "node_modules", "tsx", "dist", "cli.mjs"), join(process.cwd(), "src", "lint-text.ts")], { cwd: root, encoding: "utf8", env: { ...process.env, GITHUB_ACTIONS: "" } });
    expect(out).toMatch(/3 issues in 3 files/);
    expect(out).toMatch(/passive\s+1/);
  });
});
