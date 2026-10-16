#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const KEPT = /^(SOURCES\.md|files\.json|fetch[^/]*\.sh)$/;

export function dataIndex(catalog, name) {
  const files = execFileSync("git", ["ls-files", "-z", "--", `${name}/data`], { cwd: catalog, encoding: "utf8" })
    .split("\0")
    .filter((f) => f && !KEPT.test(f.slice(`${name}/data/`.length)))
    .sort();
  const out = {};
  for (const f of files) {
    const body = readFileSync(join(catalog, f));
    out[f.slice(name.length + 1)] = { sha256: createHash("sha256").update(body).digest("hex"), bytes: body.length };
  }
  return out;
}

export function indexText(index) {
  return `{\n${Object.entries(index).map(([k, v]) => ` ${JSON.stringify(k)}: ${JSON.stringify(v)}`).join(",\n")}\n}\n`;
}

export function writeIndexes(catalog) {
  const written = [];
  for (const name of readdirSync(catalog).sort()) {
    if (!existsSync(join(catalog, name, "adapter.yaml"))) continue;
    const index = dataIndex(catalog, name);
    const file = join(catalog, name, "data", "files.json");
    if (Object.keys(index).length) {
      writeFileSync(file, indexText(index));
      written.push(name);
    }
  }
  return written;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const written = writeIndexes(resolve(process.argv[2] ?? "catalog"));
  console.log(`Wrote data/files.json for ${written.length} adapters.`);
}
