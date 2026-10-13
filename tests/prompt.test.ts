import { expect, test } from "vitest";
import { foldersNote, systemPrompt } from "../src/core/prompt.ts";

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
  expect(pick).toMatch(/call list_adapters\. Then call use_adapter/);
  expect(pick).toMatch(/Do not guess tool names/);
  expect(systemPrompt({ ...base, model })).not.toContain("list_adapters");
  expect(systemPrompt({ ...base, model, guidance: false, pick: true })).toMatch(/list_adapters/);
});

test("the prompt names the folders with no path and forbids a disk search; the folder note gives the paths", () => {
  const text = systemPrompt({ ...base, model: { provider: "claude", model: "m", contextWindow: 1, vision: true, small: false }, folders: { figureFormats: "png,svg", xlsx: true } });
  expect(text).toContain("A note from the harness gives the paths of the project folder, the session folder and the output folder.");
  expect(text).toContain("Save every figure in the figures folder of the output folder as PNG (300 dpi) and SVG");
  expect(text).toContain("Write each result table as a CSV file in the output folder.");
  expect(text).not.toMatch(/\/[a-z]+\//);
  expect(text).toContain("Never search the whole disk for a file. If you cannot find a file, ask the scientist for the path.");
  const note = foldersNote({ project: "/data/exp1", work: "/data/exp1/out", output: "/data/exp1/results" });
  expect(note).toBe("Folders of this session. The project folder is /data/exp1. The session folder is /data/exp1/out. The output folder is /data/exp1/results. The figures folder is /data/exp1/results/figures.");
});
