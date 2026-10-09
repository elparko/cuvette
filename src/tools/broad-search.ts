import { homedir } from "node:os";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";

const TOP = ["/", "/Users", "/home", "/Volumes", "/mnt", "/media", "/Applications", "/Library", "/System", "/opt", "/usr", "/private", "/var", "/Network"];
const ONE_BELOW = ["/Users", "/home", "/Volumes", "/mnt", "/media"];
const HOME_EXPR = /Path\.home\(\)|expanduser\(\s*['"]~\/?['"]\s*\)|environ(?:\.get\(|\[)\s*['"](?:HOME|USERPROFILE)['"]|getenv\(\s*['"](?:HOME|USERPROFILE)['"]|gethomedir|homedir\(\)/;
const LITERAL = /(?:[rbuf]{0,2})(['"])((?:\\.|(?!\1).)*)\1/g;

function inside(root: string, p: string): boolean {
  const rel = relative(root, p);
  return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
}

export function broadRoot(raw: string, projectDir: string): string | undefined {
  let p = raw.trim();
  if (!p) return undefined;
  if (/^[A-Za-z]:[\\/]?$/.test(p)) return p;
  const wild = p.search(/[*?[]/);
  if (wild >= 0) p = p.slice(0, wild).replace(/[^\\/]*$/, "") || ".";
  p = p.replace(/^~(?=\/|$)/, homedir());
  const abs = resolve(projectDir, p);
  if (inside(projectDir, abs)) return undefined;
  const home = homedir();
  if (abs === home || inside(abs, home)) return abs;
  if (TOP.includes(abs) || ONE_BELOW.includes(dirname(abs))) return abs;
  if (dirname(dirname(abs)) === "/media") return abs;
  if (abs === resolve(home, "Library")) return abs;
  return undefined;
}

function argsAt(code: string, open: number): string {
  let depth = 0;
  for (let i = open; i < code.length; i++) {
    if (code[i] === "(") depth++;
    else if (code[i] === ")" && --depth === 0) return code.slice(open + 1, i);
  }
  return code.slice(open + 1);
}

const METHOD_ARG = /\.(?:split|rsplit|replace|endswith|startswith|strip|rstrip|lstrip|join|count|find|index|partition)\(\s*$/;

function literals(expr: string): string[] {
  const out: string[] = [];
  for (const m of expr.matchAll(LITERAL)) {
    const before = expr.slice(0, m.index!).trimEnd();
    const after = expr.slice(m.index! + m[0].length);
    if (/[+%]$/.test(before) || METHOD_ARG.test(before) || /^\s*\.\w+\(/.test(after)) continue;
    out.push(m[2]!);
  }
  return out;
}

const SKIP_NAMES = /^(os|path|Path|glob|pathlib|str|True|False|None|recursive|for|in|if|and|or|not|join|walk|rglob|iglob|expanduser|abspath|f|r|b)$/;

function rootsOf(expr: string, code: string, projectDir: string, depth = 0): string | undefined {
  let lits = literals(expr);
  if (HOME_EXPR.test(expr)) {
    const deeper = lits.filter((l) => l && !/^~\/?$/.test(l) && !/^(HOME|USERPROFILE)$/.test(l));
    if (!deeper.length) return homedir();
    lits = [join(homedir(), deeper[0]!.replace(/^~\/?/, "")), ...deeper.slice(1)];
  }
  for (const l of lits) {
    const hit = broadRoot(l, projectDir);
    if (hit) return hit;
  }
  if (depth > 2) return undefined;
  const names = [...expr.replace(LITERAL, " ").matchAll(/\b[A-Za-z_]\w*\b/g), ...[...expr.matchAll(LITERAL)].flatMap((m) => [...m[2]!.matchAll(/\{([A-Za-z_]\w*)/g)])].map((m) => m[1] ?? m[0]);
  for (const name of new Set(names)) {
    if (SKIP_NAMES.test(name)) continue;
    const defs = [
      ...code.matchAll(new RegExp(`^[ \\t]*${name}[ \\t]*(?::[^=\\n]*)?=(?!=)(.*)$`, "gm")),
      ...code.matchAll(new RegExp(`\\bfor[ \\t]+(?:[\\w, ]*\\b)?${name}\\b[\\w, ]*[ \\t]+in[ \\t]+(.*):`, "g")),
    ];
    for (const d of defs) {
      const hit = rootsOf(d[1]!, code, projectDir, depth + 1);
      if (hit) return hit;
    }
  }
  return undefined;
}

export function broadSearchInPython(code: string, projectDir: string): string | undefined {
  const calls: string[] = [];
  for (const m of code.matchAll(/\b(?:os\.)?(?:walk|fwalk)\s*\(/g)) calls.push(argsAt(code, m.index! + m[0].length - 1));
  for (const m of code.matchAll(/\b(?:glob\.)?i?glob\s*\(/g)) {
    const a = argsAt(code, m.index! + m[0].length - 1);
    if (/recursive\s*=\s*True/.test(a) || a.includes("**")) calls.push(a);
  }
  for (const m of code.matchAll(/\.(rglob|glob|walk)\s*\(/g)) {
    const a = argsAt(code, m.index! + m[0].length - 1);
    if (m[1] === "glob" && !a.includes("**")) continue;
    const line = code.slice(code.lastIndexOf("\n", m.index!) + 1, m.index!);
    calls.push(line.replace(/^.*\bin\s+/, ""));
  }
  for (const a of calls) {
    const hit = rootsOf(a, code, projectDir);
    if (hit) return hit;
  }
  for (const m of code.matchAll(/\[\s*(['"])(find|mdfind|locate|du|tree)\1\s*,([^\]]*)\]/g)) {
    const hit = broadSearchInArgv([m[2]!, ...literals(m[3]!)], projectDir);
    if (hit) return hit;
  }
  for (const s of literals(code)) {
    if (!/^\s*(find|mdfind|locate|ls\s+-\w*R|du|tree|grep\s+-\w*[rR])\b/.test(s)) continue;
    const hit = broadSearchInArgv(s.trim().split(/\s+/), projectDir);
    if (hit) return hit;
  }
  return undefined;
}

export function broadSearchInArgv(argv: string[], projectDir: string): string | undefined {
  const prog = (argv[0] ?? "").split(/[\\/]/).pop() ?? "";
  const rest = argv.slice(1);
  if (/^(sh|bash|zsh|dash)$/.test(prog)) {
    const i = rest.indexOf("-c");
    const script = i >= 0 ? rest[i + 1] : undefined;
    if (!script) return undefined;
    for (const part of script.split(/[;&|]+|\$\(|`/)) {
      const words = part.trim().split(/\s+/).map((w) => w.replace(/^['"]|['"]$/g, ""));
      const hit = broadSearchInArgv(words, projectDir);
      if (hit) return hit;
    }
    return undefined;
  }
  if (/^python[\d.]*$/.test(prog)) {
    const i = rest.indexOf("-c");
    return i >= 0 && rest[i + 1] ? broadSearchInPython(rest[i + 1]!, projectDir) : undefined;
  }
  if (prog === "mdfind") {
    const i = rest.indexOf("-onlyin");
    return i >= 0 && rest[i + 1] ? broadRoot(rest[i + 1]!, projectDir) : "the whole disk";
  }
  if (prog === "locate" || prog === "plocate") return "the whole disk";
  const recursive = prog === "find" || prog === "du" || prog === "tree" || prog === "fd" || prog === "rg"
    || ((prog === "ls" || prog === "grep") && rest.some((a) => /^-\w*[rR]/.test(a)));
  if (!recursive) return undefined;
  for (const a of rest) {
    if (a.startsWith("-")) {
      if (prog === "find") break;
      continue;
    }
    const hit = broadRoot(a, projectDir);
    if (hit) return hit;
  }
  return undefined;
}

export function broadSearch(tool: string, args: Record<string, unknown>, projectDir: string): string | undefined {
  if (tool === "run_script" && typeof args.code === "string") return broadSearchInPython(args.code, projectDir);
  if (tool === "run_command" && Array.isArray(args.argv)) return broadSearchInArgv(args.argv.map(String), projectDir);
  return undefined;
}
