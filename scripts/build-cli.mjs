import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import { parse as parseYaml } from "yaml";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "dist");

// Each catalog adapter.ts goes into the bundle at dist/catalog/<name>/adapter.js and shares its chunks with the CLI.
// Thus the CLI does not start tsx to load the adapter module. src/adapters/manifest.ts loads this file.
const adapters = Object.fromEntries(
  readdirSync(join(ROOT, "catalog"), { withFileTypes: true })
    .filter((d) => d.isDirectory() && existsSync(join(ROOT, "catalog", d.name, "adapter.ts")))
    .map((d) => [`catalog/${d.name}/adapter`, `catalog/${d.name}/adapter.ts`]),
);

// An adapter module finds its own files from import.meta.url. In the bundle, that URL must still point to the catalog folder.
const metaUrl = {
  name: "catalog-meta-url",
  setup(b) {
    b.onLoad({ filter: /[\\/]catalog[\\/][^\\/]+[\\/]adapter\.ts$/ }, (a) => {
      const text = readFileSync(a.path, "utf8");
      const name = a.path.split(/[\\/]/).at(-2);
      return { contents: text.replaceAll("import.meta.url", `new URL(${JSON.stringify(`../../../catalog/${name}/adapter.ts`)}, import.meta.url).href`), loader: "ts" };
    });
  },
};

rmSync(OUT, { recursive: true, force: true });
const r = await build({
  absWorkingDir: ROOT,
  entryPoints: { cli: "src/cli.ts", ...adapters },
  outdir: OUT,
  bundle: true,
  splitting: true,
  platform: "node",
  format: "esm",
  target: "node22",
  packages: "external",
  metafile: true,
  logLevel: "warning",
  plugins: [metaUrl],
});
// The parsed adapter.yaml of each catalog adapter goes to dist/catalog/<name>/adapter.json. A YAML parse at each start takes about 20 ms.
for (const d of readdirSync(join(ROOT, "catalog"), { withFileTypes: true })) {
  const yaml = join(ROOT, "catalog", d.name, "adapter.yaml");
  if (!d.isDirectory() || !existsSync(yaml)) continue;
  mkdirSync(join(OUT, "catalog", d.name), { recursive: true });
  writeFileSync(join(OUT, "catalog", d.name, "adapter.json"), JSON.stringify(parseYaml(readFileSync(yaml, "utf8"))));
}
// bin/cuvette.js compares the time of these files with the bundle. In a git checkout it uses tsx if a source file is newer.
writeFileSync(join(OUT, "inputs.json"), JSON.stringify(Object.keys(r.metafile.inputs)));
