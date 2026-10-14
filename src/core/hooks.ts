import { spawn } from "node:child_process";
import type {
  Hook, HookEvent, PostToolUseInput, PostToolUseResult, PreAnswerInput, PreAnswerResult,
  PreToolUseInput, PreToolUseResult,
} from "./types.ts";

export interface CommandHook {
  matcher?: string;
  command: string[];
}

export type PreResult = PreToolUseResult & { errors?: string[] };

const STOPPING = new Set(["deny", "block", "ask", "instruct"]);
const TIMEOUT_MS = 30_000;

type Runner = (input: any, signal?: AbortSignal) => Promise<{ result?: any; error?: string }>;

function matches(matcher: string | undefined, name: unknown): boolean {
  if (!matcher || matcher === "*" || typeof name !== "string") return true;
  try {
    return new RegExp(matcher).test(name);
  } catch {
    return false;
  }
}

function normalize(raw: any): any {
  if (!raw || typeof raw !== "object") return {};
  const out: any = {};
  for (const k of ["decision", "reason", "updatedArgs", "additionalContext", "waitingOn", "deviations", "applied", "findings", "answer"]) {
    if (raw[k] !== undefined) out[k] = raw[k];
  }
  if (out.decision === "approve") out.decision = "allow";
  if (out.decision === "defer") out.decision = "block";
  const h = raw.hookSpecificOutput;
  if (h && typeof h === "object") {
    if (h.permissionDecision) out.decision = h.permissionDecision === "defer" ? "block" : h.permissionDecision;
    if (h.permissionDecisionReason !== undefined) out.reason = h.permissionDecisionReason;
    if (h.updatedInput !== undefined) out.updatedArgs = h.updatedInput;
    if (h.additionalContext !== undefined) out.additionalContext = h.additionalContext;
  }
  return out;
}

function runCommand(hook: CommandHook, event: HookEvent, cwd: string): Runner {
  const label = hook.command.join(" ");
  return (input, signal) =>
    new Promise((resolve) => {
      if (signal?.aborted) return resolve({});
      const payload = {
        ...input,
        hook_event_name: event,
        session_id: input.session,
        tool_name: input.tool,
        tool_input: input.args,
      };
      let stdout = "";
      let stderr = "";
      let settled = false;
      const finish = (v: { result?: any; error?: string }) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        signal?.removeEventListener("abort", onAbort);
        resolve(v);
      };
      const onAbort = () => {
        child.kill("SIGKILL");
        finish({});
      };
      const child = spawn(hook.command[0], hook.command.slice(1), { cwd, stdio: ["pipe", "pipe", "pipe"] });
      const timer = setTimeout(() => {
        child.kill("SIGKILL");
        finish({ error: `Command hook "${label}" timed out after 30 s.` });
      }, TIMEOUT_MS);
      signal?.addEventListener("abort", onAbort, { once: true });
      child.stdout.setEncoding("utf8");
      child.stderr.setEncoding("utf8");
      child.stdout.on("data", (d) => (stdout += d));
      child.stderr.on("data", (d) => (stderr += d));
      child.on("error", (err) => finish({ error: `Command hook "${label}" failed to start: ${err.message}` }));
      child.stdin.on("error", () => {});
      child.on("close", (code) => {
        if (code === 2) {
          const reason = stderr.trim() || "Blocked by a command hook.";
          return finish({ result: event === "PreToolUse" ? { decision: "deny", reason } : event === "Stop" ? { decision: "block", reason } : { additionalContext: reason } });
        }
        if (code !== 0) return finish({ error: `Command hook "${label}" exited with code ${code}: ${stderr.trim()}` });
        const text = stdout.trim();
        if (!text) return finish({ result: {} });
        try {
          finish({ result: normalize(JSON.parse(text)) });
        } catch {
          finish({ error: `Command hook "${label}" gave output that is not JSON: ${text.slice(0, 200)}` });
        }
      });
      child.stdin.end(JSON.stringify(payload));
    });
}

const join = (a: string | undefined, b: string | undefined) => (a && b ? `${a}\n${b}` : (a ?? b));

export class HookRunner {
  constructor(
    private hooks: Hook[],
    private commandHooks: Partial<Record<HookEvent, CommandHook[]>> = {},
    private cwd: string = process.cwd(),
  ) {}

  onError?: (message: string) => void;

  private async call(run: Runner, input: any, signal?: AbortSignal): Promise<any> {
    const { result, error } = await run(input, signal);
    if (error) this.onError?.(error);
    return result;
  }

  setCommands(commands: Partial<Record<HookEvent, CommandHook[]>>): void {
    this.commandHooks = commands;
  }

  add(hooks: Hook[]): void {
    this.hooks.push(...hooks);
  }

  private runners(event: HookEvent, name: unknown): Runner[] {
    const builtin = this.hooks
      .filter((h) => h.event === event && matches(h.matcher, name))
      .map((h): Runner => async (input) => ({ result: await h.run(input) }));
    const commands = (this.commandHooks[event] ?? [])
      .filter((h) => matches(h.matcher, name))
      .map((h) => runCommand(h, event, this.cwd));
    return [...builtin, ...commands];
  }

  async pre(input: PreToolUseInput, signal?: AbortSignal): Promise<PreResult> {
    const merged: PreResult = {};
    const errors: string[] = [];
    let current = input;
    for (const run of this.runners("PreToolUse", input.tool)) {
      const { result: r, error } = await run(current, signal);
      if (error) {
        errors.push(error);
        this.onError?.(error);
      }
      if (signal?.aborted) {
        merged.decision = "deny";
        merged.reason = "The scientist stopped the turn before the hooks ended.";
        break;
      }
      if (!r) continue;
      if (r.updatedArgs) {
        current = { ...current, args: r.updatedArgs };
        merged.updatedArgs = r.updatedArgs;
      }
      if (r.deviations?.length) merged.deviations = [...(merged.deviations ?? []), ...r.deviations];
      if (r.applied) merged.applied = { ...merged.applied, ...r.applied };
      merged.additionalContext = join(merged.additionalContext, r.additionalContext);
      if (r.decision && STOPPING.has(r.decision)) {
        merged.decision = r.decision;
        if (r.reason) merged.reason = r.reason;
        if (r.waitingOn) merged.waitingOn = r.waitingOn;
        break;
      }
      if (r.decision === "allow" && !merged.decision) {
        merged.decision = "allow";
        if (r.reason) merged.reason = r.reason;
      }
    }
    if (errors.length) merged.errors = errors;
    if (merged.additionalContext === undefined) delete merged.additionalContext;
    return merged;
  }

  async post(input: PostToolUseInput): Promise<PostToolUseResult> {
    const merged: PostToolUseResult = {};
    for (const run of this.runners("PostToolUse", input.tool)) {
      const r = await this.call(run, input);
      if (!r) continue;
      merged.additionalContext = join(merged.additionalContext, r.additionalContext);
      if (r.findings?.length) merged.findings = [...(merged.findings ?? []), ...r.findings];
    }
    return merged;
  }

  async preAnswer(input: PreAnswerInput): Promise<PreAnswerResult> {
    const merged: PreAnswerResult = {};
    let current = input;
    for (const run of this.runners("PreAnswer", undefined)) {
      const r = await this.call(run, current);
      if (!r) continue;
      if (typeof r.answer === "string") {
        current = { ...current, answer: r.answer };
        merged.answer = r.answer;
      }
      merged.additionalContext = join(merged.additionalContext, r.additionalContext);
      if (r.findings?.length) merged.findings = [...(merged.findings ?? []), ...r.findings];
    }
    return merged;
  }

  // Like Claude Code: a Stop hook that gives decision "block" keeps the agent working, with the reason as the next note.
  async stop(input: Record<string, unknown>, signal?: AbortSignal): Promise<string | undefined> {
    for (const run of this.runners("Stop", undefined)) {
      if (signal?.aborted) return undefined;
      const r = await this.call(run, { ...input, event: "Stop" }, signal);
      if (r?.decision === "block") return String(r.reason || "A Stop hook asks the agent to continue.");
    }
    return undefined;
  }

  async event(name: HookEvent, input: Record<string, unknown>): Promise<void> {
    for (const run of this.runners(name, input.tool)) {
      try {
        await this.call(run, { ...input, event: name });
      } catch {}
    }
  }
}
