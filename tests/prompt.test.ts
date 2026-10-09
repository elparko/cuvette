import { expect, test } from "vitest";
import { systemPrompt } from "../src/core/prompt.ts";

const base = { adapters: [], mode: "watch" as const, lab: "", guidance: true };

test("both rule sets say that the final answer holds every requested number", () => {
  const big = systemPrompt({ ...base, model: { provider: "claude", model: "m", contextWindow: 1, vision: true, small: false } });
  const small = systemPrompt({ ...base, model: { provider: "ollama", model: "m", contextWindow: 1, vision: false, small: true } });
  expect(big).toContain("Put every number that the request asks for in your final answer");
  expect(small).toContain("Put every number that the request asks for in your final answer");
});

test("with no adapter at the start, the prompt tells the agent to list and load adapters; with --adapter it does not", () => {
  const model = { provider: "claude" as const, model: "m", contextWindow: 1, vision: true, small: false };
  const pick = systemPrompt({ ...base, model, pick: true });
  expect(pick).toContain("# Programs");
  expect(pick).toMatch(/Call list_adapters\. Then call use_adapter/);
  expect(pick).toMatch(/Do not guess tool names/);
  expect(systemPrompt({ ...base, model })).not.toContain("list_adapters");
  expect(systemPrompt({ ...base, model, guidance: false, pick: true })).toMatch(/list_adapters/);
});

test("the prompt gives the absolute project folder and forbids a disk search", () => {
  const text = systemPrompt({ ...base, model: { provider: "claude", model: "m", contextWindow: 1, vision: true, small: false }, folders: { project: "/data/exp1", work: "/data/exp1/out" } });
  expect(text).toContain("The project folder is /data/exp1.");
  expect(text).toContain("Never search the whole disk for a file. If you cannot find a file, ask the scientist for the path.");
});
