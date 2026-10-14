import type { Args, Hook, Mode, PreToolUseInput, PreToolUseResult, Tool } from "./types.ts";

type Rule = "allow" | "ask" | "deny";

function globToRegex(glob: string): RegExp {
  const body = glob.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\?/g, ".");
  return new RegExp(`^${body}$`, "s");
}

const WRAPPERS: Record<string, Set<string>> = {
  env: new Set(["-u", "-C", "-S"]),
  command: new Set(),
  exec: new Set(),
  nohup: new Set(),
  sudo: new Set(["-u", "-g", "-h", "-p", "-C", "-D", "-R", "-r", "-t", "-T"]),
  xargs: new Set(["-n", "-L", "-I", "-P", "-s", "-d", "-E", "-a"]),
};

function programName(p: string): string {
  return p.split(/[\\/]/).pop()!.replace(/\.(exe|cmd|bat|com)$/i, "").toLowerCase();
}

function foldProgram(text: string): string {
  const i = text.indexOf(" ");
  return (i < 0 ? text : text.slice(0, i)).toLowerCase() + (i < 0 ? "" : text.slice(i));
}

function joinedArgv(args: Args, programs: RegExp[]): string[] {
  const v = args.argv ?? args.command;
  if (!Array.isArray(v)) return [String(v ?? "")];
  const list = v.map(String);
  const out = [list.join(" ")];
  const wanted = (w: string[]) => !!w.length && (programs.some((r) => r.test(programName(w[0]!))) || !!WRAPPERS[programName(w[0]!)]);
  const peel = (words: string[], depth: number) => {
    out.push([programName(words[0] ?? ""), ...words.slice(1)].join(" "));
    const wrapper = WRAPPERS[programName(words[0] ?? "")];
    if (!wrapper || depth > 4) return;
    let rest = words.slice(1);
    while (rest.length) {
      const w = rest[0]!;
      if (w === "--" || /^[A-Za-z_]\w*=/.test(w)) rest = rest.slice(1);
      else if (wrapper.has(w)) {
        if (programName(words[0]!) === "env" && w === "-S" && rest[1] !== undefined) peel(rest[1].split(/\s+/).filter(Boolean).filter((x, i, all) => !/^[A-Za-z_]\w*=/.test(x) || all.slice(0, i).some((y) => !/^[A-Za-z_]\w*=/.test(y))), depth + 1);
        rest = rest.slice(2);
      } else if (w.startsWith("-")) {
        for (let i = 1; i <= 4 && i < rest.length; i++) if (wanted(rest.slice(i))) peel(rest.slice(i), depth + 1);
        return;
      } else break;
    }
    if (rest.length) peel(rest, depth + 1);
  };
  peel(list, 0);
  return [...new Set(out)];
}

export class Permissions {
  private rules: { rule: Rule; tool: RegExp; argv?: RegExp; folded?: RegExp }[];
  private programs: RegExp[];

  constructor(rules: Record<string, Rule>) {
    this.rules = Object.entries(rules).map(([key, rule]) => {
      const i = key.indexOf(":");
      if (i < 0) return { rule, tool: globToRegex(key) };
      const glob = key.slice(i + 1);
      return { rule, tool: globToRegex(key.slice(0, i)), argv: globToRegex(glob), folded: globToRegex(foldProgram(glob)) };
    });
    this.programs = Object.entries(rules)
      .filter(([k, r]) => r !== "allow" && k.includes(":"))
      .map(([k]) => globToRegex(programName(k.slice(k.indexOf(":") + 1).split(" ")[0]!.replace(/\*$/, "*"))));
  }

  check(tool: Tool, args: Args): Rule {
    const argv = joinedArgv(args, this.programs);
    for (const rule of ["deny", "ask", "allow"] as Rule[]) {
      const hit = this.rules.find((r) => r.rule === rule && r.tool.test(tool.name) && (!r.argv || (rule === "allow" ? r.argv.test(argv[0]!) : argv.some((a) => r.folded!.test(foldProgram(a))))));
      if (hit) return rule;
    }
    if (tool.permission) return tool.permission;
    if (tool.readOnly) return "allow";
    return tool.source === "generic" ? "ask" : "allow";
  }
}

export function modeHook(getMode: () => Mode, isReadOnly?: (tool: string) => boolean): Hook {
  return {
    name: "mode",
    event: "PreToolUse",
    run(input: PreToolUseInput & { readOnly?: boolean }): PreToolUseResult {
      const readOnly = input.readOnly ?? isReadOnly?.(input.tool) ?? false;
      if (readOnly) return {};
      const mode = getMode();
      if (mode === "plan") {
        return {
          decision: "deny",
          reason: "Plan mode: the agent plans and runs only read-only tools. Switch to watch mode to run steps.",
        };
      }
      if (mode === "teach") {
        return {
          decision: "deny",
          reason: "Teach mode: the scientist runs the steps and the agent runs only read-only tools. Switch to watch mode to let the agent run steps.",
        };
      }
      if (mode === "follow" && input.adapter) return { decision: "instruct" };
      return {};
    },
  };
}
