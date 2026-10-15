import { appendFileSync, closeSync, existsSync, fstatSync, mkdirSync, openSync, readdirSync, readFileSync, readSync } from "node:fs";
import { join } from "node:path";
import { ensureHome, noticeOnce } from "./atomic.ts";
import { KnownAnswerTest, cuvetteHome } from "../adapters/manifest.ts";
import type { LoadedAdapter, Manifest } from "../adapters/manifest.ts";
import type { AnalysisRecord } from "./record.ts";
import { labDisplayText, trustStatus } from "./trust.ts";

export interface LabChange {
  pid: string;
  adapter: string;
  changeKind: "default" | "check" | "standard" | "test";
  payload: Record<string, unknown>;
  reason: string;
  status: "pending" | "approved" | "rejected";
  version: number;
  by: string;
  ts: string;
  rejectReason?: string;
}

const dirOf = (adapter: string) => join(cuvetteHome(), "labmemory", adapter);
const fileOf = (adapter: string) => join(dirOf(adapter), "changes.jsonl");

function readAdapter(adapter: string): LabChange[] {
  const f = fileOf(adapter);
  if (!existsSync(f)) return [];
  const latest = new Map<string, LabChange>();
  for (const line of readFileSync(f, "utf8").split("\n")) {
    if (!line.trim()) continue;
    let c: LabChange;
    try {
      c = JSON.parse(line) as LabChange;
    } catch {
      noticeOnce(`Cuvette skipped a line in ${f} that is not valid JSON.`);
      continue;
    }
    if (c && typeof c.pid === "string") latest.set(c.pid, c);
  }
  return [...latest.values()].sort((a, b) => a.version - b.version);
}

function adapterNames(): string[] {
  const base = join(cuvetteHome(), "labmemory");
  return existsSync(base) ? readdirSync(base) : [];
}

function endsCut(path: string): boolean {
  if (!existsSync(path)) return false;
  const fd = openSync(path, "r");
  try {
    const size = fstatSync(fd).size;
    const last = Buffer.alloc(1);
    return size > 0 && readSync(fd, last, 0, 1, size - 1) === 1 && last[0] !== 0x0a;
  } finally {
    closeSync(fd);
  }
}

function write(c: LabChange): void {
  ensureHome();
  mkdirSync(dirOf(c.adapter), { recursive: true });
  appendFileSync(fileOf(c.adapter), (endsCut(fileOf(c.adapter)) ? "\n" : "") + JSON.stringify(c) + "\n");
}

export function propose(
  adapter: string,
  changeKind: LabChange["changeKind"],
  payload: Record<string, unknown>,
  reason: string,
  record?: AnalysisRecord,
): LabChange {
  const version = readAdapter(adapter).reduce((m, c) => Math.max(m, c.version), 0) + 1;
  const change: LabChange = {
    pid: `lm-${adapter}-${version}`,
    adapter,
    changeKind,
    payload,
    reason,
    status: "pending",
    version,
    by: "agent",
    ts: new Date().toISOString(),
  };
  write(change);
  record?.append("lab_memory", { pid: change.pid, adapter, changeKind, payload, status: change.status });
  return change;
}

function decide(pid: string, by: string, status: "approved" | "rejected", rejectReason?: string): LabChange {
  const name = /^lm-(.+)-\d+$/.exec(pid)?.[1];
  const current = name ? readAdapter(name).find((c) => c.pid === pid) : undefined;
  if (!current) throw new Error(`no lab memory change ${pid}`);
  if (current.status !== "pending") throw new Error(`${pid} is already ${current.status}`);
  const next: LabChange = { ...current, status, by, ts: new Date().toISOString(), ...(rejectReason ? { rejectReason } : {}) };
  write(next);
  return next;
}

export function approve(pid: string, by: string): LabChange {
  return decide(pid, by, "approved");
}

export function reject(pid: string, by: string, reason: string): LabChange {
  return decide(pid, by, "rejected", reason);
}

export function pending(adapter?: string): LabChange[] {
  const names = adapter ? [adapter] : adapterNames();
  return names.flatMap(readAdapter).filter((c) => c.status === "pending");
}

export function approved(adapter: string): LabChange[] {
  return readAdapter(adapter).filter((c) => c.status === "approved");
}

function replaceById<T extends { id: string }>(list: T[], item: T): T[] {
  return list.some((x) => x.id === item.id) ? list.map((x) => (x.id === item.id ? item : x)) : [...list, item];
}

function applyChange(m: Manifest, c: LabChange): Manifest {
  const p = c.payload;
  if (c.changeKind === "default") {
    return { ...m, decisions: m.decisions.map((d) => (d.key === p.key ? { ...d, default: p.value } : d)) };
  }
  if (c.changeKind === "check") {
    const check = {
      id: String(p.id ?? c.pid),
      description: String(p.description ?? c.reason),
      severity: (p.severity as "info" | "warning" | "error") ?? "warning",
      rule: p.rule as Manifest["checks"][number]["rule"],
      text: String(p.text ?? ""),
    };
    return { ...m, checks: replaceById(m.checks, check) };
  }
  if (c.changeKind === "test") {
    const parsed = KnownAnswerTest.safeParse(p);
    return parsed.success ? { ...m, tests: replaceById(m.tests, parsed.data) } : m;
  }
  return m;
}

export function applyOverlay(adapter: LoadedAdapter): LoadedAdapter {
  const changes = approved(adapter.name);
  if (!changes.length) return adapter;
  const manifest = changes.reduce(applyChange, adapter.manifest);
  const rules = changes.filter((c) => c.changeKind === "standard" && typeof c.payload.text === "string");
  return {
    ...adapter,
    manifest,
    standardsText() {
      const base = adapter.standardsText();
      if (!rules.length) return base;
      const lines = rules.map((c) => `- ${String(c.payload.text).trim()} (lab rule v${c.version})`);
      return [base, `## Lab rules\n${lines.join("\n")}`].filter(Boolean).join("\n\n");
    },
  };
}

export function labText(cwd: string): string {
  const home = join(cuvetteHome(), "LAB.md");
  const t = trustStatus(cwd);
  return [existsSync(home) ? labDisplayText(readFileSync(home, "utf8").replace(/\r\n?/g, "\n").trim()) : "", t.state === "trusted" || t.state === "once" ? (t.scan.lab ?? "") : ""].filter(Boolean).join("\n\n");
}
