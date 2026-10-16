import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { closeSync, existsSync, fsyncSync, linkSync, openSync, readdirSync, readFileSync, readSync, renameSync, rmSync, statSync, writeFileSync, writeSync } from "node:fs";
import { basename, dirname, isAbsolute, join, relative, resolve } from "node:path";
import { cuvetteHome } from "../adapters/manifest.ts";
import { cutText, discardPlace, readIndex, readRowMarks, type IndexRow } from "./places.ts";

export type SessionStatus = "answered" | "waiting for you" | "running" | "in progress" | "not started" | "log too large to read";

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
  worked?: boolean;
}

const WORK_KINDS = new Set(["user", "assistant", "tool_call", "tool_result", "node", "decision", "answer"]);
const IMAGE = /\.(png|jpe?g|gif|webp|svg)$/i;

export interface OpenLock {
  pid: number;
  app?: string;
  started?: string;
  procStart?: number;
  fresh?: boolean;
}

const LOCK = "open.json";
const START_SLACK_MS = 5000;
const LOCK_GRACE_MS = 5000;
const CLOCK_SKEW_MS = 1000;

export function processStart(pid: number): number | undefined {
  if (process.platform === "win32") {
    try {
      const out = execFileSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", `[DateTimeOffset]::new((Get-Process -Id ${Math.trunc(pid)}).StartTime).ToUnixTimeMilliseconds()`], { encoding: "utf8", timeout: 5000, stdio: ["ignore", "pipe", "ignore"], windowsHide: true }).trim();
      const t = Number(out);
      return Number.isFinite(t) && t > 0 ? t : undefined;
    } catch {
      return undefined;
    }
  }
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
  const real = startOf(lock.pid);
  if (typeof lock.procStart !== "number") {
    const wrote = Date.parse(lock.started ?? "");
    return real === undefined || !Number.isFinite(wrote) || real <= wrote + START_SLACK_MS;
  }
  return real === undefined || Math.abs(real - lock.procStart) <= START_SLACK_MS;
}

function readLock(path: string): OpenLock | undefined {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return undefined;
  }
}

export const OPENING_TEXT = "This session is opening in another window. Try again in a moment.";

export const ownerKnown = (lock: OpenLock | undefined): lock is OpenLock => !!lock && Number.isInteger(lock.pid) && lock.pid > 0;

export function signalOwner(lock: OpenLock, signal: NodeJS.Signals, kill: (pid: number, signal: NodeJS.Signals) => unknown = process.kill): boolean {
  if (!ownerKnown(lock)) return false;
  kill(lock.pid, signal);
  return true;
}

function freshFile(path: string): boolean {
  try {
    const age = Date.now() - statSync(path).mtimeMs;
    return age >= -CLOCK_SKEW_MS && age < LOCK_GRACE_MS;
  } catch {
    return false;
  }
}

export function openLock(recordDir: string, startOf?: (pid: number) => number | undefined): OpenLock | undefined {
  const path = join(recordDir, LOCK);
  const lock = readLock(path);
  if (!lock && freshFile(path)) return { pid: 0, fresh: true };
  return lockAlive(lock, startOf) ? lock : undefined;
}

const NO_LINK_CODES = new Set(["EPERM", "ENOTSUP", "EOPNOTSUPP", "ENOSYS"]);
let warnedNoLinks = false;

const pause = (ms: number) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

export function claimLock(recordDir: string, extra: Record<string, unknown> = {}, startOf?: (pid: number) => number | undefined): OpenLock | undefined {
  const path = join(recordDir, LOCK);
  const guard = `${path}.take`;
  const body = () => JSON.stringify({ pid: process.pid, procStart: ownStart(), started: new Date().toISOString(), ...extra });
  const writeInPlace = () => {
    const fd = openSync(path, "wx", 0o600);
    try {
      writeSync(fd, body());
      fsyncSync(fd);
    } finally {
      closeSync(fd);
    }
  };
  const publish = () => {
    const temp = `${path}.new.${process.pid}.${randomBytes(4).toString("hex")}`;
    try {
      writeFileSync(temp, body(), { flag: "wx", mode: 0o600 });
      linkSync(temp, path);
      return true;
    } catch (e) {
      const code = (e as NodeJS.ErrnoException).code ?? "";
      if (code === "EEXIST") return false;
      if (!NO_LINK_CODES.has(code)) throw e;
      if (!warnedNoLinks) {
        warnedNoLinks = true;
        process.stderr.write("This file system has no hard links. The session lock is weaker here.\n");
      }
      try {
        writeInPlace();
        return true;
      } catch (e2) {
        if ((e2 as NodeJS.ErrnoException).code === "EEXIST") return false;
        throw e2;
      }
    } finally {
      rmSync(temp, { force: true });
    }
  };
  const takeGuard = () => {
    try {
      closeSync(openSync(guard, "wx", 0o600));
      return true;
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "EEXIST") throw e;
    }
    if (!freshFile(guard)) rmSync(guard, { force: true });
    return false;
  };
  const opening: OpenLock = { pid: 0, fresh: true };
  for (let i = 0; i < 5; i++) {
    if (publish()) return undefined;
    const held = readLock(path);
    if (held && lockAlive(held, startOf)) return held.pid === process.pid ? undefined : held;
    if (!held && freshFile(path)) return opening;
    if (!takeGuard()) {
      pause(100);
      continue;
    }
    try {
      const again = readLock(path);
      if (again && lockAlive(again, startOf)) return again.pid === process.pid ? undefined : again;
      if (!again && freshFile(path)) return opening;
      const aside = `${path}.${process.pid}.${randomBytes(4).toString("hex")}`;
      try {
        renameSync(path, aside);
        rmSync(aside, { force: true });
      } catch {}
      if (publish()) return undefined;
    } finally {
      rmSync(guard, { force: true });
    }
  }
  return opening;
}

const alive = (dir: string) => !!openLock(dir);

interface Parsed {
  first: any;
  owner?: string;
  ask: any;
  title?: { title: string; description: string };
  figures: string[];
  answered: boolean;
  waiting: boolean;
  lastFinal: boolean;
  worked: boolean;
  partial?: boolean;
}

export const logLimits = { read: 256 * 1024 * 1024, edge: 1024 * 1024 };

function readLog(log: string, size: number): string {
  if (size <= logLimits.read) return readFileSync(log, "utf8");
  const fd = openSync(log, "r");
  try {
    const part = (at: number) => {
      const buf = Buffer.alloc(logLimits.edge);
      return buf.subarray(0, readSync(fd, buf, 0, logLimits.edge, at)).toString("utf8");
    };
    return `${part(0)}\n${part(size - logLimits.edge)}`;
  } finally {
    closeSync(fd);
  }
}

const parsed = new Map<string, { mtime: number; size: number; ino: number; limit: number; p: Parsed }>();

function parseLog(log: string): Parsed {
  const st = statSync(log);
  const hit = parsed.get(log);
  if (hit && hit.mtime === st.mtimeMs && hit.size === st.size && hit.ino === st.ino && hit.limit === logLimits.read) return hit.p;
  let first: any;
  let owner: string | undefined;
  let ask: any;
  let title: { title: string; description: string } | undefined;
  const figures: string[] = [];
  let answered = false;
  const asked = new Set<string>();
  let planOpen = false;
  let lastFinal = false;
  let worked = false;
  for (const l of readLog(log, st.size).replace(/^\uFEFF/, "").split("\n")) {
    if (!l) continue;
    let e: any;
    try {
      e = JSON.parse(l);
    } catch {
      continue;
    }
    if (!e || typeof e !== "object") continue;
    const d = e.data && typeof e.data === "object" ? e.data : {};
    if (WORK_KINDS.has(e.kind)) worked = true;
    if (!first && e.kind === "session") first = e;
    if (e.kind === "fork" && typeof e.session === "string") owner = e.session;
    else if (!ask && e.kind === "user" && !d.during) ask = e;
    else if (e.kind === "title") title = { title: String(d.title ?? ""), description: String(d.description ?? "") };
    if (e.kind === "assistant" && d.final) answered = lastFinal = true;
    else if (e.kind === "user" && !d.during) lastFinal = false;
    if (e.kind === "assistant") continue;
    else if (e.kind === "question") asked.add(String(d.qid));
    else if (e.kind === "answer") asked.delete(String(d.qid));
    else if (e.kind === "plan") planOpen = d.action === "proposed";
    else if (e.kind === "plan_approved" || e.kind === "pilot_approved") planOpen = false;
    else if (figures.length < 20 && e.kind === "node" && !d.sensitivityOf) figures.push(...((d.outputs ?? []) as { path: string; kind?: string }[]).map((o) => o.path).filter((p) => IMAGE.test(p)));
  }
  const p = { first, owner: owner ?? first?.session, ask, title, figures, answered, waiting: asked.size > 0 || planOpen, lastFinal, worked, ...(st.size > logLimits.read ? { partial: true } : {}) };
  parsed.set(log, { mtime: st.mtimeMs, size: st.size, ino: st.ino, limit: logLimits.read, p });
  return p;
}

export function scanLog(log: string): { first: any; ask: any; title?: { title: string; description: string }; status: SessionStatus; figure?: string; owner?: string; worked: boolean; partial?: boolean } {
  const { first, owner, ask, title, figures, answered, waiting, lastFinal, worked, partial } = parseLog(log);
  const figure = figures.find((f) => existsSync(f));
  const live = alive(dirname(log));
  const status: SessionStatus = partial ? "log too large to read" : waiting && !lastFinal ? "waiting for you" : live && !lastFinal ? "running" : answered ? "answered" : ask || worked ? "in progress" : "not started";
  return { first, ask, title, status, figure, owner, worked, ...(partial ? { partial } : {}) };
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
    worked: s.worked,
    figure: s.figure ?? firstFigure(base.folder),
  };
}

const STALE_MS = 24 * 3600 * 1000;

export function startEntriesOnly(log: string): boolean {
  if (!existsSync(log)) return true;
  for (const l of readFileSync(log, "utf8").replace(/^\uFEFF/, "").split("\n")) {
    if (!l.trim()) continue;
    try {
      const kind = JSON.parse(l)?.kind;
      if (kind !== "session" && kind !== "notice") return false;
    } catch {
      return false;
    }
  }
  return true;
}

function staleEmpty(r: IndexRow): boolean {
  if (!basename(r.folder).startsWith(".new-") || Date.now() - (Date.parse(r.date) || 0) < STALE_MS) return false;
  const record = join(r.folder, ".record");
  return existsSync(r.folder) && readdirSync(r.folder).every((n) => n === ".record") && !alive(record) && startEntriesOnly(join(record, "log.jsonl"));
}

export function cleanSessions(): string[] {
  const removed: string[] = [];
  for (const r of readIndex()) {
    if (!staleEmpty(r)) continue;
    const record = join(r.folder, ".record");
    try {
      if (claimLock(record)) continue;
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === "ENOENT") continue;
      throw e;
    }
    if (startEntriesOnly(join(record, "log.jsonl"))) discardPlace({ id: r.id, outDir: r.folder, recordDir: record, project: r.project, title: "", created: r.date, legacy: false, fallback: false });
    if (existsSync(r.folder)) rmSync(join(record, LOCK), { force: true });
    else removed.push(`${r.id}  ${r.folder}`);
  }
  return removed;
}

function indexed(home: string): SessionInfo[] {
  const rows = readIndex(join(home, "sessions-index.json")).filter((r) => !staleEmpty(r));
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
  const marks = readRowMarks(join(home, "sessions-index.json"));
  for (const id of existsSync(dir) ? readdirSync(dir) : []) {
    const log = join(dir, id, "log.jsonl");
    if (seen.has(id) || !existsSync(log) || marks.get(id) === null) continue;
    const s = info(id, log, { cwd: "" }, "", marks.get(id) ?? undefined);
    s.cwd = String(scanLog(log).first?.data.cwd ?? "");
    out.push(s);
  }
  for (const log of parsed.keys()) if (!existsSync(log)) parsed.delete(log);
  return out.filter((s) => !(s.moved && s.used === 0)).sort((a, b) => b.used - a.used || b.id.localeCompare(a.id));
}

export function defaultSession(all: SessionInfo[], cwd: string): { info: SessionInfo; here: boolean } | undefined {
  const list = all.filter((s) => !s.moved && (s.ask || s.worked));
  const inside = (dir: string) => !relative(resolve(dir), resolve(cwd)).startsWith("..") && !isAbsolute(relative(resolve(dir), resolve(cwd)));
  const here = list.find((s) => ((s.cwd && resolve(s.cwd) === resolve(cwd)) || (s.folder && inside(s.folder))));
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
  return one.length > n ? cutText(one, n - 1).trimEnd() + "…" : one;
}

export function clipStart(s: string, n: number): string {
  return s.length > n ? "…" + s.slice(s.length - n + 1).replace(/^[\udc00-\udfff]/, "") : s;
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
