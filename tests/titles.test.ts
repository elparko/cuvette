import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "vitest";
import { AnalysisRecord } from "../src/core/record.ts";
import { changedAnalysis, describeSession, lastTitle, parseTitle, titleInput } from "../src/core/titles.ts";
import type { Provider } from "../src/core/types.ts";

test("the title reply is read from JSON, with or without text around it", () => {
  expect(parseTitle('Here: {"title": "Extra sleep, drug 2 vs drug 1", "description": "Paired t test on 10 patients."}')).toEqual({ title: "Extra sleep, drug 2 vs drug 1", description: "Paired t test on 10 patients." });
  expect(parseTitle("no json")).toBeUndefined();
  expect(parseTitle('{"title": ""}')).toBeUndefined();
});

test("one short call names the session from the request, the steps and the answer", async () => {
  const r = new AnalysisRecord(mkdtempSync(join(tmpdir(), "cuvette-title-")), "s1");
  r.append("user", { text: "Did drug 2 give more sleep?" });
  r.append("assistant", { text: "Yes, 1.58 h more (p = 0.003).", final: true });
  let seen = "";
  const p = { info: { provider: "fake", model: "m", contextWindow: 1000, vision: false, small: true }, complete: async (_s: string, t: string) => ((seen = t), '{"title":"Extra sleep","description":"Drug 2 gave 1.58 h more sleep."}'), step: async () => ({}) } as unknown as Provider;
  expect(await describeSession(p, r)).toEqual({ title: "Extra sleep", description: "Drug 2 gave 1.58 h more sleep." });
  expect(seen).toContain("Did drug 2 give more sleep?");
  expect(seen).toContain("1.58 h more");
  expect(titleInput(r)).toContain("Answer:");
  r.append("title", { title: "Extra sleep", description: "x" });
  expect(lastTitle(r.entries())?.title).toBe("Extra sleep");
  expect(changedAnalysis(r.entries(["user"]))).toBe(false);
});
