import { describe, expect, test } from "vitest";
import { Permissions } from "../src/core/permissions.ts";
import type { Tool } from "../src/core/types.ts";
import { linear as once, Rng, runs } from "./fuzz-rng.ts";

function linear(make: (n: number) => string, run: (s: string) => void, n: number) {
  let res = once(make, run, n);
  for (let k = 0; k < 2 && !res.ok; k++) res = once(make, run, n);
  return res;
}

const rc: Tool = { name: "run_command", description: "", inputSchema: {}, source: "generic", execute: async () => ({ ok: true }) };

const KNOWN: Record<string, string[][]> = {
  env: [["-i"], ["-0"], ["-v"], ["-u", "VAR"], ["-C", "/tmp"], ["--unset", "V"], ["--chdir=/tmp"], ["VAR=x"], ["A=1", "B=2"], ["-uV"], ["-"]],
  sudo: [["-n"], ["-E"], ["-u", "root"], ["-g", "wheel"], ["-H"], ["--user", "root"], ["-uroot"], ["-k"], ["-A"], ["-nE"], ["-nu", "root"], ["--user=root"], ["-h", "host"], ["-p", "prompt:"]],
  xargs: [["-0"], ["-n", "1"], ["-I", "{}"], ["-P", "4"], ["-t"], ["-r"], ["-L", "1"], ["--max-args=2"], ["-d", "\\n"], ["-0rt"]],
  nohup: [[]],
  command: [[], ["-p"]],
  exec: [[], ["-c"], ["-a", "name"], ["-cl"]],
};
const UNKNOWN = [["-Z"], ["-Q", "val"], ["--weird"], ["--weird-value", "val"], ["-j"]];
const WRAPPERS = Object.keys(KNOWN);

function wrappers(r: Rng, unknown: boolean, only: string[] = WRAPPERS): string[] {
  const out: string[] = [];
  for (let k = r.int(0, 7); k > 0; k--) {
    const w = r.pick(only);
    out.push(w);
    for (let j = r.int(0, 6); j > 0; j--) out.push(...r.pick(unknown && ["env", "sudo", "xargs"].includes(w) && r.bool(0.2) ? UNKNOWN : KNOWN[w]!));
    if (r.bool(0.15)) out.push("--");
  }
  return out;
}

const RM = ["rm", "/bin/rm", "RM", "rm.exe", "./rm", "C:\\tools\\rm.exe", "/usr/bin/RM.EXE", "Rm.CMD"];
const ARGS = ["-rf", "x", "a b", "rm", "--", "-", "git", "*", "$HOME", "'rm'"];
const tail = (r: Rng) => Array.from({ length: r.int(0, 5) }, () => r.pick(ARGS));

const denyRm = new Permissions({ "run_command:rm *": "deny", "run_command:sudo *": "allow", "run_command:env *": "allow", "run_command:xargs *": "allow", "run_command:nohup *": "allow", "run_command:command *": "allow", "run_command:exec *": "allow", "run_command:git *": "allow" });

describe("fuzz: the permission rules for a command", () => {
  test("a deny rule for a program denies it after any chain of wrappers and options", () => {
    const r = new Rng(51001);
    for (let i = 0; i < runs(1500); i++) {
      const argv = [...wrappers(r, true), r.pick(RM), ...tail(r)];
      expect(denyRm.check(rc, { argv }), JSON.stringify(argv)).toBe("deny");
    }
  });

  test("a deny rule sees the program in a quoted env -S string", () => {
    const r = new Rng(51002);
    for (let i = 0; i < runs(600); i++) {
      const prog = r.pick(RM.filter((x) => !x.includes("\\")));
      const q = r.pick(["", "'", '"']);
      const inner = [r.pick(["", "FOO=1 ", "sudo -n ", "env -i ", "nohup "]), `${q}${prog}${q}`, ...tail(r).filter((x) => !x.includes("'") && !x.includes('"'))].join(" ").replace(/ +/g, " ");
      const argv = [...wrappers(r, false), ...r.pick([["env", "-S", inner], ["env", `-S${inner}`], ["env", `--split-string=${inner}`], ["env", "--split-string", inner]])];
      expect(denyRm.check(rc, { argv }), JSON.stringify(argv)).toBe("deny");
    }
  });

  test("a deny rule does not catch a program word that is only an argument or the value of an option", () => {
    const r = new Rng(51003);
    const programs = ["git", "echo", "python", "ls", "cat", "grep", "Rscript"];
    for (let i = 0; i < runs(1500); i++) {
      const prefix = wrappers(r, false);
      const prog = r.pick(programs);
      const argv = [...prefix, prog, ...r.pick([["commit", "-m", "rm"], ["rm", "x"], ["-C", "rm", "status"], ["rm"], ["-m", "rm old"], ["--", "rm"], ["x", "rm", "rm", "rm"]])];
      expect(denyRm.check(rc, { argv }), JSON.stringify(argv)).not.toBe("deny");
    }
    for (const argv of [["sudo", "-u", "rm", "git", "status"], ["env", "-u", "rm", "git", "status"], ["env", "-C", "rm", "git", "status"], ["env", "RM=rm", "git", "status"], ["xargs", "-I", "rm", "git", "{}"], ["sudo", "--user", "rm", "git", "status"], ["exec", "-a", "rm", "git", "status"], ["env", "-S", "git commit -m 'rm'"], ["env", "-S", "git commit -m rm"], ["env", "-i", "git", "commit", "-m", "rm"]]) expect(denyRm.check(rc, { argv }), argv.join(" ")).not.toBe("deny");
  });

  test("an ask rule and a deny rule for an argument pattern follow the same path", () => {
    const r = new Rng(51004);
    const p = new Permissions({ "run_command:git push --force *": "deny", "run_command:curl *": "ask", "run_command:git *": "allow", "run_command:env *": "allow", "run_command:sudo *": "allow" });
    for (let i = 0; i < runs(800); i++) {
      const prefix = wrappers(r, true, ["env", "sudo"]);
      const forced = [...prefix, r.pick(["git", "/usr/bin/GIT", "Git.exe"]), "push", "--force", r.pick(["origin", "x"])];
      expect(p.check(rc, { argv: forced }), JSON.stringify(forced)).toBe("deny");
      const safe = [...wrappers(r, false), "git", "push", r.pick(["--force-with-lease", "--FORCE", "origin"]), "--force"];
      expect(p.check(rc, { argv: safe }), JSON.stringify(safe)).not.toBe("deny");
      const curl = [...wrappers(r, true), r.pick(["curl", "/usr/bin/CURL", "curl.exe"]), "http://x"];
      expect(p.check(rc, { argv: curl }), JSON.stringify(curl)).toBe("ask");
    }
  });

  test("a deep chain of wrappers does not hide the program", () => {
    expect(denyRm.check(rc, { argv: [...Array(40).fill("env"), "rm", "x"] })).toBe("deny");
    expect(denyRm.check(rc, { argv: [...Array(5000).fill("sudo"), "rm", "x"] })).toBe("deny");
    expect(denyRm.check(rc, { argv: [...Array(30).fill(["env", "-i", "nohup"]).flat(), "rm"] })).toBe("deny");
    expect(denyRm.check(rc, { argv: ["sudo", "-E", "-u", "root", "-g", "wheel", "-h", "host", "-p", "pw", "-D", "dir", "-r", "role", "rm", "x"] })).toBe("deny");
    expect(denyRm.check(rc, { argv: ["sudo", "-Z", "-u", "root", "-g", "wheel", "-h", "host", "-p", "pw", "-D", "dir", "-r", "role", "rm", "x"] })).toBe("deny");
    expect(denyRm.check(rc, { argv: ["env", "-S", "env -S 'env -S \"rm x\"'"] })).toBe("deny");
  });

  test("an allow rule stays exact", () => {
    const p = new Permissions({ "run_command:git status": "allow", "run_command:git log *": "allow", "run_command:rm *": "deny" });
    expect(p.check(rc, { argv: ["git", "status"] })).toBe("allow");
    for (const argv of [["git", "status", "x"], ["/tmp/git", "status"], ["GIT", "status"], ["Git", "status"], ["env", "git", "status"], ["git"], ["git", "log"], ["git", "logx"], ["sudo", "git", "log", "x"], ["git", "status", "&&", "rm"], ["nohup", "git", "status"]]) expect(p.check(rc, { argv }), argv.join(" ")).toBe("ask");
    const r = new Rng(51005);
    const words = ["git", "status", "log", "rm", "x", "-p", "env", "sudo", "--oneline", "a b", "GIT", "", "*", ".", "?"];
    let allowed = 0;
    for (let i = 0; i < runs(3000); i++) {
      const argv = Array.from({ length: r.int(1, 5) }, () => r.pick(words));
      if (r.bool(0.4)) argv[0] = "git";
      if (r.bool(0.2)) argv.splice(1, 0, r.pick(["status", "log"]));
      const joined = argv.join(" ");
      const exact = joined === "git status" || joined.startsWith("git log ");
      const got = p.check(rc, { argv });
      if (exact) {
        expect(got, joined).toBe("allow");
        allowed++;
      } else expect(got, joined).not.toBe("allow");
    }
    expect(allowed).toBeGreaterThan(10);
  });

  test("random commands never crash and the result is one of the three rules", () => {
    const r = new Rng(51006);
    const words = ["env", "sudo", "xargs", "-S", "-u", "--", "-", "-i", "rm", "", " ", "'", '"', "\\", "A=", "=", "--split-string=", "-S'rm'", "x", "\u0000", "日本"];
    for (let i = 0; i < runs(3000); i++) {
      const argv = Array.from({ length: r.int(0, 12) }, () => r.pick(words));
      expect(["allow", "ask", "deny"]).toContain(denyRm.check(rc, { argv }));
      expect(["allow", "ask", "deny"]).toContain(denyRm.check(rc, { command: argv.join(" ") }));
    }
    expect(denyRm.check(rc, {})).toBe("ask");
    expect(denyRm.check(rc, { argv: [] })).toBe("ask");
  });

  test("the check takes linear time in the number of words", () => {
    const cases: [string, (n: number) => string][] = [
      ["flags", (n) => "env " + "-i ".repeat(n / 3) + "echo hi"],
      ["unknown options", (n) => "sudo " + "-Z ".repeat(n / 3) + "echo hi"],
      ["unknown options with values", (n) => "sudo " + "-Z a ".repeat(n / 5) + "echo hi"],
      ["nested wrappers", (n) => "env ".repeat(n / 4) + "echo hi"],
      ["nested wrappers with unknown options", (n) => "env -Z ".repeat(n / 7) + "echo hi"],
      ["words", (n) => "git commit -m " + "rm ".repeat(n / 3)],
      ["a long -S string", (n) => "env -S " + "x".repeat(n)],
      ["assignments", (n) => "env " + "A=1 ".repeat(n / 4) + "echo"],
    ];
    for (const [name, make] of cases) {
      const res = linear(make, (s) => void denyRm.check(rc, { argv: s.split(" ") }), 8000);
      expect(res.ok, `${name}: ${res.small} ms for 8 000, ${res.big} ms for 32 000`).toBe(true);
    }
  });
});
