import { expect, test } from "vitest";
import { systemPrompt } from "../src/core/prompt.ts";

const base = { adapters: [], mode: "watch" as const, lab: "", guidance: true };

test("both rule sets say that the final answer holds every requested number", () => {
  const big = systemPrompt({ ...base, model: { provider: "claude", model: "m", contextWindow: 1, vision: true, small: false } });
  const small = systemPrompt({ ...base, model: { provider: "ollama", model: "m", contextWindow: 1, vision: false, small: true } });
  expect(big).toContain("Put every number that the request asks for in your final answer");
  expect(small).toContain("Put every number that the request asks for in your final answer");
});
