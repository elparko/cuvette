import type { Message, ModelInfo, Part, Provider, StepRequest, StepResult, Usage } from "../core/types.ts";
import { CONTEXT_OVERFLOW, CutReplyError, ProviderError } from "../core/types.ts";
import { estimateTokens } from "../core/compaction.ts";
import { ThinkSplitter, defang, extractTextToolCall, lastCallNumber, splitThink } from "./text.ts";
import { localUrl } from "../core/phi.ts";
import { hideKeys } from "../core/credentials.ts";
import { RETRIES, errorBody, longFetch, noRetry, idleSignal, timedOut, withRetry, type IdleSignal, type Sleep } from "./retry.ts";

const TIMEOUT_MS = 600_000;
const NO_STREAM = /cannot use tools with stream|stream(?:ing)? (?:is )?not supported|does not support stream/i;

export function keySafe(base: string): boolean {
  try {
    const u = new URL(base);
    return u.protocol === "https:" || (u.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(u.hostname));
  } catch {
    return false;
  }
}

const REASONING_MAX_TOKENS = 16000;

function reasoningEffort(effort: string): string {
  return ["minimal", "low", "medium", "high"].includes(effort) ? effort : "high";
}

export interface OpenAIOpts {
  numCtx?: number;
  sleep?: Sleep;
  retries?: number;
  effort?: string;
}

interface CallDraft {
  id: string;
  name: string;
  args: string;
  obj?: unknown;
}

interface Reply {
  content: string;
  text?: string;
  thinking: string;
  calls: CallDraft[];
  finish: string;
  usage?: any;
}

function partial(message: string): Error {
  return Object.assign(new Error(message), { partial: true });
}

export function parseArgs(c: CallDraft, cut: boolean): { args: unknown; parseError?: string } {
  if (c.obj !== undefined && !c.args.trim()) return { args: c.obj };
  const raw = c.args.trim();
  if (!raw) return { args: {} };
  try {
    let v: unknown = JSON.parse(raw);
    if (typeof v === "string" && /^\s*\{/.test(v)) v = JSON.parse(v);
    if (!v || typeof v !== "object" || Array.isArray(v)) return { args: {}, parseError: `Arguments must be one JSON object: ${raw.slice(0, 200)}` };
    return { args: v };
  } catch (e) {
    const why = cut ? "The output limit cut the arguments before their end" : `Arguments are not valid JSON (${(e as Error).message})`;
    return { args: {}, parseError: `${why}: ${raw.slice(0, 200)}` };
  }
}

export class OpenAIProvider implements Provider {
  info: ModelInfo;
  private base: string;
  private sleep?: Sleep;
  private retries: number;
  private stream = true;
  private usageOption = true;
  private noUsageNoted = false;
  private capKey: "max_tokens" | "max_completion_tokens";
  private capSwapped = false;
  private reasoning: boolean;
  private effortOk: boolean;
  private effortRefused = false;
  private effort?: string;

  constructor(baseUrl: string, readonly model: string, opts: OpenAIOpts = {}) {
    this.base = baseUrl.replace(/\/+$/, "");
    this.info = { provider: "openai", model, contextWindow: opts.numCtx ?? 32768, vision: false, small: true, local: localUrl(this.base) };
    this.sleep = opts.sleep;
    this.retries = opts.retries ?? RETRIES;
    this.reasoning = /^https:\/\/api\.openai\.com(?:[/:]|$)/i.test(this.base) && /^(o\d|gpt-5)/i.test(model);
    this.effortOk = this.reasoning && /^(o3|o4|gpt-5)/i.test(model) && !/-chat/i.test(model);
    this.capKey = this.reasoning ? "max_completion_tokens" : "max_tokens";
    this.effort = opts.effort;
  }

  toNative(system: string, messages: Message[]): unknown[] {
    const out: any[] = [{ role: "system", content: system }];
    for (const m of messages) {
      if (m.role === "assistant") {
        const text = defang(m.parts.filter((p) => p.type === "text").map((p) => (p as any).text).join("\n\n"));
        const calls = m.parts.filter((p) => p.type === "tool_call") as Extract<Part, { type: "tool_call" }>[];
        const msg: any = { role: "assistant", content: text || (calls.length ? null : "(no reply)") };
        if (calls.length)
          msg.tool_calls = calls.map((c) => ({ id: c.id, type: "function", function: { name: c.name, arguments: defang(JSON.stringify(c.args ?? {})) } }));
        out.push(msg);
        continue;
      }
      const texts: string[] = [];
      for (const p of m.parts) {
        if (p.type === "tool_result") {
          const body = (p.text || "(no output)") + (p.images?.length ? "\n(image not shown to this model)" : "");
          out.push({ role: "tool", tool_call_id: p.callId, content: defang(p.isError ? errorBody(body) : body) });
        } else if (p.type === "text") texts.push(defang(p.text));
        else if (p.type === "image") texts.push("(image not shown to this model)");
      }
      if (texts.length) out.push({ role: "user", content: texts.join("\n\n") });
    }
    return out;
  }

  private async attempt(body: Record<string, unknown>, idle: IdleSignal): Promise<Response> {
    idle.touch();
    const headers: Record<string, string> = { "content-type": "application/json" };
    if (process.env.OPENAI_API_KEY && keySafe(this.base)) headers.authorization = `Bearer ${process.env.OPENAI_API_KEY}`;
    const res = await longFetch(`${this.base}/chat/completions`, { method: "POST", headers, body: JSON.stringify(body), signal: idle.signal });
    if (res.status === 429 || res.status === 408 || res.status === 409 || res.status >= 500) {
      const txt = hideKeys(await res.text()).text;
      if (body.stream && NO_STREAM.test(txt)) return new Response(txt, { status: 400 });
      throw Object.assign(new Error(`Model server error ${res.status}: ${txt.slice(0, 300)}`), { status: res.status, headers: res.headers });
    }
    return res;
  }

  private async httpError(res: Response, body: Record<string, unknown>): Promise<ProviderError | "again"> {
    const txt = hideKeys(await res.text()).text;
    let msg: unknown = txt;
    try {
      const j = JSON.parse(txt);
      msg = j.error?.message ?? j.error ?? j.detail ?? txt;
    } catch {}
    const text = typeof msg === "string" ? msg : JSON.stringify(msg);
    if (res.status === 401 || res.status === 403) return new ProviderError(process.env.OPENAI_API_KEY && !keySafe(this.base) ? "The model server rejected the request. Cuvette did not send OPENAI_API_KEY, because the address uses plain http and is not on this computer. Use https." : "The model server rejected the credentials. Set OPENAI_API_KEY.");
    if (res.status === 400 && body.stream_options && /stream_options|include_usage/i.test(text)) {
      this.usageOption = false;
      return "again";
    }
    const sent = "max_tokens" in body ? "max_tokens" : "max_completion_tokens" in body ? "max_completion_tokens" : undefined;
    if (res.status === 400 && sent && !this.capSwapped && /unsupported parameter|unknown (?:parameter|field|argument)|unrecognized (?:request )?argument|use ['"]?max_(?:completion_)?tokens['"]? instead/i.test(text) && /max_tokens|max_completion_tokens/i.test(text)) {
      this.capSwapped = true;
      this.capKey = sent === "max_tokens" ? "max_completion_tokens" : "max_tokens";
      return "again";
    }
    if (res.status === 400 && "reasoning_effort" in body && !this.effortRefused && /reasoning_effort/i.test(text)) {
      this.effortRefused = true;
      return "again";
    }
    if (res.status === 400 && body.stream && NO_STREAM.test(text)) {
      this.stream = false;
      return "again";
    }
    return new ProviderError(`Model server error ${res.status}: ${text.slice(0, 300)}`, false, res.status === 413 || (res.status === 400 && CONTEXT_OVERFLOW.test(text)));
  }

  private failure(e: unknown, signal: AbortSignal): unknown {
    if (e instanceof ProviderError) return e;
    if (timedOut(signal)) return new ProviderError(`The model server sent no data for ${TIMEOUT_MS / 1000} s.`, true);
    if (signal.aborted) return e;
    if (typeof (e as any).status === "number") return new ProviderError((e as Error).message, !noRetry(e));
    if ((e as any).partial) return new ProviderError(`The model server stopped during the reply: ${(e as Error).message}.`, true);
    return new ProviderError(`Cannot reach the model server at ${this.base.replace(/\/\/[^@/]*@/, "//")}. Check that it is running.`, true);
  }

  private body(messages: unknown[], tools: StepRequest["tools"], maxTokens?: number): Record<string, unknown> {
    const body: Record<string, unknown> = { model: this.model, messages, stream: this.stream };
    if (maxTokens) body[this.capKey] = maxTokens;
    if (this.stream && this.usageOption) body.stream_options = { include_usage: true };
    if (tools.length) body.tools = tools.map((t) => ({ type: "function", function: { name: t.name, description: t.description, parameters: t.inputSchema } }));
    return body;
  }

  // One try reads the whole reply, so that a reply that stops early is tried again.
  private async exchange(make: () => Record<string, unknown>, user: AbortSignal | undefined, onRetry: StepRequest["onRetry"], onDelta: StepRequest["onDelta"], budget?: StepRequest["retryBudget"]): Promise<Reply> {
    const idle = idleSignal(TIMEOUT_MS, user);
    try {
      for (let again = 0; ; again++) {
        const body = make();
        const res = await this.retry(async () => {
          const r = await this.attempt(body, idle);
          return r.ok ? { r, reply: await this.read(r, idle, onDelta) } : { r };
        }, idle.signal, onRetry, budget);
        if (res.reply) return res.reply;
        const err = await this.httpError(res.r, body);
        if (err !== "again") throw err;
        if (again > 3) throw new ProviderError("The model server refused the request.");
      }
    } catch (e) {
      throw this.failure(e, idle.signal);
    } finally {
      idle.stop();
    }
  }

  private retry<T>(fn: () => Promise<T>, signal?: AbortSignal, onRetry?: StepRequest["onRetry"], budget?: StepRequest["retryBudget"]): Promise<T> {
    return withRetry(fn, { retries: this.retries, sleep: this.sleep, signal, onRetry, budget });
  }

  private async read(res: Response, idle: IdleSignal, onDelta: StepRequest["onDelta"], budget?: StepRequest["retryBudget"]): Promise<Reply> {
    const reader = res.body?.getReader();
    if (!reader) throw partial("the reply has no body");
    const dec = new TextDecoder();
    let buf = "";
    let sse = /event-stream/i.test(res.headers.get("content-type") ?? "");
    let decided = sse;
    const reply: Reply = { content: "", thinking: "", calls: [], finish: "" };
    const splitter = new ThinkSplitter((kind, s) => onDelta?.({ type: kind, text: s }));
    const slots = new Map<string, CallDraft>();
    let ended = false;
    const chunk = (j: any) => {
      if (!j || typeof j !== "object") return;
      if (j.error) {
        const msg = hideKeys(typeof j.error === "string" ? j.error : String(j.error.message ?? JSON.stringify(j.error))).text;
        throw new ProviderError(`Model server error: ${String(msg).slice(0, 300)}`, false, CONTEXT_OVERFLOW.test(msg));
      }
      if (j.usage) reply.usage = j.usage;
      const ch = j.choices?.[0];
      if (!ch) return;
      if (ch.finish_reason) reply.finish = ch.finish_reason;
      const d = ch.delta ?? ch.message ?? {};
      const think = d.reasoning_content ?? d.reasoning;
      if (typeof think === "string" && think) {
        reply.thinking += think;
        if (sse) onDelta?.({ type: "thinking", text: think });
      }
      if (typeof d.content === "string" && d.content) {
        reply.content += d.content;
        if (sse) splitter.push(d.content);
      }
      for (const tc of Array.isArray(d.tool_calls) ? d.tool_calls : []) {
        if (!tc || typeof tc !== "object") continue;
        const key = !sse ? "" : typeof tc.index === "number" ? `i${tc.index}` : tc.id ? `id${tc.id}` : "last";
        let c = !key ? undefined : key === "last" ? reply.calls.at(-1) : slots.get(key);
        if (!c || (tc.id && c.id && tc.id !== c.id)) {
          c = { id: "", name: "", args: "" };
          reply.calls.push(c);
          if (key && key !== "last") slots.set(key, c);
        }
        if (tc.id && !c.id) c.id = tc.id;
        if (tc.function?.name && !c.name) c.name = tc.function.name;
        const a = tc.function?.arguments;
        if (typeof a === "string") c.args += a;
        else if (a && typeof a === "object") c.obj = a;
      }
    };
    const line = (raw: string) => {
      const s = raw.replace(/\r$/, "");
      if (!s.startsWith("data:")) return;
      const payload = s.slice(5).trim();
      if (payload === "[DONE]") {
        ended = true;
        return;
      }
      let j: unknown;
      try {
        j = JSON.parse(payload);
      } catch {
        return;
      }
      chunk(j);
    };
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        idle.touch();
        buf += dec.decode(value, { stream: true });
        if (!decided && buf.trimStart()) {
          sse = /^(data:|event:|:)/.test(buf.trimStart());
          decided = true;
        }
        if (!sse) continue;
        let nl: number;
        while ((nl = buf.indexOf("\n")) >= 0) {
          line(buf.slice(0, nl));
          buf = buf.slice(nl + 1);
        }
      }
    } catch (e) {
      await reader.cancel().catch(() => {});
      throw e;
    }
    buf += dec.decode();
    if (sse) {
      if (buf.trim()) line(buf);
      splitter.end();
      if (!ended && !reply.finish) throw partial("the reply ended without a finish reason");
      reply.text = splitter.text;
      reply.thinking = [reply.thinking.trim(), splitter.thinking.trim()].filter(Boolean).join("\n\n");
      return reply;
    }
    let j: any;
    try {
      j = JSON.parse(buf);
    } catch (e) {
      throw partial(`the reply is not valid JSON (${(e as Error).message})`);
    }
    chunk(j);
    if (!j?.choices?.length) throw new ProviderError("The model server returned no choices.");
    const split = splitThink(reply.content);
    reply.text = split.text;
    reply.thinking = [reply.thinking.trim(), split.thinking].filter(Boolean).join("\n\n");
    if (reply.thinking) onDelta?.({ type: "thinking", text: reply.thinking });
    return reply;
  }

  async step(input: StepRequest): Promise<StepResult> {
    const req = input.noToolCalls ? { ...input, tools: [], knownTools: [] } : input;
    const native = this.toNative(req.system, req.messages);
    let streamed = "";
    const reply = await this.exchange(() => this.body(native, req.tools), req.signal, req.onRetry, (d) => {
      if (d.type === "text") streamed += d.text;
      req.onDelta?.(d);
    }, req.retryBudget);
    let n = lastCallNumber(req.messages);
    const used = new Set(req.messages.flatMap((m) => m.parts.flatMap((p) => (p.type === "tool_call" ? [p.id] : []))));
    const freshId = (id: string) => {
      let out = id;
      while (!out || used.has(out)) out = `call_${++n}`;
      used.add(out);
      return out;
    };
    const parts: Part[] = [];
    let note: string | undefined;
    if (reply.thinking) parts.push({ type: "thinking", text: reply.thinking });
    const cut = reply.finish === "length";
    const calls: Part[] = reply.calls.map((c) => {
      const { args, parseError } = parseArgs(c, cut);
      return { type: "tool_call", id: freshId(c.id), name: c.name, args, ...(parseError ? { parseError } : {}) };
    });
    let said = (reply.text ?? "").trim();
    if (!calls.length && said) {
      const hit = extractTextToolCall(said, [...req.tools.map((t) => t.name), ...(req.knownTools ?? [])]);
      if (hit) {
        calls.push({ type: "tool_call", id: freshId(""), name: hit.name, args: hit.args });
        said = hit.rest;
        note = "converted a tool call written as text";
      }
    }
    if (said) {
      parts.push({ type: "text", text: said });
      if (!streamed) req.onDelta?.({ type: "text", text: said });
    }
    parts.push(...calls);
    const result: StepResult = {
      message: { role: "assistant", parts, provider: "openai", model: this.model, raw: { content: reply.content, tool_calls: reply.calls } },
      usage: this.usage(reply, req),
      stopReason: calls.length ? "tool_use" : cut ? "max_tokens" : "end",
    };
    if (!reply.usage && !this.noUsageNoted) {
      this.noUsageNoted = true;
      note = [note, "the server sent no token counts; the counts are estimates"].filter(Boolean).join("; ");
    }
    if (note) result.note = note;
    return result;
  }

  private usage(reply: Reply, req: StepRequest): Usage {
    const u = reply.usage;
    if (!u) return { inputTokens: estimateTokens(req.messages, req.system, req.tools), outputTokens: Math.ceil((reply.content.length + reply.thinking.length + reply.calls.reduce((s, c) => s + c.args.length, 0)) / 3.5) };
    const prompt = Number(u.prompt_tokens) || 0;
    const cached = Math.min(prompt, Number(u.prompt_tokens_details?.cached_tokens) || 0);
    const out: Usage = { inputTokens: prompt - cached, outputTokens: Number(u.completion_tokens) || 0 };
    if (cached) out.cacheRead = cached;
    return out;
  }

  async complete(system: string, text: string, signal?: AbortSignal, opts?: { effort?: string; failIfCut?: boolean; maxTokens?: number }): Promise<string> {
    const native = [{ role: "system", content: system }, { role: "user", content: text }];
    const cap = this.reasoning && opts?.maxTokens ? Math.max(opts.maxTokens, REASONING_MAX_TOKENS) : opts?.maxTokens;
    const effort = opts?.effort ?? this.effort;
    const make = () => {
      const body = this.body(native, [], cap);
      if (this.effortOk && !this.effortRefused && effort && effort !== "auto") body.reasoning_effort = reasoningEffort(effort);
      return body;
    };
    const reply = await this.exchange(make, signal, undefined, undefined);
    if (opts?.failIfCut && reply.finish === "length") throw new CutReplyError("The reply hit the output limit and was cut short.", (reply.text ?? splitThink(reply.content).text).trim());
    return (reply.text ?? splitThink(reply.content).text).trim();
  }
}
