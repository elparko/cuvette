import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, expect, test } from "vitest";
import { checkModelSpec, runPapers } from "../src/bench/papers.ts";
import type { Provider } from "../src/core/types.ts";
import { FakeProvider } from "../src/providers/fake.ts";

const LAB = join(__dirname, "fixtures/lab");
let root: string;
let papersDir: string;
const oldHome = process.env.CUVETTE_HOME;
const oldData = process.env.CUVETTE_BENCH_DATA;

function paper(id: string, extra: Record<string, unknown> = {}) {
  mkdirSync(join(papersDir, id), { recursive: true });
  const spec = {
    adapters: [LAB],
    prompt: "Count the particles in {data}/lab/a.tif and tell me the number.",
    answers: { method: "Triangle" },
    data: ["lab/a.tif"],
    timeout_s: 60,
    items: [
      { key: "count", description: "Particles", value: 66, exact: true },
      { key: "min_size", description: "Smallest particle", value: 5, exact: true, in_answer: false },
      { key: "never_made", description: "A number no tool makes", value: 123456, tolerance: 1 },
    ],
    ...extra,
  };
  writeFileSync(join(papersDir, id, "bench.yaml"), JSON.stringify(spec));
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "cuvette-papers-"));
  papersDir = join(root, "papers");
  process.env.CUVETTE_HOME = join(root, "home");
  process.env.CUVETTE_BENCH_DATA = join(root, "data");
  mkdirSync(join(root, "data/lab"), { recursive: true });
  writeFileSync(join(root, "data/lab/a.tif"), "x");
});
afterEach(() => {
  if (oldHome === undefined) delete process.env.CUVETTE_HOME;
  else process.env.CUVETTE_HOME = oldHome;
  if (oldData === undefined) delete process.env.CUVETTE_BENCH_DATA;
  else process.env.CUVETTE_BENCH_DATA = oldData;
});

const options = () => ({ papersDir, scratch: join(root, "scratch"), resultsDir: join(root, "results"), log: () => {} });

test("an end-to-end run with the fake model scores computed and reported and writes both reports", async () => {
  paper("lab-count");
  const final = "There are 66 particles with the Triangle method.";
  const result = await runPapers({
    ...options(),
    papers: ["lab-count"],
    models: ["fake:script"],
    providerFor: () =>
      new FakeProvider([
        { calls: [{ name: "count", args: { input: join(root, "data/lab/a.tif"), method: "Triangle", min_size: 5 } }] },
        { text: final },
        { text: final },
      ]),
  });
  const run = result.runs[0];
  expect(run.status).toBe("answer");
  const by = Object.fromEntries(run.items.map((i) => [i.key, i]));
  expect(by.count.computed.pass).toBe(true);
  expect(by.count.reported).toMatchObject({ pass: true, via: "tolerance" });
  expect(by.min_size.computed.pass).toBe(true);
  expect(by.min_size.reported.pass).toBeNull();
  expect(by.never_made.computed.pass).toBe(false);
  expect(by.never_made.reported.pass).toBe(false);
  expect(run.metrics).toMatchObject({ toolCalls: 1, failedToolCalls: 0 });
  expect(run.metrics!.requests).toBeGreaterThanOrEqual(2);
  expect(run.dir!.startsWith(join(root, "scratch"))).toBe(true);
  expect(run.dir!.startsWith(join(root, "scratch", "fake_script", "lab-count", "run1", "home"))).toBe(true);
  expect(process.env.CUVETTE_HOME).toBe(join(root, "home"));

  const json = JSON.parse(readFileSync(result.paths!.json, "utf8"));
  expect(json.summary.totals["fake:script"]).toMatchObject({ computed: 2, computedOf: 3, reported: 1, reportedOf: 2 });
  const md = readFileSync(result.paths!.md, "utf8");
  expect(md).toContain("| lab-count | 2/3 / 1/2 |");
  expect(md).toContain("via tolerance");
});

test("a paper with missing data is skipped with a clear reason", async () => {
  paper("lab-count", { data: ["lab/missing.tif"] });
  const result = await runPapers({ ...options(), papers: "all", models: ["fake:x"], providerFor: () => new FakeProvider([]) });
  expect(result.runs).toHaveLength(1);
  expect(result.runs[0]).toMatchObject({ status: "skipped" });
  expect(result.runs[0].error).toContain("data missing: run fetch.sh");
});

test("a run that exceeds the time limit ends with status timeout", async () => {
  paper("lab-count", { timeout_s: 1 });
  const hang: Provider = {
    info: { provider: "fake", model: "hang", contextWindow: 100000, vision: false, small: false },
    step: (req) => new Promise((_, reject) => req.signal?.addEventListener("abort", () => reject(new Error("interrupted")))),
    complete: async () => "",
  };
  const result = await runPapers({ ...options(), papers: ["lab-count"], models: ["fake:x"], providerFor: () => hang });
  expect(result.runs[0].status).toBe("timeout");
  expect(result.runs[0].items.every((i) => !i.computed.pass)).toBe(true);
}, 30000);

test("dry run validates specs and data without running a model", async () => {
  paper("lab-count");
  paper("lab-bad", { adapters: ["no-such-adapter"] });
  const lines: string[] = [];
  const result = await runPapers({ ...options(), papers: "all", models: ["ollama:qwen3:8b", "bogus"], dryRun: true, log: (l) => lines.push(l) });
  expect(result.paths).toBeUndefined();
  expect(result.problems.join("\n")).toContain("bogus");
  expect(result.problems.join("\n")).toContain("no adapter no-such-adapter");
  expect(lines.some((l) => l.startsWith("ok lab-count"))).toBe(true);
  expect(existsSync(join(root, "scratch"))).toBe(false);
});

test("model specs follow the provider spec forms", () => {
  expect(checkModelSpec("claude")).toBeUndefined();
  expect(checkModelSpec("claude:claude-haiku-5-5")).toBeUndefined();
  expect(checkModelSpec("ollama:qwen3:8b")).toBeUndefined();
  expect(checkModelSpec("openai:http://localhost:1234/v1|qwen")).toBeUndefined();
  expect(checkModelSpec("ollama:")).toBeDefined();
  expect(checkModelSpec("openai:http://x")).toBeDefined();
  expect(checkModelSpec("gpt")).toBeDefined();
});
