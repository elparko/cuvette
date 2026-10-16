#!/usr/bin/env node
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const catalog = join(dirname(fileURLToPath(import.meta.url)), "..", "catalog");
const problems = [];
for (const name of readdirSync(catalog).sort()) {
  const index = join(catalog, name, "data", "files.json");
  if (!existsSync(index)) continue;
  for (const [file, want] of Object.entries(JSON.parse(readFileSync(index, "utf8")))) {
    const path = join(catalog, name, file);
    if (!existsSync(path)) problems.push(`catalog/${name}/${file} is in files.json but not in this checkout.`);
    else if (createHash("sha256").update(readFileSync(path)).digest("hex") !== want.sha256) problems.push(`catalog/${name}/${file} does not match the SHA-256 sum in files.json.`);
  }
}
if (problems.length) {
  console.error(`The test data index does not match this tag. Run node scripts/data-index.mjs and commit the result.\n${problems.join("\n")}`);
  process.exit(1);
}
