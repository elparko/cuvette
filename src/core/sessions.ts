import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { gaHome } from "../adapters/manifest.ts";

export interface SessionInfo {
  id: string;
  cwd: string;
  used: number;
  ask: string;
}

export function listSessions(home = gaHome()): SessionInfo[] {
  const dir = join(home, "sessions");
  if (!existsSync(dir)) return [];
  const out: SessionInfo[] = [];
  for (const id of readdirSync(dir)) {
    const log = join(dir, id, "log.jsonl");
    if (!existsSync(log)) continue;
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
  const here = list.find((s) => s.cwd && resolve(s.cwd) === resolve(cwd));
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
  return `${s.id}  ${ageText(now - s.used).padEnd(11)} ${clipStart(folderText(s.cwd), 40).padEnd(40)}  ${s.ask ? clip(s.ask, 60) : "(no request)"}`;
}
