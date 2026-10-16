import { createHash } from "node:crypto";
import { appendFileSync, closeSync, existsSync, mkdirSync, openSync, readFileSync, readSync, readdirSync, statSync } from "node:fs";
import { extname, isAbsolute, join, relative } from "node:path";
import { copyFileAtomic, moveAside, noticeOnce, writeFileAtomic } from "./atomic.ts";
import { COPY_LIMIT_BYTES, local, portable } from "./places.ts";
import { extractNumbers } from "./claims.ts";
import type { EnvLock } from "./envlock.ts";
import { ENTRY_KINDS, type Entry, type EntryKind, type Message, type Node, type NodeIn } from "./types.ts";

const SHA_TEXT = /^[0-9a-f]{1,64}$/i;
const MAX_NUMBERS_PER_NODE = 2000;
const MAX_FILE_BYTES = 1_000_000;
// A table or text file that a script wrote holds its results. A code file holds typed numbers, not results.
const SCRIPT_RESULT_FILE = /\.(csv|tsv|tab|txt|json|md)$/i;

export interface RecordPlaces {
  workDir?: string;
  exportDir?: string;
  project?: string;
}

export const isTempOrDamaged = (f: string) => f.startsWith(".tmp-") || f.includes(".damaged-");
const isBlobFile = (f: string) => !f.startsWith(".tmp-") && !f.includes(".ref.json");

const HASHES = new Map<string, string>();

export function sha256File(path: string): string {
  const st = statSync(path);
  const key = `${path}\0${st.size}\0${st.mtimeMs}`;
  const known = HASHES.get(key);
  if (known) return known;
  const digest = hashOfFile(path);
  if (HASHES.size >= 200) HASHES.delete(HASHES.keys().next().value!);
  HASHES.set(key, digest);
  return digest;
}

function hashOfFile(path: string): string {
  const h = createHash("sha256");
  const fd = openSync(path, "r");
  const buf = Buffer.alloc(1 << 20);
  try {
    for (let n; (n = readSync(fd, buf, 0, buf.length, null)) > 0; ) h.update(buf.subarray(0, n));
  } finally {
    closeSync(fd);
  }
  return h.digest("hex");
}

const isObject = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);

// A damaged line can hold valid JSON that is not an entry. The record skips it, so that no reader gets a wrong shape.
const validId = (v: unknown): v is number => typeof v === "number" && Number.isSafeInteger(v) && v >= 0;

function intact(e: unknown): e is Entry {
  if (!isObject(e) || typeof e.kind !== "string" || !validId(e.id) || !isObject(e.data)) return false;
  const d = e.data;
  if (e.kind === "node") return typeof d.id === "string" && typeof d.tool === "string" && Array.isArray(d.parents) && Array.isArray(d.outputs);
  if (e.kind === "message") return isObject(d.message) && Array.isArray(d.message.parts);
  if (e.kind === "stale") return Array.isArray(d.nodes ?? []);
  if (e.kind === "compaction") return Array.isArray(d.kept ?? []);
  return true;
}

export const ownerOf = (entries: Pick<Entry, "kind" | "session">[]): string => entries.findLast((e) => e.kind === "fork")?.session ?? entries[0]?.session ?? "";

export const liveEntries = (r: Pick<AnalysisRecord, "entries"> & { live?: AnalysisRecord["live"] }, kinds?: EntryKind[]): Entry[] => (r.live ? r.live(kinds) : r.entries(kinds));

export class AnalysisRecord {
  dir: string;
  workDir: string;
  blobDir: string;
  exportDir: string;
  logPath: string;
  project?: string;
  onAppend?: (e: Entry) => void;
  private log: Entry[] = [];
  private nodeList: Node[] = [];
  private nodeById = new Map<string, Node>();
  private staleIds = new Set<string>();
  private envs = new Map<string, EnvLock & { name: string }>();
  private replaced = new Map<string, { node: string; entry: number }[]>();
  private nodeEntry = new Map<string, number>();
  private asideRanges: [number, number][] = [];
  private nextNode = 1;
  private cutTail = false;
  private lastId = 0;
  skipped = 0;

  constructor(sessionDir: string, readonly sessionId: string, places: RecordPlaces = {}) {
    this.dir = sessionDir;
    this.workDir = places.workDir ?? join(sessionDir, "work");
    this.blobDir = join(sessionDir, "blobs");
    this.exportDir = places.exportDir ?? join(sessionDir, "exports");
    this.logPath = join(sessionDir, "log.jsonl");
    this.project = places.project;
    for (const d of [this.dir, this.workDir, this.blobDir, this.exportDir]) mkdirSync(d, { recursive: true, mode: d === this.dir || d === this.blobDir ? 0o700 : undefined });
    if (existsSync(this.logPath)) this.load();
  }

  moveTo(sessionDir: string, places: RecordPlaces = {}): void {
    this.dir = sessionDir;
    this.workDir = places.workDir ?? join(sessionDir, "work");
    this.blobDir = join(sessionDir, "blobs");
    this.exportDir = places.exportDir ?? join(sessionDir, "exports");
    this.logPath = join(sessionDir, "log.jsonl");
  }

  // A crash can leave a cut last line. Call this only with the session lock held: the next entry must start on a new line.
  repairTail(): boolean {
    try {
      const buf = readFileSync(this.logPath);
      if (!buf.length) return false;
      if (buf[buf.length - 1] !== 0x0a) {
        appendFileSync(this.logPath, "\n");
        this.cutTail = false;
        try {
          JSON.parse(buf.toString("utf8", buf.lastIndexOf(10) + 1).replace(/^\uFEFF/, ""));
          return false;
        } catch {
          return true;
        }
      }
      this.cutTail = false;
      return false;
    } catch {
      return false;
    }
  }

  private load(): void {
    const buf = readFileSync(this.logPath);
    this.cutTail = buf.length > 0 && buf[buf.length - 1] !== 10;
    const bom = buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf ? 3 : 0;
    for (let at = bom, end = 0; at < buf.length; at = end + 1) {
      end = buf.indexOf(10, at);
      if (end < 0) end = buf.length;
      const line = buf.toString("utf8", at, end);
      if (!line.trim()) continue;
      let e: Entry;
      try {
        e = local(JSON.parse(line), this.project) as Entry;
      } catch {
        if (end < buf.length) this.skipped++;
        continue;
      }
      if (!intact(e)) {
        this.skip(e);
        continue;
      }
      if (e.kind === "message") this.readLater(e, at, end - at);
      this.log.push(e);
      this.lastId = Math.max(this.lastId, e.id);
      this.index(e);
    }
    if (this.skipped) for (const n of this.nodeList) n.parents = n.parents.filter((p) => this.nodeById.has(p));
  }

  private skip(e: unknown): void {
    this.skipped++;
    if (!isObject(e)) return;
    if (validId(e.id)) this.lastId = Math.max(this.lastId, e.id);
    if (e.kind !== "node" || !isObject(e.data)) return;
    const num = Number(/^n(\d+)$/.exec(String(e.data.id))?.[1] ?? 0);
    if (num >= this.nextNode) this.nextNode = num + 1;
  }

  // A loaded message holds the full model history of its turn. Only a resume or a rewind reads it, so it stays on disk until then.
  private readLater(e: Entry, at: number, length: number): void {
    Object.defineProperty(e, "data", {
      enumerable: true,
      configurable: true,
      get: () => {
        const buf = Buffer.alloc(length);
        const fd = openSync(this.logPath, "r");
        try {
          readSync(fd, buf, 0, length, at);
        } finally {
          closeSync(fd);
        }
        return (local(JSON.parse(buf.toString("utf8")), this.project) as Entry).data;
      },
    });
  }

  private index(e: Entry): void {
    if (e.kind === "node") {
      const n = e.data as unknown as Node;
      this.nodeList.push(n);
      this.nodeById.set(n.id, n);
      this.nodeEntry.set(n.id, e.id);
      const num = Number(/^n(\d+)$/.exec(n.id)?.[1] ?? 0);
      if (num >= this.nextNode) this.nextNode = num + 1;
    } else if (e.kind === "stale") {
      for (const id of (e.data.nodes as string[] | undefined) ?? []) this.staleIds.add(id);
    } else if (e.kind === "environment") {
      const l = e.data as unknown as EnvLock & { name: string };
      if (!this.envs.has(l.hash)) this.envs.set(l.hash, l);
    } else if (e.kind === "rerun") {
      const old = String(e.data.old);
      this.replaced.set(old, [...(this.replaced.get(old) ?? []), { node: String(e.data.node), entry: e.id }]);
    } else if (e.kind === "rewind") {
      this.asideRanges.push([Number(e.data.upTo), e.id]);
    }
  }

  unknownKinds(): string[] {
    const known = new Set<string>(ENTRY_KINDS);
    return [...new Set(this.log.map((e) => e.kind).filter((k) => !known.has(k)))].sort();
  }

  setAside(id: number): boolean {
    return this.asideRanges.some(([from, to]) => id > from && id < to);
  }

  live(kinds?: EntryKind[]): Entry[] {
    return this.entries(kinds).filter((e) => !this.setAside(e.id));
  }

  liveView(): AnalysisRecord {
    if (!this.asideRanges.length) return this;
    const rewound = this.rewound();
    return new Proxy(this, {
      get: (t, k, r) => {
        if (k === "entries") return (kinds?: EntryKind[]) => t.live(kinds);
        if (k === "nodes") return () => t.nodes().filter((n) => !rewound.has(n.id));
        return Reflect.get(t, k, r);
      },
    });
  }

  rewound(): Set<string> {
    return new Set([...this.nodeEntry].filter(([, id]) => this.setAside(id)).map(([n]) => n));
  }

  append(kind: EntryKind, data: Record<string, unknown>, opts: { refs?: number[]; node?: string } = {}): Entry {
    const e: Entry = {
      id: Math.max(this.log.length, this.lastId) + 1,
      ts: new Date().toISOString(),
      session: this.sessionId,
      kind,
      ...(opts.refs ? { refs: opts.refs } : {}),
      ...(opts.node ? { node: opts.node } : {}),
      data,
    };
    appendFileSync(this.logPath, (this.cutTail ? "\n" : "") + JSON.stringify(portable(e, this.project)) + "\n", { mode: 0o600 });
    this.cutTail = false;
    this.log.push(e);
    this.lastId = e.id;
    this.index(e);
    this.onAppend?.(e);
    return e;
  }

  entries(kinds?: EntryKind[]): Entry[] {
    return kinds ? this.log.filter((e) => kinds.includes(e.kind)) : [...this.log];
  }

  entry(id: number): Entry | undefined {
    const e = this.log[id - 1];
    return e?.id === id ? e : this.log.find((x) => x.id === id);
  }

  correct(id: number, data: Record<string, unknown>): Entry {
    return this.append("correction", data, { refs: [id] });
  }

  putBlob(src: string | Buffer, ext?: string): string {
    if (typeof src === "string") {
      const st = statSync(src);
      const rel = relative(this.workDir, src);
      const made = rel !== "" && !rel.startsWith("..") && !isAbsolute(rel);
      if (st.size > COPY_LIMIT_BYTES && !made) {
        const sha = sha256File(src);
        if (!this.blobPath(sha)) writeFileAtomic(join(this.blobDir, `${sha}.ref.json`), JSON.stringify(portable({ path: src, size: st.size, mtime: st.mtime.toISOString(), sha256: sha }, this.project)));
        return sha;
      }
    }
    const sha = typeof src === "string" ? sha256File(src) : createHash("sha256").update(src).digest("hex");
    const suffix = ext ?? (typeof src === "string" ? extname(src) : "");
    const dest = join(this.blobDir, sha + suffix);
    if (!this.blobPath(sha)) {
      if (typeof src === "string") copyFileAtomic(src, dest);
      else writeFileAtomic(dest, src);
      this.blobNames = undefined;
    }
    return sha;
  }

  blobRef(sha: string): { path: string; size: number; mtime: string; sha256: string } | undefined {
    if (!SHA_TEXT.test(sha)) return undefined;
    const ref = join(this.blobDir, `${sha}.ref.json`);
    if (!existsSync(ref)) return undefined;
    try {
      return local(JSON.parse(readFileSync(ref, "utf8")), this.project) as { path: string; size: number; mtime: string; sha256: string };
    } catch {
      try {
        noticeOnce(`The file ${ref} is damaged. Cuvette moved it to ${moveAside(ref)}.`);
      } catch {}
      return undefined;
    }
  }

  private blobNames?: { dir: string; mtimeMs: number; names: Map<string, string> };

  private blobName(sha: string): string | undefined {
    if (sha.length !== 64) return readdirSync(this.blobDir).find((f) => f.startsWith(sha) && isBlobFile(f));
    let c = this.blobNames;
    const hit = c?.dir === this.blobDir ? c.names.get(sha) : undefined;
    if (hit) return hit;
    const mtimeMs = statSync(this.blobDir, { throwIfNoEntry: false })?.mtimeMs ?? 0;
    if (c?.dir !== this.blobDir || c.mtimeMs !== mtimeMs) {
      c = this.blobNames = { dir: this.blobDir, mtimeMs, names: new Map() };
      for (const f of mtimeMs ? readdirSync(this.blobDir) : []) if (isBlobFile(f) && !c.names.has(f.slice(0, 64))) c.names.set(f.slice(0, 64), f);
    }
    return c.names.get(sha);
  }

  blobPath(sha: string): string | undefined {
    if (!SHA_TEXT.test(sha)) return undefined;
    const bare = join(this.blobDir, sha);
    if (existsSync(bare)) return bare;
    const hit = this.blobName(sha);
    if (hit && existsSync(join(this.blobDir, hit))) return join(this.blobDir, hit);
    const ref = this.blobRef(sha);
    if (!ref || !existsSync(ref.path)) return undefined;
    const st = statSync(ref.path);
    if (st.size === ref.size && st.mtime.toISOString() === ref.mtime) return ref.path;
    return sha256File(ref.path) === ref.sha256 ? ref.path : undefined;
  }

  addNode(n: NodeIn): Node {
    const node: Node = { ...n, id: `n${this.nextNode}`, ts: new Date().toISOString() };
    this.append("node", node as unknown as Record<string, unknown>, { node: node.id });
    return node;
  }

  nodes(): Node[] {
    return [...this.nodeList];
  }

  node(id: string): Node | undefined {
    return this.nodeById.get(id);
  }

  edges(): [string, string][] {
    return this.nodeList.flatMap((n) => n.parents.map((p): [string, string] => [p, n.id]));
  }

  comparisons(): Map<string, string> {
    const out = new Map<string, string>();
    for (const n of this.nodeList) {
      const key = n.sensitivityOf || n.parents.map((p) => out.get(p)).find(Boolean);
      if (key) out.set(n.id, key);
    }
    return out;
  }

  descendants(id: string): string[] {
    const kids = new Map<string, string[]>();
    for (const [p, c] of this.edges()) kids.set(p, [...(kids.get(p) ?? []), c]);
    const seen = new Set<string>();
    const walk = (x: string) => {
      for (const c of kids.get(x) ?? []) {
        if (seen.has(c)) continue;
        seen.add(c);
        walk(c);
      }
    };
    walk(id);
    return [...seen];
  }

  markStale(decisionKey: string, reason: string): string[] {
    const hit = new Set<string>();
    for (const n of this.nodeList) {
      if (!Object.hasOwn(n.decisions ?? {}, decisionKey)) continue;
      hit.add(n.id);
      for (const d of this.descendants(n.id)) hit.add(d);
    }
    const known = this.stale();
    const fresh = [...hit].filter((id) => !known.has(id));
    this.append("stale", { key: decisionKey, reason, nodes: fresh });
    return fresh;
  }

  staleMarks(): Entry[] {
    return this.log.filter((e) => e.kind === "stale" && (e.data.kind || !this.setAside(e.id)));
  }

  stale(): Set<string> {
    if (!this.asideRanges.length) return new Set(this.staleIds);
    return new Set(this.staleMarks().flatMap((e) => (e.data.nodes as string[] | undefined) ?? []));
  }

  addEnvironment(lock: EnvLock, name: string): string {
    if (!this.envs.has(lock.hash)) this.append("environment", { ...lock, name } as unknown as Record<string, unknown>);
    return lock.hash;
  }

  environment(hash: string): (EnvLock & { name: string }) | undefined {
    return this.envs.get(hash);
  }

  environments(): (EnvLock & { name: string })[] {
    return [...this.envs.values()];
  }

  replacedBy(id: string): string | undefined {
    return this.replaced.get(id)?.findLast((r) => !this.setAside(r.entry))?.node;
  }

  latest(id: string): string {
    let at = id;
    for (let i = 0; i < 1000; i++) {
      const next = this.replacedBy(at);
      if (next === undefined) break;
      at = next;
    }
    return at;
  }

  // A blob over the size limit, or one with a NUL byte (binary content with a text name), gives no text.
  private blobText(sha: string): string | undefined {
    try {
      const blob = this.blobPath(sha);
      if (!blob || statSync(blob).size > MAX_FILE_BYTES) return undefined;
      const buf = readFileSync(blob);
      return buf.subarray(0, 8192).includes(0) ? undefined : buf.toString("utf8");
    } catch {
      return undefined;
    }
  }

  numbers(): { node: string; path: string; value: number }[] {
    const out: { node: string; path: string; value: number }[] = [];
    const rewound = this.rewound();
    const reads = new Map<string, Entry[]>();
    for (const e of this.log) {
      const path = e.kind === "tool_result" && e.data.tool === "read_file" && e.data.ok ? (e.data.effectiveArgs as { path?: string } | undefined)?.path : undefined;
      if (path) reads.get(path)?.push(e) ?? reads.set(path, [e]);
    }
    for (const n of this.nodeList) {
      if (rewound.has(n.id)) continue;
      let count = 0;
      const walk = (v: unknown, path: string) => {
        if (count >= MAX_NUMBERS_PER_NODE) return;
        if (typeof v === "number") {
          if (Number.isFinite(v)) {
            out.push({ node: n.id, path, value: v });
            count++;
          }
        } else if (typeof v === "string" && path.startsWith("table.rows") && /^\s*-?\d+(?:\.\d+)?(?:e[-+]?\d+)?\s*$/i.test(v)) {
          out.push({ node: n.id, path, value: Number(v) });
          count++;
        } else if (Array.isArray(v)) {
          v.forEach((x, i) => walk(x, `${path}[${i}]`));
        } else if (v && typeof v === "object") {
          for (const [k, x] of Object.entries(v)) walk(x, path ? `${path}.${k}` : k);
        }
      };
      walk(n.result, "");
      const texts: [string, () => string | undefined][] = [];
      if (n.tool === "run_script") texts.push(["stdout", () => String(this.entry(n.entry)?.data.text ?? "")]);
      const seen = new Set<string>();
      const own = n.outputs.filter((o) => !seen.has(o.path) && seen.add(o.path));
      const written = n.tool === "run_script" ? own.filter((o) => o.sha && SCRIPT_RESULT_FILE.test(o.path) && !reads.has(o.path)) : [];
      for (const o of written) texts.push([`file:${o.path}`, () => this.blobText(o.sha!)]);
      const hits = own.flatMap((o) => (reads.get(o.path) ?? []).map((e) => ({ e, out: o, read: o.path }))).sort((x, y) => x.e.id - y.e.id);
      for (const { e, out, read } of hits) texts.push([`file:${read}`, () => (out.sha ? this.blobText(out.sha) : undefined) ?? String(e.data.text ?? "")]);
      for (const [path, read] of texts) {
        if (count >= MAX_NUMBERS_PER_NODE) break;
        for (const f of extractNumbers(read() ?? "")) {
          if (count >= MAX_NUMBERS_PER_NODE) break;
          out.push({ node: n.id, path, value: f.value });
          count++;
        }
      }
    }
    return out;
  }

  // One pass: a rewind takes the history as it was at its point, from a saved copy. A message body is read from disk only once.
  messages(upTo = Infinity): Message[] {
    const points = [...new Set(this.log.filter((e) => e.kind === "rewind").map((e) => Number(e.data.upTo)))].sort((a, b) => a - b);
    const at = new Map<number, { list: Message[]; length: number }>();
    let next = 0;
    let out: Message[] = [];
    for (const e of this.log) {
      if (e.id > upTo) break;
      for (; next < points.length && points[next]! < e.id; next++) at.set(points[next]!, { list: out, length: out.length });
      if (e.kind === "compaction") out = [{ role: "user", parts: [{ type: "text", text: String(e.data.summary ?? "") }] }, ...((e.data.kept as Message[] | undefined) ?? [])];
      else if (e.kind === "rewind") {
        const back = at.get(Number(e.data.upTo));
        if (back) out = back.list.slice(0, back.length);
      } else if (e.kind === "message") out.push(e.data.message as Message);
    }
    return out;
  }
}
