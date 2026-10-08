import Anthropic from "@anthropic-ai/sdk";
import type { Message, ModelInfo, Part, Provider, StepRequest, StepResult, ToolSchema, Usage } from "../core/types.ts";
import { ProviderError } from "../core/types.ts";
import { claudeKey, claudeWorkspace, keyVersion, WORKSPACE_HELP } from "../core/credentials.ts";
import { ImageBudget } from "./images.ts";

export const DEFAULT_CLAUDE_MODEL = "claude-opus-5-5";
const MAX_TOKENS = 64000;
const FALLBACK_BETA = "server-side-fallback-2026-07-01";
const NO_CREDENTIALS = "No valid Claude credentials. Type /key to add your API key, set ANTHROPIC_API_KEY, or run `ant auth login`.";

export interface ClaudeOpts {
  apiKey?: string;
  effort?: string;
  client?: any;
}

function mapError(e: unknown, model: string): unknown {
  if (e instanceof Anthropic.APIUserAbortError) return e;
  if (e instanceof Anthropic.AuthenticationError) return new ProviderError(`${NO_CREDENTIALS} The API said: ${e.message}`);
  if (e instanceof Anthropic.PermissionDeniedError) return new ProviderError(`This key cannot use ${model}: ${e.message}`);
  if (e instanceof Anthropic.NotFoundError) return new ProviderError(`Unknown Claude model ${model}: ${e.message}`);
  if (e instanceof Anthropic.RateLimitError) return new ProviderError("Claude rate limit reached. Wait a moment and retry.");
  if (e instanceof Anthropic.BadRequestError && /anthropic-workspace-id/.test(e.message)) return new ProviderError(WORKSPACE_HELP);
  if (e instanceof Anthropic.BadRequestError) return new ProviderError(`Claude rejected the request: ${e.message}`);
  if (e instanceof Anthropic.APIConnectionError) return new ProviderError("Cannot reach the Claude API. Check the network.");
  if (e instanceof Anthropic.APIError && typeof e.status === "number" && e.status >= 500)
    return new ProviderError(`The Claude API had a server error (${e.status}). Retry in a moment.`);
  if (e instanceof Error && /authentication|api key|auth token|credentials/i.test(e.message)) return new ProviderError(`${NO_CREDENTIALS} Detail: ${e.message}`);
  return e;
}

function makeClient(key?: string): any {
  const ws = claudeWorkspace();
  const headers = ws ? { defaultHeaders: { "anthropic-workspace-id": ws } } : {};
  return key ? new Anthropic({ apiKey: key, ...headers }) : new Anthropic(headers);
}

function toolResultContent(text: string, images: { media: string; data: string }[], note: string): unknown {
  const body = (text || "(no output)") + (note ? `\n[${note}]` : "");
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
  private fallbacks = true;

  constructor(readonly model: string, opts: ClaudeOpts = {}) {
    this.info = { provider: "claude", model, contextWindow: 1_000_000, vision: true, small: false };
    this.effort = opts.effort || (model === "claude-haiku-5-5" ? "medium" : "high");
    this.fixedClient = opts.client;
    this.apiKey = opts.apiKey;
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
          if (p.type === "text" && p.text) content.push({ type: "text", text: p.text });
          else if (p.type === "tool_call") content.push({ type: "tool_use", id: p.id, name: p.name, input: p.args && typeof p.args === "object" ? p.args : {} });
        }
        if (!content.length) content.push({ type: "text", text: "(no reply)" });
        out.push({ role: "assistant", content });
        continue;
      }
      const results: unknown[] = [];
      const rest: unknown[] = [];
      for (const p of m.parts) {
        if (p.type === "tool_result") {
          const { images, note } = budget.pick(p.images ?? []);
          const block: Record<string, unknown> = { type: "tool_result", tool_use_id: p.callId, content: toolResultContent(p.text, images, note) };
          if (p.isError) block.is_error = true;
          results.push(block);
        } else if (p.type === "text") {
          if (p.text) rest.push({ type: "text", text: p.text });
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
    if (list.length) list[list.length - 1].cache_control = { type: "ephemeral" };
    return list;
  }

  private params(system: string, messages: Message[], tools: ToolSchema[]): Record<string, unknown> {
    const p: Record<string, unknown> = {
      model: this.model,
      max_tokens: MAX_TOKENS,
      system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
      messages: this.toNative(messages),
      thinking: { type: "adaptive", display: "summarized" },
      output_config: { effort: this.effort },
    };
    if (tools.length) p.tools = this.toolsNative(tools);
    return p;
  }

  async step(req: StepRequest): Promise<StepResult> {
    const base = this.params(req.system, req.messages, req.tools);
    const run = async (): Promise<any> => {
      const useFallback = this.fallbacks;
      const body = useFallback ? { ...base, betas: [FALLBACK_BETA], fallbacks: "default" } : base;
      const api = useFallback ? this.client.beta.messages : this.client.messages;
      const stream = api.stream(body, req.signal ? { signal: req.signal } : undefined);
      stream.on("text", (d: string) => req.onDelta?.({ type: "text", text: d }));
      stream.on("thinking", (d: string) => req.onDelta?.({ type: "thinking", text: d }));
      return stream.finalMessage();
    };
    let msg: any;
    try {
      try {
        msg = await run();
      } catch (e) {
        if (this.fallbacks && e instanceof Anthropic.BadRequestError && /fallback|betas?\b|server-side/i.test(e.message)) {
          this.fallbacks = false;
          msg = await run();
        } else throw e;
      }
    } catch (e) {
      throw mapError(e, this.model);
    }
    return this.fromNative(msg);
  }

  private fromNative(msg: any): StepResult {
    const stop: string = msg.stop_reason ?? "end_turn";
    let content: any[] = msg.content ?? [];
    if (stop === "refusal" || stop === "max_tokens") content = content.filter((b) => b.type !== "tool_use");
    const parts: Part[] = [];
    for (const b of content) {
      if (b.type === "text" && b.text) parts.push({ type: "text", text: b.text });
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
    const u = msg.usage ?? {};
    const usage: Usage = { inputTokens: u.input_tokens ?? 0, outputTokens: u.output_tokens ?? 0 };
    if (u.cache_read_input_tokens != null) usage.cacheRead = u.cache_read_input_tokens;
    if (u.cache_creation_input_tokens != null) usage.cacheWrite = u.cache_creation_input_tokens;
    const stopReason: StepResult["stopReason"] =
      stop === "tool_use" ? "tool_use" : stop === "refusal" ? "refusal" : stop === "max_tokens" || stop === "model_context_window_exceeded" ? "max_tokens" : "end";
    const result: StepResult = {
      message: { role: "assistant", parts, provider: "claude", model: this.model, raw: content },
      usage,
      stopReason,
    };
    if (note) result.note = note;
    return result;
  }

  async complete(system: string, text: string, signal?: AbortSignal): Promise<string> {
    const params = {
      model: this.model,
      max_tokens: 16000,
      system: [{ type: "text", text: system }],
      messages: [{ role: "user", content: text }],
      thinking: { type: "adaptive", display: "summarized" },
      output_config: { effort: this.effort },
    };
    try {
      const msg = await this.client.messages.create(params, signal ? { signal } : undefined);
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

export async function checkClaudeKey(key: string, model = DEFAULT_CLAUDE_MODEL): Promise<{ ok: boolean; text: string }> {
  try {
    await makeClient(key).models.retrieve(model);
    return { ok: true, text: `The key works. It can use ${model}.` };
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) return { ok: false, text: "The API rejected this key (HTTP 401). Check it and try again." };
    if (e instanceof Anthropic.NotFoundError || e instanceof Anthropic.PermissionDeniedError) return { ok: true, text: `The key works, but it cannot use ${model}.` };
    if (e instanceof Anthropic.BadRequestError && /anthropic-workspace-id/.test(e.message)) return { ok: false, text: WORKSPACE_HELP };
    if (e instanceof Anthropic.APIConnectionError) return { ok: true, text: "Cannot reach the Claude API to check the key. It is saved; the first request will test it." };
    return { ok: true, text: `Cannot check the key: ${(e as Error).message}. It is saved; the first request will test it.` };
  }
}
