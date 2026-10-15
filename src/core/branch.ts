import { randomBytes } from "node:crypto";
import { copyFileSync, existsSync, linkSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { branchPlace, inProject, placeAt, type Place } from "./places.ts";
import { AnalysisRecord, isTempOrDamaged } from "./record.ts";
import { changeCell, currentNodes, num, numbersOf } from "./status.ts";

export interface BranchSource {
  id: string;
  place: Place;
  record: AnalysisRecord;
}

export interface BranchInfo {
  n: number;
  role: "this" | "parent" | "branch";
  id: string;
  name: string;
  folder: string;
  result: string;
}

function branchId(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}-${randomBytes(2).toString("hex")}`;
}

export function openRecord(place: Place): AnalysisRecord {
  return new AnalysisRecord(place.recordDir, place.id, { workDir: place.outDir, exportDir: place.outDir, project: inProject(place) ? place.project : undefined });
}

export function branchSession(s: BranchSource, name: string, upTo?: number): { place: Place; upTo: number } {
  const clean = name.trim();
  if (!clean) throw new Error("Give the branch a name: /branch <name>.");
  const cut = upTo ?? s.record.entries().at(-1)?.id ?? 0;
  const id = branchId();
  const child = branchPlace(s.place, clean, id);
  const lines = readFileSync(s.record.logPath, "utf8")
    .replace(/^\uFEFF/, "")
    .split("\n")
    .filter((l) => {
      if (!l.trim()) return false;
      try {
        return Number(JSON.parse(l).id) <= cut;
      } catch {
        return false;
      }
    });
  writeFileSync(join(child.recordDir, "log.jsonl"), lines.length ? lines.join("\n") + "\n" : "", { mode: 0o600 });
  const rec = openRecord(child);
  for (const f of existsSync(s.record.blobDir) ? readdirSync(s.record.blobDir) : []) {
    if (isTempOrDamaged(f)) continue;
    const from = join(s.record.blobDir, f);
    const to = join(rec.blobDir, f);
    if (existsSync(to)) continue;
    try {
      linkSync(from, to);
    } catch {
      copyFileSync(from, to);
    }
  }
  rec.append("fork", { parent: { id: s.id, folder: s.place.outDir, title: s.place.title }, upTo: cut, name: clean });
  s.record.append("branch", { child: { id, folder: child.outDir, name: clean }, upTo: cut });
  return { place: child, upTo: cut };
}

function firstSentence(text: string): string {
  const one = text.replace(/[#*_`>|]/g, "").replace(/\s+/g, " ").trim();
  const s = one.split(/(?<=[.!?])\s/)[0] ?? one;
  return s.length > 140 ? s.slice(0, 139) + "…" : s;
}

export function resultLine(record: AnalysisRecord): string {
  const answer = record.live(["assistant"]).filter((e) => e.data.final).at(-1);
  if (answer) return firstSentence(String(answer.data.text ?? ""));
  const steps = record.nodes().filter((n) => !record.rewound().has(n.id) && !n.sensitivityOf).length;
  return steps ? `${steps} ${steps === 1 ? "step" : "steps"}, no answer yet.` : "No result yet.";
}

function info(n: number, role: BranchInfo["role"], folder: string, fallbackName: string): BranchInfo {
  const place = placeAt(join(folder, ".record"));
  if (!place) return { n, role, id: "", name: fallbackName, folder, result: "The folder is missing or moved." };
  const rec = openRecord(place);
  const title = rec.entries(["title"]).at(-1)?.data.title;
  return { n, role, id: place.id, name: fallbackName || String(title ?? place.title), folder, result: resultLine(rec) };
}

export function branchesOf(s: BranchSource): BranchInfo[] {
  const own = (e: { session: string }) => e.session === s.record.sessionId;
  const out: BranchInfo[] = [];
  const fork = s.record.entries(["fork"]).filter(own).at(-1);
  out.push({ n: 1, role: "this", id: s.id, name: (fork?.data.name as string) || s.place.title || s.id, folder: s.place.outDir, result: resultLine(s.record) });
  if (fork) {
    const p = fork.data.parent as { folder: string; title?: string };
    out.push(info(out.length + 1, "parent", p.folder, p.title ?? ""));
  }
  for (const e of s.record.entries(["branch"]).filter(own)) {
    const c = e.data.child as { folder: string; name: string };
    out.push(info(out.length + 1, "branch", c.folder, c.name));
  }
  return out;
}

export function branchesText(list: BranchInfo[]): string {
  const role = { this: "this session", parent: "parent", branch: "branch" };
  return list.map((b) => `${String(b.n).padStart(2)}. ${b.name} (${role[b.role]})\n    ${b.result}\n    ${b.folder}`).join("\n");
}

export function findBranch(s: BranchSource, ref: string): BranchInfo | undefined {
  const list = branchesOf(s);
  const r = ref.trim().toLowerCase();
  if (r === "this" || r === "") return list[0];
  if (r === "parent") return list.find((b) => b.role === "parent");
  if (/^\d+$/.test(r)) return list[Number(r) - 1];
  return list.find((b) => b.name.toLowerCase() === r) ?? list.find((b) => b.name.toLowerCase().startsWith(r));
}

export function keyNumbers(record: AnalysisRecord): Map<string, string | number> {
  const out = new Map<string, string | number>();
  const values: Record<string, unknown> = {};
  for (const e of record.entries(["setup", "decision"])) {
    if (e.kind === "setup") Object.assign(values, (e.data.values as object) ?? {});
    else if (e.data.unset) delete values[String(e.data.key)];
    else values[String(e.data.key)] = e.data.new;
  }
  for (const [k, v] of Object.entries(values)) if (v !== undefined && v !== null && v !== "") out.set(`Decision: ${k}`, typeof v === "string" ? v : JSON.stringify(v));
  const approved = record.live(["pilot_approved"]).at(-1);
  const run = approved ? record.entry(Number(approved.data.run)) : undefined;
  for (const [k, v] of Object.entries((run?.data.values as Record<string, number>) ?? {})) out.set(`Demonstration: ${k}`, v);
  const rewound = record.rewound();
  for (const n of currentNodes(record).filter((x) => !rewound.has(x.id))) for (const [k, v] of numbersOf(n.result)) out.set(`${n.tool.replace(/_/g, " ")}: ${k}`, v);
  return out;
}

export function compareRows(a: AnalysisRecord, b: AnalysisRecord): { rows: string[][]; differ: number } {
  const ka = keyNumbers(a);
  const kb = keyNumbers(b);
  const keys = [...new Set([...ka.keys(), ...kb.keys()])];
  const rank = (k: string) => (k.startsWith("Decision:") ? 0 : k.startsWith("Demonstration:") ? 1 : 2);
  keys.sort((x, y) => rank(x) - rank(y));
  let differ = 0;
  const rows = keys.map((k) => {
    const va = ka.get(k);
    const vb = kb.get(k);
    const show = (v: string | number | undefined) => (v === undefined ? "none" : typeof v === "number" ? num(v) : v);
    const change =
      typeof va === "number" || typeof vb === "number"
        ? changeCell({ name: k, before: typeof va === "number" ? va : null, after: typeof vb === "number" ? vb : null, change: typeof va === "number" && typeof vb === "number" ? vb - va : null })
        : va === vb ? "0" : "differs";
    if (change !== "0") differ++;
    return [k, show(va), show(vb), change === "0" ? "" : change];
  });
  return { rows, differ };
}
