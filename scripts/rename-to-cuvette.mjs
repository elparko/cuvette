#!/usr/bin/env node
// Renames guided-analysis / ga to Cuvette / cuvette. Run from the repository root.
// It is safe to run again: a second run changes nothing.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const SKIP = new Set(["scripts/rename-to-cuvette.mjs", "src/core/old-names.ts", "tests/old-names.test.ts"]);
const TEXT = /\.(ts|tsx|mjs|js|py|R|sh|ya?ml|md|groovy|html)$/;
const CODE = /\.(ts|tsx|mjs|js|py)$/;

const selected = (f) =>
  !SKIP.has(f) &&
  TEXT.test(f) &&
  (f === "README.md" || f === "CLAUDE.md" || f === "AGENTS.md" ||
    (/^docs\/[^/]+\.md$/.test(f) && !/^docs\/(handoff|status|release)-/.test(f)) ||
    f.startsWith("src/") ||
    (f.startsWith("catalog/") && !/^catalog\/[^/]+\/data\//.test(f)) ||
    (f.startsWith("tests/") && !f.startsWith("tests/fixtures/paper-figures/")) ||
    f.startsWith("examples/") ||
    f.startsWith(".github/") ||
    /^bench\/papers\/[^/]+\/(fetch\.sh|figure\.py)$/.test(f));

const PROSE = [
  ["ga - a guided analysis agent for science programs", "cuvette - a guided analysis agent for science programs"],
  ["You are a guided analysis agent.", "You are Cuvette, a guided analysis agent."],
  ["You are a guided analysis agent for science programs.", "You are Cuvette, a guided analysis agent for science programs."],
  ["inside a guided analysis session", "inside a Cuvette session"],
  ["Guided analysis harness.", "Cuvette harness."],
  ["<title>Guided analysis</title>", "<title>Cuvette</title>"],
  ['"Guided analysis", parent', '"Cuvette", parent'],
  ["`Guided analysis ${id}", "`Cuvette session ${id}"],
  ["guided-analysis version", "Cuvette version"],
  ["Export of the guided-analysis session", "Export of the Cuvette session"],
  ["calls ga's ToolRunner", "calls the Cuvette ToolRunner"],
  ["`ga: ${", "`cuvette: ${"],
  ['name: "guided-analysis" }', 'name: "Cuvette" }'],
  ["<Text bold>guided-analysis</Text>", "<Text bold>Cuvette</Text>"],
  ["# Guided Analysis Agent Design", "# Cuvette Design"],
  ["Use guided-analysis in Claude Desktop", "Use Cuvette in Claude Desktop"],
  ["`CUVETTE_KEYLOG=/tmp/keys.log ga` ", "`CUVETTE_KEYLOG=/tmp/keys.log cuvette` "],
  ["where you start ga,", "where you start cuvette,"],
  ["Node or ga moved", "Node or cuvette moved"],
  ["Terminal ga $dir", "Terminal cuvette $dir"],
  ["when ga has the app command", "when cuvette has the app command"],
  ["falls back to Terminal with ga in", "falls back to Terminal with cuvette in"],
  ["  ga: string;", "  cuvette: string;"],
  ['which("ga", ', 'which("cuvette", '],
  ["const ga = linked", "const cuvette = linked"],
  ["process.execPath, ga, path", "process.execPath, cuvette, path"],
  ["paths: { node, ga, path", "paths: { node, cuvette, path"],
  ['ga: "/Users/a', 'cuvette: "/Users/a'],
  ["const ga = join(", "const cuvette = join("],
  ["[ga, ...args]", "[cuvette, ...args]"],
  ['[ga, "mcp"', '[cuvette, "mcp"'],
  ['"ga.js"', '"cuvette.js"'],
  ["writeFileSync(ga,", "writeFileSync(cuvette,"],
  ["what `guided-analysis` takes", "what Cuvette takes"],
  ["What guided-analysis takes", "What Cuvette takes"],
];

// Real folders that keep their names: the source folder and the T7 data drive.
const KEEP = ["Code/guided-analysis", "Code-guided-analysis", "T7/guided-analysis", 'T7, "guided-analysis'];

const COMMANDS = "\\[|-|\\(|<|adapters?\\b|onboard\\b|models\\b|spend\\b|key\\b|eln\\b|sessions\\b|export\\b|replay\\b|run-step\\b|questions\\b|bench\\b|mcp\\b|app\\b|terminal\\b|tools\\b|doctor\\b|programs\\b|open\\b|resume\\b|install-|uninstall-|trust\\b|config\\b|method\\b|databook\\b|status\\b|compare\\b|learn\\b|run\\b|again\\b|asks\\b";
const GA_CMD = new RegExp(`(?<![\\w./@$-])ga(?= (?:${COMMANDS}))`, "g");

// Keeps the next column in line when a name before it gets longer.
function keepColumn(before, after) {
  let p = 0;
  while (p < before.length && before[p] === after[p]) p++;
  const run = /\S( {7,})\S/g;
  run.lastIndex = p;
  const mb = run.exec(before);
  run.lastIndex = p;
  const ma = run.exec(after);
  if (!mb || !ma) return after;
  const d = ma.index - mb.index;
  if (d <= 0) return after;
  return after.slice(0, ma.index + 1) + " ".repeat(Math.max(2, ma[1].length - d)) + after.slice(ma.index + 1 + ma[1].length);
}

function renameLine(line, file) {
  let t = line;
  if (/^bench\/papers\/[^/]+\/fetch\.sh$/.test(file))
    t = t.replace(/(?<!:-)\$\{GA_([A-Z0-9_]+):-([^{}]*)\}/g, "${CUVETTE_$1:-${GA_$1:-$2}}");
  t = t.replace(/(?<!:-\$\{)\bGA_(?=[A-Z0-9])/g, "CUVETTE_");
  t = t.replace(/\bga_(setup|questions|answer|trail|export|eln_push)\b/g, "cuvette_$1");
  t = t.replace(/`ga`/g, "`cuvette`");
  t = t.replace(GA_CMD, "cuvette");
  return keepColumn(line, t);
}

// A section with the heading "Old names" names the old names on purpose. It stays as it is.
function rename(text, file) {
  const old = /^#+ Old names\n[\s\S]*?(?=^#|(?![\s\S]))/m.exec(text);
  if (old) return renameText(text.slice(0, old.index), file) + old[0] + renameText(text.slice(old.index + old[0].length), file);
  return renameText(text, file);
}

function renameText(text, file) {
  let t = text;
  for (const [a, b] of PROSE) t = t.split(a).join(b);
  t = t.replace(/^# guided-analysis$/m, "# Cuvette");
  KEEP.forEach((k, i) => (t = t.split(k).join(`\u0000KEEP${i}\u0000`)));
  t = t.replace(/\.guided-analysis\b/g, ".cuvette").replace(/guided-analysis/g, "cuvette");
  KEEP.forEach((k, i) => (t = t.split(`\u0000KEEP${i}\u0000`).join(k)));
  t = t.replace(/bin\/ga\.js( {6,})/g, (_, s) => "bin/cuvette.js" + s.slice(5));
  t = t.replace(/bin\/ga\.js/g, "bin/cuvette.js");
  t = t
    .split("\n")
    .map((line) => renameLine(line, file))
    .join("\n");
  t = t.replace(/\bgaHome\b/g, "cuvetteHome");
  t = t.replace(/\bGaPaths\b/g, "CuvettePaths").replace(/\bgaPaths\b/g, "cuvettePaths");
  t = t.replace(/(?<=\w)\.ga\b(?![\w/])/g, ".cuvette").replace(/(?<!\w)\$GA\b/g, "$CUVETTE_JS").replace(/\bGA=(?=\$\{sq|')/g, "CUVETTE_JS=");
  t = t.replace(/join\(cwd, "\.ga", /g, 'join(cwd, ".cuvette", ');
  if (CODE.test(file)) t = t.replace(/(?<![\w.-])ga-(?=[a-z"'`])/g, "cuvette-");
  return t;
}

const changed = [];
const files = execFileSync("git", ["ls-files"], { encoding: "utf8" }).split("\n").filter(Boolean);
for (const f of files.filter(selected)) {
  if (!existsSync(f)) continue;
  const before = readFileSync(f, "utf8");
  const after = rename(before, f);
  if (after !== before) {
    writeFileSync(f, after);
    changed.push(f);
  }
}

function writeIfChanged(f, text) {
  if (existsSync(f) && readFileSync(f, "utf8") === text) return;
  writeFileSync(f, text);
  changed.push(f);
}

if (!existsSync("bin/cuvette.js")) writeIfChanged("bin/cuvette.js", readFileSync("bin/ga.js", "utf8"));
writeIfChanged(
  "bin/ga.js",
  `#!/usr/bin/env node
console.error("The command ga is now cuvette.");
await import("./cuvette.js");
`,
);
execFileSync("chmod", ["+x", "bin/cuvette.js", "bin/ga.js"]);

const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const deps = { ...pkg.dependencies };
const devDeps = { ...pkg.devDependencies };
if (devDeps.tsx) {
  deps.tsx = devDeps.tsx;
  delete devDeps.tsx;
}
const scripts = {};
for (const [k, v] of Object.entries(pkg.scripts ?? {})) scripts[k === "ga" ? "cuvette" : k] = v.replace(/\bGA_(?=[A-Z0-9])/g, "CUVETTE_");
const { name, version, description, type, engines, bin, files: _f, license, homepage, repository, dependencies, devDependencies, scripts: _s, ...rest } = pkg;
const next = {
  name: "@elparko/cuvette",
  version,
  description,
  license: "AGPL-3.0-only",
  homepage: "https://cuvette.ai",
  repository: { type: "git", url: "git+https://github.com/elparko/cuvette.git" },
  type,
  bin: { cuvette: "bin/cuvette.js" },
  files: ["bin/", "src/", "catalog/", "samples/", "README.md", "!**/__pycache__/", "!**/*.pyc"],
  engines,
  scripts,
  ...rest,
  dependencies: Object.fromEntries(Object.entries(deps).sort(([a], [b]) => a.localeCompare(b))),
  devDependencies: devDeps,
};
writeIfChanged("package.json", JSON.stringify(next, null, 2) + "\n");

const lockBefore = readFileSync("package-lock.json", "utf8");
execFileSync("npm", ["install", "--package-lock-only", "--ignore-scripts", "--no-audit", "--no-fund"], { stdio: "inherit" });
if (readFileSync("package-lock.json", "utf8") !== lockBefore) changed.push("package-lock.json");

console.log(changed.length ? `Changed ${changed.length} files:\n${changed.join("\n")}` : "No changes.");
