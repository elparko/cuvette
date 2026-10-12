import { rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "dist");

rmSync(OUT, { recursive: true, force: true });
const r = await build({
  absWorkingDir: ROOT,
  entryPoints: ["src/cli.ts"],
  outdir: OUT,
  bundle: true,
  splitting: true,
  platform: "node",
  format: "esm",
  target: "node22",
  packages: "external",
  metafile: true,
  logLevel: "warning",
});
// bin/cuvette.js compares the time of these files with the bundle. In a git checkout it uses tsx if a source file is newer.
writeFileSync(join(OUT, "inputs.json"), JSON.stringify(Object.keys(r.metafile.inputs)));
