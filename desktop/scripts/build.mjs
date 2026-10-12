import { execFileSync } from "node:child_process";
import { chmodSync, copyFileSync, cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const DESKTOP = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ROOT = resolve(DESKTOP, "..");
const OUT = join(DESKTOP, "build");
const CORE = join(OUT, "core");
const NODE_VERSION = "24.21.0";
const NODE_SHA256 = "a6f54defb6fd7c84f41dba13d61e78e9b4e0961712cf61f29715c05f5ced94fc";
const NODE_FLAGS = ["--with-intl=small-icu", "--without-inspector", "--without-amaro", "--without-npm", "--without-corepack", "--without-sqlite"];
const CACHE = process.env.CUVETTE_CACHE ?? join(homedir(), ".cache", "cuvette");
const TARGET = process.env.CARGO_TARGET_DIR ?? join(DESKTOP, "src-tauri", "target");
const TRIPLE = "aarch64-apple-darwin";
const JOBS = process.env.CUVETTE_JOBS ?? "4";
const VERSION = JSON.parse(readFileSync(join(DESKTOP, "src-tauri", "tauri.conf.json"), "utf8")).version;

const run = (cmd, args, cwd = DESKTOP) => execFileSync(cmd, args, { cwd, stdio: "inherit" });
const mb = (p) => (Number(execFileSync("du", ["-sk", p], { encoding: "utf8" }).split("\t")[0]) / 1024).toFixed(1) + " MB";

const metaUrl = {
  name: "meta-url",
  setup(b) {
    b.onLoad({ filter: /\.tsx?$/ }, (a) => {
      if (!a.path.startsWith(join(ROOT, "src") + sep)) return;
      const text = readFileSync(a.path, "utf8");
      if (!text.includes("import.meta.url")) return;
      const rel = relative(ROOT, a.path).split(sep).join("/");
      return { contents: text.replaceAll("import.meta.url", `__gaUrl(${JSON.stringify(rel)})`), loader: a.path.endsWith("x") ? "tsx" : "ts" };
    });
  },
};

async function core() {
  rmSync(CORE, { recursive: true, force: true });
  run("npx", ["vite", "build", "--config", join(ROOT, "src", "ui-web", "vite.config.ts"), "--logLevel", "warn"], ROOT);
  await build({
    entryPoints: { sidecar: join(DESKTOP, "sidecar", "main.ts"), cli: join(ROOT, "src", "cli.ts") },
    outdir: join(CORE, "dist"),
    outExtension: { ".js": ".mjs" },
    chunkNames: "[name]-[hash]",
    splitting: true,
    bundle: true,
    platform: "node",
    format: "esm",
    target: "node24",
    minify: true,
    legalComments: "none",
    logLevel: "warning",
    external: ["react-devtools-core"],
    plugins: [metaUrl],
    banner: {
      js: [
        'import { createRequire as __gaRequire } from "node:module";',
        "const require = __gaRequire(import.meta.url);",
        'const __gaRoot = new URL("../", import.meta.url);',
        "const __gaUrl = (p) => new URL(p, __gaRoot).href;",
      ].join("\n"),
    },
  });
  const skip = (p) => /[\\/](data|__pycache__|node_modules)$/.test(p) || p.endsWith(".pyc") || basename(p) === ".DS_Store";
  cpSync(join(ROOT, "catalog"), join(CORE, "catalog"), { recursive: true, filter: (p) => !skip(p) });
  await adapterModules();
  cpSync(join(ROOT, "samples"), join(CORE, "samples"), { recursive: true, filter: (p) => !skip(p) });
  cpSync(join(ROOT, "ui-dist"), join(CORE, "ui-dist"), { recursive: true });
  cpSync(join(ROOT, "src/core/guidelines"), join(CORE, "src/core/guidelines"), { recursive: true });
  for (const f of ["src/adapters/kinds/ga_figures.py", "src/adapters/kinds/python_worker.py", "src/adapters/kinds/cuvette.mplstyle", "src/tools/science-requirements.txt", "src/tools/inspect_data.py", "src/core/imagedeck.py", "package.json", "CITATION.cff"]) {
    mkdirSync(dirname(join(CORE, f)), { recursive: true });
    copyFileSync(join(ROOT, f), join(CORE, f));
  }
}

// The app's Node has no type stripping, so each adapter.ts becomes an adapter.mjs next to it.
// The loader in src/adapters/manifest.ts takes the .mjs file when it exists.
async function adapterModules() {
  const files = readdirSync(join(ROOT, "catalog"), { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => join(ROOT, "catalog", d.name, "adapter.ts"))
    .filter((f) => existsSync(f));
  for (const f of files) {
    const rel = relative(ROOT, f).split(sep).join("/");
    await build({
      entryPoints: [f],
      outfile: join(CORE, rel.replace(/\.ts$/, ".mjs")),
      bundle: true,
      platform: "node",
      format: "esm",
      target: "node24",
      minify: true,
      legalComments: "none",
      logLevel: "warning",
      plugins: [metaUrl],
      banner: {
        js: [
          'import { createRequire as __gaRequire } from "node:module";',
          "const require = __gaRequire(import.meta.url);",
          'const __gaRoot = new URL("../../", import.meta.url);',
          "const __gaUrl = (p) => new URL(p, __gaRoot).href;",
        ].join("\n"),
      },
    });
  }
}

function sourceNode() {
  const dir = join(CACHE, `node-v${NODE_VERSION}`);
  const tar = `${dir}.tar.xz`;
  if (!existsSync(tar)) run("curl", ["-fsSL", "-o", tar, `https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}.tar.xz`], CACHE);
  const sum = execFileSync("shasum", ["-a", "256", tar], { encoding: "utf8" }).split(" ")[0];
  if (sum !== NODE_SHA256) throw new Error(`The Node source has the wrong checksum: ${sum}`);
  if (!existsSync(dir)) run("tar", ["xf", tar], CACHE);
  return dir;
}

function node() {
  const dest = join(OUT, "bin", `node-${TRIPLE}`);
  const small = process.env.CUVETTE_NODE ?? join(CACHE, `node-v${NODE_VERSION}-small`);
  if (!existsSync(small)) {
    mkdirSync(CACHE, { recursive: true });
    const dir = sourceNode();
    console.log(`Building Node ${NODE_VERSION} without the full ICU data, the inspector, npm, Corepack, Amaro and SQLite. This takes 20 to 40 minutes once.`);
    run("./configure", NODE_FLAGS, dir);
    run("make", [`-j${JOBS}`], dir);
    copyFileSync(join(dir, "out", "Release", "node"), small);
    run("strip", ["-x", small]);
    run("codesign", ["--force", "--sign", "-", small]);
    rmSync(dir, { recursive: true, force: true });
  }
  mkdirSync(dirname(dest), { recursive: true });
  copyFileSync(small, dest);
  chmodSync(dest, 0o755);
}

function tauriCli() {
  if (!existsSync(join(DESKTOP, "node_modules", ".bin", "tauri"))) run("npm", ["ci"]);
  return join(DESKTOP, "node_modules", ".bin", "tauri");
}

function dmg(app) {
  const file = join(OUT, `Cuvette-${VERSION}-arm64.dmg`);
  rmSync(file, { force: true });
  run("uvx", ["--from", "dmgbuild==1.6.7", "dmgbuild", "-s", join(DESKTOP, "dmg.py"), "-D", `app=${app}`, "Cuvette", file]);
  return file;
}

const mode = process.argv[2] ?? "build";
await core();
if (mode !== "core") node();
if (mode === "dev") {
  run(tauriCli(), ["dev"]);
} else if (mode === "build") {
  run(tauriCli(), ["build", "--bundles", "app", "--", "-j", JOBS]);
  const app = join(TARGET, "release", "bundle", "macos", "Cuvette.app");
  const appOut = join(OUT, "Cuvette.app");
  rmSync(appOut, { recursive: true, force: true });
  run("ditto", [app, appOut]);
  const file = dmg(appOut);
  console.log(`\nCuvette.app ${mb(appOut)}: ${appOut}`);
  console.log(`  node ${mb(join(appOut, "Contents", "MacOS", "node"))}, shell ${mb(join(appOut, "Contents", "MacOS", "cuvette"))}, core ${mb(join(appOut, "Contents", "Resources", "core"))}`);
  console.log(`Disk image ${(statSync(file).size / 1048576).toFixed(1)} MB: ${file}`);
}
