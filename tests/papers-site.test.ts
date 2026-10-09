import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { beforeAll, expect, test } from "vitest";
import { buildSite } from "../src/bench/papers-site.ts";

const SCIENCE = join(homedir(), ".cuvette/envs/science/bin/python");
const PNG = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

let root: string;
let papers: string;
let results: string;

const item = (key: string, pass: boolean) => ({
  key,
  description: key,
  expected: 5,
  tolerance: 0.1,
  abs: false,
  inAnswer: true,
  computed: { pass, value: pass ? 5 : 9, diff: 0, node: "n", path: "", entry: 1 },
  reported: { pass, value: pass ? 5 : 9, diff: 0, via: "tolerance", node: "n", claimEntry: 2, text: "" },
});

function run(paper: string, model: string, pass: boolean) {
  return { paper, model, run: 1, status: "answer", durationS: 12.5, session: "s", dir: join(root, "sess", paper), answer: "x".repeat(900), items: [item("a", pass), item("b", true)], metrics: { toolCalls: 4, nudges: 1, inputTokens: 1000, outputTokens: 100, cacheRead: 0, cacheWrite: 0 } };
}

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), "cuvette-site-test-"));
  papers = join(root, "papers");
  for (const id of ["with-fig", "no-fig", "unrun"]) {
    mkdirSync(join(papers, id), { recursive: true });
    writeFileSync(join(papers, id, "paper.md"), `# Title of ${id}\n`);
    writeFileSync(join(papers, id, "bench.yaml"), `adapters: [biostats]\nprompt: "A question that is long enough to pass the schema check."\nitems:\n  - {key: a, value: 5, tolerance: 0.1}\n`);
  }
  writeFileSync(join(papers, "no-fig", "triage.md"), "The tool crashed.\n\nFix: update it.\n");
  writeFileSync(join(papers, "with-fig", "figure.py"), `import argparse, base64\np = argparse.ArgumentParser()\nfor k in ("--session", "--run", "--expected", "--out"):\n    p.add_argument(k)\na = p.parse_args()\nopen(a.out, "wb").write(base64.b64decode("${PNG}"))\n`);
  results = join(root, "r.json");
  writeFileSync(results, JSON.stringify({ date: "2026-10-08", models: ["ollama:m1", "claude"], runsPerCell: 1, problems: [], runs: [run("with-fig", "ollama:m1", true), run("no-fig", "ollama:m1", false), run("no-fig", "claude", true)] }));
});

test("builds the page, the matrix and the cards", () => {
  const out = join(root, "site");
  const info = buildSite({ results: [results], out, papersDir: papers, python: existsSync(SCIENCE) ? SCIENCE : "python3" });
  const html = readFileSync(join(out, "index.html"), "utf8");
  expect(info.papers).toBe(3);
  expect(html).toContain("<title>Paper Benchmark</title>");
  expect(html).toContain('<table class="matrix">');
  expect(html).toContain('id="p-with-fig"');
  expect(html).toContain('id="p-no-fig"');
  expect(html).toContain("Title of with-fig");
  expect(html).toContain('class="cell pending"');
  expect(html).toContain('class="cell all"');
  expect(html).toContain('class="cell part"');
  expect(html).toContain("Claude cost");
  expect(html).toContain("The tool crashed.");
  expect(html).toContain("prefers-color-scheme:dark");
  expect(html).toContain("loading=\"lazy\"");
  expect(html).not.toContain("x".repeat(401));
  expect(html.length).toBeLessThan(2_000_000);
});

test("uses figure.py when present and writes image files", () => {
  const out = join(root, "site");
  const imgs = readdirSync(join(out, "img"));
  expect(imgs.some((f) => f.startsWith("with-fig-"))).toBe(true);
  const stub = readFileSync(join(out, "img", imgs.find((f) => f.startsWith("with-fig-"))!));
  expect(stub.subarray(1, 4).toString()).toBe("PNG");
});

test.skipIf(!existsSync(SCIENCE))("draws the fallback figure when figure.py is missing", () => {
  const out = join(root, "site");
  const imgs = readdirSync(join(out, "img")).filter((f) => f.startsWith("no-fig-"));
  expect(imgs).toHaveLength(2);
  for (const f of imgs) expect(readFileSync(join(out, "img", f)).subarray(1, 4).toString()).toBe("PNG");
});

test("reuses cached figures on a second build", () => {
  const out = join(root, "site");
  const before = readdirSync(join(out, "img")).sort();
  buildSite({ results: [results], out, papersDir: papers, python: "/nonexistent" });
  expect(readdirSync(join(out, "img")).sort()).toEqual(before);
});
