import { localUrl } from "../core/phi.ts";
import type { Message, ModelInfo, Part, Provider, StepRequest, StepResult } from "../core/types.ts";
import { CONTEXT_OVERFLOW, ProviderError } from "../core/types.ts";
import { ImageBudget, prepareImages } from "./images.ts";
import { ThinkSplitter, extractTextToolCall, lastCallNumber, promptedToolsText } from "./text.ts";
import { RETRIES, errorBody, idleSignal, timedOut, withRetry, type IdleSignal, type Sleep } from "./retry.ts";
import { estimateTokens } from "../core/compaction.ts";
import { parseArgs } from "./openai.ts";

const TIMEOUT_MS = 600_000;
const DEFAULT_NUM_CTX = 32768;
const MAX_OUTPUT_TOKENS = 8192;
const FULL_PROMPT = 0.9;

function ollamaError(text: string, status?: number): ProviderError {
  return new ProviderError(`Ollama ${status ? `error ${status}` : "error"}: ${text.slice(0, 300)}`, false, CONTEXT_OVERFLOW.test(text));
}

export function repeatStart(text: string, chunk = 300): number | null {
  if (text.length < chunk * 4) return null;
  const tail = text.slice(-chunk);
  const first = text.indexOf(tail);
  const second = text.indexOf(tail, first + 1);
  if (second < 0 || second >= text.length - chunk) return null;
  return second;
}

export function cutRepeat(text: string): string {
  const at = repeatStart(text);
  if (at === null) return text;
  const kept = text.slice(0, at);
  const para = kept.lastIndexOf("\n\n");
  return (para > kept.length / 2 ? kept.slice(0, para) : kept).trim();
}

export interface OllamaOpts {
  numCtx?: number;
  think?: boolean;
  promptedTools?: boolean;
  sleep?: Sleep;
  retries?: number;
}

export function ollamaHost(): string {
  const h = process.env.OLLAMA_HOST || "http://localhost:11434";
  const withScheme = /^https?:\/\//.test(h) ? h : `http://${h}`;
  return withScheme.replace(/\/+$/, "");
}

export function parseParamSize(s: string | undefined): number | null {
  const m = /([\d.]+)\s*([KMBT])/i.exec(s ?? "");
  if (!m) return null;
  const n = Number(m[1]);
  const unit = m[2].toUpperCase();
  return unit === "T" ? n * 1000 : unit === "B" ? n : unit === "M" ? n / 1000 : n / 1e6;
}

export interface OllamaShow {
  capabilities: string[];
  paramSize: number | null;
  contextLength: number | null;
}

export async function showModel(model: string, signal?: AbortSignal): Promise<OllamaShow> {
  const host = ollamaHost();
  let res: Response;
  try {
    res = await fetch(`${host}/api/show`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ model }),
      signal,
    });
  } catch {
    throw new ProviderError(`Cannot reach Ollama at ${host}. Start it with \`ollama serve\`.`);
  }
  if (res.status === 404) throw new ProviderError(`Ollama has no model ${model}. Run \`ollama pull ${model}\`.`);
  if (!res.ok) throw new ProviderError(`Ollama /api/show failed (${res.status}): ${(await res.text()).slice(0, 200)}`);
  const j: any = await res.json();
  let contextLength: number | null = null;
  for (const [k, v] of Object.entries(j.model_info ?? {}))
    if (k.endsWith(".context_length") && typeof v === "number") contextLength = v;
  return {
    capabilities: Array.isArray(j.capabilities) ? j.capabilities : [],
    paramSize: parseParamSize(j.details?.parameter_size),
    contextLength,
  };
}

export async function createOllama(model: string, opts: OllamaOpts = {}): Promise<OllamaProvider> {
  const show = await showModel(model);
  const promptedTools = opts.promptedTools ?? !show.capabilities.includes("tools");
  return new OllamaProvider(model, show, { ...opts, promptedTools });
}

export class OllamaProvider implements Provider {
  info: ModelInfo;
  private numCtx: number;
  private think: boolean;
  private thinkOk = true;
  private sleep?: Sleep;
  private retries: number;
  readonly promptedTools: boolean;

  constructor(readonly model: string, show: OllamaShow, opts: OllamaOpts = {}) {
    this.numCtx = opts.numCtx ?? Math.min(DEFAULT_NUM_CTX, show.contextLength ?? DEFAULT_NUM_CTX);
    this.think = opts.think ?? false;
    this.promptedTools = opts.promptedTools ?? false;
    this.sleep = opts.sleep;
    this.retries = opts.retries ?? RETRIES;
    this.info = {
      provider: "ollama",
      model,
      contextWindow: this.numCtx,
      vision: show.capabilities.includes("vision"),
      small: (show.paramSize ?? 0) < 30 || this.numCtx < 64000,
      local: localUrl(ollamaHost()),
    };
  }

  toNative(system: string, messages: Message[]): unknown[] {
    const budget = new ImageBudget();
    const out: any[] = [{ role: "system", content: system }];
    for (const m of messages) {
      if (m.role === "assistant") {
        const text = m.parts.filter((p) => p.type === "text").map((p) => (p as any).text).join("\n\n");
        const calls = m.parts.filter((p) => p.type === "tool_call") as Extract<Part, { type: "tool_call" }>[];
        const args = (c: Extract<Part, { type: "tool_call" }>) => (c.args && typeof c.args === "object" ? c.args : {});
        if (this.promptedTools) {
          const blocks = calls.map((c) => `<tool_call>${JSON.stringify({ name: c.name, arguments: args(c) })}</tool_call>`);
          out.push({ role: "assistant", content: [text, ...blocks].filter(Boolean).join("\n") });
          continue;
        }
        const msg: any = { role: "assistant", content: text };
        if (calls.length) msg.tool_calls = calls.map((c) => ({ function: { name: c.name, arguments: args(c) } }));
        out.push(msg);
        continue;
      }
      const pics: string[] = [];
      const texts: string[] = [];
      for (const p of m.parts) {
        if (p.type === "tool_result") {
          let body = p.text || "(no output)";
          if (p.images?.length) {
            if (this.info.vision) {
              const { images, note } = budget.pick(p.images);
              pics.push(...images.map((i) => i.data));
              if (note) body += `\n[${note}]`;
              if (images.length) body += `\n[${images.length} image(s) follow in the next message]`;
            } else body += `\n(image not shown to this model)`;
          }
          if (this.promptedTools) texts.push(`<tool_result name="${p.name}">\n${p.isError ? errorBody(body) : body}\n</tool_result>`);
          else out.push({ role: "tool", tool_name: p.name, content: p.isError ? errorBody(body) : body });
        } else if (p.type === "text") texts.push(p.text);
        else if (p.type === "image") {
          if (this.info.vision) pics.push(...budget.pick([p.path]).images.map((i) => i.data));
          else texts.push("(image not shown to this model)");
        }
      }
      if (texts.length) out.push({ role: "user", content: texts.join("\n\n"), ...(pics.length && !m.parts.some((p) => p.type === "tool_result") ? { images: pics } : {}) });
      else if (pics.length && !m.parts.some((p) => p.type === "tool_result")) out.push({ role: "user", content: "(image)", images: pics });
      if (pics.length && m.parts.some((p) => p.type === "tool_result")) out.push({ role: "user", content: "Images from the tool results above.", images: pics });
    }
    return out;
  }

  private retry<T>(fn: () => Promise<T>, signal?: AbortSignal, onRetry?: StepRequest["onRetry"]): Promise<T> {
    return withRetry(fn, { retries: this.retries, sleep: this.sleep, signal, onRetry });
  }

  private async attempt(body: Record<string, unknown>, idle: IdleSignal): Promise<Response> {
    idle.touch();
    const res = await fetch(`${ollamaHost()}/api/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: idle.signal,
    });
    if (res.status === 429 || res.status === 408 || res.status >= 500) {
      const txt = await res.text();
      throw Object.assign(new Error(`Ollama error ${res.status}: ${txt.slice(0, 300)}`), { status: res.status, headers: res.headers });
    }
    return res;
  }

  private async post(body: Record<string, unknown>, idle: IdleSignal, onRetry?: StepRequest["onRetry"]): Promise<Response> {
    const host = ollamaHost();
    try {
      return await this.retry(() => this.attempt(body, idle), idle.signal, onRetry);
    } catch (e) {
      if (!idle.signal.aborted && typeof (e as any).status === "number") throw new ProviderError((e as Error).message, true);
      throw this.networkError(e, host, idle.signal);
    }
  }

  private networkError(e: unknown, host: string, signal: AbortSignal | undefined): unknown {
    if (signal?.aborted) return timedOut(signal) ? new ProviderError(`Ollama sent no data for ${TIMEOUT_MS / 1000} s.`, true) : e;
    return new ProviderError(`Cannot reach Ollama at ${host}. Start it with \`ollama serve\`.`, true);
  }

  // Calls take() for each JSON line. If take() returns true, the read stops and the server stops the reply.
  private async readLines(res: Response, idle: IdleSignal, take: (j: any) => boolean): Promise<void> {
    const line = (s: string): boolean => {
      if (!s.trim()) return false;
      let j: any;
      try {
        j = JSON.parse(s);
      } catch {
        return false;
      }
      if (j.error) throw ollamaError(String(j.error));
      return take(j);
    };
    const reader = res.body!.getReader();
    try {
      const dec = new TextDecoder();
      let buf = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        idle.touch();
        buf += dec.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf("\n")) >= 0) {
          const stop = line(buf.slice(0, nl));
          buf = buf.slice(nl + 1);
          if (stop) {
            await reader.cancel().catch(() => {});
            return;
          }
        }
      }
      line(buf + dec.decode());
    } catch (e) {
      await reader.cancel().catch(() => {});
      if (e instanceof ProviderError) throw e;
      throw this.networkError(e, ollamaHost(), idle.signal);
    }
  }

  async step(input: StepRequest): Promise<StepResult> {
    const req = input.noToolCalls ? { ...input, tools: [] } : input;
    const system = this.promptedTools && req.tools.length ? `${req.system}\n\n${promptedToolsText(req.tools)}` : req.system;
    if (this.info.vision) await prepareImages(req.messages, req.signal);
    const body: Record<string, unknown> = {
      model: this.model,
      messages: this.toNative(system, req.messages),
      stream: true,
      truncate: false,
      options: { num_ctx: this.numCtx, num_predict: MAX_OUTPUT_TOKENS },
    };
    if (req.tools.length && !this.promptedTools)
      body.tools = req.tools.map((t) => ({ type: "function", function: { name: t.name, description: t.description, parameters: t.inputSchema } }));
    if (this.thinkOk) body.think = this.think;
    const sent = estimateTokens(req.messages, system, this.promptedTools ? [] : req.tools);
    const idle = idleSignal(TIMEOUT_MS, req.signal);
    try {
      return await this.run(req, body, sent, idle);
    } finally {
      idle.stop();
    }
  }

  private async run(req: StepRequest, body: Record<string, unknown>, sent: number, idle: IdleSignal): Promise<StepResult> {
    let res = await this.post(body, idle, req.onRetry);
    if (res.status === 400 && "think" in body) {
      const err = await res.text();
      if (/think/i.test(err)) {
        this.thinkOk = false;
        delete body.think;
        res = await this.post(body, idle, req.onRetry);
      } else throw ollamaError(err, res.status);
    }
    if (!res.ok) {
      const txt = await res.text();
      let msg = txt;
      try {
        msg = JSON.parse(txt).error ?? txt;
      } catch {}
      throw ollamaError(String(msg), res.status);
    }

    let content = "";
    let thinkField = "";
    const nativeCalls: { name: string; args: unknown; parseError?: string }[] = [];
    let inTok = 0;
    let outTok = 0;
    let doneReason = "";
    let finished = false;
    let checkAt = 3000;
    let looped = false;
    const textOut: string[] = [];
    const thinkOut: string[] = [];
    const splitter = new ThinkSplitter((kind, s) => {
      (kind === "text" ? textOut : thinkOut).push(s);
      req.onDelta?.({ type: kind, text: s });
    });
    await this.readLines(res, idle, (j) => {
      const m = j.message;
      if (m?.thinking) {
        thinkField += m.thinking;
        req.onDelta?.({ type: "thinking", text: m.thinking });
      }
      if (m?.content) {
        content += m.content;
        splitter.push(m.content);
        if (content.length >= checkAt) {
          checkAt = content.length + 1000;
          if (repeatStart(content) !== null) looped = true;
        }
      }
      for (const c of m?.tool_calls ?? []) {
        const a = c.function?.arguments;
        const { args, parseError } = parseArgs({ id: "", name: "", args: typeof a === "string" ? a : "", obj: typeof a === "string" ? undefined : (a ?? {}) }, false);
        nativeCalls.push({ name: c.function?.name ?? "", args, ...(parseError ? { parseError } : {}) });
      }
      if (j.done) {
        finished = true;
        inTok = j.prompt_eval_count ?? 0;
        outTok = j.eval_count ?? 0;
        doneReason = j.done_reason ?? "";
      }
      return looped;
    });
    splitter.end();
    if (!finished && !looped) throw new ProviderError("Ollama stopped before the end of the reply.", true);
    if (!finished) {
      inTok = sent;
      outTok = Math.ceil((content.length + thinkField.length) / 3.5);
    }

    let text = textOut.join("").trim();
    if (looped) text = cutRepeat(text);
    const thinking = [thinkField.trim(), thinkOut.join("").trim()].filter(Boolean).join("\n\n");
    let n = lastCallNumber(req.messages);
    const parts: Part[] = [];
    let note: string | undefined;
    const calls: { name: string; args: unknown; parseError?: string }[] = nativeCalls.map((c) => ({ ...c }));
    if (!calls.length && text) {
      const hit = extractTextToolCall(text, req.tools.map((t) => t.name));
      if (hit) {
        calls.push({ name: hit.name, args: hit.args });
        text = hit.rest;
        if (!this.promptedTools) note = "converted a tool call written as text";
      }
    }
    if (thinking) parts.push({ type: "thinking", text: thinking });
    if (text) parts.push({ type: "text", text });
    for (const c of calls) parts.push({ type: "tool_call", id: `call_${++n}`, name: c.name, args: c.args, ...(c.parseError ? { parseError: c.parseError } : {}) });
    const raw = { content, thinking: thinkField, tool_calls: nativeCalls };
    const result: StepResult = {
      message: { role: "assistant", parts, provider: "ollama", model: this.model, raw },
      usage: { inputTokens: inTok, outputTokens: outTok },
      stopReason: calls.length ? "tool_use" : doneReason === "length" ? "max_tokens" : "end",
    };
    if (looped) note = [note, "stopped a reply that repeated the same text; kept the text before the repeat; the token counts are estimates"].filter(Boolean).join("; ");
    if (note) result.note = note;
    if (inTok >= this.numCtx * FULL_PROMPT)
      throw new ProviderError(`The prompt has ${inTok} tokens and fills the context window of ${this.numCtx} tokens. Ollama can cut a prompt that is too long without an error.`, false, true, result);
    if (finished && sent > this.numCtx && inTok > 0 && inTok < sent * 0.5)
      throw new ProviderError(`The prompt has about ${sent} tokens, but Ollama read only ${inTok}. This Ollama version cuts a prompt that is longer than the context window of ${this.numCtx} tokens.`, false, true, result);
    return result;
  }

  async complete(system: string, text: string, signal?: AbortSignal): Promise<string> {
    const body: Record<string, unknown> = {
      model: this.model,
      messages: [{ role: "system", content: system }, { role: "user", content: text }],
      stream: true,
      truncate: false,
      options: { num_ctx: this.numCtx, num_predict: MAX_OUTPUT_TOKENS },
    };
    if (this.thinkOk) body.think = false;
    const idle = idleSignal(TIMEOUT_MS, signal);
    try {
      let res = await this.post(body, idle);
      if (res.status === 400 && "think" in body && /think/i.test(await res.clone().text())) {
        this.thinkOk = false;
        delete body.think;
        res = await this.post(body, idle);
      }
      if (!res.ok) throw ollamaError(await res.text(), res.status);
      let content = "";
      let checkAt = 3000;
      let looped = false;
      let finished = false;
      await this.readLines(res, idle, (j) => {
        content += j.message?.content ?? "";
        if (j.done) finished = true;
        if (content.length >= checkAt) {
          checkAt = content.length + 1000;
          if (repeatStart(content) !== null) looped = true;
        }
        return looped;
      });
      if (!finished && !looped) throw new ProviderError("Ollama stopped before the end of the reply.", true);
      if (looped) content = cutRepeat(content);
      return content.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
    } finally {
      idle.stop();
    }
  }
}
