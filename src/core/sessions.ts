import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { gaHome } from "../adapters/manifest.ts";

export type SessionStatus = "answered" | "waiting for you" | "running" | "not started";

export interface SessionInfo {
  id: string;
  cwd: string;
  used: number;
  ask: string;
  folder?: string;
  moved?: boolean;
  name?: string;
  description?: string;
  status?: SessionStatus;
  figure?: string;
}

const IMAGE = /\.(png|jpe?g|gif|webp|svg)$/i;

export function openLock(recordDir: string): { pid: number; app?: string; started?: string } | undefined {
  try {
    const lock = JSON.parse(readFileSync(join(recordDir, "open.json"), "utf8"));
    process.kill(lock.pid, 0);
    return lock;
  } catch {
    return undefined;
  }
}

const alive = (dir: string) => !!openLock(dir);

export function scanLog(log: string): { first: any; ask: any; title?: { title: string; description: string }; status: SessionStatus; figure?: string; owner?: string } {
  let first: any;
  let ask: any;
  let title: { title: string; description: string } | undefined;
  let figure: string | undefined;
  let answered = false;
  const asked = new Set<string>();
  let planOpen = false;
  let lastFinal = false;
  for (const l of readFileSync(log, "utf8").split("\n")) {
    if (!l) continue;
    let e: any;
    try {
      e = JSON.parse(l);
    } catch {
      continue;
    }
    const d = e.data ?? {};
    if (!first && e.kind === "session") first = e;
    else if (!ask && e.kind === "user" && !d.during) ask = e;
    else if (e.kind === "title") title = { title: String(d.title ?? ""), description: String(d.description ?? "") };
    if (e.kind === "assistant" && d.final) answered = lastFinal = true;
    else if (e.kind === "user" && !d.during) lastFinal = false;
    if (e.kind === "assistant") continue;
    else if (e.kind === "question") asked.add(String(d.qid));
    else if (e.kind === "answer") asked.delete(String(d.qid));
    else if (e.kind === "plan") planOpen = d.action === "proposed";
    else if (e.kind === "plan_approved" || e.kind === "pilot_approved") planOpen = false;
    else if (!figure && e.kind === "node" && !d.sensitivityOf) figure = ((d.outputs ?? []) as { path: string; kind?: string }[]).map((o) => o.path).find((p) => IMAGE.test(p) && existsSync(p));
  }
  const live = alive(dirname(log));
  const waiting = asked.size > 0 || planOpen;
  const status: SessionStatus = waiting && !lastFinal ? "waiting for you" : live && !lastFinal ? "running" : answered ? "answered" : ask ? "waiting for you" : "not started";
  return { first, ask, title, status, figure, owner: first?.session };
}

function firstFigure(folder: string | undefined): string | undefined {
  const dir = folder ? join(folder, "figures") : "";
  if (!dir || !existsSync(dir)) return undefined;
  const f = readdirSync(dir).filter((n) => /\.(png|jpe?g|gif|webp)$/i.test(n)).sort()[0];
  return f ? join(dir, f) : undefined;
}

function info(id: string, log: string, base: Omit<SessionInfo, "id" | "used" | "ask">, fallbackAsk = "", named?: { name?: string; description?: string }): SessionInfo {
  const s = scanLog(log);
  if (s.owner && s.owner !== id) return { id, ...base, used: 0, ask: fallbackAsk, moved: true };
  return {
    id,
    ...base,
    used: statSync(log).mtimeMs,
    ask: String(s.ask?.data.text ?? fallbackAsk),
    name: s.title?.title || named?.name,
    description: s.title?.description || named?.description,
    status: s.status,
    figure: s.figure ?? firstFigure(base.folder),
  };
}

function indexed(home: string): SessionInfo[] {
  let rows: { id: string; project: string; folder: string; title: string; date: string; name?: string; description?: string }[] = [];
  try {
    rows = JSON.parse(readFileSync(join(home, "sessions-index.json"), "utf8"));
  } catch {
    return [];
  }
  return rows.map((r) => {
    const log = join(r.folder, ".record", "log.jsonl");
    if (!existsSync(log)) return { id: r.id, cwd: r.project, used: Date.parse(r.date) || 0, ask: r.title, folder: r.folder, moved: true, name: r.name, description: r.description };
    return info(r.id, log, { cwd: r.project, folder: r.folder }, r.title, r);
  });
}

export function listSessions(home = gaHome()): SessionInfo[] {
  const dir = join(home, "sessions");
  const out: SessionInfo[] = indexed(home);
  for (const id of existsSync(dir) ? readdirSync(dir) : []) {
    const log = join(dir, id, "log.jsonl");
    if (!existsSync(log) || out.some((s) => s.id === id)) continue;
    const s = info(id, log, { cwd: "" });
    s.cwd = String(scanLog(log).first?.data.cwd ?? "");
    out.push(s);
  }
  return out.filter((s) => !(s.moved && s.used === 0)).sort((a, b) => b.used - a.used || b.id.localeCompare(a.id));
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
  const head = `${s.id}  ${ageText(now - s.used).padEnd(11)} ${(s.moved ? "moved: run ga open <new folder>" : clipStart(folderText(s.cwd), 40)).padEnd(40)}  ${s.name ? clip(s.name, 70) : s.ask ? clip(s.ask, 60) : "(no request)"}`;
  const more = [s.status && !s.moved ? s.status : "", s.description ? clip(s.description, 110) : ""].filter(Boolean).join(" · ");
  return more ? `${head}\n${" ".repeat(22)}${more}` : head;
}
