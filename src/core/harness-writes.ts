import { createHash } from "node:crypto";
import { closeSync, openSync, readSync, realpathSync } from "node:fs";
import { basename, dirname, join } from "node:path";

export function hashBytes(path: string, from = 0, limit = Infinity): string {
  const h = createHash("sha256");
  const buf = Buffer.alloc(1 << 20);
  const fd = openSync(path, "r");
  try {
    for (let done = 0; done < limit; ) {
      const n = readSync(fd, buf, 0, Math.min(buf.length, limit - done), from + done);
      if (!n) break;
      h.update(buf.subarray(0, n));
      done += n;
    }
  } finally {
    closeSync(fd);
  }
  return h.digest("hex");
}

export function fileHash(path: string): string {
  try {
    return hashBytes(path);
  } catch {
    return "";
  }
}

const recorded = new Map<string, string>();
const pending = new Map<string, number>();

function keyOf(path: string): string {
  try {
    return join(realpathSync.native(dirname(path)), basename(path));
  } catch {
    return path;
  }
}

export function noteHarnessWrite(path: string, hash: string = fileHash(path)): void {
  recorded.set(keyOf(path), hash);
}

// A file that the harness writes now, or wrote with this content, is not a change by a program.
export function harnessWrite(path: string, write: () => void): void {
  const key = keyOf(path);
  pending.set(key, (pending.get(key) ?? 0) + 1);
  try {
    write();
  } finally {
    pending.set(key, pending.get(key)! - 1);
    noteHarnessWrite(path);
  }
}

export function harnessWrote(path: string, currentHash: string): boolean {
  const key = keyOf(path);
  return (pending.get(key) ?? 0) > 0 || recorded.get(key) === currentHash;
}
