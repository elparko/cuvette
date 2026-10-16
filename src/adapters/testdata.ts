import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { ensureHome } from "../core/atomic.ts";
import { readSources, sourceRow } from "../onboarding/lint.ts";
import { ROOT } from "../root.ts";
import { cuvetteHome, type KnownAnswerTest, type LoadedAdapter } from "./manifest.ts";

export interface DataEntry {
  sha256: string;
  bytes: number;
}

export interface DataGap {
  fetch: string;
  files: string[];
}

export interface DataResult {
  skip?: string;
  error?: string;
}

const OFFLINE_CODES = new Set([6, 7, 28, 35, 56]);
const SHOWN_FILES = 8;

export const present = (p: string) => existsSync(p) && (!statSync(p).isDirectory() || readdirSync(p).length > 0);

export const homeDataDir = (root: string) => join(cuvetteHome(), "testdata", basename(root));

export function dataFile(root: string, rel: string): string {
  const inPackage = join(root, rel);
  if (present(inPackage)) return inPackage;
  const inHome = join(homeDataDir(root), rel);
  return present(inHome) ? inHome : inPackage;
}

const strip = (p: string) => p.replace(/^\.\//, "").replace(/\/+$/, "");

export function dataIndex(root: string): Record<string, DataEntry> {
  try {
    return JSON.parse(readFileSync(join(root, "data", "files.json"), "utf8"));
  } catch {
    return {};
  }
}

export function indexed(root: string, rel: string): boolean {
  const p = strip(rel);
  return Object.keys(dataIndex(root)).some((k) => k === p || k.startsWith(`${p}/`));
}

const packageVersion = (): string => JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")).version;

function dataUrl(root: string): string {
  return `https://raw.githubusercontent.com/elparko/cuvette/v${packageVersion()}/catalog/${basename(root)}`;
}

function wanted(test: KnownAnswerTest): string[] {
  const refs = [...JSON.stringify(test.calls).matchAll(/\{adapter_dir\}\/(data\/[^"{}*?\s]+)/g)].map((x) => x[1]);
  return [...new Set([...test.data, ...refs].map(strip))];
}

export function dataGaps(adapter: LoadedAdapter, tests: KnownAnswerTest[]): DataGap[] {
  const keys = Object.keys(dataIndex(adapter.root));
  const groups = new Map<string, Set<string>>();
  for (const t of tests) {
    const files = new Set<string>();
    for (const w of wanted(t)) {
      const listed = keys.filter((k) => k === w || k.startsWith(`${w}/`));
      if (listed.length) for (const k of listed) if (!present(dataFile(adapter.root, k))) files.add(k);
      if (!listed.length && t.fetch && t.data.map(strip).includes(w) && !present(dataFile(adapter.root, w))) files.add(w);
    }
    if (files.size) groups.set(t.fetch, new Set([...(groups.get(t.fetch) ?? []), ...files]));
  }
  return [...groups].map(([fetch, files]) => ({ fetch, files: [...files] }));
}

export function sizeText(bytes: number): string {
  if (bytes < 1024) return `${bytes} bytes`;
  const v = bytes / 1024;
  return v < 1024 ? `${v.toFixed(1)} KB` : `${(v / 1024).toFixed(1)} MB`;
}

export function dataNotice(adapter: LoadedAdapter, gaps: DataGap[]): string[] {
  const files = [...new Set(gaps.flatMap((g) => g.files))];
  const index = dataIndex(adapter.root);
  const note = join(adapter.root, "data", "SOURCES.md");
  const rows = existsSync(note) ? readSources(readFileSync(note, "utf8")) : [];
  const sources = [...new Set(files.map((f) => sourceRow(rows, f.replace(/^data\//, ""))?.source).filter((s): s is string => !!s))];
  const shown = files.slice(0, SHOWN_FILES).join(", ") + (files.length > SHOWN_FILES ? ` and ${files.length - SHOWN_FILES} more` : "");
  const lines = [`The tests of the adapter ${adapter.name} need data that the computer does not have.`, `Files: ${shown}.`];
  lines.push(sources.length ? `Source: ${sources.slice(0, 3).map((x) => (x.length > 160 ? `${x.slice(0, 157)}...` : x)).join(" | ")}${sources.length > 3 ? " | and more in data/SOURCES.md" : ""}` : "Source: data/SOURCES.md does not list these files.");
  const scripts = [...new Set(gaps.map((g) => g.fetch).filter(Boolean))];
  if (scripts.length) lines.push(`Fetch script: ${scripts.join(", ")}. It checks the SHA-256 sum of each download.`);
  if (files.some((f) => index[f])) lines.push(`Download address: ${dataUrl(adapter.root)}/. Cuvette checks the SHA-256 sum of each file.`);
  if (files.every((f) => index[f])) lines.push(`Size: ${sizeText(files.reduce((n, f) => n + index[f].bytes, 0))}.`);
  return lines;
}

export function runFetchScript(root: string, fetch: string, expected: string[], timeoutMs = 1_800_000): Promise<DataResult> {
  const script = join(root, fetch);
  if (!existsSync(script)) return Promise.resolve({ error: `the fetch script ${fetch} does not exist` });
  return new Promise((done) => {
    execFile("bash", [script], { cwd: join(script, ".."), timeout: timeoutMs, maxBuffer: 1 << 24 }, (err, _out, stderr) => {
      const last = String(stderr).trim().split("\n").pop() ?? "";
      if (err) {
        const code = typeof err.code === "number" ? err.code : -1;
        if (OFFLINE_CODES.has(code)) return done({ skip: `the test data is not in the repository and ${fetch} could not download it (no network, exit code ${code}). Connect to the network and run the test again` });
        return done({ error: `${fetch} failed with exit code ${code}${last ? `: ${last}` : ""}` });
      }
      const missing = expected.filter((d) => !present(dataFile(root, d)));
      done(missing.length ? { error: `${fetch} finished but did not make ${missing.join(", ")}` } : {});
    });
  });
}

const BODY_SLACK = 1024;

async function readCapped(res: Response, limit: number): Promise<Buffer | null> {
  if (!res.body) return Buffer.from(await res.arrayBuffer());
  const chunks: Buffer[] = [];
  let total = 0;
  const reader = res.body.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) return Buffer.concat(chunks);
    total += value.length;
    if (total > limit) {
      await reader.cancel();
      return null;
    }
    chunks.push(Buffer.from(value));
  }
}

function writeAll(base: string, got: [string, Buffer][]): void {
  for (const [f, body] of got) {
    const dest = join(base, f);
    mkdirSync(dirname(dest), { recursive: true });
    writeFileSync(`${dest}.part`, body);
    renameSync(`${dest}.part`, dest);
  }
}

function save(root: string, got: [string, Buffer][]): DataResult {
  try {
    writeAll(root, got);
    return {};
  } catch {
    const home = homeDataDir(root);
    try {
      ensureHome();
      mkdirSync(home, { recursive: true, mode: 0o700 });
      writeAll(home, got);
      return {};
    } catch (e) {
      return { error: `Cuvette cannot write the test data to the folder ${home} (${(e as NodeJS.ErrnoException).code ?? (e as Error).message}). Make the folder writable and run the test again` };
    }
  }
}

async function download(root: string, files: string[], index: Record<string, DataEntry>): Promise<DataResult> {
  const got: [string, Buffer][] = [];
  for (const f of files) {
    const url = `${dataUrl(root)}/${f.split("/").map(encodeURIComponent).join("/")}`;
    process.stderr.write(`Downloading ${f} (${sizeText(index[f].bytes)})...\n`);
    let body: Buffer | null;
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(120_000) });
      if (res.status === 404) return { skip: `The data files for version ${packageVersion()} are not published yet.` };
      if (!res.ok) return { error: `${url} gave HTTP ${res.status}` };
      body = await readCapped(res, index[f].bytes + BODY_SLACK);
    } catch (e) {
      return { skip: `the test data could not be downloaded from ${url} (${(e as Error).message}). Connect to the network and run the test again` };
    }
    if (!body) return { error: `the download of ${f} is larger than the size in data/files.json. Cuvette stopped it and saved no file` };
    if (createHash("sha256").update(body).digest("hex") !== index[f].sha256 || body.length !== index[f].bytes) {
      return { error: `the download of ${f} does not match the SHA-256 sum in data/files.json. Cuvette refused it and saved no file` };
    }
    got.push([f, body]);
  }
  return save(root, got);
}

export async function provideData(adapter: LoadedAdapter, gap: DataGap): Promise<DataResult> {
  const index = dataIndex(adapter.root);
  const listed = gap.files.filter((f) => index[f]);
  const made = gap.files.filter((f) => !index[f]);
  if (listed.length) {
    const got = await download(adapter.root, listed, index);
    if (got.skip || got.error) return got;
  }
  return made.length ? runFetchScript(adapter.root, gap.fetch, made) : {};
}
