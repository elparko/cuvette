import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, linkSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { cuvetteHome } from "../adapters/manifest.ts";

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

export interface OpenLock {
  pid: number;
  app?: string;
  started?: string;
  procStart?: number;
}

const LOCK = "open.json";
const START_SLACK_MS = 5000;

export function processStart(pid: number): number | undefined {
  if (process.platform === "win32") return undefined;
  try {
    const out = execFileSync("ps", ["-o", "lstart=", "-p", String(pid)], { encoding: "utf8", timeout: 3000, env: { ...process.env, LC_ALL: "C" }, stdio: ["ignore", "pipe", "ignore"] }).trim();
    const t = Date.parse(out);
    return Number.isFinite(t) ? t : undefined;
  } catch {
    return undefined;
  }
}

export const ownStart = () => Math.round(Date.now() - process.uptime() * 1000);

export function lockAlive(lock: OpenLock | undefined, startOf: (pid: number) => number | undefined = processStart): boolean {
  if (!lock || !Number.isInteger(lock.pid) || lock.pid <= 0) return false;
  if (lock.pid === process.pid) return lock.procStart === undefined || Math.abs(lock.procStart - ownStart()) <= START_SLACK_MS;
  try {
    process.kill(lock.pid, 0);
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "EPERM") return false;
  }
  if (typeof lock.procStart !== "number") return true;
  const real = startOf(lock.pid);
  return real === undefined || Math.abs(real - lock.procStart) <= START_SLACK_MS;
}

function readLock(path: string): OpenLock | undefined {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return undefined;
  }
}

export function openLock(recordDir: string, startOf?: (pid: number) => number | undefined): OpenLock | undefined {
  const lock = readLock(join(recordDir, LOCK));
  return lockAlive(lock, startOf) ? lock : undefined;
}

export function claimLock(recordDir: string, extra: Record<string, unknown> = {}, startOf?: (pid: number) => number | undefined): OpenLock | undefined {
  const path = join(recordDir, LOCK);
  const body = () => JSON.stringify({ pid: process.pid, procStart: ownStart(), started: new Date().toISOString(), ...extra });
  for (let i = 0; i < 5; i++) {
    try {
      writeFileSync(path, body(), { flag: "wx", mode: 0o600 });
      return undefined;
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "EEXIST") return undefined;
    }
    const held = readLock(path);
    if (held && lockAlive(held, startOf)) {
      if (held.pid === process.pid) return undefined;
      return held;
    }
    const aside = `${path}.${process.pid}.${randomBytes(4).toString("hex")}`;
    try {
      renameSync(path, aside);
    } catch {
      continue;
    }
    const moved = readLock(aside);
    if (moved && lockAlive(moved, startOf) && moved.pid !== process.pid) {
      try {
        linkSync(aside, path);
      } catch {}
      rmSync(aside, { force: true });
      return moved;
    }
    rmSync(aside, { force: true });
  }
  return readLock(path);
}

const alive = (dir: string) => !!openLock(dir);

interface Parsed {
  first: any;
  ask: any;
  title?: { title: string; description: string };
  figure?: string;
  answered: boolean;
  waiting: boolean;
  lastFinal: boolean;
}

const parsed = new Map<string, { mtime: number; size: number; p: Parsed }>();

function parseLog(log: string): Parsed {
  const st = statSync(log);
  const hit = parsed.get(log);
  if (hit && hit.mtime === st.mtimeMs && hit.size === st.size) return hit.p;
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
  const p = { first, ask, title, figure, answered, waiting: asked.size > 0 || planOpen, lastFinal };
  parsed.set(log, { mtime: st.mtimeMs, size: st.size, p });
  return p;
}

export function scanLog(log: string): { first: any; ask: any; title?: { title: string; description: string }; status: SessionStatus; figure?: string; owner?: string } {
  const { first, ask, title, figure, answered, waiting, lastFinal } = parseLog(log);
  const live = alive(dirname(log));
  const status: SessionStatus = waiting && !lastFinal ? "waiting for you" : live && !lastFinal ? "running" : answered ? "answered" : ask ? "waiting for you" : "not started";
  return { first, ask, title, status, figure, owner: first?.session };
}

function firstFigure(folder: string | undefined): string | undefined {
  const dir = folder ? join(folder, "figures") : "";
  if (!dir || !existsSync(dir)) return undefined;
  const f = readdirSync(dir).filter((n) => /\.(png|jpe?g|gif|webp)$/i.test(n)).sort()[0];
  return f ? join(dir, f) : undefined;
}

function info(id: string, log: string, base: Omit<SessionInfo, "id" | "used" | "ask">, fallbackAsk = "", named?: { name?: string; custom?: string; description?: string }): SessionInfo {
  const s = scanLog(log);
  if (s.owner && s.owner !== id) return { id, ...base, used: 0, ask: fallbackAsk, moved: true };
  return {
    id,
    ...base,
    used: statSync(log).mtimeMs,
    ask: String(s.ask?.data.text ?? fallbackAsk),
    name: named?.custom || s.title?.title || named?.name,
    description: s.title?.description || named?.description,
    status: s.status,
    figure: s.figure ?? firstFigure(base.folder),
  };
}

function indexed(home: string): SessionInfo[] {
  let rows: { id: string; project: string; folder: string; title: string; date: string; name?: string; custom?: string; description?: string }[] = [];
  try {
    rows = JSON.parse(readFileSync(join(home, "sessions-index.json"), "utf8"));
  } catch {
    return [];
  }
  return rows.map((r) => {
    const log = join(r.folder, ".record", "log.jsonl");
    if (!existsSync(log)) return { id: r.id, cwd: r.project, used: Date.parse(r.date) || 0, ask: r.title, folder: r.folder, moved: true, name: r.custom || r.name, description: r.description };
    return info(r.id, log, { cwd: r.project, folder: r.folder }, r.title, r);
  });
}

export function listSessions(home = cuvetteHome()): SessionInfo[] {
  const dir = join(home, "sessions");
  const out: SessionInfo[] = indexed(home);
  const seen = new Set(out.map((s) => s.id));
  for (const id of existsSync(dir) ? readdirSync(dir) : []) {
    const log = join(dir, id, "log.jsonl");
    if (seen.has(id) || !existsSync(log)) continue;
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
  const head = `${s.id}  ${ageText(now - s.used).padEnd(11)} ${(s.moved ? "moved: run cuvette open <new folder>" : clipStart(folderText(s.cwd), 40)).padEnd(40)}  ${s.name ? clip(s.name, 70) : s.ask ? clip(s.ask, 60) : "(no request)"}`;
  const more = [s.status && !s.moved ? s.status : "", s.description ? clip(s.description, 110) : ""].filter(Boolean).join(" · ");
  return more ? `${head}\n${" ".repeat(22)}${more}` : head;
}
