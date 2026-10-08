import { createHash } from "node:crypto";
import { appendFileSync, copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { extname, join } from "node:path";
import type { Entry, EntryKind, Message, Node, NodeIn } from "./types.ts";

const MAX_NUMBERS_PER_NODE = 2000;

export class AnalysisRecord {
  readonly dir: string;
  readonly workDir: string;
  readonly blobDir: string;
  readonly exportDir: string;
  readonly logPath: string;
  onAppend?: (e: Entry) => void;
  private log: Entry[] = [];
  private nodeList: Node[] = [];
  private nodeById = new Map<string, Node>();
  private staleIds = new Set<string>();
  private nextNode = 1;

  constructor(sessionDir: string, private sessionId: string) {
    this.dir = sessionDir;
    this.workDir = join(sessionDir, "work");
    this.blobDir = join(sessionDir, "blobs");
    this.exportDir = join(sessionDir, "exports");
    this.logPath = join(sessionDir, "log.jsonl");
    for (const d of [this.dir, this.workDir, this.blobDir, this.exportDir]) mkdirSync(d, { recursive: true });
    if (existsSync(this.logPath)) this.load();
  }

  private load(): void {
    for (const line of readFileSync(this.logPath, "utf8").split("\n")) {
      if (!line.trim()) continue;
      let e: Entry;
      try {
        e = JSON.parse(line) as Entry;
      } catch {
        continue;
      }
      this.log.push(e);
      this.index(e);
    }
  }

  private index(e: Entry): void {
    if (e.kind === "node") {
      const n = e.data as unknown as Node;
      this.nodeList.push(n);
      this.nodeById.set(n.id, n);
      const num = Number(/^n(\d+)$/.exec(n.id)?.[1] ?? 0);
      if (num >= this.nextNode) this.nextNode = num + 1;
    } else if (e.kind === "stale") {
      for (const id of (e.data.nodes as string[] | undefined) ?? []) this.staleIds.add(id);
    }
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
    appendFileSync(this.logPath, JSON.stringify(e) + "\n");
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
    const buf = typeof src === "string" ? readFileSync(src) : src;
    const sha = createHash("sha256").update(buf).digest("hex");
    const suffix = ext ?? (typeof src === "string" ? extname(src) : "");
    const dest = join(this.blobDir, sha + suffix);
    if (!this.blobPath(sha)) {
      if (typeof src === "string") copyFileSync(src, dest);
      else writeFileSync(dest, buf);
    }
    return sha;
  }

  blobPath(sha: string): string | undefined {
    const bare = join(this.blobDir, sha);
    if (existsSync(bare)) return bare;
    const hit = readdirSync(this.blobDir).find((f) => f.startsWith(sha));
    return hit ? join(this.blobDir, hit) : undefined;
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

  numbers(): { node: string; path: string; value: number }[] {
    const out: { node: string; path: string; value: number }[] = [];
    for (const n of this.nodeList) {
      let count = 0;
      const walk = (v: unknown, path: string) => {
        if (count >= MAX_NUMBERS_PER_NODE) return;
        if (typeof v === "number") {
          if (Number.isFinite(v)) {
            out.push({ node: n.id, path, value: v });
            count++;
          }
        } else if (Array.isArray(v)) {
          v.forEach((x, i) => walk(x, `${path}[${i}]`));
        } else if (v && typeof v === "object") {
          for (const [k, x] of Object.entries(v)) walk(x, path ? `${path}.${k}` : k);
        }
      };
      walk(n.result, "");
    }
    return out;
  }

  messages(): Message[] {
    const all = this.log;
    let start = 0;
    let head: Message[] = [];
    for (let i = all.length - 1; i >= 0; i--) {
      if (all[i].kind === "compaction") {
        head = [{ role: "user", parts: [{ type: "text", text: String(all[i].data.summary ?? "") }] }];
        start = i + 1;
        break;
      }
    }
    const rest = all
      .slice(start)
      .filter((e) => e.kind === "message")
      .map((e) => e.data.message as Message);
    return [...head, ...rest];
  }
}
