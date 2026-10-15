import { createHash } from "node:crypto";
import { existsSync, lstatSync, readdirSync, readFileSync, realpathSync } from "node:fs";
import { basename, dirname, join, relative, resolve, sep } from "node:path";
import { ensureHome, moveAside, noticeOnce, writeFileAtomic } from "../core/atomic.ts";
import { CATALOG_DIR, cuvetteHome, loadAdapter, type Manifest } from "./manifest.ts";
import { trustedRegistry } from "./registry.ts";

export type TrustLevel = "reviewed" | "checked" | "unlisted";
export type SourceKind = "git" | "folder" | "zip" | "registry";

export const TRUST_NAME: Record<TrustLevel, string> = { reviewed: "Reviewed", checked: "Checked", unlisted: "Unlisted" };

export const TRUST_DETAIL: Record<TrustLevel, string> = {
  reviewed: "Reviewed: in the built-in catalog. The owner read every file.",
  checked: "Checked: from the registry. It passed the registry checks.",
  unlisted: "Unlisted: nobody reviewed or checked it. Read every file before you use it.",
};

export interface InstalledEntry {
  name: string;
  kind: SourceKind;
  source: string;
  version: string;
  commit?: string;
  registry?: string;
  sha256: string;
  installed_on: string;
  checked?: boolean;
}

interface IndexFile {
  adapters: Record<string, InstalledEntry>;
  confirmed: Record<string, string>;
  [other: string]: unknown;
}

export interface TrustInfo {
  level: TrustLevel;
  label: string;
  detail: string;
  entry?: InstalledEntry;
  changed: boolean;
  codeFiles: string[];
  codeConfirmed: boolean;
}

export const indexFile = () => join(cuvetteHome(), "installed-adapters.json");

export const userAdapterDir = (name: string) => join(cuvetteHome(), "adapters", name);

function readIndex(): IndexFile {
  let text: string;
  try {
    text = readFileSync(indexFile(), "utf8");
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") noticeOnce(`Cuvette cannot read the file ${indexFile()}: ${(e as Error).message} The installed adapters list is empty.`);
    return { adapters: {}, confirmed: {} };
  }
  try {
    const j = JSON.parse(text);
    const obj = (v: unknown) => (v && typeof v === "object" && !Array.isArray(v) ? v : {});
    const adapters = Object.fromEntries(Object.entries(obj(j?.adapters)).filter(([, e]) => e && typeof e === "object" && typeof (e as { name?: unknown }).name === "string"));
    return { ...obj(j), adapters, confirmed: obj(j?.confirmed) } as IndexFile;
  } catch {
    try {
      noticeOnce(`The file ${indexFile()} is damaged. Cuvette moved it to ${moveAside(indexFile())}. The installed adapters list is empty until you install the adapters again.`);
    } catch {}
    return { adapters: {}, confirmed: {} };
  }
}

function writeIndex(i: IndexFile): void {
  ensureHome();
  writeFileAtomic(indexFile(), JSON.stringify({ version: 1, ...i }, null, 2) + "\n");
}

export const readInstalled = () => readIndex().adapters;

export function saveInstalled(entry: InstalledEntry): void {
  const i = readIndex();
  i.adapters[entry.name] = entry;
  writeIndex(i);
}

export function forgetInstalled(name: string): void {
  const i = readIndex();
  delete i.adapters[name];
  for (const k of Object.keys(i.confirmed)) if (k === realOf(userAdapterDir(name))) delete i.confirmed[k];
  writeIndex(i);
}

function realOf(p: string): string {
  try {
    return realpathSync(p);
  } catch {
    return resolve(p);
  }
}

export function listFiles(dir: string): string[] {
  const out: string[] = [];
  const walk = (d: string) => {
    for (const n of readdirSync(d).sort()) {
      if (n === ".git") continue;
      const p = join(d, n);
      const st = lstatSync(p);
      if (st.isDirectory()) walk(p);
      else if (st.isFile()) out.push(relative(dir, p).split(sep).join("/"));
    }
  };
  walk(dir);
  return out.sort();
}

export function fileHash(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

export function hashFolder(dir: string): string {
  const h = createHash("sha256");
  for (const f of listFiles(dir)) h.update(`${f}\0${fileHash(join(dir, f))}\n`);
  return h.digest("hex");
}

const CODE_EXT = /\.(py|r|js|mjs|cjs|ts|tsx|sh|bash|zsh|ps1|bat|cmd|ijm|groovy|java|jar|rb|pl|jl|applescript|scpt)$/i;

export function codeFilesIn(root: string, manifest?: Manifest): string[] {
  const named = new Set<string>();
  if (manifest) {
    if (manifest.module) named.add(manifest.module);
    for (const t of manifest.tools) for (const f of [t.script, t.macro]) if (f && existsSync(join(root, f))) named.add(f);
  }
  return listFiles(root).filter((f) => CODE_EXT.test(f) || named.has(f));
}

const NETWORK = /\bfetch\(|https?:\/\/|urllib|requests\.|httpx|aiohttp|socket|axios|\bcurl\b|\bwget\b|net\.connect|http\.request|XMLHttpRequest|Invoke-WebRequest|download\.file|url\(/i;

export function networkFilesIn(root: string, files: string[]): string[] {
  return files.filter((f) => {
    try {
      return NETWORK.test(readFileSync(join(root, f), "utf8"));
    } catch {
      return false;
    }
  });
}

const LICENSES: [RegExp, string][] = [
  [/SPDX-License-Identifier:\s*([\w.+-]+)/i, ""],
  [/GNU AFFERO GENERAL PUBLIC LICENSE/i, "AGPL-3.0"],
  [/GNU LESSER GENERAL PUBLIC LICENSE/i, "LGPL"],
  [/GNU GENERAL PUBLIC LICENSE/i, "GPL"],
  [/Apache License[\s\S]{0,40}Version 2\.0/i, "Apache-2.0"],
  [/Mozilla Public License/i, "MPL-2.0"],
  [/Permission is hereby granted, free of charge/i, "MIT"],
  [/Redistribution and use in source and binary forms/i, "BSD"],
  [/Permission to use, copy, modify, and\/or distribute/i, "ISC"],
  [/This is free and unencumbered software/i, "Unlicense"],
  [/Creative Commons/i, "Creative Commons"],
];

export function licenseOf(root: string): string {
  const f = readdirSync(root).find((n) => /^(licen[sc]e|copying)(\.|$)/i.test(n));
  if (!f) return "none stated";
  const text = readFileSync(join(root, f), "utf8").slice(0, 4000);
  for (const [re, name] of LICENSES) {
    const m = re.exec(text);
    if (m) return name || m[1]!;
  }
  return `a file named ${f} that Cuvette does not recognize`;
}

function inside(parent: string, p: string): boolean {
  const r = relative(realOf(parent), realOf(p));
  return !!r && !r.startsWith("..") && !r.startsWith(sep);
}

export function adapterTrust(root: string): TrustInfo {
  const make = (level: TrustLevel, extra: Partial<TrustInfo> = {}): TrustInfo => ({ level, label: TRUST_NAME[level], detail: TRUST_DETAIL[level], changed: false, codeFiles: [], codeConfirmed: true, ...extra });
  if (inside(CATALOG_DIR, root)) return make("reviewed");
  if (!existsSync(root)) return make("unlisted");
  const index = readIndex();
  const entry = Object.values(index.adapters).find((e) => realOf(userAdapterDir(e.name)) === realOf(root));
  const digest = hashFolder(root);
  const changed = !!entry && entry.sha256 !== digest;
  let codeFiles: string[] = [];
  try {
    codeFiles = codeFilesIn(root, loadAdapter(root).manifest);
  } catch {
    codeFiles = codeFilesIn(root);
  }
  const level: TrustLevel = entry?.checked && trustedRegistry(entry.registry) && !changed ? "checked" : "unlisted";
  const info = make(level, { entry, changed, codeFiles });
  if (changed) info.detail = `${TRUST_DETAIL.unlisted} The files changed after the install.`;
  const homeBase = join(cuvetteHome(), "adapters");
  const homeAdapter = inside(homeBase, root) || (() => {
    const r = relative(realOf(homeBase), resolve(realOf(dirname(root)), basename(root)));
    return !!r && !r.startsWith("..") && !r.startsWith(sep);
  })();
  info.codeConfirmed = !((entry || homeAdapter) && level === "unlisted" && codeFiles.length) || index.confirmed[realOf(root)] === digest;
  return info;
}

export function confirmCode(root: string): void {
  const i = readIndex();
  i.confirmed[realOf(root)] = hashFolder(root);
  writeIndex(i);
}

export const trustLine = (t: TrustInfo) => (t.level === "unlisted" ? `${t.label} (not reviewed, not checked)` : t.level === "checked" ? `${t.label} (registry)` : `${t.label} (built-in catalog)`);
