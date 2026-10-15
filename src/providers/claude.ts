import Anthropic from "@anthropic-ai/sdk";
import { createHash } from "node:crypto";
import type { Message, ModelInfo, Part, Provider, StepRequest, StepResult, ToolSchema, Usage } from "../core/types.ts";
import { CONTEXT_OVERFLOW, ProviderError } from "../core/types.ts";
import { claudeKey, claudeWorkspace, keyVersion, WORKSPACE_HELP } from "../core/credentials.ts";
import { keyApiProblem } from "../core/keyhelp.ts";
import { budgetProblem, recordSpend } from "../core/spend.ts";
import { ImageBudget, prepareImages } from "./images.ts";
import { RETRIES, noRetry, retryAfterMs, retryReason, withRetry, type Sleep } from "./retry.ts";

export const DEFAULT_CLAUDE_MODEL = "claude-opus-5-5";
const MAX_TOKENS = 64000;
const FALLBACK_BETA = "server-side-fallback-2026-07-01";
const NO_CREDENTIALS = "No valid Claude credentials. Type /key to add your API key, set ANTHROPIC_API_KEY, or run `ant auth login`.";

export interface ClaudeOpts {
  apiKey?: string;
  effort?: string;
  showThinking?: boolean;
  client?: any;
  sleep?: Sleep;
  retries?: number;
  cache?: "off" | "5m" | "1h";
}

function mapError(e: unknown, model: string): unknown {
  if (e instanceof Anthropic.APIUserAbortError) return e;
  if (e instanceof Anthropic.AuthenticationError) return new ProviderError(`${NO_CREDENTIALS} The API said: ${e.message}`);
  if (e instanceof Anthropic.APIError && /credit balance/i.test(e.message)) return new ProviderError(keyApiProblem(e.status, e.message));
  if (e instanceof Anthropic.PermissionDeniedError) return new ProviderError(`This key cannot use ${model}: ${e.message} ${keyApiProblem(403)}`);
  if (e instanceof Anthropic.NotFoundError) return new ProviderError(`Unknown Claude model ${model}: ${e.message}`);
  if (e instanceof Anthropic.RateLimitError) {
    const wait = retryAfterMs(e);
    return new ProviderError(`The Claude API refused the request because of a rate limit (HTTP 429).${wait ? ` It asks for a wait of ${Math.ceil(wait / 1000)} s.` : ""}`, !noRetry(e));
  }
  if (e instanceof Anthropic.APIError && e.status === 413) return new ProviderError(`The request is too large for the Claude API: ${e.message}`, false, true);
  if (e instanceof Anthropic.BadRequestError && /anthropic-workspace-id/.test(e.message)) return new ProviderError(WORKSPACE_HELP);
  if (e instanceof Anthropic.BadRequestError) return new ProviderError(`Claude rejected the request: ${e.message}`, false, CONTEXT_OVERFLOW.test(e.message));
  if (e instanceof Anthropic.APIConnectionError) return new ProviderError("Cannot reach the Claude API. Check the network.", true);
  if (e instanceof Anthropic.APIError && typeof e.status === "number" && e.status >= 500)
    return new ProviderError(`The Claude API had a server error (${e.status}).`, !noRetry(e));
  if ((e as any)?.partial === true) return new ProviderError("The Claude API stopped the reply before the end.", true);
  if (retryReason(e) === "network error") return new ProviderError("Cannot reach the Claude API. Check the network.", true);
  if (retryReason(e)) return new ProviderError(`The Claude API had a server error: ${(e as Error).message}`, true);
  if (e instanceof Error && /authentication|api key|auth token|credentials/i.test(e.message)) return new ProviderError(`${NO_CREDENTIALS} Detail: ${e.message}`);
  return e;
}

// Other servers can make call IDs with characters that the Claude API refuses, for example "functions.read_file:0". A switch to Claude must still work.
function toolId(id: string): string {
  return /^[a-zA-Z0-9_-]{1,64}$/.test(id) ? id : `id_${createHash("sha256").update(id).digest("hex").slice(0, 24)}`;
}

function toolName(name: string): string {
  return name.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 64) || "unknown_tool";
}

function cacheLast(messages: any[], mark?: Record<string, unknown>): any[] {
  const last = messages.at(-1);
  if (!mark) return messages;
  if (!last || last.role !== "user") return messages;
  const content = typeof last.content === "string" ? [{ type: "text", text: last.content }] : [...last.content];
  const end = content.length - 1;
  if (end < 0) return messages;
  content[end] = { ...content[end], cache_control: mark };
  return [...messages.slice(0, -1), { ...last, content }];
}

function makeClient(key?: string): any {
  const ws = claudeWorkspace();
  const headers = ws ? { defaultHeaders: { "anthropic-workspace-id": ws } } : {};
  return key ? new Anthropic({ apiKey: key, maxRetries: 0, ...headers }) : new Anthropic({ maxRetries: 0, ...headers });
}

function usageOf(u: any): Usage {
  const usage: Usage = { inputTokens: u.input_tokens ?? 0, outputTokens: u.output_tokens ?? 0 };
  if (u.cache_read_input_tokens != null) usage.cacheRead = u.cache_read_input_tokens;
  if (u.cache_creation_input_tokens != null) usage.cacheWrite = u.cache_creation_input_tokens;
  return usage;
}

function toolResultContent(text: string, images: { media: string; data: string }[], note: string): unknown {
  const body = (text.trim() ? text : "(no output)") + (note ? `\n[${note}]` : "");
  if (!images.length) return body;
  return [
    { type: "text", text: body },
    ...images.map((i) => ({ type: "image", source: { type: "base64", media_type: i.media, data: i.data } })),
  ];
}

export class ClaudeProvider implements Provider {
  info: ModelInfo;
  private fixedClient: any;
  private apiKey?: string;
  private made?: { client: any; version: number };
  private effort: string;
  private display: "summarized" | "omitted";
  private fallbacks = true;
  private sleep?: Sleep;
  private retries: number;
  private mark?: Record<string, unknown>;

  constructor(readonly model: string, opts: ClaudeOpts = {}) {
    this.info = { provider: "claude", model, contextWindow: 1_000_000, vision: true, small: false, local: false };
    this.effort = opts.effort && opts.effort !== "auto" ? opts.effort : model === "claude-haiku-5-5" ? "medium" : "high";
    this.display = opts.showThinking === false ? "omitted" : "summarized";
    this.fixedClient = opts.client;
    this.apiKey = opts.apiKey;
    this.sleep = opts.sleep;
    this.retries = opts.retries ?? RETRIES;
    this.mark = opts.cache === "off" ? undefined : opts.cache === "1h" ? { type: "ephemeral", ttl: "1h" } : { type: "ephemeral" };
  }

  private retry<T>(fn: () => Promise<T>, signal?: AbortSignal, onRetry?: StepRequest["onRetry"], budget?: StepRequest["retryBudget"]): Promise<T> {
    return withRetry(fn, { retries: this.retries, sleep: this.sleep, signal, onRetry, budget });
  }

  private get client(): any {
    if (this.fixedClient) return this.fixedClient;
    if (!this.made || this.made.version !== keyVersion()) {
      const key = this.apiKey ?? claudeKey().key;
      this.made = { client: makeClient(key), version: keyVersion() };
    }
    return this.made.client;
  }

  toNative(messages: Message[]): unknown[] {
    const budget = new ImageBudget();
    const out: unknown[] = [];
    for (const m of messages) {
      if (m.role === "assistant") {
        if (m.raw && m.provider === "claude" && m.model === this.model) {
          out.push({ role: "assistant", content: m.raw });
          continue;
        }
        const content: unknown[] = [];
        for (const p of m.parts) {
          if (p.type === "text" && p.text.trim()) content.push({ type: "text", text: p.text });
          else if (p.type === "tool_call") content.push({ type: "tool_use", id: toolId(p.id), name: toolName(p.name), input: p.args && typeof p.args === "object" ? p.args : {} });
        }
        if (!content.length) content.push({ type: "text", text: "(no reply)" });
        out.push({ role: "assistant", content });
        continue;
      }
      const results: unknown[] = [];
      const rest: unknown[] = [];
      for (const p of m.parts) {
        if (p.type === "tool_result") {
          const { images, note } = p.isError ? { images: [], note: p.images?.length ? `${p.images.length} image(s) left out of an error result` : "" } : budget.pick(p.images ?? []);
          const block: Record<string, unknown> = { type: "tool_result", tool_use_id: toolId(p.callId), content: toolResultContent(p.text, images, note) };
          if (p.isError) block.is_error = true;
          results.push(block);
        } else if (p.type === "text") {
          if (p.text.trim()) rest.push({ type: "text", text: p.text });
        } else if (p.type === "image") {
          const { images, note } = budget.pick([p.path]);
          for (const i of images) rest.push({ type: "image", source: { type: "base64", media_type: i.media, data: i.data } });
          if (note) rest.push({ type: "text", text: `[${note}]` });
        }
      }
      const content = [...results, ...rest];
      if (!content.length) content.push({ type: "text", text: "(empty)" });
      out.push({ role: "user", content });
    }
    return out;
  }

  private toolsNative(tools: ToolSchema[]): unknown[] {
    const list: any[] = tools.map((t) => ({ name: t.name, description: t.description, input_schema: t.inputSchema }));
    if (list.length && this.mark) list[list.length - 1].cache_control = this.mark;
    return list;
  }

  private params(system: string, messages: Message[], tools: ToolSchema[]): Record<string, unknown> {
    const p: Record<string, unknown> = {
      model: this.model,
      max_tokens: MAX_TOKENS,
      system: [{ type: "text", text: system, ...(this.mark ? { cache_control: this.mark } : {}) }],
      messages: cacheLast(this.toNative(messages), this.mark),
      thinking: { type: "adaptive", display: this.display },
      output_config: { effort: this.effort },
    };
    if (tools.length) p.tools = this.toolsNative(tools);
    return p;
  }

  async step(req: StepRequest): Promise<StepResult> {
    const over = budgetProblem();
    if (over) throw new ProviderError(over);
    await prepareImages(req.messages, req.signal);
    const base = this.params(req.system, req.messages, req.tools);
    if (req.noToolCalls && req.tools.length) base.tool_choice = { type: "none" };
    let live: any;
    const run = async (): Promise<any> => {
      const useFallback = this.fallbacks;
      const body = useFallback ? { ...base, betas: [FALLBACK_BETA], fallbacks: "default" } : base;
      const api = useFallback ? this.client.beta.messages : this.client.messages;
      const stream = api.stream(body, req.signal ? { signal: req.signal } : undefined);
      live = stream;
      stream.on("text", (d: string) => req.onDelta?.({ type: "text", text: d }));
      stream.on("thinking", (d: string) => req.onDelta?.({ type: "thinking", text: d }));
      try {
        return await stream.finalMessage();
      } catch (e) {
        if (e instanceof Anthropic.AnthropicError && !(e instanceof Anthropic.APIError) && /^(stream|request) ended without/.test(e.message)) throw Object.assign(new Error(e.message), { partial: true });
        throw e;
      }
    };
    let msg: any;
    try {
      try {
        msg = await this.retry(run, req.signal, req.onRetry, req.retryBudget);
      } catch (e) {
        if (this.fallbacks && e instanceof Anthropic.BadRequestError && /fallback|betas?\b|server-side/i.test(e.message)) {
          this.fallbacks = false;
          msg = await this.retry(run, req.signal, req.onRetry, req.retryBudget);
        } else throw e;
      }
    } catch (e) {
      // A stopped stream still costs the input tokens. The budget must count them.
      const started = req.signal?.aborted ? live?.currentMessage?.usage : undefined;
      if (started && !this.fixedClient) recordSpend(this.model, usageOf(started));
      throw mapError(e, this.model);
    }
    const out = this.fromNative(msg);
    if (!this.fixedClient) recordSpend(this.model, out.usage);
    if (msg.stop_reason === "model_context_window_exceeded") throw new ProviderError("The reply stopped because the context window of the model is full.", false, true);
    return out;
  }

  private fromNative(msg: any): StepResult {
    const stop: string = msg.stop_reason ?? "end_turn";
    let content: any[] = msg.content ?? [];
    if (stop === "refusal" || stop === "max_tokens") content = content.filter((b) => b.type !== "tool_use");
    content = content.filter((b) => !(b.type === "text" && !b.text?.trim())).map((b) => (b.type === "tool_use" && (b.input === undefined || b.input === null) ? { ...b, input: {} } : b));
    const parts: Part[] = [];
    for (const b of content) {
      if (b.type === "text" && b.text.trim()) parts.push({ type: "text", text: b.text });
      else if (b.type === "thinking" && b.thinking) parts.push({ type: "thinking", text: b.thinking });
      else if (b.type === "tool_use") parts.push({ type: "tool_call", id: b.id, name: b.name, args: b.input ?? {} });
    }
    if (!content.length) content = [{ type: "text", text: "(no reply)" }];
    let note: string | undefined;
    if (stop === "refusal") {
      const cat = msg.stop_details?.category;
      note = `The model declined this request${cat ? ` (category: ${cat})` : ""}.`;
      parts.push({ type: "text", text: note });
    } else if (stop === "max_tokens") note = "The reply hit the output limit and was cut short.";
    const usage = usageOf(msg.usage ?? {});
    const stopReason: StepResult["stopReason"] =
      stop === "tool_use" ? "tool_use" : stop === "refusal" ? "refusal" : stop === "max_tokens" ? "max_tokens" : "end";
    const result: StepResult = {
      message: { role: "assistant", parts, provider: "claude", model: this.model, raw: content },
      usage,
      stopReason,
    };
    if (note) result.note = note;
    return result;
  }

  async complete(system: string, text: string, signal?: AbortSignal, opts?: { effort?: string; maxTokens?: number }): Promise<string> {
    const params = {
      model: this.model,
      max_tokens: opts?.maxTokens ?? 16000,
      system: [{ type: "text", text: system }],
      messages: [{ role: "user", content: text }],
      thinking: { type: "adaptive", display: "omitted" },
      output_config: { effort: opts?.effort ?? this.effort },
    };
    try {
      const over = budgetProblem();
      if (over) throw new ProviderError(over);
      const msg: any = await this.retry(() => this.client.messages.create(params, signal ? { signal } : undefined), signal);
      const u = msg.usage ?? {};
      if (!this.fixedClient) recordSpend(this.model, { inputTokens: u.input_tokens ?? 0, outputTokens: u.output_tokens ?? 0, cacheRead: u.cache_read_input_tokens ?? 0, cacheWrite: u.cache_creation_input_tokens ?? 0 });
      return (msg.content as any[]).filter((b) => b.type === "text").map((b) => b.text).join("\n\n");
    } catch (e) {
      throw mapError(e, this.model);
    }
  }

  async countTokens(req: Omit<StepRequest, "signal" | "onDelta">): Promise<number> {
    const p = this.params(req.system, req.messages, req.tools);
    try {
      const r = await this.client.messages.countTokens({ model: this.model, system: p.system, messages: p.messages, tools: p.tools });
      return r.input_tokens;
    } catch (e) {
      throw mapError(e, this.model);
    }
  }
}

export async function checkClaudeKey(key: string, model = DEFAULT_CLAUDE_MODEL, timeoutMs = 15_000): Promise<{ ok: boolean; text: string }> {
  try {
    const m: unknown = await makeClient(key).models.retrieve(model, {}, { timeout: timeoutMs });
    if (typeof (m as { id?: unknown } | null)?.id !== "string") return { ok: true, text: "Cannot check the key: the server did not answer as the Claude API does. Make sure that ANTHROPIC_BASE_URL or the proxy is correct. The first request tests it." };
    return { ok: true, text: `The key works. It can use ${model}.` };
  } catch (e) {
    if (e instanceof Anthropic.APIError && /credit balance/i.test(e.message)) return { ok: false, text: keyApiProblem(e.status, e.message) };
    if (e instanceof Anthropic.AuthenticationError || e instanceof Anthropic.PermissionDeniedError) return { ok: false, text: keyApiProblem(e.status, e.message) };
    if (e instanceof Anthropic.NotFoundError) return { ok: true, text: `The key works, but it cannot use ${model}.` };
    if (e instanceof Anthropic.BadRequestError && /anthropic-workspace-id/.test(e.message)) return { ok: false, text: WORKSPACE_HELP };
    if (e instanceof Anthropic.APIConnectionError) return { ok: true, text: "Cannot reach the Claude API to check the key. The first request tests it." };
    if (e instanceof Anthropic.APIError && e.status) return { ok: true, text: `Cannot check the key: the Claude API gave HTTP ${e.status}. The first request tests it.` };
    return { ok: true, text: `Cannot check the key: ${(e as Error).message}. The first request tests it.` };
  }
}
