import { existsSync, readdirSync, statSync } from "node:fs";
import { basename } from "node:path";
import { pathsIn } from "./blind.ts";
import { accessAll } from "./access.ts";
import { findProgram } from "./locate.ts";
import { adapterDirs, loadAdapter, type Manifest } from "./manifest.ts";
import { adapterTrust } from "./source.ts";

export interface AdapterSummary {
  name: string;
  program: string;
  field: string;
  does: string;
  fileTypes: string[];
  status: string;
  trust: string;
  found: "yes" | "no" | "not checked";
  root: string;
  problem?: string;
}

export type FoundCache = Map<string, { path?: string; how: string }>;

function firstSentence(text: string): string {
  const t = text.replace(/\s+/g, " ").trim();
  const m = /^.*?[.!?](?=\s|$)/.exec(t);
  return (m ? m[0] : t).slice(0, 200);
}

export function programFound(m: Manifest, cache: FoundCache): { path?: string; how: string } {
  const key = m.adapter.name;
  if (!cache.has(key)) cache.set(key, findProgram(m));
  return cache.get(key)!;
}

function checks(m: Manifest): boolean {
  return Boolean(m.locate.env || m.locate.paths.length || m.locate.which.length);
}

export function installHint(m: Manifest): string {
  if (m.program.install) return m.program.install.trim();
  const l = m.locate;
  const where = [...l.paths.slice(0, 2), ...l.which.map((w) => `${w} on the PATH`)];
  return [
    `Install ${m.program.name}${m.program.homepage ? ` (${m.program.homepage})` : ""}.`,
    l.env ? `Or set ${l.env} to its path.` : "",
    where.length ? `The harness looks for: ${where.join(", ")}.` : "",
  ].filter(Boolean).join(" ");
}

export function adapterIndex(cwd: string, cache: FoundCache = new Map()): AdapterSummary[] {
  const out: AdapterSummary[] = [];
  const access = accessAll(cwd);
  for (const [name, root] of Object.entries(adapterDirs(cwd))) {
    if (access[name]?.off) continue;
    try {
      const m = loadAdapter(root).manifest;
      out.push({
        name,
        program: m.program.name,
        field: m.adapter.field,
        does: firstSentence(m.adapter.description),
        fileTypes: m.adapter.file_types,
        status: m.adapter.status,
        trust: adapterTrust(root).label,
        found: checks(m) ? (programFound(m, cache).path ? "yes" : "no") : "not checked",
        root,
      });
    } catch (e) {
      out.push({ name, program: "", field: "", does: "", fileTypes: [], status: "invalid", trust: "Unlisted", found: "not checked", root, problem: (e as Error).message.split("\n")[0] });
    }
  }
  return out;
}

export function formatIndex(list: AdapterSummary[], filter = ""): string {
  const words = filter.toLowerCase().split(/[^a-z0-9.+-]+/).filter((w) => w.length > 1);
  const hay = (a: AdapterSummary) => `${a.name} ${a.program} ${a.field} ${a.does} ${a.fileTypes.join(" ")}`.toLowerCase();
  const hits = words.length ? list.filter((a) => words.some((w) => hay(a).includes(w) || a.fileTypes.some((t) => matches(t, w)))) : list;
  if (!hits.length) return `No adapter matches "${filter}". Call list_adapters with no filter to see all ${list.length}.`;
  const lines = hits.map((a) =>
    a.problem
      ? `- ${a.name}: invalid manifest (${a.problem})`
      : `- ${a.name} | ${a.program} | ${a.field || "no field"} | ${a.does} | files: ${a.fileTypes.join(" ") || "none listed"} | ${a.status} | trust: ${a.trust} | program found: ${a.found}`,
  );
  return [`${hits.length} adapters (name | program | field | what it does | input files | status | trust | program found):`, ...lines, "Load one with use_adapter(name, reason)."].join("\n");
}

function matches(type: string, file: string): boolean {
  const t = type.toLowerCase();
  const f = file.toLowerCase();
  return t.startsWith(".") ? f.endsWith(t) : f === t || f.endsWith(`.${t}`) || f.endsWith(`_${t}`);
}

function namedFiles(text: string, cwd: string): string[] {
  const tokens = text.match(/[\w~./-]+\.[A-Za-z][\w.]{0,9}\b/g) ?? [];
  const paths = [...pathsIn(text), ...tokens.filter((t) => !t.startsWith("/") && !t.startsWith("~"))];
  const out: string[] = [];
  for (const p of new Set(paths)) {
    out.push(basename(p));
    try {
      const abs = p.startsWith("/") ? p : `${cwd}/${p}`;
      if (existsSync(abs) && statSync(abs).isDirectory()) out.push(...readdirSync(abs).slice(0, 200));
    } catch {}
  }
  return [...new Set(out)];
}

export function fileTypeHint(text: string, list: AdapterSummary[], cwd: string, skip: string[] = []): string {
  const parts: string[] = [];
  const seen = new Set<string>();
  for (const f of namedFiles(text, cwd)) {
    const fits = list
      .filter((a) => !a.problem && !skip.includes(a.name))
      .map((a) => ({ a, rank: a.fileTypes.findIndex((t) => matches(t, f)) }))
      .filter((x) => x.rank >= 0)
      .sort((x, y) => x.rank - y.rank || Number(y.a.found === "yes") - Number(x.a.found === "yes") || x.a.name.localeCompare(y.a.name))
      .slice(0, 4)
      .map((x) => x.a.name);
    const line = `${f} -> ${fits.join(", ")}`;
    if (fits.length && !seen.has(fits.join())) {
      seen.add(fits.join());
      parts.push(line);
    }
    if (parts.length >= 4) break;
  }
  return parts.length ? `Adapters that read the named files: ${parts.join("; ")}. Check with list_adapters, then load one with use_adapter.` : "";
}

export function filesFor(text: string, a: Pick<AdapterSummary, "fileTypes">, cwd: string): string[] {
  return namedFiles(text, cwd).filter((f) => a.fileTypes.some((t) => matches(t, f)));
}

export function alternatives(list: AdapterSummary[], name: string, skip: string[] = [], k = 4): string[] {
  const me = list.find((a) => a.name === name);
  if (!me) return [];
  const shared = (a: AdapterSummary) => a.fileTypes.filter((t) => me.fileTypes.some((u) => u.toLowerCase() === t.toLowerCase())).length;
  return list
    .filter((a) => a.name !== name && !a.problem && !skip.includes(a.name) && (me.fileTypes.length ? shared(a) > 0 : !!me.field && a.field === me.field))
    .sort((x, y) => shared(y) - shared(x) || Number(y.found === "yes") - Number(x.found === "yes") || x.name.localeCompare(y.name))
    .slice(0, k)
    .map((a) => a.name);
}
