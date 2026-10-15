import type { Args, Hook, Mode, PreToolUseInput, PreToolUseResult, Tool } from "./types.ts";

type Rule = "allow" | "ask" | "deny";

function globToRegex(glob: string, bare = false): RegExp {
  const open = bare && glob.endsWith(" *");
  const body = (open ? glob.slice(0, -2) : glob).replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\?/g, ".");
  return new RegExp(`^${body}${open ? "(?: .*)?" : ""}$`, "s");
}

interface Wrapper {
  values: Set<string>;
  flags: Set<string>;
}

const wrapper = (values: string[], flags: string[]): Wrapper => ({ values: new Set(values), flags: new Set(flags) });

const WRAPPERS: Record<string, Wrapper> = {
  env: wrapper(["-u", "-C", "-S", "-P", "--unset", "--chdir", "--split-string", "--default-signal", "--ignore-signal", "--block-signal"], ["-i", "-0", "-v", "-", "--ignore-environment", "--null", "--debug"]),
  command: wrapper([], ["-p"]),
  exec: wrapper(["-a"], ["-c", "-l"]),
  nohup: wrapper([], []),
  sudo: wrapper(["-u", "-g", "-h", "-p", "-C", "-D", "-R", "-r", "-t", "-T", "--user", "--group", "--host", "--prompt", "--close-from", "--chdir", "--chroot", "--role", "--type", "--command-timeout"], ["-A", "-b", "-B", "-E", "-H", "-K", "-k", "-n", "-P", "-S", "--askpass", "--background", "--preserve-env", "--set-home", "--non-interactive", "--stdin", "--reset-timestamp", "--remove-timestamp"]),
  xargs: wrapper(["-n", "-L", "-I", "-P", "-s", "-d", "-E", "-a", "--max-args", "--max-lines", "--max-procs", "--max-chars", "--replace", "--delimiter", "--eof", "--arg-file"], ["-0", "-r", "-t", "-p", "-x", "-o", "--null", "--no-run-if-empty", "--verbose", "--interactive", "--open-tty", "--exit"]),
};

const ASSIGNMENT = /^[A-Za-z_]\w*=/;
const MAX_CANDIDATES = 8;
const MAX_STRINGS = 256;

function programName(p: string): string {
  return p.split(/[\\/]/).pop()!.replace(/\.(exe|cmd|bat|com)$/i, "").toLowerCase();
}

function foldProgram(text: string): string {
  const i = text.indexOf(" ");
  return (i < 0 ? text : text.slice(0, i)).toLowerCase() + (i < 0 ? "" : text.slice(i));
}

function shellWords(text: string): string[] {
  const out: string[] = [];
  let word = "";
  let started = false;
  let quote = "";
  for (let i = 0; i < text.length; i++) {
    const c = text[i]!;
    if (quote === "'") {
      if (c === "'") quote = "";
      else word += c;
    } else if (quote === '"') {
      if (c === '"') quote = "";
      else if (c === "\\" && i + 1 < text.length && '"\\$`'.includes(text[i + 1]!)) word += text[++i];
      else word += c;
    } else if (c === "'" || c === '"') {
      quote = c;
      started = true;
    } else if (c === "\\" && text[i + 1] === "_") {
      i++;
      if (started) out.push(word);
      word = "";
      started = false;
    } else if (c === "\\" && i + 1 < text.length) {
      word += text[++i];
      started = true;
    } else if (/\s/.test(c)) {
      if (started) out.push(word);
      word = "";
      started = false;
    } else {
      word += c;
      started = true;
    }
  }
  if (started) out.push(word);
  return out;
}

function splitAt(w: string): number {
  for (let i = 1; i < w.length; i++) {
    if (w[i] === "S") return i;
    if ("uCP".includes(w[i]!)) return -1;
  }
  return -1;
}

function optionStep(w: string, wrap: Wrapper): number[] {
  if (wrap.values.has(w)) return [2];
  if (wrap.flags.has(w) || (w.startsWith("--") && w.includes("="))) return [1];
  if (!w.startsWith("--") && w.length > 2) {
    const letters = w.slice(1);
    const at = [...letters].findIndex((c) => wrap.values.has(`-${c}`));
    if (at >= 0) return [at < letters.length - 1 ? 1 : 2];
    if ([...letters].every((c) => wrap.flags.has(`-${c}`))) return [1];
  }
  return [1, 2];
}

function joinedArgv(args: Args, programs: RegExp[]): string[] {
  const v = args.argv ?? args.command;
  if (!Array.isArray(v)) return [String(v ?? "")];
  const list = v.map(String);
  const out = [list.join(" ")];
  const ruled = (w: string | undefined) => w !== undefined && programs.some((r) => r.test(programName(w)));
  const lists = [list];
  const work: { list: number; at: number }[] = list.length ? [{ list: 0, at: 0 }] : [];
  const seen = new Set<string>(["0:0"]);
  const visit = (id: number, at: number) => {
    const key = `${id}:${at}`;
    if (!seen.has(key) && at < lists[id]!.length) {
      seen.add(key);
      work.push({ list: id, at });
    }
  };
  const command = (text: string) => {
    const words = shellWords(text);
    if (words.length) visit(lists.push(["env", ...words]) - 1, 0);
  };
  let strings = 0;
  for (let steps = 0; work.length && steps < 100_000 + 8 * list.length; steps++) {
    const { list: id, at } = work.pop()!;
    const words = lists[id]!;
    const name = programName(words[at]!);
    if ((at === 0 && id === 0) || (strings < MAX_STRINGS && ruled(words[at]))) {
      out.push([name, ...words.slice(at + 1)].join(" "));
      strings++;
    }
    const wrap = WRAPPERS[name];
    if (!wrap) continue;
    const env = name === "env";
    const todo = [at + 1];
    const done = new Set<number>();
    let found = 0;
    while (todo.length && found < MAX_CANDIDATES) {
      const p = todo.shift()!;
      if (p >= words.length || done.has(p)) continue;
      done.add(p);
      const w = words[p]!;
      if (w === "--" || ASSIGNMENT.test(w)) todo.push(p + 1);
      else if (env && (w === "-S" || w === "--split-string")) {
        if (words[p + 1] !== undefined) command(words[p + 1]!);
        todo.push(p + 2);
      } else if (env && /^-[A-Za-z0-9]/.test(w) && splitAt(w) >= 0) {
        const at = splitAt(w);
        if (at < w.length - 1) {
          command(w.slice(at + 1));
          todo.push(p + 1);
        } else {
          if (words[p + 1] !== undefined) command(words[p + 1]!);
          todo.push(p + 2);
        }
      } else if (env && w.startsWith("--split-string=")) {
        command(w.slice("--split-string=".length));
        todo.push(p + 1);
      } else if (w.startsWith("-") && w.length > 1) todo.push(...optionStep(w, wrap).map((n) => p + n));
      else if (w === "-") todo.push(p + 1);
      else {
        found++;
        visit(id, p);
      }
    }
  }
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
      return { rule, tool: globToRegex(key.slice(0, i)), argv: globToRegex(glob), folded: globToRegex(foldProgram(glob), true) };
    });
    this.programs = Object.entries(rules)
      .filter(([k, r]) => r !== "allow" && k.includes(":"))
      .map(([k]) => globToRegex(programName(k.slice(k.indexOf(":") + 1).split(" ")[0]!.replace(/\*$/, "*"))));
  }

  private ruleFor(tool: Tool, args: Args): Rule | undefined {
    const argv = joinedArgv(args, this.programs);
    for (const rule of ["deny", "ask", "allow"] as Rule[]) {
      const hit = this.rules.find((r) => r.rule === rule && r.tool.test(tool.name) && (!r.argv || (rule === "allow" ? r.argv.test(argv[0]!) : argv.some((a) => r.folded!.test(foldProgram(a))))));
      if (hit) return rule;
    }
    return undefined;
  }

  asks(tool: Tool, args: Args): boolean {
    return this.ruleFor(tool, args) === "ask";
  }

  check(tool: Tool, args: Args): Rule {
    const rule = this.ruleFor(tool, args);
    if (rule) return rule;
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
