import { randomBytes } from "node:crypto";
import { copyFileSync, mkdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { cuvetteHome } from "../adapters/manifest.ts";

const tempIn = (path: string) => join(dirname(path), `.tmp-${process.pid}-${randomBytes(4).toString("hex")}`);

function viaTemp(path: string, fill: (tmp: string) => void): void {
  const tmp = tempIn(path);
  try {
    fill(tmp);
    renameSync(tmp, path);
  } catch (e) {
    rmSync(tmp, { force: true });
    throw e;
  }
}

export function writeFileAtomic(path: string, text: string | Buffer, mode?: number): void {
  viaTemp(path, (tmp) => writeFileSync(tmp, text, mode === undefined ? undefined : { mode }));
}

export function copyFileAtomic(from: string, path: string): void {
  viaTemp(path, (tmp) => copyFileSync(from, tmp));
}

export function ensureHome(): void {
  mkdirSync(cuvetteHome(), { recursive: true, mode: 0o700 });
}

export function moveAside(path: string): string {
  const aside = `${path}.damaged-${new Date().toISOString().replace(/[:.]/g, "-")}-${randomBytes(3).toString("hex")}`;
  renameSync(path, aside);
  return aside;
}

const told = new Set<string>();

export function noticeOnce(text: string): void {
  if (told.has(text)) return;
  told.add(text);
  process.stderr.write(`${text}\n`);
}
