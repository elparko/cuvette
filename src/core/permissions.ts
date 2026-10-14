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

function joinedArgv(args: Args): string[] {
  const v = args.argv ?? args.command;
  if (!Array.isArray(v)) return [String(v ?? "")];
  const list = v.map(String);
  const out = [list.join(" ")];
  const add = (w: string[]) => out.push([programName(w[0] ?? ""), ...w.slice(1)].join(" "));
  let rest = list;
  for (let n = 0; n < 4; n++) {
    add(rest);
    const wrapper = WRAPPERS[programName(rest[0] ?? "")];
    if (!wrapper) break;
    rest = rest.slice(1);
    while (rest.length) {
      const w = rest[0]!;
      if (w === "--") rest = rest.slice(1);
      else if (/^[A-Za-z_]\w*=/.test(w)) rest = rest.slice(1);
      else if (wrapper.has(w)) rest = rest.slice(2);
      else if (w.startsWith("-")) {
        for (let i = 1; i < rest.length; i++) add(rest.slice(i));
        return [...new Set(out)];
      } else break;
    }
  }
  return [...new Set(out)];
}

export class Permissions {
  private rules: { rule: Rule; tool: RegExp; argv?: RegExp; folded?: RegExp }[];

  constructor(rules: Record<string, Rule>) {
    this.rules = Object.entries(rules).map(([key, rule]) => {
      const i = key.indexOf(":");
      if (i < 0) return { rule, tool: globToRegex(key) };
      const glob = key.slice(i + 1);
      return { rule, tool: globToRegex(key.slice(0, i)), argv: globToRegex(glob), folded: globToRegex(foldProgram(glob)) };
    });
  }

  check(tool: Tool, args: Args): Rule {
    const argv = joinedArgv(args);
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
