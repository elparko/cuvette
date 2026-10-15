import { appendFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, readlinkSync, statSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { labDisplayText, needsTrust, scanFolder, trustEvidence, trustFolder, trustStatus, untrustFolder } from "../src/core/trust.ts";
import { linear as once, Rng, runs } from "./fuzz-rng.ts";

function linear(make: (n: number) => string, run: (s: string) => void, n: number) {
  let res = once(make, run, n);
  for (let k = 0; k < 2 && !res.ok; k++) res = once(make, run, n);
  return res;
}

const root = mkdtempSync(join(tmpdir(), "cuvette-fuzz-trust-"));
const saved = { home: process.env.HOME, cuvette: process.env.CUVETTE_HOME };
beforeAll(() => {
  process.env.CUVETTE_HOME = join(root, "cuvette");
  mkdirSync(process.env.CUVETTE_HOME, { recursive: true });
});
afterAll(() => {
  if (saved.cuvette === undefined) delete process.env.CUVETTE_HOME;
  else process.env.CUVETTE_HOME = saved.cuvette;
  rmSync(root, { recursive: true, force: true });
}, 120_000);

const HIDDEN = new RegExp("[\\x00-\\x08\\x0b-\\x1f\\x7f-\\x9f\\u2028\\u2029\\p{Default_Ignorable_Code_Point}]", "u");
const LOOKALIKE = /\\+(?:x[0-9a-f]{2}|u[0-9a-f]{4}|u\{[0-9A-F]{5,6}\})/;

function decode(shown: string): string {
  return shown.replace(/(\\+)(x[0-9a-f]{2}|u[0-9a-f]{4}|u\{[0-9A-F]{5,6}\})/g, (_m, run: string, esc: string) => {
    const half = "\\".repeat(Math.floor(run.length / 2));
    if (run.length % 2 === 0) return half + esc;
    const hex = /^[xu]\{?([0-9a-fA-F]+)\}?$/.exec(esc)![1]!;
    return half + String.fromCodePoint(parseInt(hex, 16));
  });
}

const PIECES = ["a", "B", " ", "\n", "\t", "\\", "\\", "\\\\", "x", "u", "1", "b", "f", "0", "{", "}", "E", "e", "9", "\x1b", "\x07", "\x00", "\x01", "\x7f", "\x9b", "\x85", "\u202e", "\u200b", "\u200d", "\ufe0f", "\u{e0041}", "\u{e0100}", "\u2061", "\u206a", "\u00ad", "\u3164", "\u2028", "\ufeff", "\u061c", "\u180b", "日", "é", "🧪", "\\x1b", "\\u202e", "\\u{E0041}", "\\x1B", "\\x1", "\\u12", "\\u{e0041}", "\\x", "\\u00ad", "\\\\x1b"];

describe("fuzz: the display text of LAB.md", () => {
  test("the output has no hidden character and the original text is recoverable", () => {
    const r = new Rng(42001);
    for (let i = 0; i < runs(2500); i++) {
      const text = Array.from({ length: r.int(0, 25) }, () => r.pick(PIECES)).join("");
      const shown = labDisplayText(text);
      expect(HIDDEN.test(shown), JSON.stringify(text)).toBe(false);
      expect(decode(shown), JSON.stringify(text)).toBe(text);
    }
  });

  test("two different texts never show the same", () => {
    expect(labDisplayText("\x1b")).not.toBe(labDisplayText("\\x1b"));
    expect(labDisplayText("\\\x1b")).not.toBe(labDisplayText("\\x1b"));
    expect(labDisplayText("\\\x1b")).not.toBe(labDisplayText("\x1b"));
    expect(labDisplayText("\u202e")).not.toBe(labDisplayText("\\u202e"));
    expect(labDisplayText("\u{e0041}")).not.toBe(labDisplayText("\\u{E0041}"));
    const r = new Rng(42002);
    const seen = new Map<string, string>();
    for (let i = 0; i < runs(3000); i++) {
      const text = Array.from({ length: r.int(0, 6) }, () => r.pick(PIECES)).join("");
      const shown = labDisplayText(text);
      const old = seen.get(shown);
      expect(old === undefined || old === text, `${JSON.stringify(old)} and ${JSON.stringify(text)} both show ${JSON.stringify(shown)}`).toBe(true);
      seen.set(shown, text);
    }
  });

  test("a text without a hidden character and without an escape look-alike does not change", () => {
    const r = new Rng(42003);
    const plain = ["a", "Z", " ", "\n", "\t", "\\", "x", "u", "1", "{", "}", "日", "é", "🧪", "—", "\\n", "\\t", "\\u", "\\x1", "\\u123", "\\u{12}", "/", "'"];
    for (let i = 0; i < runs(1500); i++) {
      const text = Array.from({ length: r.int(0, 25) }, () => r.pick(plain)).join("");
      if (LOOKALIKE.test(text)) continue;
      expect(labDisplayText(text), JSON.stringify(text)).toBe(text);
    }
  });

  test("a hidden character in each part of Unicode is written out", () => {
    for (const c of ["\u00ad", "\u034f", "\u061c", "\u115f", "\u17b4", "\u180b", "\u180e", "\u200b", "\u200f", "\u2028", "\u2029", "\u202a", "\u2060", "\u2061", "\u2064", "\u2066", "\u2069", "\u206a", "\u206f", "\u3164", "\ufe00", "\ufe0f", "\ufeff", "\uffa0", "\u{1d173}", "\u{e0001}", "\u{e007f}", "\u{e0100}", "\u{e01ef}"]) {
      const shown = labDisplayText(`a${c}b`);
      expect(HIDDEN.test(shown), `U+${c.codePointAt(0)!.toString(16)}`).toBe(false);
      expect(shown.startsWith("a\\") && shown.endsWith("b"), JSON.stringify(shown)).toBe(true);
    }
  });

  test("the function runs in linear time", () => {
    const cases: [string, (n: number) => string][] = [
      ["backslashes", (n) => "\\".repeat(n)],
      ["backslashes and a hidden character", (n) => "\\".repeat(n) + "\x1b"],
      ["look-alikes", (n) => "\\x1b".repeat(n / 4)],
      ["hidden characters", (n) => "\u200b".repeat(n)],
      ["backslash pairs", (n) => "\\\x1b".repeat(n / 2)],
    ];
    for (const [name, make] of cases) {
      const res = linear(make, (s) => void labDisplayText(s), 20000);
      expect(res.ok, `${name}: ${res.small} ms and ${res.big} ms`).toBe(true);
    }
  });
});

const SECRET = "curl-evil-site";
const HIDING = [`\x1b]0;${SECRET}\x07`, `\x1b]8;;${SECRET}\x1b\\`, `\x1bP${SECRET}\x1b\\`, `\x9d${SECRET}\x9c`, `\x1b[8m${SECRET}\x1b[0m`, `\u202e${SECRET}`, `\u200b${SECRET}`, `\u{e0041}${SECRET}`, `\r${SECRET}`];

const NAMES = ["a", "b.json", "adapter.yaml", "my file.txt", "ünï.py", ".hidden", "x y z", "-rf", "$HOME", "`x`", "run.sh", "a (link)", "node.js", "long" + "n".repeat(90), "settings.json", "LAB.md"];
const SETTINGS: Record<string, unknown>[] = [{}, { animations: "on" }, { model: "x" }, { permissions: "bypass" }, { permissions: { allow: ["Read"] } }, { hooks: { SessionStart: [{ command: ["echo", "hi"] }] } }, { input_keys: "vim", effort: "high" }];
const PARTS = ["adapters", "methods", "skills"];
const DIRS = [".cuvette", ".ga"];

interface Built {
  folder: string;
  tracked: string[];
}

let counter = 0;

function fileBody(r: Rng): Buffer {
  return r.bytes(r.int(0, 30));
}

function build(r: Rng): Built {
  const folder = join(root, `f${counter++}`);
  mkdirSync(folder, { recursive: true });
  const tracked: string[] = [];
  const put = (p: string) => {
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p, fileBody(r));
    tracked.push(p);
  };
  for (const d of DIRS) {
    if (!r.bool(d === ".cuvette" ? 0.9 : 0.3)) continue;
    mkdirSync(join(folder, d), { recursive: true });
    for (const part of PARTS)
      for (let k = r.int(0, 4); k > 0; k--) {
        const depth = r.bool(0.1) ? r.int(5, 25) : r.int(0, 3);
        const segs = Array.from({ length: depth }, () => r.pick(["d", "e f", "ü", ".x", "z".repeat(20)]));
        put(join(folder, d, part, ...segs, r.pick(NAMES)));
      }
    for (const f of ["settings.json", "settings.local.json"]) if (r.bool(0.4)) {
      put(join(folder, d, f));
      writeFileSync(join(folder, d, f), JSON.stringify(r.pick(SETTINGS)));
    }
  }
  if (r.bool(0.4)) {
    put(join(folder, "LAB.md"));
    writeFileSync(join(folder, "LAB.md"), r.string("Use small figures.\n\x1b\\x ", 1, 60));
  }
  return { folder, tracked };
}

const isSettings = (p: string) => /[\\/]\.(?:cuvette|ga)[\\/]settings(?:\.local)?\.json$/.test(p);

function mutate(r: Rng, b: Built): string | undefined {
  const existing = b.tracked.filter((p) => {
    try {
      return statSync(p).isFile();
    } catch {
      return false;
    }
  });
  const kind = r.pick(["content", "content", "append", "add", "add-new-dir", "delete", "rename", "swap"]);
  const some = existing.length ? r.pick(existing) : undefined;
  if (some && isSettings(some) && (kind === "content" || kind === "append")) {
    writeFileSync(some, JSON.stringify({ ...JSON.parse(readFileSync(some, "utf8")), [`k${r.int(0, 9999)}`]: r.int(0, 9) }));
    return `settings ${some}`;
  }
  if (some && isSettings(some) && kind === "rename") return undefined;
  if (kind === "content" && some) {
    const body = readFileSync(some);
    const next = Buffer.from(body.length ? body : [0]);
    next[r.int(0, next.length - 1)] = (next[r.int(0, next.length - 1)]! + 1) & 255;
    if (body.length) next[0] = (body[0]! + 1) & 255;
    writeFileSync(some, next);
    return `content ${some}`;
  }
  if (kind === "append" && some) {
    appendFileSync(some, "x");
    return `append ${some}`;
  }
  if (kind === "add") {
    const d = r.pick(DIRS);
    const p = join(b.folder, d, r.pick(PARTS), r.pick(["new.txt", "adapter.yaml", ".git", "node_modules", "a b", ".hidden"]));
    try {
      statSync(p);
      return undefined;
    } catch {}
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p, "n");
    b.tracked.push(p);
    return `add ${p}`;
  }
  if (kind === "add-new-dir") {
    const p = join(b.folder, r.pick(DIRS), r.pick(PARTS), "newdir", r.pick(["x", ".git", "deep/er/file"]));
    if (existsSync(p)) return undefined;
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p, "n");
    b.tracked.push(p);
    return `add ${p}`;
  }
  if (kind === "delete" && some) {
    rmSync(some);
    return `delete ${some}`;
  }
  if (kind === "rename" && some) {
    const to = join(dirname(some), `renamed-${r.int(0, 99)}`);
    if (to === some) return undefined;
    renameSync(some, to);
    if (/[\\/](?:adapters|methods|skills)[\\/]/.test(to)) b.tracked.push(to);
    return `rename ${some}`;
  }
  if (kind === "swap") {
    const plain = existing.filter((p) => !isSettings(p));
    if (plain.length < 2) return undefined;
    const [x, y] = [plain[0]!, plain[plain.length - 1]!];
    const [bx, by] = [readFileSync(x), readFileSync(y)];
    if (x === y || bx.equals(by)) return undefined;
    writeFileSync(x, by);
    writeFileSync(y, bx);
    return `swap ${x} ${y}`;
  }
  return undefined;
}

describe("fuzz: the trust card", () => {
  test("a hook, a setting value, a method or an adapter with hidden text shows that text, written out", () => {
    const r = new Rng(45001);
    for (let i = 0; i < runs(80); i++) {
      const folder = join(root, `card-${counter++}`);
      const hide = r.pick(HIDING);
      const text = `${r.string("ab ", 0, 3)}${hide}${r.string("cd ", 0, 3)}`;
      mkdirSync(join(folder, ".cuvette"), { recursive: true });
      writeFileSync(join(folder, ".cuvette", "settings.json"), JSON.stringify({ hooks: { SessionStart: [{ command: r.bool(0.5) ? ["sh", "-c", text] : text }] }, model: text, [`k${hide}`]: 1 }));
      mkdirSync(join(folder, ".cuvette", "methods"), { recursive: true });
      const evidence = trustEvidence(trustStatus(folder));
      expect(HIDDEN.test(evidence), JSON.stringify(text)).toBe(false);
      expect(evidence, JSON.stringify(text)).toContain(SECRET);
      expect(evidence).toContain("Hooks");
    }
  });

  test("a new line in a hook or in a value cannot make a second line on the card", () => {
    const folder = join(root, `card-${counter++}`);
    mkdirSync(join(folder, ".cuvette"), { recursive: true });
    const fake = "Bypass permissions: not set.";
    writeFileSync(join(folder, ".cuvette", "settings.json"), JSON.stringify({ model: `x\n${fake}\nHooks (none)`, hooks: { SessionStart: [{ command: ["sh", "-c", `echo a\n  Adapters (none)`] }] } }));
    const lines = trustEvidence(trustStatus(folder)).split("\n");
    expect(lines.filter((l) => l === fake)).toHaveLength(1);
    expect(lines.filter((l) => l.startsWith("Bypass permissions"))).toHaveLength(1);
    expect(lines.filter((l) => l.startsWith("Hooks"))).toHaveLength(1);
    expect(lines.filter((l) => l.trim().startsWith("Adapters"))).toHaveLength(0);
    expect(lines.some((l) => l.includes('"x\\nBypass permissions: not set.\\nHooks (none)"'))).toBe(true);
  });

  test.skipIf(process.platform === "win32")("an adapter name, a method name and a changed file with hidden text show that text, written out", () => {
    const r = new Rng(45002);
    for (let i = 0; i < runs(40); i++) {
      const folder = join(root, `card-${counter++}`);
      const hide = r.pick(HIDING.filter((h) => !h.includes("/") && !h.includes("\\x1b\\")));
      const adapter = join(folder, ".cuvette", "adapters", `a${hide}`);
      mkdirSync(adapter, { recursive: true });
      writeFileSync(join(adapter, "adapter.yaml"), "name: a\n");
      mkdirSync(join(folder, ".cuvette", "methods"), { recursive: true });
      writeFileSync(join(folder, ".cuvette", "methods", `m${hide}.json`), "{}");
      trustFolder(folder);
      writeFileSync(join(adapter, `new${hide}.py`), "print(1)\n");
      const evidence = trustEvidence(trustStatus(folder));
      expect(HIDDEN.test(evidence), JSON.stringify(hide)).toBe(false);
      expect(evidence.split(SECRET).length - 1, JSON.stringify(hide)).toBeGreaterThanOrEqual(3);
      untrustFolder(folder);
    }
  });
});

describe("fuzz: the scan of a project folder", () => {
  test("random folders never throw, and the scan gives the same hash again", () => {
    const r = new Rng(43001);
    for (let i = 0; i < runs(60); i++) {
      const b = build(r);
      const a = scanFolder(b.folder);
      expect(scanFolder(b.folder).hash).toBe(a.hash);
      expect(() => trustStatus(b.folder)).not.toThrow();
      expect(trustStatus(b.folder).scan.hash).toBe(a.hash);
    }
  });

  test("a change to any file under adapters, methods or skills, or to LAB.md or the settings, changes the hash", () => {
    const r = new Rng(43002);
    let changes = 0;
    for (let i = 0; i < runs(80); i++) {
      const b = build(r);
      for (let k = 0; k < 3; k++) {
        const before = scanFolder(b.folder).hash;
        const what = mutate(r, b);
        if (!what) continue;
        changes++;
        const after = scanFolder(b.folder);
        expect(after.hash, what).not.toBe(before);
        expect(after.incomplete, what).toEqual([]);
      }
    }
    expect(changes).toBeGreaterThan(20);
  });

  test("after trust the state is trusted until a change, and a change makes it changed", () => {
    const r = new Rng(43003);
    let trusted = 0;
    for (let i = 0; i < runs(60); i++) {
      const b = build(r);
      const s = scanFolder(b.folder);
      if (!needsTrust(s)) {
        expect(trustStatus(b.folder).state).toBe("none");
        continue;
      }
      expect(trustStatus(b.folder).state).toBe("new");
      trustFolder(b.folder);
      trusted++;
      expect(trustStatus(b.folder).state).toBe("trusted");
      expect(trustStatus(b.folder).state).toBe("trusted");
      for (let k = 0; k < 2; k++) {
        const what = mutate(r, b);
        if (!what) continue;
        const t = trustStatus(b.folder);
        if (t.state === "none") {
          expect(needsTrust(t.scan), what).toBe(false);
          break;
        } else {
          expect(t.state, what).toBe("changed");
          expect(t.changes.length, what).toBeGreaterThan(0);
        }
        if (t.state === "changed") break;
      }
      untrustFolder(b.folder);
      expect(trustStatus(b.folder).state === "trusted").toBe(false);
    }
    expect(trusted).toBeGreaterThan(10);
  });

  test("a file in a .git folder inside an adapter is part of the hash", () => {
    const folder = join(root, "git-inside");
    const file = join(folder, ".cuvette", "adapters", "tool", ".git", "hooks", "run.sh");
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(join(folder, ".cuvette", "adapters", "tool", "adapter.yaml"), "name: tool\n");
    writeFileSync(file, "echo one\n");
    trustFolder(folder);
    expect(trustStatus(folder).state).toBe("trusted");
    writeFileSync(file, "echo two and more\n");
    expect(trustStatus(folder).state).toBe("changed");
    untrustFolder(folder);
    trustFolder(folder);
    expect(trustStatus(folder).state).toBe("trusted");
    mkdirSync(join(folder, ".cuvette", "adapters", ".git"), { recursive: true });
    writeFileSync(join(folder, ".cuvette", "adapters", ".git", "adapter.yaml"), "name: x\n");
    expect(trustStatus(folder).state).toBe("changed");
  });

  test("inside a .git folder of an adapter only the hooks and the config are part of the hash", () => {
    const folder = join(root, "git-narrow");
    const git = join(join(folder, ".cuvette", "adapters", "tool"), ".git");
    mkdirSync(join(git, "hooks"), { recursive: true });
    mkdirSync(join(git, "refs"), { recursive: true });
    writeFileSync(join(folder, ".cuvette", "adapters", "tool", "adapter.yaml"), "name: tool\n");
    writeFileSync(join(git, "config"), "[core]\n");
    writeFileSync(join(git, "hooks", "post-checkout"), "echo one\n");
    writeFileSync(join(git, "index"), "one");
    writeFileSync(join(git, "refs", "main"), "abc");
    trustFolder(folder);
    writeFileSync(join(git, "index"), "two and more");
    writeFileSync(join(git, "refs", "main"), "def");
    writeFileSync(join(git, "COMMIT_EDITMSG"), "x");
    expect(trustStatus(folder).state).toBe("trusted");
    writeFileSync(join(git, "config"), "[core]\n\thooksPath = /tmp/x\n");
    expect(trustStatus(folder).state).toBe("changed");
    untrustFolder(folder);
    trustFolder(folder);
    writeFileSync(join(git, "hooks", "post-checkout"), "echo two\n");
    expect(trustStatus(folder).state).toBe("changed");
  });

  test("more files than the limit give the state changed, and the folder cannot be trusted", () => {
    const folder = join(root, "many");
    const dir = join(folder, ".cuvette", "adapters", "tool");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "adapter.yaml"), "name: tool\n");
    for (let i = 0; i < 2100; i++) writeFileSync(join(dir, `f${i}.txt`), String(i));
    const t = trustStatus(folder);
    expect(t.state).toBe("changed");
    expect(t.scan.incomplete.length).toBeGreaterThan(0);
    expect(() => trustFolder(folder)).toThrow(/cannot trust/);
  });
});

describe.skipIf(process.platform === "win32")("fuzz: links in a project folder", () => {
  test("a link to a folder is always linked, and the state is never trusted", () => {
    const r = new Rng(44001);
    for (let i = 0; i < runs(50); i++) {
      const b = build(r);
      const outside = join(root, `outside-${counter++}`);
      mkdirSync(outside, { recursive: true });
      writeFileSync(join(outside, "code.py"), "print(1)\n");
      const d = r.pick(DIRS);
      const part = r.pick(PARTS);
      const base = join(b.folder, d, part);
      mkdirSync(base, { recursive: true });
      const where = r.pick(["part", "inside", "deep"]);
      let at = base;
      if (where === "part") {
        rmSync(base, { recursive: true, force: true });
      } else {
        at = where === "inside" ? base : join(base, "x", "y");
        mkdirSync(at, { recursive: true });
        at = join(at, `${r.pick(["lib", "lib.d", "a b", ".hidden"])}-${counter++}`);
      }
      symlinkSync(outside, at);
      writeFileSync(join(b.folder, "LAB.md"), "Use small figures.\n");
      const s = scanFolder(b.folder);
      expect(s.linked.length, `link at ${at}`).toBeGreaterThan(0);
      expect(trustStatus(b.folder).state, `link at ${at}`).toBe("changed");
      expect(() => trustFolder(b.folder)).toThrow(/cannot trust/);
      expect(trustStatus(b.folder).state).toBe("changed");
    }
  });

  test("a dangling link, a link to a file, and a changed target change the hash and never throw", () => {
    const r = new Rng(44002);
    for (let i = 0; i < runs(40); i++) {
      const b = build(r);
      const base = join(b.folder, ".cuvette", "adapters", "tool");
      mkdirSync(base, { recursive: true });
      const target = join(root, `target-${counter++}.txt`);
      symlinkSync(target, join(base, "dangling"));
      const dangling = scanFolder(b.folder);
      expect(Object.keys(dangling.files).some((k) => k.endsWith("dangling") && k.startsWith("(link) "))).toBe(true);
      writeFileSync(target, "one");
      const one = scanFolder(b.folder).hash;
      expect(one).not.toBe(dangling.hash);
      writeFileSync(target, "two");
      const two = scanFolder(b.folder).hash;
      expect(two).not.toBe(one);
      expect(scanFolder(b.folder).linked).toEqual([]);
      const other = join(root, `other-${counter++}.txt`);
      writeFileSync(other, "two");
      rmSync(join(base, "dangling"));
      symlinkSync(other, join(base, "dangling"));
      expect(scanFolder(b.folder).hash).not.toBe(two);
    }
  });

  test("a regular file that is named like the entry of a link does not hide the link", () => {
    const folder = join(root, "decoy");
    const base = join(folder, ".cuvette", "adapters", "tool");
    mkdirSync(base, { recursive: true });
    const target = join(root, "decoy-target.sh");
    writeFileSync(target, "echo one\n");
    symlinkSync(target, join(base, "run"));
    writeFileSync(join(base, "run (link)"), "decoy");
    mkdirSync(join(base, "node_modules"), { recursive: true });
    writeFileSync(join(base, "node_modules", "dep.js"), "one");
    writeFileSync(join(base, "node_modules (listing)"), "decoy");
    const before = scanFolder(folder).hash;
    writeFileSync(target, "echo two\n");
    const second = scanFolder(folder).hash;
    expect(second).not.toBe(before);
    writeFileSync(join(base, "node_modules", "dep.js"), "twotwo");
    expect(scanFolder(folder).hash).not.toBe(second);
  });

  test("a link to a folder outside the adapter folder is linked also inside node_modules and .venv", () => {
    const outside = join(root, "outside-listed");
    mkdirSync(outside, { recursive: true });
    writeFileSync(join(outside, "code.py"), "print(1)\n");
    for (const listed of ["node_modules", ".venv"]) {
      const folder = join(root, `listed-${counter++}`);
      const base = join(folder, ".cuvette", "adapters", "tool");
      mkdirSync(join(base, listed, "lib"), { recursive: true });
      writeFileSync(join(base, "adapter.yaml"), "name: tool\n");
      writeFileSync(join(base, listed, "lib", "a.py"), "a\n");
      symlinkSync("lib", join(base, listed, "lib64"));
      symlinkSync(join(base, "adapter.yaml"), join(base, listed, "file-link"));
      expect(scanFolder(folder).linked, listed).toEqual([]);
      trustFolder(folder);
      expect(trustStatus(folder).state, listed).toBe("trusted");
      symlinkSync(outside, join(base, listed, "escape"));
      expect(scanFolder(folder).linked, listed).toEqual([join(".cuvette", "adapters", "tool", listed, "escape")]);
      expect(trustStatus(folder).state, listed).toBe("changed");
      untrustFolder(folder);
    }
  });

  test("a link to a file or a dangling link inside node_modules and .venv is hashed with its target", () => {
    for (const listed of ["node_modules", ".venv"]) {
      const folder = join(root, `listed-file-${counter++}`);
      const base = join(folder, ".cuvette", "adapters", "tool");
      mkdirSync(join(base, listed), { recursive: true });
      writeFileSync(join(base, "adapter.yaml"), "name: tool\n");
      const target = join(root, `listed-target-${counter++}.js`);
      writeFileSync(target, "one");
      symlinkSync(target, join(base, listed, "tool.js"));
      symlinkSync(join(root, `missing-${counter++}.js`), join(base, listed, "dangling.js"));
      trustFolder(folder);
      expect(trustStatus(folder).state, listed).toBe("trusted");
      writeFileSync(target, "one-changed");
      expect(trustStatus(folder).state, listed).toBe("changed");
      untrustFolder(folder);
      trustFolder(folder);
      const dangling = readlinkSync(join(base, listed, "dangling.js"));
      writeFileSync(dangling, "now it exists");
      expect(trustStatus(folder).state, listed).toBe("changed");
    }
  });

  test("a link loop and a link that points at its own folder do not stop the scan", () => {
    const folder = join(root, "loops");
    const base = join(folder, ".cuvette", "adapters");
    mkdirSync(base, { recursive: true });
    symlinkSync(base, join(base, "self"));
    symlinkSync(join(base, "b"), join(base, "a"));
    symlinkSync(join(base, "a"), join(base, "b"));
    const t = trustStatus(folder);
    expect(t.state).toBe("changed");
    expect(t.scan.linked).toContain(join(".cuvette", "adapters", "self"));
  });

  test("the folder with a link as the project settings folder reads the target files into the hash", () => {
    const folder = join(root, "linked-dot");
    const real = join(root, "real-dot");
    mkdirSync(join(real, "adapters", "tool"), { recursive: true });
    writeFileSync(join(real, "adapters", "tool", "adapter.yaml"), "name: tool\n");
    mkdirSync(folder, { recursive: true });
    symlinkSync(real, join(folder, ".cuvette"));
    const before = scanFolder(folder).hash;
    expect(before).not.toBe("");
    writeFileSync(join(real, "adapters", "tool", "adapter.yaml"), "name: tool2\n");
    expect(scanFolder(folder).hash).not.toBe(before);
  });
});
