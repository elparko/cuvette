#!/usr/bin/env node
import { existsSync, readFileSync, statSync } from "node:fs";

const root = new URL("../", import.meta.url);
const bundle = new URL("dist/cli.js", root);

// An installed package uses the bundle. A git checkout uses it only if no source file is newer than the bundle.
function bundleIsCurrent() {
  if (process.env.CUVETTE_TSX === "1" || !existsSync(bundle)) return false;
  if (!existsSync(new URL(".git", root))) return true;
  try {
    const built = statSync(bundle).mtimeMs;
    const inputs = JSON.parse(readFileSync(new URL("dist/inputs.json", root), "utf8"));
    return inputs.every((f) => statSync(new URL(f, root)).mtimeMs <= built);
  } catch {
    return false;
  }
}

if (bundleIsCurrent()) await import(bundle.href);
else {
  const { register } = await import("tsx/esm/api");
  register();
  await import("../src/cli.ts");
}
