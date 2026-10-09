import { existsSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { locate, which } from "../adapters/locate.ts";
import { adapterDirs, gaHome, loadAdapter, type Manifest } from "../adapters/manifest.ts";
import { runProcess } from "../adapters/kinds/common.ts";
import { claudeKey, credentialsPath } from "./credentials.ts";

export type Status = "ok" | "missing" | "old";
export type Group = "Needed to start" | "Tools" | "Python environments" | "R packages" | "Programs";

export interface Fix {
  command?: string;
  link?: string;
  safe?: boolean;
}

export interface Check {
  id: string;
  group: Group;
  name: string;
  status: Status;
  detail: string;
  fix?: Fix;
}

export interface Run {
  (argv: string[], timeoutMs?: number): Promise<{ code: number | null; stdout: string; stderr: string }>;
}

export interface DoctorOpts {
  env?: Record<string, string | undefined>;
  home?: string;
  nodeVersion?: string;
  adapters?: Record<string, Manifest>;
  find?: (name: "uv" | "java" | "Rscript" | "ollama") => string | undefined;
  run?: Run;
  fetch?: typeof fetch;
  onProgress?: (text: string) => void;
}

export const MIN_NODE = 22;
const MIN_JAVA = 8;
const MIN_R = [4, 5];
const PYTHON = "3.12";
export const SCIENCE_REQUIREMENTS = resolve(dirname(fileURLToPath(import.meta.url)), "../tools/science-requirements.txt");

export const ENVS: Record<string, { modules: string[]; packages: string[] }> = {
  science: { modules: ["numpy", "pandas", "scipy", "statsmodels", "lifelines", "matplotlib", "openpyxl", "tifffile", "skimage", "pptx"], packages: ["-r", SCIENCE_REQUIREMENTS] },
  biostats: { modules: ["statsmodels", "pingouin", "lifelines", "matplotlib", "openpyxl", "pandas", "scipy"], packages: ["statsmodels", "pingouin", "lifelines", "matplotlib", "openpyxl", "pandas<3", "scipy"] },
  astropy: { modules: ["astropy", "photutils", "matplotlib", "pandas", "scipy"], packages: ["astropy", "photutils", "matplotlib", "pandas", "scipy"] },
  cellpose: { modules: ["cellpose", "tifffile", "PIL", "scipy"], packages: ["cellpose", "packaging", "tifffile", "pillow", "scipy"] },
  flowkit: { modules: ["flowkit", "flowio", "matplotlib", "pandas"], packages: ["flowkit", "matplotlib", "pandas"] },
  gdal: { modules: ["geopandas", "rasterio", "rasterstats", "matplotlib"], packages: ["geopandas", "rasterio", "rasterstats", "matplotlib"] },
  mdanalysis: { modules: ["MDAnalysis", "Bio", "matplotlib", "pandas"], packages: ["MDAnalysis", "biopython", "matplotlib", "pandas"] },
  metaspace: { modules: ["metaspace", "PIL", "matplotlib"], packages: ["metaspace2020", "pillow", "matplotlib"] },
  mne: { modules: ["mne", "matplotlib", "pandas"], packages: ["mne", "matplotlib", "pandas"] },
  pyimzml: { modules: ["pyimzml", "numpy"], packages: ["pyimzml", "numpy"] },
  pyopenms: { modules: ["pyopenms", "numpy"], packages: ["pyopenms", "numpy"] },
  rdkit: { modules: ["rdkit", "numpy"], packages: ["rdkit", "numpy"] },
  scanpy: { modules: ["scanpy", "anndata", "matplotlib", "pandas", "scipy"], packages: ["scanpy", "matplotlib", "pandas", "scipy"] },
  skimage: { modules: ["skimage", "tifffile", "PIL", "scipy"], packages: ["scikit-image", "tifffile", "pillow", "scipy"] },
};

export const R_PACKAGES: Record<string, { cran?: string[]; bioc?: string[] }> = {
  deseq2: { bioc: ["DESeq2", "tximport", "SummarizedExperiment"] },
  cardinal: { bioc: ["Cardinal"] },
  lme4: { cran: ["lme4", "lmerTest"] },
  vegan: { cran: ["vegan"] },
};

export const PROGRAM_INSTALL: Record<string, Fix> = {
  bcftools: { command: "brew install bcftools" },
  bedtools: { command: "brew install bedtools" },
  samtools: { command: "brew install samtools" },
  fastqc: { command: "brew install fastqc" },
  gdal: { command: "brew install gdal" },
  openbabel: { command: "brew install open-babel" },
  phylo: { command: "brew install iqtree3 mafft" },
  qgis: { command: "brew install --cask qgis", link: "https://qgis.org/download/" },
  imagej: { command: "brew install --cask fiji", link: "https://imagej.net/ij/download.html" },
  bftools: { link: "https://www.openmicroscopy.org/bio-formats/downloads/" },
  cellprofiler: { link: "https://cellprofiler.org/releases" },
  mzmine: { link: "https://mzmine.github.io/download.html" },
  openms: { link: "https://openms.de/download/" },
  qupath: { link: "https://qupath.github.io" },
  sage: { link: "https://github.com/lazear/sage/releases" },
};

export const q = (s: string) => (/^[\w@%+=:,./-]+$/.test(s) ? s : `'${s.replace(/'/g, `'\\''`)}'`);
const tilde = (p: string) => (p.startsWith(homedir() + "/") ? "~" + p.slice(homedir().length) : p);

export function versionParts(v: string): number[] {
  return (/\d+(?:\.\d+)*/.exec(v)?.[0] ?? "").split(".").filter(Boolean).map(Number);
}

export function older(v: string, than: number[] | string): boolean {
  const a = versionParts(v);
  const b = typeof than === "string" ? versionParts(than) : than;
  if (!a.length || !b.length) return false;
  for (let i = 0; i < Math.min(2, b.length); i++) {
    const x = a[i] ?? 0;
    if (x !== b[i]) return x < b[i]!;
  }
  return false;
}

export function defaultFind(env: Record<string, string | undefined>) {
  const extra = ["/opt/homebrew/bin", "/usr/local/bin", join(homedir(), ".local/bin"), join(homedir(), ".cargo/bin"), "/Library/Frameworks/R.framework/Resources/bin", "/Applications/Ollama.app/Contents/Resources"];
  return (name: string) => which(name, [env.PATH ?? "", ...extra].join(":"));
}

export const defaultRun: Run = (argv, timeoutMs = 60_000) => runProcess(argv, { timeoutMs });

export function envPython(home: string, name: string): string {
  return join(home, "envs", name, "bin", "python");
}

export function uvCommand(home: string, name: string): string {
  const dir = join(home, "envs", name);
  const pkgs = ENVS[name]?.packages ?? [];
  return `uv venv --python ${PYTHON} ${q(dir)} && uv pip install --python ${q(join(dir, "bin", "python"))} ${pkgs.map(q).join(" ")}`;
}

export function rLibrary(env: Record<string, string | undefined>, home = homedir()): string {
  const cand = [env.GA_R_LIBS, env.R_LIBS_USER, "/Volumes/T7/guided-analysis/tools/R-library", join(home, ".guided-analysis", "R-library")].filter((x): x is string => !!x);
  return cand.find((c) => existsSync(c)) ?? join(home, ".guided-analysis", "R-library");
}

export function rInstallCommand(lib: string, p: { cran?: string[]; bioc?: string[] }): string {
  const vec = (xs: string[]) => `c(${xs.map((x) => `"${x}"`).join(", ")})`;
  const repos = `repos = "https://cloud.r-project.org"`;
  const body = p.bioc?.length
    ? `.libPaths(c("${lib}", .libPaths())); if (!requireNamespace("BiocManager", quietly = TRUE)) install.packages("BiocManager", lib = "${lib}", ${repos}); BiocManager::install(${vec(p.bioc)}, lib = "${lib}", ask = FALSE, update = FALSE)`
    : `.libPaths(c("${lib}", .libPaths())); install.packages(${vec(p.cran ?? [])}, lib = "${lib}", ${repos})`;
  return `mkdir -p ${q(lib)} && Rscript -e '${body}'`;
}

async function pool<T, R>(items: T[], n: number, fn: (x: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(n, items.length) }, async () => {
      while (i < items.length) {
        const k = i++;
        out[k] = await fn(items[k]!);
      }
    }),
  );
  return out;
}

function catalogManifests(): Record<string, Manifest> {
  const out: Record<string, Manifest> = {};
  for (const [name, dir] of Object.entries(adapterDirs())) {
    try {
      out[name] = loadAdapter(dir).manifest;
    } catch {}
  }
  return out;
}

export async function importCheck(run: Run, python: string, modules: string[]): Promise<{ ok: boolean; missing: string[]; runs: boolean }> {
  if (!existsSync(python)) return { ok: false, missing: modules, runs: false };
  const code = `import importlib.util as u\nfor m in ${JSON.stringify(modules)}:\n    print(m, u.find_spec(m) is not None)`;
  const r = await run([python, "-c", code], 60_000);
  if (r.code !== 0) return { ok: false, missing: modules, runs: false };
  const missing = r.stdout.split("\n").filter((l) => / False$/.test(l)).map((l) => l.split(" ")[0]!);
  return { ok: !missing.length, missing, runs: true };
}

function envOf(path: string | undefined, home: string): string | undefined {
  if (!path) return undefined;
  const m = /^(.*)\/envs\/([^/]+)\/bin\/python[\d.]*$/.exec(path);
  return m && resolve(m[1]!) === resolve(home) ? m[2] : undefined;
}

export function envNameIn(m: Manifest): string | undefined {
  for (const p of m.locate.paths) {
    const hit = /\.guided-analysis\/envs\/([^/]+)\/bin\/python$/.exec(p);
    if (hit) return hit[1];
  }
  return undefined;
}

export async function runDoctor(opts: DoctorOpts = {}): Promise<Check[]> {
  const env = opts.env ?? process.env;
  const home = opts.home ?? gaHome();
  const run = opts.run ?? defaultRun;
  const find = opts.find ?? defaultFind(env);
  const progress = opts.onProgress ?? (() => {});
  const adapters = opts.adapters ?? catalogManifests();
  const checks: Check[] = [];

  const nodeV = opts.nodeVersion ?? process.versions.node;
  checks.push(
    older(nodeV, [MIN_NODE])
      ? { id: "node", group: "Needed to start", name: "Node", status: "old", detail: `version ${nodeV} is older than ${MIN_NODE}. Cuvette needs Node ${MIN_NODE} or later.`, fix: { command: "brew install node", link: "https://nodejs.org" } }
      : { id: "node", group: "Needed to start", name: "Node", status: "ok", detail: `version ${nodeV}` },
  );

  const key = claudeKey(env);
  checks.push(
    key.from === "none"
      ? { id: "claude-key", group: "Needed to start", name: "Claude API key", status: "missing", detail: "no key is saved. You need a key or a local model.", fix: { command: "ga key", link: "https://platform.claude.com/settings/keys" } }
      : { id: "claude-key", group: "Needed to start", name: "Claude API key", status: "ok", detail: key.from === "env" ? "set in ANTHROPIC_API_KEY" : `saved in ${tilde(credentialsPath())}` },
  );

  progress("Ollama");
  const host = (env.OLLAMA_HOST || "http://localhost:11434").replace(/\/$/, "");
  let models: string[] | undefined;
  try {
    const res = await (opts.fetch ?? fetch)(`${host}/api/tags`, { signal: AbortSignal.timeout(1500) });
    if (res.ok) models = (((await res.json()) as { models?: { name: string }[] }).models ?? []).map((m) => m.name);
  } catch {}
  if (models?.length) checks.push({ id: "ollama", group: "Needed to start", name: "Ollama", status: "ok", detail: `${models.length} local model${models.length === 1 ? "" : "s"}: ${models.slice(0, 4).join(", ")}${models.length > 4 ? ", ..." : ""}` });
  else if (models) checks.push({ id: "ollama", group: "Needed to start", name: "Ollama", status: "missing", detail: "Ollama runs, but it has no model.", fix: { command: "ollama pull qwen3:8b" } });
  else if (find("ollama")) checks.push({ id: "ollama", group: "Needed to start", name: "Ollama", status: "missing", detail: "Ollama is installed, but it does not run.", fix: { command: "open -a Ollama" } });
  else checks.push({ id: "ollama", group: "Needed to start", name: "Ollama", status: "missing", detail: "not installed. You need a local model or a Claude API key.", fix: { command: "brew install ollama && ollama pull qwen3:8b", link: "https://ollama.com/download" } });

  const uv = find("uv");
  checks.push(uv ? { id: "uv", group: "Tools", name: "uv", status: "ok", detail: `the Python package manager, ${tilde(uv)}` } : { id: "uv", group: "Tools", name: "uv", status: "missing", detail: "the Python package manager. It installs the Python environments.", fix: { command: "brew install uv", link: "https://docs.astral.sh/uv/getting-started/installation/" } });

  progress("Java");
  const java = find("java");
  const jr = java ? await run([java, "-version"], 15_000) : undefined;
  const jv = jr && jr.code === 0 ? /version "([^"]+)"/.exec(jr.stderr + jr.stdout)?.[1] : undefined;
  const javaFix = { command: "brew install --cask temurin", link: "https://adoptium.net" };
  const jMajor = jv ? (jv.startsWith("1.") ? versionParts(jv)[1] : versionParts(jv)[0]) : undefined;
  checks.push(
    !jv
      ? { id: "java", group: "Tools", name: "Java", status: "missing", detail: "ImageJ, FastQC and Bio-Formats need it.", fix: javaFix }
      : jMajor !== undefined && jMajor < MIN_JAVA
        ? { id: "java", group: "Tools", name: "Java", status: "old", detail: `version ${jv} is older than ${MIN_JAVA}.`, fix: javaFix }
        : { id: "java", group: "Tools", name: "Java", status: "ok", detail: `version ${jv}` },
  );

  progress("R");
  const rscript = find("Rscript");
  const rr = rscript ? await run([rscript, "--version"], 15_000) : undefined;
  const rv = rr ? /version (\d+\.\d+\.\d+)/.exec(rr.stdout + rr.stderr)?.[1] : undefined;
  const rFix = { command: "brew install r", link: "https://cran.r-project.org/bin/macosx/" };
  const rNeeded = Object.keys(adapters).some((n) => R_PACKAGES[n]);
  if (rNeeded)
    checks.push(
      !rv
        ? { id: "r", group: "Tools", name: "R", status: "missing", detail: "the DESeq2, Cardinal, lme4 and vegan adapters need it.", fix: rFix }
        : older(rv, MIN_R)
          ? { id: "r", group: "Tools", name: "R", status: "old", detail: `version ${rv} is older than ${MIN_R.join(".")}. Bioconductor packages need R ${MIN_R.join(".")} or later.`, fix: rFix }
          : { id: "r", group: "Tools", name: "R", status: "ok", detail: `version ${rv}` },
    );

  progress("Python environments");
  const covered = new Set(Object.values(adapters).map(envNameIn).filter((x): x is string => !!x));
  const envDir = join(home, "envs");
  const present = existsSync(envDir) ? readdirSync(envDir).filter((n) => !n.startsWith(".")) : [];
  const standalone = [...new Set(["science", ...present])].filter((n) => !covered.has(n)).sort((a, b) => (a === "science" ? -1 : b === "science" ? 1 : a.localeCompare(b)));
  const envChecks = await pool(standalone, 6, async (name): Promise<Check> => {
    const spec = ENVS[name];
    const r = await importCheck(run, envPython(home, name), spec?.modules ?? []);
    const what = name === "science" ? "the Python environment that runs the agent's scripts" : `Python environment ${name}`;
    if (r.ok) return { id: `env:${name}`, group: "Python environments", name, status: "ok", detail: tilde(join(envDir, name)) };
    const fix = spec ? { command: uvCommand(home, name), safe: true } : undefined;
    const detail = !r.runs ? `${what}: there is no working Python in ${tilde(join(envDir, name))}.` : `${what}: these packages are missing: ${r.missing.join(", ")}.`;
    return { id: `env:${name}`, group: "Python environments", name, status: "missing", detail, fix };
  });
  checks.push(...envChecks);

  if (rNeeded && rv) {
    progress("R packages");
    const lib = rLibrary(env);
    const all = [...new Set(Object.entries(R_PACKAGES).filter(([n]) => adapters[n]).flatMap(([, p]) => [...(p.cran ?? []), ...(p.bioc ?? [])]))];
    const code = `.libPaths(c("${lib}", .libPaths())); for (p in c(${all.map((x) => `"${x}"`).join(", ")})) cat(p, if (requireNamespace(p, quietly = TRUE)) as.character(packageVersion(p)) else "-", "\\n")`;
    const out = await run([rscript!, "-e", code], 120_000);
    const have = new Map(out.stdout.split("\n").map((l) => l.trim().split(/\s+/) as [string, string]).filter((x) => x.length === 2 && x[1] !== "-"));
    for (const [name, p] of Object.entries(R_PACKAGES)) {
      if (!adapters[name]) continue;
      const pk = [...(p.cran ?? []), ...(p.bioc ?? [])];
      const missing = pk.filter((x) => !have.has(x));
      checks.push(
        missing.length
          ? { id: `r:${name}`, group: "R packages", name, status: "missing", detail: `these R packages are missing: ${missing.join(", ")} (library ${tilde(lib)}).`, fix: { command: rInstallCommand(lib, { cran: p.cran?.filter((x) => missing.includes(x)), bioc: p.bioc?.filter((x) => missing.includes(x)) }), safe: true } }
          : { id: `r:${name}`, group: "R packages", name, status: "ok", detail: pk.map((x) => `${x} ${have.get(x)}`).join(", ") },
      );
    }
  }

  progress("Programs");
  const names = Object.keys(adapters).filter((n) => adapters[n]!.connection.kind !== "mcp" || adapters[n]!.locate.paths.length || adapters[n]!.locate.which.length).sort();
  const programs = await pool(names, 6, async (name): Promise<Check> => {
    const m = adapters[name]!;
    const envName = envNameIn(m);
    const l = await locate(m).catch(() => ({ path: undefined, version: "", how: "" }));
    let version = l.version;
    if (l.path && !version) version = /ij-(\d[\w.]*)\.jar$/.exec(l.path)?.[1] ?? "";
    const label = `${m.program.name}`;
    const install: Fix | undefined = envName && ENVS[envName] ? { command: uvCommand(home, envName), safe: true } : R_PACKAGES[name] ? (rv ? undefined : rFix) : PROGRAM_INSTALL[name] ?? (m.program.homepage ? { link: m.program.homepage } : undefined);
    if (!l.path) return { id: `program:${name}`, group: "Programs", name, status: "missing", detail: `${label} was not found.`, fix: install };
    const pyEnv = envOf(l.path, home);
    if (pyEnv && ENVS[pyEnv]) {
      const r = await importCheck(run, l.path, ENVS[pyEnv]!.modules);
      if (!r.ok) return { id: `program:${name}`, group: "Programs", name, status: "missing", detail: `${label}: the environment ${pyEnv} lacks ${r.missing.join(", ")}.`, fix: install };
    }
    const tested = m.program.tested_versions.filter((t) => versionParts(t).length);
    const lowest = tested.sort((a, b) => (older(a, b) ? -1 : 1))[0];
    const where = tilde(pyEnv ? join(home, "envs", pyEnv) : l.path);
    if (lowest && version && older(version, lowest) && !R_PACKAGES[name])
      return { id: `program:${name}`, group: "Programs", name, status: "old", detail: `${label} ${version} is older than the tested version ${lowest} (${where}).`, fix: install };
    if (R_PACKAGES[name]) return { id: `program:${name}`, group: "Programs", name, status: "ok", detail: `${label} runs in R (${where}). The R packages are listed above.` };
    return { id: `program:${name}`, group: "Programs", name, status: "ok", detail: `${label}${version ? ` ${version}` : ""} (${where})` };
  });
  checks.push(...programs);
  return checks;
}

export function canStart(checks: Check[]): boolean {
  const ok = (id: string) => checks.find((c) => c.id === id)?.status === "ok";
  return ok("node") && (ok("claude-key") || ok("ollama"));
}

export function safeFixes(checks: Check[]): string[] {
  const uvOk = checks.find((c) => c.id === "uv")?.status === "ok";
  const rOk = checks.find((c) => c.id === "r")?.status === "ok";
  const cmds = checks
    .filter((c) => c.status !== "ok" && c.fix?.safe && c.fix.command)
    .filter((c) => (c.fix!.command!.startsWith("uv ") ? uvOk : rOk))
    .map((c) => c.fix!.command!);
  return [...new Set(cmds)];
}

export function doctorText(checks: Check[], opts: { only?: Status[] } = {}): string {
  const lines: string[] = [];
  let group = "";
  const modelRow = (c: Check) => c.id === "claude-key" || c.id === "ollama";
  const shown = opts.only ? checks.filter((c) => opts.only!.includes(c.status) && !(modelRow(c) && canStart(checks))) : checks;
  for (const c of shown) {
    if (c.group !== group) lines.push(`${lines.length ? "\n" : ""}${(group = c.group)}`);
    lines.push(`  ${c.status.padEnd(8)} ${c.name}: ${c.detail}`);
    if (c.status !== "ok" && c.fix?.command) lines.push(`           Install: ${c.fix.command}`);
    if (c.status !== "ok" && c.fix?.link) lines.push(`           ${c.fix.command ? "Or download" : "Download"}: ${c.fix.link}`);
  }
  const n = (s: Status) => checks.filter((c) => c.status === s).length;
  lines.push("", `${n("ok")} ok, ${n("missing")} missing, ${n("old")} old.`);
  lines.push(canStart(checks) ? "Cuvette can start: Node is new enough and a model is ready." : "Cuvette cannot start yet. It needs Node 22 or later, and a Claude API key or an Ollama model.");
  const fixes = safeFixes(checks);
  if (fixes.length) lines.push(`ga doctor --fix installs ${fixes.length} missing Python environment${fixes.length === 1 ? "" : "s"} or R package set${fixes.length === 1 ? "" : "s"}. It asks before it starts.`);
  return lines.join("\n");
}
