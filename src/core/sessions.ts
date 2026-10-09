import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { isAbsolute, join, relative, resolve } from "node:path";
import { gaHome } from "../adapters/manifest.ts";

export interface SessionInfo {
  id: string;
  cwd: string;
  used: number;
  ask: string;
  folder?: string;
  moved?: boolean;
}

function readLog(log: string): { first: any; ask: any } {
  let first: any;
  let ask: any;
  for (const l of readFileSync(log, "utf8").split("\n")) {
    if (!l || (first && ask)) continue;
    try {
      const e = JSON.parse(l);
      if (!first && e.kind === "session") first = e;
      if (!ask && e.kind === "user") ask = e;
    } catch {}
  }
  return { first, ask };
}

function indexed(home: string): SessionInfo[] {
  let rows: { id: string; project: string; folder: string; title: string; date: string }[] = [];
  try {
    rows = JSON.parse(readFileSync(join(home, "sessions-index.json"), "utf8"));
  } catch {
    return [];
  }
  return rows.map((r) => {
    const log = join(r.folder, ".record", "log.jsonl");
    if (!existsSync(log)) return { id: r.id, cwd: r.project, used: Date.parse(r.date) || 0, ask: r.title, folder: r.folder, moved: true };
    return { id: r.id, cwd: r.project, used: statSync(log).mtimeMs, ask: String(readLog(log).ask?.data.text ?? r.title), folder: r.folder };
  });
}

export function listSessions(home = gaHome()): SessionInfo[] {
  const dir = join(home, "sessions");
  const out: SessionInfo[] = indexed(home);
  for (const id of existsSync(dir) ? readdirSync(dir) : []) {
    const log = join(dir, id, "log.jsonl");
    if (!existsSync(log) || out.some((s) => s.id === id)) continue;
    const { first, ask } = readLog(log);
    out.push({
      id,
      cwd: String(first?.data.cwd ?? ""),
      used: statSync(log).mtimeMs,
      ask: String(ask?.data.text ?? ""),
    });
  }
  return out.sort((a, b) => b.used - a.used || b.id.localeCompare(a.id));
}

export function defaultSession(list: SessionInfo[], cwd: string): { info: SessionInfo; here: boolean } | undefined {
  const inside = (dir: string) => !relative(resolve(dir), resolve(cwd)).startsWith("..") && !isAbsolute(relative(resolve(dir), resolve(cwd)));
  const here = list.find((s) => !s.moved && ((s.cwd && resolve(s.cwd) === resolve(cwd)) || (s.folder && inside(s.folder))));
  if (here) return { info: here, here: true };
  return list[0] ? { info: list[0], here: false } : undefined;
}

export function ageText(ms: number): string {
  const min = Math.floor(ms / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.floor(h / 24);
  return d === 1 ? "1 day ago" : `${d} days ago`;
}

export function clip(s: string, n: number): string {
  const one = s.replace(/\s+/g, " ").trim();
  return one.length > n ? one.slice(0, n - 1).trimEnd() + "…" : one;
}

export function clipStart(s: string, n: number): string {
  return s.length > n ? "…" + s.slice(s.length - n + 1) : s;
}

export function folderText(cwd: string, home = process.env.HOME ?? ""): string {
  if (!cwd) return "unknown folder";
  return home && cwd.startsWith(home) ? "~" + cwd.slice(home.length) : cwd;
}

export function sessionLine(s: SessionInfo, now = Date.now()): string {
  return `${s.id}  ${ageText(now - s.used).padEnd(11)} ${(s.moved ? "moved: run ga open <new folder>" : clipStart(folderText(s.cwd), 40)).padEnd(40)}  ${s.ask ? clip(s.ask, 60) : "(no request)"}`;
}
