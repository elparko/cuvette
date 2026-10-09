import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, expect, test } from "vitest";
import { blindPolicy, canonical } from "../src/adapters/blind.ts";
import { blindPolicyFor, dataFolders, leakCheck, REPO_DIR } from "../src/bench/papers-blind.ts";
import { runPapers } from "../src/bench/papers.ts";
import { loadPaper } from "../src/bench/papers-spec.ts";
import type { Entry } from "../src/core/types.ts";
import { FakeProvider } from "../src/providers/fake.ts";

const LAB = join(__dirname, "fixtures/lab");
let root: string;
let papersDir: string;
const oldHome = process.env.CUVETTE_HOME;
const oldData = process.env.CUVETTE_BENCH_DATA;

beforeEach(() => {
  root = canonical(mkdtempSync(join(tmpdir(), "cuvette-blindbench-")));
  papersDir = join(root, "papers");
  process.env.CUVETTE_HOME = join(root, "home");
  process.env.CUVETTE_BENCH_DATA = join(root, "data");
  mkdirSync(join(root, "data/lab"), { recursive: true });
  writeFileSync(join(root, "data/lab/a.tif"), "x");
  mkdirSync(join(papersDir, "lab-count"), { recursive: true });
  const spec = {
    adapters: [LAB],
    prompt: "Count the particles in {data}/lab/a.tif and tell me the number.",
    answers: { method: "Triangle" },
    data: ["lab/a.tif"],
    timeout_s: 60,
    items: [{ key: "count", description: "Particles", value: 66, exact: true }],
  };
  writeFileSync(join(papersDir, "lab-count", "bench.yaml"), JSON.stringify(spec));
  writeFileSync(join(papersDir, "lab-count", "expected.yaml"), "count: 66\n");
});
afterEach(() => {
  if (oldHome === undefined) delete process.env.CUVETTE_HOME;
  else process.env.CUVETTE_HOME = oldHome;
  if (oldData === undefined) delete process.env.CUVETTE_BENCH_DATA;
  else process.env.CUVETTE_BENCH_DATA = oldData;
});

const options = () => ({ papersDir, scratch: join(root, "scratch"), resultsDir: join(root, "results"), log: () => {} });

function agent(expected: string) {
  return new FakeProvider([
    { calls: [{ name: "read_file", args: { path: expected } }] },
    { calls: [{ name: "list_dir", args: { path: join(root, "data/lab") } }] },
    { calls: [{ name: "read_file", args: { path: "../../../../../../../../papers/lab-count/expected.yaml" } }] },
    { text: "I could not read the file. The folder holds a.tif." },
  ]);
}

test("the policy allows the data folder and the run folder and denies the specs, results, scratch, repo and harness home", () => {
  const paper = loadPaper("lab-count", papersDir);
  expect(dataFolders(paper)).toEqual([join(root, "data", "lab-count"), join(root, "data", "lab")]);
  const runDir = join(root, "scratch", "m", "lab-count", "run1");
  const p = blindPolicyFor({ paper, runDir, scratch: join(root, "scratch"), home: join(homedir(), ".cuvette"), adapterRoots: [LAB], programs: [], papersDir, resultsDir: join(root, "results") });
  expect(p.allow).toEqual(expect.arrayContaining([join(root, "data", "lab"), runDir, LAB, tmpdir()]));
  expect(p.deny).toEqual(expect.arrayContaining([REPO_DIR, papersDir, join(root, "results"), join(root, "scratch"), join(homedir(), ".cuvette"), join(homedir(), ".claude")]));
});

test("a blind run blocks reads of the expected values, logs them, sets cwd to the work folder, and reports the leak check", async () => {
  const expected = join(papersDir, "lab-count", "expected.yaml");
  const result = await runPapers({ ...options(), papers: ["lab-count"], models: ["fake:blind"], providerFor: () => agent(expected) });
  const run = result.runs[0];
  expect(blindPolicy()).toBeUndefined();
  expect(run.blind?.cwd).toBe(join(run.dir!, "work"));
  const log = readFileSync(join(run.dir!, "log.jsonl"), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l) as Entry);
  expect(log.find((e) => e.kind === "session")?.data.cwd).toBe(run.blind!.cwd);
  const blocked = log.filter((e) => e.kind === "blocked" && e.data.reason === "blind mode");
  expect(blocked.map((e) => e.data.path)).toEqual([expected, expected]);
  const results = log.filter((e) => e.kind === "tool_result");
  expect(results.map((e) => e.data.ok)).toEqual([false, true, false]);
  expect(JSON.stringify(results)).not.toContain("count: 66");
  expect(run.leaks).toMatchObject({ blocked: 2, outside: [expected] });
  expect(run.leaks!.read).toEqual(expect.arrayContaining([expected, join(root, "data/lab")]));
  const json = JSON.parse(readFileSync(result.paths!.json, "utf8"));
  expect(json.blind).toBe(true);
  expect(json.runs[0].leaks.blocked).toBe(2);
  const md = readFileSync(result.paths!.md, "utf8");
  expect(md).toContain("## Leak check");
  expect(md).toMatch(/\| lab-count \| fake:blind \| 1 \| (on|off) \| \d+ \| 1 \| 2 \| 0 \| 0 \|/);
  expect(md).toContain(`Paths outside the allow list:\n- lab-count | fake:blind | run 1: ${expected}`);
});

test("with blind mode off the run keeps the old behavior and the report says so", async () => {
  const expected = join(papersDir, "lab-count", "expected.yaml");
  const result = await runPapers({ ...options(), blind: false, papers: ["lab-count"], models: ["fake:open"], providerFor: () => agent(expected) });
  const run = result.runs[0];
  expect(run.blind).toBeUndefined();
  expect(run.leaks).toBeUndefined();
  const log = readFileSync(join(run.dir!, "log.jsonl"), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l) as Entry);
  expect(log.find((e) => e.kind === "session")?.data.cwd).toBe(process.cwd());
  expect(log.some((e) => e.kind === "blocked")).toBe(false);
  expect(readFileSync(result.paths!.md, "utf8")).toContain("Blind mode was off");
});

test("the leak check flags paths outside the allow list and counts unsourced and literature claims", () => {
  const entries = [
    { id: 1, kind: "session", data: { cwd: "/run/work" } },
    { id: 2, kind: "tool_call", data: { tool: "read_file", args: { path: "notes.txt" } } },
    { id: 3, kind: "tool_call", data: { tool: "run_script", args: { code: "open('/data/p/in.csv'); open('/repo/bench/p/expected.yaml')" } } },
    { id: 4, kind: "blocked", data: { reason: "blind mode", path: "/repo/bench/p/expected.yaml" } },
    { id: 5, kind: "blocked", data: { reason: "waiting for the scientist: method" } },
    { id: 6, kind: "claim_check", data: { claims: [{ label: "measured", value: 1 }, { label: "unsourced", value: 0.75 }, { label: "literature", value: 1.1 }] } },
    { id: 7, kind: "assistant", data: { final: true, text: "R2 0.75" } },
  ] as unknown as Entry[];
  const record = { entries: (kinds?: string[]) => entries.filter((e) => !kinds || kinds.includes(e.kind)), live: (kinds?: string[]) => entries.filter((e) => !kinds || kinds.includes(e.kind)), nodes: () => [] };
  const k = leakCheck(record, { allow: ["/run", "/data/p"], deny: ["/repo"] });
  expect(k.read).toEqual(["/data/p/in.csv", "/repo/bench/p/expected.yaml", "/run/work/notes.txt"]);
  expect(k.outside).toEqual(["/repo/bench/p/expected.yaml"]);
  expect(k).toMatchObject({ blocked: 1, unsourced: 1, literature: 1 });
});

test("a blind run writes results.xlsx in the run folder, not in the data folder, and the leak check stays clean", async () => {
  const counted = () => new FakeProvider([{ calls: [{ name: "count", args: { input: join(root, "data/lab/a.tif") } }] }, { text: "There are 66 particles (step 1)." }]);
  const result = await runPapers({ ...options(), papers: ["lab-count"], models: ["fake:xlsx"], providerFor: counted });
  const run = result.runs[0];
  expect(run.dir!.startsWith(join(root, "scratch"))).toBe(true);
  expect(existsSync(join(run.dir!, "work", "results.xlsx"))).toBe(true);
  expect(readdirSync(join(root, "data/lab"))).toEqual(["a.tif"]);
  expect(run.leaks).toMatchObject({ blocked: 0, outside: [] });
});
