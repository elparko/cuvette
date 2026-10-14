import type { Args, Hook, Mode, PreToolUseInput, PreToolUseResult, Tool } from "./types.ts";

type Rule = "allow" | "ask" | "deny";

function globToRegex(glob: string): RegExp {
  const body = glob.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\?/g, ".");
  return new RegExp(`^${body}$`, "s");
}

function joinedArgv(args: Args): string[] {
  const v = args.argv ?? args.command;
  if (!Array.isArray(v)) return [String(v ?? "")];
  const joined = v.join(" ");
  const first = String(v[0] ?? "");
  const name = first.split(/[\\/]/).pop()!.replace(/\.(exe|cmd|bat|com)$/i, "");
  return name === first ? [joined] : [joined, [name, ...v.slice(1)].join(" ")];
}

export class Permissions {
  private rules: { rule: Rule; tool: RegExp; argv?: RegExp }[];

  constructor(rules: Record<string, Rule>) {
    this.rules = Object.entries(rules).map(([key, rule]) => {
      const i = key.indexOf(":");
      if (i < 0) return { rule, tool: globToRegex(key) };
      return { rule, tool: globToRegex(key.slice(0, i)), argv: globToRegex(key.slice(i + 1)) };
    });
  }

  check(tool: Tool, args: Args): Rule {
    const argv = joinedArgv(args);
    for (const rule of ["deny", "ask", "allow"] as Rule[]) {
      const shown = rule === "allow" ? argv.slice(0, 1) : argv;
      const hit = this.rules.find((r) => r.rule === rule && r.tool.test(tool.name) && (!r.argv || shown.some((a) => r.argv!.test(a))));
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
