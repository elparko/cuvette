import { createHash } from "node:crypto";
import { appendFileSync, closeSync, copyFileSync, existsSync, mkdirSync, openSync, readFileSync, readSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { extname, isAbsolute, join, relative } from "node:path";
import { COPY_LIMIT_BYTES, local, portable } from "./places.ts";
import { extractNumbers } from "./claims.ts";
import type { EnvLock } from "./envlock.ts";
import type { Entry, EntryKind, Message, Node, NodeIn } from "./types.ts";

const MAX_NUMBERS_PER_NODE = 2000;
const MAX_FILE_BYTES = 1_000_000;

export interface RecordPlaces {
  workDir?: string;
  exportDir?: string;
  project?: string;
}

function sha256File(path: string): string {
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
  private replaced = new Map<string, string>();
  private nodeEntry = new Map<string, number>();
  private asideRanges: [number, number][] = [];
  private nextNode = 1;

  constructor(sessionDir: string, readonly sessionId: string, places: RecordPlaces = {}) {
    this.dir = sessionDir;
    this.workDir = places.workDir ?? join(sessionDir, "work");
    this.blobDir = join(sessionDir, "blobs");
    this.exportDir = places.exportDir ?? join(sessionDir, "exports");
    this.logPath = join(sessionDir, "log.jsonl");
    this.project = places.project;
    for (const d of [this.dir, this.workDir, this.blobDir, this.exportDir]) mkdirSync(d, { recursive: true });
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
  repairTail(): void {
    try {
      const size = statSync(this.logPath).size;
      if (!size) return;
      const fd = openSync(this.logPath, "r");
      const last = Buffer.alloc(1);
      try {
        readSync(fd, last, 0, 1, size - 1);
      } finally {
        closeSync(fd);
      }
      if (last[0] !== 0x0a) appendFileSync(this.logPath, "\n");
    } catch {}
  }

  private load(): void {
    const buf = readFileSync(this.logPath);
    for (let at = 0, end = 0; at < buf.length; at = end + 1) {
      end = buf.indexOf(10, at);
      if (end < 0) end = buf.length;
      const line = buf.toString("utf8", at, end);
      if (!line.trim()) continue;
      let e: Entry;
      try {
        e = local(JSON.parse(line), this.project) as Entry;
      } catch {
        continue;
      }
      if (e.kind === "message") this.readLater(e, at, end - at);
      this.log.push(e);
      this.index(e);
    }
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
      this.replaced.set(String(e.data.old), String(e.data.node));
    } else if (e.kind === "rewind") {
      this.asideRanges.push([Number(e.data.upTo), e.id]);
    }
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
      id: this.log.length + 1,
      ts: new Date().toISOString(),
      session: this.sessionId,
      kind,
      ...(opts.refs ? { refs: opts.refs } : {}),
      ...(opts.node ? { node: opts.node } : {}),
      data,
    };
    appendFileSync(this.logPath, JSON.stringify(portable(e, this.project)) + "\n");
    this.log.push(e);
    this.index(e);
    this.onAppend?.(e);
    return e;
  }

  entries(kinds?: EntryKind[]): Entry[] {
    return kinds ? this.log.filter((e) => kinds.includes(e.kind)) : [...this.log];
  }

  entry(id: number): Entry | undefined {
    return this.log[id - 1];
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
        if (!this.blobPath(sha)) writeFileSync(join(this.blobDir, `${sha}.ref.json`), JSON.stringify(portable({ path: src, size: st.size, mtime: st.mtime.toISOString(), sha256: sha }, this.project)));
        return sha;
      }
    }
    const buf = typeof src === "string" ? readFileSync(src) : src;
    const sha = createHash("sha256").update(buf).digest("hex");
    const suffix = ext ?? (typeof src === "string" ? extname(src) : "");
    const dest = join(this.blobDir, sha + suffix);
    if (!this.blobPath(sha)) {
      if (typeof src === "string") copyFileSync(src, dest);
      else writeFileSync(dest, buf);
      this.blobNames = undefined;
    }
    return sha;
  }

  blobRef(sha: string): { path: string; size: number; mtime: string; sha256: string } | undefined {
    const ref = join(this.blobDir, `${sha}.ref.json`);
    return existsSync(ref) ? (local(JSON.parse(readFileSync(ref, "utf8")), this.project) as { path: string; size: number; mtime: string; sha256: string }) : undefined;
  }

  private blobNames?: { dir: string; mtimeMs: number; names: Map<string, string> };

  private blobName(sha: string): string | undefined {
    if (sha.length !== 64) return readdirSync(this.blobDir).find((f) => f.startsWith(sha) && !f.endsWith(".ref.json"));
    let c = this.blobNames;
    const hit = c?.dir === this.blobDir ? c.names.get(sha) : undefined;
    if (hit) return hit;
    const mtimeMs = statSync(this.blobDir, { throwIfNoEntry: false })?.mtimeMs ?? 0;
    if (c?.dir !== this.blobDir || c.mtimeMs !== mtimeMs) {
      c = this.blobNames = { dir: this.blobDir, mtimeMs, names: new Map() };
      for (const f of mtimeMs ? readdirSync(this.blobDir) : []) if (!f.endsWith(".ref.json") && !c.names.has(f.slice(0, 64))) c.names.set(f.slice(0, 64), f);
    }
    return c.names.get(sha);
  }

  blobPath(sha: string): string | undefined {
    const bare = join(this.blobDir, sha);
    if (existsSync(bare)) return bare;
    const hit = this.blobName(sha);
    if (hit && existsSync(join(this.blobDir, hit))) return join(this.blobDir, hit);
    const ref = this.blobRef(sha);
    return ref && existsSync(ref.path) ? ref.path : undefined;
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
    const fresh = [...hit].filter((id) => !this.staleIds.has(id));
    this.append("stale", { key: decisionKey, reason, nodes: fresh });
    return fresh;
  }

  stale(): Set<string> {
    return new Set(this.staleIds);
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
    return this.replaced.get(id);
  }

  latest(id: string): string {
    let at = id;
    for (let i = 0; i < 1000 && this.replaced.has(at); i++) at = this.replaced.get(at)!;
    return at;
  }

  numbers(): { node: string; path: string; value: number }[] {
    const out: { node: string; path: string; value: number }[] = [];
    const rewound = this.rewound();
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
      const texts: [string, string][] = [];
      if (n.tool === "run_script") texts.push(["stdout", String(this.log.find((e) => e.id === n.entry)?.data.text ?? "")]);
      for (const e of this.log) {
        if (e.kind !== "tool_result" || e.data.tool !== "read_file" || !e.data.ok) continue;
        const read = (e.data.effectiveArgs as { path?: string } | undefined)?.path;
        const out = read ? n.outputs.find((o) => o.path === read) : undefined;
        if (!out) continue;
        const blob = out.sha ? this.blobPath(out.sha) : undefined;
        let text = String(e.data.text ?? "");
        try {
          if (blob && statSync(blob).size <= MAX_FILE_BYTES) text = readFileSync(blob, "utf8");
        } catch {}
        texts.push([`file:${read}`, text]);
      }
      for (const [path, text] of texts) {
        for (const f of extractNumbers(text)) {
          if (count >= MAX_NUMBERS_PER_NODE) break;
          out.push({ node: n.id, path, value: f.value });
          count++;
        }
      }
    }
    return out;
  }

  messages(upTo = Infinity): Message[] {
    let out: Message[] = [];
    for (const e of this.log) {
      if (e.id > upTo) break;
      if (e.kind === "compaction") out = [{ role: "user", parts: [{ type: "text", text: String(e.data.summary ?? "") }] }];
      else if (e.kind === "rewind") out = this.messages(Number(e.data.upTo));
      else if (e.kind === "message") out.push(e.data.message as Message);
    }
    return out;
  }
}
