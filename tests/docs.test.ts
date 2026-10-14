import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { expect, test } from "vitest";
import { COMMANDS } from "../src/ui/parity.ts";

const ROOT = join(__dirname, "..");
const DATED = /handoff-|status-|release-|\d{4}-\d{2}-\d{2}/;
const SKIP_DIRS = new Set(["node_modules", "target", "dist", "results", ".git"]);
const CODE_EXT = /\.(ts|tsx|js|mjs|cjs|sh|py|rs|swift|yaml|json|plist|toml)$/;

const read = (file: string) => readFileSync(file, "utf8");
const prose = (text: string) => text.replace(/```[\s\S]*?```/g, "");
const rel = (file: string) => relative(ROOT, file);

function walk(dir: string, keep: (name: string) => boolean): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return SKIP_DIRS.has(name) ? [] : walk(path, keep);
    return keep(name) ? [path] : [];
  });
}

const DOCS = [
  join(ROOT, "README.md"),
  join(ROOT, "CONTRIBUTING.md"),
  join(ROOT, "AGENTS.md"),
  join(ROOT, "CLAUDE.md"),
  ...readdirSync(join(ROOT, "docs"))
    .filter((name) => name.endsWith(".md") && !DATED.test(name))
    .map((name) => join(ROOT, "docs", name)),
];

function slug(heading: string) {
  return heading.replace(/`/g, "").trim().toLowerCase().replace(/[^\p{L}\p{N} _-]/gu, "").replace(/ /g, "-");
}

function headings(file: string) {
  const found = new Set<string>();
  for (const line of prose(read(file)).split("\n")) {
    const match = /^#{1,6} (.+)$/.exec(line);
    if (match) found.add(slug(match[1]!));
  }
  return found;
}

test("the README names only slash commands that the terminal has", () => {
  const named = new Set<string>();
  for (const match of prose(read(join(ROOT, "README.md"))).matchAll(/`\/([a-z][a-z-]*)(?=[\s`])/g)) named.add(match[1]!);
  expect(named.size).toBeGreaterThan(20);
  expect([...named].filter((name) => !COMMANDS.includes(name))).toEqual([]);
});

test("relative links in the docs resolve to files and headings", () => {
  const broken: string[] = [];
  for (const file of DOCS) {
    for (const match of prose(read(file)).matchAll(/\]\(([^)\s]+)\)/g)) {
      const target = match[1]!;
      if (/^(https?:|mailto:)/.test(target)) continue;
      const [path = "", anchor] = target.split("#");
      const linked = path ? join(dirname(file), path) : file;
      const found = existsSync(linked) && (!anchor || !linked.endsWith(".md") || headings(linked).has(anchor));
      if (!found) broken.push(`${rel(file)} -> ${target}`);
    }
  }
  expect(broken).toEqual([]);
});

test("the docs name only environment variables that the code reads", () => {
  const code = ["src", "bin", "scripts", "tests", "bench", "desktop"]
    .flatMap((dir) => walk(join(ROOT, dir), (name) => CODE_EXT.test(name)))
    .map(read)
    .join("\n");
  const named = new Set<string>();
  for (const file of DOCS) {
    for (const match of read(file).matchAll(/\b(?:CUVETTE|GA|ANTHROPIC)_[A-Z][A-Z0-9_]*[A-Z0-9]\b/g)) named.add(match[0]);
  }
  const unknown = [...named].filter((name) => {
    if (code.includes(name)) return false;
    return !(name.startsWith("GA_") && code.includes(`CUVETTE_${name.slice(3)}`));
  });
  expect(unknown).toEqual([]);
});

test("the README adapter table lists every catalog adapter", () => {
  const section = read(join(ROOT, "README.md")).split("## Adapters")[1]!.split("## Benchmark")[0]!;
  const listed = [...section.matchAll(/^\| `([^`]+)` \|/gm)].map((match) => match[1]!);
  const catalog = readdirSync(join(ROOT, "catalog")).filter((name) => statSync(join(ROOT, "catalog", name)).isDirectory());
  expect(listed.sort()).toEqual(catalog.sort());
});
