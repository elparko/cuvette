import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { chmodSync, cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { afterAll, afterEach, beforeAll, describe, expect, test, vi } from "vitest";
import { adapterDirs, CATALOG_DIR, loadAdapter } from "../src/adapters/manifest.ts";
import { dataFile, dataGaps, dataNotice, homeDataDir, provideData } from "../src/adapters/testdata.ts";
import { listPrograms } from "../src/core/programs.ts";
import { checkAdapter } from "../src/onboarding/checker.ts";

const A_CSV = "x\n1\n2\n3\n";
const sha = (s: string) => createHash("sha256").update(s).digest("hex");
const SLOW = 300_000;
const CUVETTE = join(__dirname, "..", "bin/cuvette.js");

const YAML = [
  "adapter: { name: datafix, title: Data fixture, version: 0.1.0, description: A test adapter., field: statistics, file_types: ['.csv'] }",
  "program: { name: sh, version: '1.0', install: Install sh., citation: [{ text: 'Doe, J. (2020). sh. Journal of Examples, 1, 1.', doi: 10.1234/sh }] }",
  "connection: { kind: script, interpreter: ['{program_path}'] }",
  "locate: { which: [sh], version_command: ['{program_path}', '-c', 'echo sh 1.0'], version_pattern: 'sh (\\S+)', identity: 'sh \\d' }",
  "map:",
  "  - { tool: run, route: 'wc -l {x}', fidelity: close, difference: route not tested, summary: 'lines {metrics.n}' }",
  "tests:",
  "  - { id: indexed, data: [data/a.csv], calls: [{ tool: run, args: { x: '{adapter_dir}/data/a.csv' } }], expect: [{ path: metrics.n, equals: 4 }] }",
  "  - { id: made, data: [data/made.txt], fetch: data/fetch.sh, calls: [{ tool: run, args: { x: '{adapter_dir}/data/made.txt' } }], expect: [{ path: metrics.n, equals: 2 }] }",
  "  - { id: nofile, calls: [{ tool: run, args: { x: '{adapter_dir}/data/nothing.csv' } }], expect: [{ path: ok, equals: false }] }",
  "tools:",
  "  - { name: run, title: Run, description: Count the lines of one file., params: { x: { type: string, description: Absolute path of the file. } }, script: scripts/run.sh, parse: json }",
].join("\n");

const RUN = `f=$(sed -n 's/.*"x": *"\\([^"]*\\)".*/\\1/p' "$1")\nset -- "$f"\n[ -f "$1" ] || { echo '{"ok": false, "error": "the file does not exist"}'; exit 0; }\nn=$(wc -l < "$1" | tr -d ' ')\necho "{\\"ok\\": true, \\"metrics\\": {\\"n\\": $n}}"\n`;
const FETCH = `#!/usr/bin/env bash\nset -e\ncd "$(dirname "$0")"\nprintf 'a\\nb\\n' > made.txt\nshasum -a 256 made.txt > /dev/null\ntouch fetch-ran\n`;

let tmp: string;
let n = 0;

beforeAll(() => {
  tmp = mkdtempSync(join(tmpdir(), "cuvette-testdata-"));
  process.env.CUVETTE_HOME = join(tmp, "home");
});
afterAll(() => rmSync(tmp, { recursive: true, force: true }));
afterEach(() => vi.unstubAllGlobals());

function fixture(opts: { fetch?: string; withData?: boolean } = {}): string {
  const dir = join(tmp, `datafix${++n}`);
  mkdirSync(join(dir, "scripts"), { recursive: true });
  mkdirSync(join(dir, "data"), { recursive: true });
  writeFileSync(join(dir, "adapter.yaml"), YAML);
  writeFileSync(join(dir, "STANDARDS.md"), "Report the count with each file.\n");
  writeFileSync(join(dir, "scripts", "run.sh"), RUN);
  writeFileSync(join(dir, "data", "fetch.sh"), opts.fetch ?? FETCH);
  writeFileSync(join(dir, "data", "SOURCES.md"), "| File | Source | License |\n| --- | --- | --- |\n| a.csv | Written by hand for the test. | synthetic |\n| made.txt | Made by data/fetch.sh. | synthetic |\n");
  writeFileSync(join(dir, "data", "files.json"), JSON.stringify({ "data/a.csv": { sha256: sha(A_CSV), bytes: A_CSV.length } }));
  if (opts.withData) {
    writeFileSync(join(dir, "data", "a.csv"), A_CSV);
    writeFileSync(join(dir, "data", "made.txt"), "a\nb\n");
  }
  return dir;
}

function stubFetch(body: string | (() => string) = A_CSV) {
  const urls: string[] = [];
  vi.stubGlobal("fetch", async (url: string) => {
    urls.push(String(url));
    return new Response(typeof body === "function" ? body() : body);
  });
  return urls;
}

describe("a check of an adapter whose test data is not installed", () => {
  test("it asks before it fetches, and the question names the adapter, the files, the source and the size", async () => {
    const dir = fixture();
    const urls = stubFetch();
    const seen: string[][] = [];
    await checkAdapter(dir, { runTests: true, fetchData: async (notice) => (seen.push(notice), false) });
    expect(seen).toHaveLength(1);
    const text = seen[0].join("\n");
    expect(text).toContain("datafix");
    expect(text).toContain("data/a.csv");
    expect(text).toContain("data/made.txt");
    expect(text).toContain("Written by hand for the test.");
    expect(text).toContain("Fetch script: data/fetch.sh");
    expect(urls).toEqual([]);
    expect(existsSync(join(dir, "data", "fetch-ran"))).toBe(false);
  });

  test("the size shows if every file is listed in data/files.json", () => {
    const a = loadAdapter(fixture());
    const only = dataGaps(a, a.manifest.tests.filter((t) => t.id === "indexed"));
    expect(dataNotice(a, only).join("\n")).toContain(`Size: ${A_CSV.length} bytes.`);
    expect(dataNotice(a, dataGaps(a, a.manifest.tests)).join("\n")).not.toContain("Size:");
  });

  test("a decline gives no adapter error, and the tests that need the data do not run", async () => {
    const dir = fixture();
    const urls = stubFetch();
    const r = await checkAdapter(dir, { runTests: true, fetchData: async () => false });
    expect(r.errors).toEqual([]);
    expect(r.ok).toBe(true);
    expect(r.tests!.filter((t) => t.skipped).map((t) => t.id)).toEqual(["indexed", "made"]);
    expect(r.tests!.find((t) => t.id === "nofile")).toMatchObject({ ok: true });
    expect(r.tests!.find((t) => t.id === "nofile")!.skipped).toBeUndefined();
    expect(r.warnings.join("\n")).toContain('test "indexed" did not run');
    expect(urls).toEqual([]);
    expect(existsSync(join(dir, "data", "a.csv"))).toBe(false);
    expect(existsSync(join(dir, "data", "fetch-ran"))).toBe(false);
  });

  test.skipIf(process.platform === "win32")("an accepted question fetches the data of this adapter only", async () => {
    const dir = fixture();
    const other = fixture();
    const urls = stubFetch();
    const r = await checkAdapter(dir, { runTests: true, fetchData: async () => true });
    expect(r.errors).toEqual([]);
    expect(r.tests!.map((t) => [t.id, t.ok, !!t.skipped])).toEqual([["indexed", true, false], ["made", true, false], ["nofile", true, false]]);
    expect(urls).toHaveLength(1);
    expect(urls[0]).toMatch(/\/catalog\/datafix\d+\/data\/a\.csv$/);
    expect(readFileSync(join(dir, "data", "a.csv"), "utf8")).toBe(A_CSV);
    expect(existsSync(join(dir, "data", "fetch-ran"))).toBe(true);
    expect(readdirSync(join(other, "data")).sort()).toEqual(["SOURCES.md", "fetch.sh", "files.json"]);
  });

  test("a check with all data present asks nothing and fetches nothing", async () => {
    const dir = fixture({ withData: true });
    const urls = stubFetch();
    const ask = vi.fn(async () => true);
    const r = await checkAdapter(dir, { runTests: true, fetchData: ask });
    expect(ask).not.toHaveBeenCalled();
    expect(urls).toEqual([]);
    expect(r.tests!.every((t) => t.ok && !t.skipped)).toBe(true);
  });

  test("a check with no fetchData option keeps the old behavior and does not download from the network", async () => {
    const dir = fixture();
    const urls = stubFetch();
    await checkAdapter(dir, { runTests: true });
    expect(urls).toEqual([]);
  });

  test("a static check does not report the missing data file of a listed file as an error", async () => {
    const r = await checkAdapter(fixture(), { static: true });
    expect(r.errors.filter((e) => e.includes("data file"))).toEqual([]);
    const bare = fixture();
    rmSync(join(bare, "data", "files.json"));
    expect((await checkAdapter(bare, { static: true })).errors.join("\n")).toContain('data file "data/a.csv" does not exist');
  });
});

describe("a corrupt download", () => {
  test("is refused, and no file is saved", async () => {
    const dir = fixture();
    stubFetch("x\n9\n9\n9\n");
    const a = loadAdapter(dir);
    const [gap] = dataGaps(a, a.manifest.tests.filter((t) => t.id === "indexed"));
    const got = await provideData(a, gap);
    expect(got.error).toContain("does not match the SHA-256 sum");
    expect(readdirSync(join(dir, "data")).sort()).toEqual(["SOURCES.md", "fetch.sh", "files.json"]);
  });

  test("the check shows it as a failed test, not as a test that did not run", async () => {
    const dir = fixture();
    stubFetch("x\n9\n9\n9\n");
    const r = await checkAdapter(dir, { runTests: true, fetchData: async () => true });
    expect(r.errors.join("\n")).toContain('test "indexed" failed: the download of data/a.csv does not match');
    expect(existsSync(join(dir, "data", "a.csv"))).toBe(false);
  });

  test("a fetch script that stops on a checksum mismatch is refused too", async () => {
    const dir = fixture({ fetch: "#!/usr/bin/env bash\necho 'checksum mismatch: made.txt' >&2\nexit 1\n" });
    stubFetch();
    const r = await checkAdapter(dir, { runTests: true, fetchData: async () => true });
    expect(r.errors.join("\n")).toContain("checksum mismatch: made.txt");
    expect(existsSync(join(dir, "data", "made.txt"))).toBe(false);
  });
});

describe("where the download is saved", () => {
  const gapOf = (dir: string) => {
    const a = loadAdapter(dir);
    return { a, gap: dataGaps(a, a.manifest.tests.filter((t) => t.id === "indexed"))[0] };
  };

  test("a writable package folder gets the file", async () => {
    const dir = fixture();
    stubFetch();
    const { a, gap } = gapOf(dir);
    expect(await provideData(a, gap)).toEqual({});
    expect(readFileSync(join(dir, "data", "a.csv"), "utf8")).toBe(A_CSV);
    expect(existsSync(homeDataDir(dir))).toBe(false);
  });

  test.skipIf(process.platform === "win32" || process.getuid?.() === 0)("a read-only package folder sends the file to the home folder", async () => {
    const dir = fixture();
    stubFetch();
    const { a, gap } = gapOf(dir);
    chmodSync(join(dir, "data"), 0o500);
    try {
      expect(await provideData(a, gap)).toEqual({});
    } finally {
      chmodSync(join(dir, "data"), 0o700);
    }
    expect(existsSync(join(dir, "data", "a.csv"))).toBe(false);
    expect(readFileSync(join(homeDataDir(dir), "data", "a.csv"), "utf8")).toBe(A_CSV);
    expect(dataFile(dir, "data/a.csv")).toBe(join(homeDataDir(dir), "data", "a.csv"));
    expect(dataGaps(a, a.manifest.tests.filter((t) => t.id === "indexed"))).toEqual([]);
  });

  test.skipIf(process.platform === "win32" || process.getuid?.() === 0)("if both folders fail, the message names the home folder", async () => {
    const dir = fixture();
    stubFetch();
    const { a, gap } = gapOf(dir);
    mkdirSync(join(homeDataDir(dir), ".."), { recursive: true });
    chmodSync(join(dir, "data"), 0o500);
    chmodSync(join(homeDataDir(dir), ".."), 0o500);
    try {
      const got = await provideData(a, gap);
      expect(got.error).toContain(homeDataDir(dir));
    } finally {
      chmodSync(join(dir, "data"), 0o700);
      chmodSync(join(homeDataDir(dir), ".."), 0o700);
    }
  });
});

describe("the download request", () => {
  test("a 404 for the version tag is a skip with a plain message", async () => {
    const dir = fixture();
    vi.stubGlobal("fetch", async () => new Response("Not Found", { status: 404 }));
    const a = loadAdapter(dir);
    const [gap] = dataGaps(a, a.manifest.tests.filter((t) => t.id === "indexed"));
    const version = JSON.parse(readFileSync(join(__dirname, "..", "package.json"), "utf8")).version;
    expect(await provideData(a, gap)).toEqual({ skip: `The data files for version ${version} are not published yet.` });
  });

  test("a body larger than the indexed size plus 1 KB is stopped", async () => {
    const dir = fixture();
    vi.stubGlobal("fetch", async () => new Response("x".repeat(A_CSV.length + 2048)));
    const a = loadAdapter(dir);
    const [gap] = dataGaps(a, a.manifest.tests.filter((t) => t.id === "indexed"));
    const got = await provideData(a, gap);
    expect(got.error).toContain("larger than the size in data/files.json");
    expect(existsSync(join(dir, "data", "a.csv"))).toBe(false);
  });

  test("it prints one line for each file", async () => {
    const dir = fixture();
    stubFetch();
    const write = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    const a = loadAdapter(dir);
    const [gap] = dataGaps(a, a.manifest.tests.filter((t) => t.id === "indexed"));
    await provideData(a, gap);
    const lines = write.mock.calls.map((c) => String(c[0]));
    write.mockRestore();
    expect(lines).toEqual([`Downloading data/a.csv (${A_CSV.length} bytes)...\n`]);
  });
});

describe("no network", () => {
  test.skipIf(process.platform === "win32")("a download that cannot reach the network is reported as not run", async () => {
    const dir = fixture();
    vi.stubGlobal("fetch", async () => {
      throw new TypeError("fetch failed");
    });
    const r = await checkAdapter(dir, { runTests: true, fetchData: async () => true });
    expect(r.errors).toEqual([]);
    expect(r.tests!.find((t) => t.id === "indexed")!.skipped).toContain("could not be downloaded");
  });
});

describe.skipIf(process.platform === "win32")("cuvette adapter check from the command line", () => {
  const run = (dir: string, ...flags: string[]) => spawnSync("node", [CUVETTE, "adapter", "check", dir, "--run-tests", ...flags], { cwd: tmp, env: { ...process.env, CUVETTE_HOME: join(tmp, "home"), CUVETTE_NO_OPEN: "1" }, encoding: "utf8", input: "", timeout: 120_000 });

  test("a run without a terminal and without --fetch-data downloads nothing and exits 0", () => {
    const dir = fixture();
    const r = run(dir);
    expect(r.stdout).toContain("need data that the computer does not have");
    expect(r.stdout).toContain("Nothing was downloaded. To download this data, run the check again with --fetch-data.");
    expect(r.stdout).toMatch(/skip made: /);
    expect(r.stdout).not.toMatch(/FAIL/);
    expect(r.status).toBe(0);
    expect(existsSync(join(dir, "data", "fetch-ran"))).toBe(false);
  }, SLOW);

  test("--fetch-data runs the fetch script of this adapter only", () => {
    const dir = fixture();
    writeFileSync(join(dir, "data", "a.csv"), A_CSV);
    const other = fixture();
    const r = run(dir, "--fetch-data");
    expect(r.stdout).toContain("pass made");
    expect(r.status).toBe(0);
    expect(existsSync(join(dir, "data", "fetch-ran"))).toBe(true);
    expect(existsSync(join(other, "data", "fetch-ran"))).toBe(false);
  }, SLOW);
});

describe("the list of all adapters", () => {
  test("it does not need a data folder", async () => {
    const adapters = join(tmp, "home", "adapters");
    mkdirSync(adapters, { recursive: true });
    for (const name of readdirSync(CATALOG_DIR)) {
      if (!existsSync(join(CATALOG_DIR, name, "adapter.yaml"))) continue;
      cpSync(join(CATALOG_DIR, name), join(adapters, name), { recursive: true, filter: (src) => !/[\\/]data([\\/]|$)/.test(src) && !/[\\/]checks([\\/]|$)/.test(src) });
    }
    const dirs = adapterDirs(tmp);
    const names = Object.keys(dirs);
    expect(names.length).toBeGreaterThanOrEqual(60);
    for (const name of names) {
      expect(dirs[name].startsWith(adapters)).toBe(true);
      expect(existsSync(join(dirs[name], "data"))).toBe(false);
      loadAdapter(dirs[name]);
    }
    const rows = await listPrograms({ quick: true, cwd: tmp });
    expect(rows.length).toBe(names.length);
    expect(rows.map((r) => r.name).sort()).toEqual(names.sort());
    rmSync(adapters, { recursive: true, force: true });
  }, SLOW);
});

describe("the catalog data folders", () => {
  const catalogNames = readdirSync(CATALOG_DIR).filter((d) => existsSync(join(CATALOG_DIR, d, "adapter.yaml")));

  test("data/files.json lists the committed data files with their SHA-256 sums", async () => {
    const { dataIndex: build, indexText } = (await import(pathToFileURL(join(__dirname, "../scripts/data-index.mjs")).href)) as { dataIndex(catalog: string, name: string): Record<string, unknown>; indexText(index: Record<string, unknown>): string };
    for (const name of catalogNames) {
      const want = build(CATALOG_DIR, name);
      const file = join(CATALOG_DIR, name, "data", "files.json");
      if (!Object.keys(want).length) expect(existsSync(file), name).toBe(false);
      else expect(readFileSync(file, "utf8"), `${name}: run node scripts/data-index.mjs`).toBe(indexText(want));
    }
  });

  test("the package has the self-test data, the sources, the fetch scripts and the index, and no other test data", () => {
    const r = spawnSync("npm", ["pack", "--dry-run", "--json", "--ignore-scripts"], { shell: process.platform === "win32", cwd: join(__dirname, ".."), encoding: "utf8", timeout: 280_000, maxBuffer: 1 << 26 });
    const pack = JSON.parse(r.stdout)[0] as { files: { path: string; size: number }[]; unpackedSize: number };
    const inPack = new Set(pack.files.map((f) => f.path));
    const dataFiles = [...inPack].filter((p) => /^catalog\/[^/]+\/data\//.test(p));
    const allowed = /^catalog\/[^/]+\/data\/(SOURCES\.md|files\.json|fetch[^/]*\.sh)$/;
    const selfTestFiles = new Set<string>();
    for (const name of catalogNames) {
      const dir = join(CATALOG_DIR, name);
      const a = loadAdapter(dir);
      for (const f of existsSync(join(dir, "data")) ? readdirSync(join(dir, "data")).filter((x) => /^fetch[^/]*\.sh$/.test(x)) : []) expect(inPack.has(`catalog/${name}/data/${f}`), `${name}/${f}`).toBe(true);
      for (const t of a.manifest.tests.filter((x) => x.self_test)) {
        const refs = [...JSON.stringify(t.calls).matchAll(/\{adapter_dir\}\/(data\/[^"{}*?\s]+)/g)].map((x) => x[1]);
        for (const f of [...t.data, ...refs]) selfTestFiles.add(`catalog/${name}/${f.replace(/^\.\//, "")}`);
      }
      if (existsSync(join(dir, "data", "SOURCES.md"))) expect(inPack.has(`catalog/${name}/data/SOURCES.md`), name).toBe(true);
      if (existsSync(join(dir, "data", "files.json"))) expect(inPack.has(`catalog/${name}/data/files.json`), name).toBe(true);
    }
    expect(selfTestFiles.size).toBeGreaterThanOrEqual(10);
    for (const f of selfTestFiles) expect(inPack.has(f), f).toBe(true);
    expect(dataFiles.filter((p) => !allowed.test(p) && !selfTestFiles.has(p))).toEqual([]);
    expect(pack.unpackedSize).toBeLessThan(15_000_000);
  }, SLOW);
});
