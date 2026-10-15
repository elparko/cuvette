import { execFileSync } from "node:child_process";
import { chmodSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, beforeEach, expect, test } from "vitest";
import { adapterDirs, loadAdapter, Manifest as ManifestSchema, type LoadedAdapter, type Manifest } from "../src/adapters/manifest.ts";
import { canStart, doctorText, older, rInstallCommand, runDoctor, runSelfTests, safeFixes, selfTestText, uvCommand, type Check, type DoctorOpts } from "../src/core/doctor.ts";

const oldHome = process.env.CUVETTE_HOME;
const oldPath = process.env.PATH;
let root = "";
let home = "";

const IMAGEJ_JAVA = `for a in "$@"; do case "$a" in *.jar) n=$(basename "$a" .jar); v=\${n#ij-}; [ "$v" = "ij" ] && v=1.53k; echo "ImageJ version=$v"; exit 0 ;; esac; done; echo 'openjdk version "17.0.18"' >&2`;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "cuvette-doctor-"));
  home = join(root, ".cuvette");
  mkdirSync(home, { recursive: true });
  process.env.CUVETTE_HOME = home;
  exe(join(root, "pathbin/java"), IMAGEJ_JAVA);
  process.env.PATH = `${join(root, "pathbin")}:${oldPath}`;
});
afterEach(() => {
  if (oldHome === undefined) delete process.env.CUVETTE_HOME;
  else process.env.CUVETTE_HOME = oldHome;
  process.env.PATH = oldPath;
});

function exe(path: string, body: string): string {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `#!/bin/sh\n${body}\n`);
  chmodSync(path, 0o755);
  return path;
}

function touch(path: string): string {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, "");
  return path;
}

const real = (name: string) => loadAdapter(adapterDirs()[name]!).manifest;

function moved(name: string, map: (p: string) => string): Manifest {
  const m = real(name);
  return { ...m, locate: { ...m.locate, env: "", which: [], paths: m.locate.paths.map(map) } };
}

const intoRoot = (p: string) => (p.startsWith("~/") ? join(root, "home", p.slice(2)) : p.startsWith("/") ? join(root, p) : join(root, "none"));

const ollamaUp = (async () => new Response(JSON.stringify({ models: [{ name: "qwen3:8b" }] }))) as unknown as typeof fetch;
const ollamaDown = (async () => {
  throw new Error("ECONNREFUSED");
}) as unknown as typeof fetch;

const javaOk = () => exe(join(root, "bin/java"), `echo 'openjdk version "17.0.18" 2026-01-20' >&2`);
const rscript = (version: string, pkgs: string) => exe(join(root, "bin/Rscript"), `if [ "$1" = "--version" ]; then echo "Rscript (R) version ${version} (2026-06-01)"; else printf '${pkgs}'; fi`);
const python = (env: string, imports: string, version: string) =>
  exe(join(home, "envs", env, "bin/python"), `case "$*" in *find_spec*) printf '${imports}' ;; *) echo ${version} ;; esac`);

const byId = (c: Check[], id: string) => c.find((x) => x.id === id)!;

function base(over: Partial<DoctorOpts> = {}): DoctorOpts {
  return { home, env: { ANTHROPIC_API_KEY: "sk-ant-test" }, nodeVersion: "24.1.0", fetch: ollamaUp, adapters: {}, find: () => undefined, ...over };
}

test("found: every item is ok, ImageJ.app is found, and the text says Cuvette can start", async () => {
  const java = javaOk();
  const r = rscript("4.6.1", "lme4 2.0.6 \\nlmerTest 3.2.1 \\n");
  const uv = exe(join(root, "bin/uv"), "echo uv 0.9");
  python("science", "numpy True\\npandas True\\n", "");
  python("biostats", "statsmodels True\\nlifelines True\\n", "lifelines 0.30.3");
  touch(join(root, "Applications/ImageJ.app/Contents/Java/ij.jar"));
  const bin = { java, Rscript: r, uv, ollama: undefined } as Record<string, string | undefined>;
  const checks = await runDoctor(base({
    find: (n) => bin[n],
    adapters: { imagej: moved("imagej", intoRoot), lme4: moved("lme4", () => r), biostats: moved("biostats", (p) => p.replace("~/.cuvette", home)) },
  }));
  for (const c of checks) expect(c.status, `${c.id}: ${c.detail}`).toBe("ok");
  expect(byId(checks, "java").detail).toBe("version 17.0.18");
  expect(byId(checks, "r").detail).toBe("version 4.6.1");
  expect(byId(checks, "r:lme4").detail).toBe("lme4 2.0.6, lmerTest 3.2.1");
  expect(byId(checks, "program:imagej").detail).toContain("Applications/ImageJ.app/Contents/Java/ij.jar");
  expect(byId(checks, "program:biostats").detail).toContain("0.30.3");
  expect(canStart(checks)).toBe(true);
  const text = doctorText(checks);
  expect(text).toContain("  ok       Node: version 24.1.0");
  expect(text).toContain("Cuvette can start");
  expect(text).not.toContain("Install:");
});

test("found: the locate list finds Fiji and reads the version from the jar name", async () => {
  touch(join(root, "Applications/Fiji.app/jars/ij-1.54f.jar"));
  const checks = await runDoctor(base({ adapters: { imagej: moved("imagej", intoRoot) } }));
  const c = byId(checks, "program:imagej");
  expect(c.status).toBe("ok");
  expect(c.detail).toContain("ImageJ 1.54f");
  expect(c.detail).toContain("Fiji.app/jars/ij-1.54f.jar");
});

test("missing: each item gives the exact install command or a download link", async () => {
  const java = exe(join(root, "bin/java"), `echo "The operation couldn't be completed. Unable to locate a Java Runtime." >&2; exit 1`);
  const checks = await runDoctor(base({
    env: {},
    fetch: ollamaDown,
    find: (n) => (n === "java" ? java : undefined),
    adapters: { samtools: moved("samtools", intoRoot), sage: moved("sage", intoRoot), lme4: moved("lme4", intoRoot), biostats: moved("biostats", (p) => p.replace("~/.cuvette", home)) },
  }));
  const st = (id: string) => byId(checks, id).status;
  for (const id of ["claude-key", "ollama", "uv", "java", "r", "env:science", "program:samtools", "program:sage", "program:biostats", "program:lme4"]) expect(st(id), id).toBe("missing");
  expect(st("node")).toBe("ok");
  expect(canStart(checks)).toBe(false);
  const text = doctorText(checks);
  expect(text).toContain("  missing  uv: the Python package manager. It installs the Python environments.\n           Install: brew install uv");
  expect(text).toContain("Install: brew install --cask temurin");
  expect(text).toContain("Install: brew install r\n           Or download: https://cran.r-project.org/bin/macosx/");
  expect(text).toContain("Install: brew install samtools");
  expect(text).toContain("Download: https://github.com/lazear/sage/releases");
  expect(text).toContain("Install: brew install ollama && ollama pull qwen3:8b");
  expect(text).toContain("Install: cuvette key");
  expect(text).toContain(`Install: ${uvCommand(home, "science")}`);
  expect(text).toContain(`Install: ${uvCommand(home, "biostats")}`);
  expect(text).toContain("Cuvette cannot start yet");
  expect(safeFixes(checks)).toEqual([]);
});

test("the Ollama check uses the shared host: no scheme, default port 11434", async () => {
  const seen: string[] = [];
  const spy = (async (u: string) => {
    seen.push(String(u));
    return new Response(JSON.stringify({ models: [{ name: "qwen3:8b" }] }));
  }) as unknown as typeof fetch;
  const c = await runDoctor(base({ fetch: spy, env: { ANTHROPIC_API_KEY: "sk-ant-test", OLLAMA_HOST: "127.0.0.1" } }));
  expect(seen).toEqual(["http://127.0.0.1:11434/api/tags"]);
  expect(byId(c, "ollama").status).toBe("ok");
});

test("missing: Ollama runs without a model, or is installed but stopped", async () => {
  const empty = (async () => new Response(JSON.stringify({ models: [] }))) as unknown as typeof fetch;
  let c = await runDoctor(base({ fetch: empty }));
  expect(byId(c, "ollama")).toMatchObject({ status: "missing", fix: { command: "ollama pull qwen3:8b" } });
  c = await runDoctor(base({ fetch: ollamaDown, find: (n) => (n === "ollama" ? "/usr/local/bin/ollama" : undefined) }));
  expect(byId(c, "ollama")).toMatchObject({ status: "missing", fix: { command: "open -a Ollama" } });
  expect(canStart(c)).toBe(true);
});

test("old: Node, Java, R and a program older than the tested version", async () => {
  const java = exe(join(root, "bin/java"), `echo 'java version "1.6.0_65"' >&2`);
  const r = rscript("4.2.0", "");
  touch(join(root, "Applications/Fiji.app/jars/ij-1.52a.jar"));
  const checks = await runDoctor(base({ nodeVersion: "20.11.0", find: (n) => (({ java, Rscript: r }) as Record<string, string>)[n], adapters: { imagej: moved("imagej", intoRoot), vegan: moved("vegan", () => r) } }));
  expect(byId(checks, "node")).toMatchObject({ status: "old", fix: { command: "brew install node" } });
  expect(byId(checks, "java").status).toBe("old");
  expect(byId(checks, "r")).toMatchObject({ status: "old", fix: { command: "brew install r" } });
  expect(byId(checks, "program:imagej")).toMatchObject({ status: "old", detail: expect.stringContaining("1.52a is older than the tested version 1.53k") });
  expect(canStart(checks)).toBe(false);
  expect(doctorText(checks)).toContain("  old      Node: version 20.11.0 is older than 22.");
});

test("missing R packages and Python packages: --fix runs only uv and R commands", async () => {
  const r = rscript("4.6.1", "DESeq2 - \\ntximport 1.40.0 \\nSummarizedExperiment - \\nvegan - \\n");
  const uv = exe(join(root, "bin/uv"), "echo uv");
  python("science", "numpy True\\npandas False\\n", "");
  const bin = { Rscript: r, uv } as Record<string, string | undefined>;
  mkdirSync(join(root, "rlib"));
  const checks = await runDoctor(base({ env: { ANTHROPIC_API_KEY: "sk-ant-x", CUVETTE_R_LIBS: join(root, "rlib") }, find: (n) => bin[n], adapters: { deseq2: moved("deseq2", () => r), vegan: moved("vegan", () => r), samtools: moved("samtools", intoRoot) } }));
  expect(byId(checks, "env:science").detail).toContain("these packages are missing: pandas");
  const d = byId(checks, "r:deseq2");
  expect(d.status).toBe("missing");
  expect(d.detail).toContain("DESeq2, SummarizedExperiment");
  expect(d.fix?.command).toContain(`BiocManager::install(c("DESeq2", "SummarizedExperiment")`);
  expect(byId(checks, "r:vegan").fix?.command).toContain(`install.packages(c("vegan")`);
  const fixes = safeFixes(checks);
  expect(fixes).toHaveLength(3);
  expect(fixes[0]).toBe(uvCommand(home, "science"));
  expect(fixes.some((f) => f.includes("brew"))).toBe(false);
  expect(d.fix?.command).toContain(`lib = "${join(root, "rlib")}"`);
  expect(doctorText(checks)).toContain("cuvette doctor --fix installs 3");
});

test("the short list hides the unused model when Cuvette can start", async () => {
  const checks = await runDoctor(base({ fetch: ollamaDown }));
  expect(doctorText(checks)).toContain("missing  Ollama");
  const short = doctorText(checks, { only: ["missing", "old"] });
  expect(short).not.toContain("Ollama");
  expect(short).toContain("Cuvette can start");
});

test("the short list puts the missing environments on one line, with no install command and no citation", () => {
  const env = (name: string): Check => ({ id: `env:${name}`, group: "Python environments", name, status: "missing", detail: "not made", fix: { command: `uv venv ${name}`, safe: true }, cite: "Author (2020)." });
  const checks: Check[] = [
    { id: "node", group: "Needed to start", name: "Node", status: "ok", detail: "version 22" },
    { id: "claude-key", group: "Needed to start", name: "Claude API key", status: "ok", detail: "set" },
    { id: "java", group: "Tools", name: "Java", status: "missing", detail: "ImageJ needs it.", fix: { command: "brew install openjdk" }, cite: "Java (1995)." },
    { id: "uv", group: "Tools", name: "uv", status: "ok", detail: "uv" },
    env("biostats"),
    env("science"),
    { id: "prog:qupath", group: "Programs", name: "qupath", status: "missing", detail: "QuPath was not found.", fix: { link: "https://qupath.github.io" } },
    { id: "prog:mzmine", group: "Programs", name: "mzmine", status: "missing", detail: "MZmine was not found.", fix: { link: "https://mzmine.github.io" } },
  ];
  expect(doctorText(checks, { only: ["missing"], brief: true })).toContain("Programs\n  missing  qupath, mzmine");
  expect(doctorText(checks, { only: ["missing"], brief: true })).not.toContain("qupath.github.io");
  expect(doctorText(checks.filter((c) => c.id !== "uv"), { only: ["missing"], brief: true })).toContain("Install: uv venv biostats");
  const short = doctorText(checks, { only: ["missing", "old"], brief: true });
  expect(short).toContain("Python environments\n  missing  biostats, science");
  expect(short).toContain("Install: brew install openjdk");
  expect(short).not.toContain("uv venv");
  expect(short).not.toContain("How to cite");
  expect(short).toContain("cuvette doctor --fix installs 2");
  expect(doctorText(checks)).not.toContain("Author (2020).");
  expect(doctorText(checks, { cite: true })).toContain("How to cite\n  Java: Java (1995).\n  biostats: Author (2020).\n  science: Author (2020).");
  expect(doctorText(checks, { only: ["missing"] })).toContain("Download: https://qupath.github.io");
});

test("the install commands are exact", () => {
  expect(uvCommand("/Users/a/.cuvette", "biostats")).toBe(
    "uv venv --python 3.12 /Users/a/.cuvette/envs/biostats && uv pip install --python /Users/a/.cuvette/envs/biostats/bin/python statsmodels pingouin lifelines matplotlib openpyxl 'pandas<3' scipy",
  );
  expect(uvCommand("/Users/a/.cuvette", "science")).toMatch(/uv pip install --python \/Users\/a\/\.cuvette\/envs\/science\/bin\/python -r \S+science-requirements\.txt$/);
  expect(rInstallCommand("/Users/a/R-library", { cran: ["lme4", "lmerTest"] })).toBe(
    `mkdir -p /Users/a/R-library && Rscript -e '.libPaths(c("/Users/a/R-library", .libPaths())); install.packages(c("lme4", "lmerTest"), lib = "/Users/a/R-library", repos = "https://cloud.r-project.org")'`,
  );
  expect(rInstallCommand("/Users/a/R-library", { bioc: ["DESeq2"] })).toBe(
    `mkdir -p /Users/a/R-library && Rscript -e '.libPaths(c("/Users/a/R-library", .libPaths())); if (!requireNamespace("BiocManager", quietly = TRUE)) install.packages("BiocManager", lib = "/Users/a/R-library", repos = "https://cloud.r-project.org"); BiocManager::install(c("DESeq2"), lib = "/Users/a/R-library", ask = FALSE, update = FALSE)'`,
  );
  const odd = `/Users/o'brien/R "lib"; $(touch x)`;
  const shown = execFileSync("/bin/sh", ["-c", rInstallCommand(odd, { cran: ["lme4"] }).replace("mkdir -p", "printf '%s\\n'").replace("Rscript -e", "printf '%s\\n'")], { encoding: "utf8" }).split("\n");
  expect(shown[0]).toBe(odd);
  expect(shown[1]).toBe(`.libPaths(c(${JSON.stringify(odd)}, .libPaths())); install.packages(c("lme4"), lib = ${JSON.stringify(odd)}, repos = "https://cloud.r-project.org")`);
});

test("version comparison uses major and minor", () => {
  expect(older("1.52a", "1.53k")).toBe(true);
  expect(older("1.54f", "1.53k")).toBe(false);
  expect(older("20.11.0", [22])).toBe(true);
  expect(older("4.6.1", [4, 5])).toBe(false);
  expect(older("", "1.0")).toBe(false);
});

test("missing: a program with the same file name is not the adapter's program (leptonica fileinfo for OpenMS FileInfo)", async () => {
  const file = join(root, "opt/homebrew/bin/FileInfo");
  exe(file, "echo 'fileinfo: leptonica image file information'");
  const m = real("openms");
  const only = { openms: { ...m, locate: { ...m.locate, env: "", which: [], paths: [file] } } };
  expect(byId(await runDoctor(base({ adapters: only })), "program:openms").status).toBe("missing");
  exe(file, "echo 'FileInfo -- Shows basic information about the file.'; echo 'Version: 3.5.0'");
  expect(byId(await runDoctor(base({ adapters: only })), "program:openms")).toMatchObject({ status: "ok", detail: expect.stringContaining("3.5.0") });
});

function selfTestAdapter(name: string, got: number): LoadedAdapter {
  const manifest = ManifestSchema.parse({
    adapter: { name },
    program: { name },
    connection: { kind: "cli" },
    tests: [{ id: "known", self_test: true, source: "Student 1908", calls: [{ tool: "t_test" }], expect: [{ path: "metrics.statistic", label: "the t statistic", approx: -4.0621, abs: 0.0001 }] }],
  });
  const tools = async () => [{ name: "t_test", description: "", inputSchema: {}, source: "adapter" as const, execute: async () => ({ ok: true, metrics: { statistic: got } }) }];
  const a: LoadedAdapter = { manifest, root: "/nowhere", name, standardsText: () => "", skills: () => [], mapEntry: () => undefined, linksFor: () => ({}), module: async () => ({}) };
  Object.assign(a, { tools });
  return a;
}

test("self-tests: pass, fail with the distance, and skip an adapter whose program is missing", async () => {
  const adapters = [selfTestAdapter("good", -4.0621), selfTestAdapter("drifted", -4.0651), selfTestAdapter("absent", -4.0621)];
  const checks: Check[] = [{ id: "program:absent", group: "Programs", name: "absent", status: "missing", detail: "absent was not found." }];
  const started: string[] = [];
  const start = async (a: LoadedAdapter) => {
    started.push(a.name);
    return { programVersion: "1", tools: (a as unknown as { tools: () => Promise<never[]> }).tools, close: async () => {} };
  };
  const rows = await runSelfTests(checks, { adapters, start });
  expect(started.sort()).toEqual(["drifted", "good"]);
  expect(rows.map((r) => [r.name, r.status, r.detail])).toEqual([
    ["absent", "skipped", "Skipped. absent was not found."],
    ["drifted", "fail", "Fails by 0.003 on the t statistic"],
    ["good", "pass", "Passes"],
  ]);
  const text = selfTestText(rows);
  expect(text).toContain("fail     drifted: Fails by 0.003 on the t statistic");
  expect(text).toContain("Source: Student 1908");
  expect(text).toContain("1 pass, 1 fail, 0 could not run, 1 skipped.");
});

test("self-tests: one adapter only, and a runtime that does not start", async () => {
  const adapters = [selfTestAdapter("a", -4.0621), selfTestAdapter("b", -4.0621)];
  const only = await runSelfTests([], { adapters, only: "b", start: async () => { throw new Error("no interpreter"); } });
  expect(only).toMatchObject([{ name: "b", status: "error", detail: "Could not run: no interpreter" }]);
});

test("self-tests: an Unlisted adapter with code that is not confirmed does not start", async () => {
  const adapters = [selfTestAdapter("unlisted", -4.0621), selfTestAdapter("good", -4.0621)];
  const started: string[] = [];
  const start = async (a: LoadedAdapter) => {
    started.push(a.name);
    return { programVersion: "1", tools: (a as unknown as { tools: () => Promise<never[]> }).tools, close: async () => {} };
  };
  const trust = (a: LoadedAdapter) => (a.name === "unlisted" ? { codeConfirmed: false, codeFiles: ["server.py"] } : { codeConfirmed: true, codeFiles: [] });
  const rows = await runSelfTests([], { adapters, start, trust });
  expect(started).toEqual(["good"]);
  expect(rows.find((r) => r.name === "unlisted")).toMatchObject({ status: "skipped", detail: "Skipped. The adapter is Unlisted and ships code (server.py). To let it run: cuvette adapter allow-code unlisted" });
});

test("the text shows ok, missing and old rows together, with the counts and the fixes", () => {
  const checks: Check[] = [
    { id: "node", group: "Needed to start", name: "Node", status: "ok", detail: "version 24.1.0" },
    { id: "claude-key", group: "Needed to start", name: "Claude API key", status: "missing", detail: "no key is saved.", fix: { command: "cuvette key", link: "https://platform.claude.com/settings/keys" } },
    { id: "ollama", group: "Needed to start", name: "Ollama", status: "ok", detail: "1 local model: qwen3:8b" },
    { id: "java", group: "Tools", name: "Java", status: "old", detail: "version 1.6 is older than 8.", fix: { command: "brew install --cask temurin", link: "https://adoptium.net" } },
    { id: "uv", group: "Tools", name: "uv", status: "ok", detail: "the Python package manager" },
    { id: "env:science", group: "Python environments", name: "science", status: "missing", detail: "no Python.", fix: { command: "uv venv x", safe: true } },
    { id: "program:cellprofiler", group: "Programs", name: "cellprofiler", status: "missing", detail: "CellProfiler was not found.", fix: { link: "https://cellprofiler.org/releases" }, cite: "Stirling 2021" },
  ];
  const text = doctorText(checks);
  expect(text).toContain("Needed to start\n  ok       Node: version 24.1.0\n  missing  Claude API key: no key is saved.\n           Install: cuvette key\n           Or download: https://platform.claude.com/settings/keys");
  expect(text).toContain("  old      Java: version 1.6 is older than 8.\n           Install: brew install --cask temurin");
  expect(text).toContain("  missing  cellprofiler: CellProfiler was not found.\n           Download: https://cellprofiler.org/releases");
  expect(text).not.toContain("Stirling 2021");
  expect(text).toContain("3 ok, 3 missing, 1 old.");
  expect(text).toContain("Cuvette can start");
  expect(text).toContain("cuvette doctor --fix installs 1 missing Python environment or R package set.");
  const short = doctorText(checks, { only: ["missing", "old"] });
  expect(short).not.toContain("Claude API key");
  expect(short).not.toContain("ok       Node");
  expect(short).toContain("old      Java");
  const none = doctorText(checks.map((c) => ({ ...c, status: "ok" as const })), { only: ["missing", "old"] });
  expect(none.trim().split("\n")[0]).toBe("7 ok, 0 missing, 0 old.");
});

test("a login from ant auth login counts as a Claude credential, so Cuvette can start", async () => {
  const cfg = mkdtempSync(join(tmpdir(), "cuvette-doctor-ant-"));
  const env = { ANTHROPIC_CONFIG_DIR: cfg };
  const none = await runDoctor(base({ env, fetch: ollamaDown }));
  expect(byId(none, "claude-key").status).toBe("missing");
  expect(canStart(none)).toBe(false);
  mkdirSync(join(cfg, "configs"), { recursive: true });
  writeFileSync(join(cfg, "configs", "default.json"), "{}");
  const some = await runDoctor(base({ env, fetch: ollamaDown }));
  expect(byId(some, "claude-key")).toMatchObject({ status: "ok", detail: "a login from ant auth login" });
  expect(canStart(some)).toBe(true);
});
