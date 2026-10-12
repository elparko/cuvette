import { execFile, execFileSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { existsSync, mkdirSync, renameSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";
import { cuvetteHome } from "../adapters/manifest.ts";

export function imageSize(b: Buffer): { w: number; h: number } | null {
  if (b.length > 24 && b.readUInt32BE(0) === 0x89504e47) return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8) {
    let i = 2;
    while (i + 9 < b.length) {
      if (b[i] !== 0xff) return null;
      const m = b[i + 1]!;
      const len = b.readUInt16BE(i + 2);
      if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) return { w: b.readUInt16BE(i + 7), h: b.readUInt16BE(i + 5) };
      i += 2 + len;
    }
  }
  return null;
}

export type Format = "png" | "jpeg";

function target(path: string, maxSide: number, format: Format): string {
  const st = statSync(path);
  const key = createHash("sha1").update(`${path}\0${st.mtimeMs}\0${st.size}\0${maxSide}\0${format}`).digest("hex");
  const dir = join(cuvetteHome(), "cache", "images");
  mkdirSync(dir, { recursive: true });
  return join(dir, `${key}.${format === "jpeg" ? "jpg" : "png"}`);
}

const args = (path: string, out: string, maxSide: number, format: Format) => ["-Z", String(maxSide), "-s", "format", format, path, "--out", out];
const partial = (out: string) => out.replace(/(\.\w+)$/, `.part-${process.pid}-${randomUUID().slice(0, 8)}$1`);

// A copy with the longest side at most maxSide pixels, in the cache. Only macOS has sips; elsewhere null.
export function scaledCopySync(path: string, maxSide: number, format: Format): string | null {
  if (process.platform !== "darwin") return null;
  let part = "";
  try {
    const out = target(path, maxSide, format);
    if (!existsSync(out)) {
      part = partial(out);
      execFileSync("sips", args(path, part, maxSide, format), { stdio: "ignore", timeout: 30_000 });
      renameSync(part, out);
    }
    return existsSync(out) ? out : null;
  } catch {
    if (part) rmSync(part, { force: true });
    return null;
  }
}

export async function scaledCopy(path: string, maxSide: number, format: Format, signal?: AbortSignal): Promise<string | null> {
  if (process.platform !== "darwin") return null;
  let part = "";
  try {
    const out = target(path, maxSide, format);
    if (!existsSync(out)) {
      part = partial(out);
      await new Promise<void>((ok, fail) => execFile("sips", args(path, part, maxSide, format), { timeout: 30_000, signal }, (e) => (e ? fail(e) : ok())));
      renameSync(part, out);
    }
    return existsSync(out) ? out : null;
  } catch {
    if (part) rmSync(part, { force: true });
    if (signal?.aborted) throw signal.reason;
    return null;
  }
}
