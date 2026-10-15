import { createHash } from "node:crypto";
import { existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, readlinkSync, realpathSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { cuvetteHome } from "./manifest.ts";

export const MAX_ADAPTER_FILES = 5000;
export const NOT_HASHED = [".git", "node_modules", ".venv"];

export interface FolderDigest {
  hash?: string;
  tooMany: boolean;
  notHashed: string[];
}

export type FolderState = "same" | "changed" | "none" | "too many files";

interface Stored {
  hash: string;
  at: string;
}

const cache = new Map<string, { sig: string; digest: FolderDigest }>();

const realOf = (p: string) => {
  try {
    return realpathSync(p);
  } catch {
    return resolve(p);
  }
};

const storePath = () => join(cuvetteHome(), "adapter-hashes.json");

function readStore(): Record<string, Stored> {
  try {
    const data = JSON.parse(readFileSync(storePath(), "utf8"));
    return data && typeof data === "object" && !Array.isArray(data) ? data : {};
  } catch {
    return {};
  }
}

export function folderDigest(dir: string): FolderDigest {
  const files: { rel: string; kind: "f" | "l"; sig: string }[] = [];
  const notHashed: string[] = [];
  let tooMany = false;
  const walk = (d: string) => {
    for (const n of readdirSync(d).sort()) {
      const p = join(d, n);
      const st = lstatSync(p);
      const rel = relative(dir, p).split(sep).join("/");
      if (st.isDirectory() && NOT_HASHED.includes(n)) {
        notHashed.push(rel);
        continue;
      }
      if (n === ".git") continue;
      if (st.isDirectory()) walk(p);
      else if (st.isFile() || st.isSymbolicLink()) {
        files.push({ rel, kind: st.isSymbolicLink() ? "l" : "f", sig: `${st.mtimeMs}:${st.size}` });
        if (files.length > MAX_ADAPTER_FILES) {
          tooMany = true;
          return;
        }
      }
      if (tooMany) return;
    }
  };
  walk(dir);
  if (tooMany) return { tooMany, notHashed };
  const key = realOf(dir);
  const sig = files.map((f) => `${f.rel}:${f.kind}:${f.sig}`).join("\n");
  const hit = cache.get(key);
  if (hit && hit.sig === sig) return { ...hit.digest, notHashed };
  const h = createHash("sha256");
  for (const f of files) {
    const body = f.kind === "l" ? readlinkSync(join(dir, f.rel)) : createHash("sha256").update(readFileSync(join(dir, f.rel))).digest("hex");
    h.update(`${f.kind}\0${f.rel}\0${body}\n`);
  }
  const digest = { hash: h.digest("hex"), tooMany: false, notHashed };
  cache.set(key, { sig, digest });
  return digest;
}

export function rememberAdapterFolder(root: string): boolean {
  const d = folderDigest(root);
  if (!d.hash) return false;
  const all = readStore();
  all[realOf(root)] = { hash: d.hash, at: new Date().toISOString() };
  const file = storePath();
  mkdirSync(dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  writeFileSync(tmp, JSON.stringify(all, null, 1), { mode: 0o600 });
  renameSync(tmp, file);
  return true;
}

export function adapterFolderState(root: string): FolderState {
  if (!existsSync(root)) return "none";
  const d = folderDigest(root);
  if (d.tooMany) return "too many files";
  const stored = readStore()[realOf(root)];
  if (!stored || typeof stored.hash !== "string") return "none";
  return stored.hash === d.hash ? "same" : "changed";
}
