import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { beforeAll, describe, expect, test } from "vitest";
import { loadAdapter } from "../src/adapters/manifest.ts";
import type { Message } from "../src/core/types.ts";
import { buildRequest, driveCases, driveText, runDrive } from "../src/onboarding/drive.ts";
import type { DriveCase } from "../src/onboarding/drive.ts";
import { FakeProvider } from "../src/providers/fake.ts";

const DIR = resolve("tests/fixtures/drive");

beforeAll(() => {
  process.env.CUVETTE_HOME = mkdtempSync(join(tmpdir(), "cuvette-drive-home-"));
});

function lastResult(messages: Message[]): string | undefined {
  const parts = messages.flatMap((m) => m.parts).filter((p) => p.type === "tool_result") as { text: string }[];
  return parts.at(-1)?.text;
}

function model(pick: (c: DriveCase) => { name: string; args: Record<string, unknown> }) {
  return (c: DriveCase) =>
    new FakeProvider((messages) => {
      const r = lastResult(messages);
      if (r === undefined) return { calls: [pick(c)] };
      const n = /mean (\d+(?:\.\d+)?)/.exec(r)?.[1] ?? /(\d+) rows/.exec(r)?.[1] ?? "none";
      return { text: `The result is ${n}.` };
    });
}

const args = (c: DriveCase) => JSON.parse(JSON.stringify(c.target.args).replaceAll("{adapter_dir}", DIR));

describe("drive test", () => {
  test("one case for each tool, from its known-answer test", () => {
    const cases = driveCases(loadAdapter(DIR));
    expect(cases.map((c) => [c.tool, c.test])).toEqual([["mean_of", "mean-x"], ["count_rows", "rows"]]);
    expect(cases[0].expect).toEqual([expect.objectContaining({ path: "metrics.mean", approx: 2.5 })]);
  });

  test("the request is plain text from the descriptions and the test input, without the tool name", () => {
    const a = loadAdapter(DIR);
    const c = driveCases(a)[0];
    const text = buildRequest(a, c.steps, c.target, new Map([["mean_of", "Compute the mean of one column of a CSV file."]]));
    expect(text).toContain("Compute the mean of one column of a CSV file.");
    expect(text).toContain(`${DIR}/data/a.csv`);
    expect(text).toContain("column: x");
    expect(text).not.toContain("mean_of");
  });

  test("a model that calls the right tool with good arguments reaches the answer", async () => {
    const results = await runDrive(DIR, { provider: model((c) => ({ name: c.tool, args: args(c) })) });
    expect(results.map((r) => [r.tool, r.rightTool, r.validArgs, r.reached])).toEqual([
      ["mean_of", true, true, true],
      ["count_rows", true, true, true],
    ]);
    expect(results[0].confusions).toEqual([]);
    expect(driveText(results)).toContain("2 of 2 tools passed the drive test.");
  });

  test("a model that picks the wrong tool is reported with the session entry", async () => {
    const results = await runDrive(DIR, { only: ["mean_of"], provider: model((c) => ({ name: "count_rows", args: { path: args(c).path } })) });
    const r = results[0];
    expect(r.rightTool).toBe(false);
    expect(r.reached).toBe(false);
    const wrong = r.confusions.find((x) => /called count_rows, not mean_of/.test(x.text));
    expect(wrong?.entry).toBeGreaterThan(0);
    expect(r.confusions.some((x) => /never called mean_of/.test(x.text))).toBe(true);
    expect(driveText(results)).toMatch(/entry \d+: called count_rows, not mean_of/);
  });

  test("a call with a bad argument value is not valid and names the difference", async () => {
    const results = await runDrive(DIR, { only: ["mean_of"], provider: model((c) => ({ name: "mean_of", args: { ...args(c), column: "z" } })) });
    const r = results[0];
    expect(r.rightTool).toBe(true);
    expect(r.validArgs).toBe(false);
    expect(r.reached).toBe(false);
    const texts = r.confusions.map((x) => x.text).join("\n");
    expect(texts).toMatch(/column = "z"; the test uses "x"/);
    expect(texts).toMatch(/mean_of failed: no column z/);
  });

  test("a call that leaves out a required argument is not valid", async () => {
    const results = await runDrive(DIR, { only: ["mean_of"], provider: model((c) => ({ name: "mean_of", args: { path: args(c).path } })) });
    expect(results[0].validArgs).toBe(false);
  });
});
