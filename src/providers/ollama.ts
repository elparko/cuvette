import type { Message, ModelInfo, Part, Provider, StepRequest, StepResult } from "../core/types.ts";
import { ProviderError } from "../core/types.ts";
import { ImageBudget } from "./images.ts";
import { ThinkSplitter, extractTextToolCall, lastCallNumber, promptedToolsText } from "./text.ts";

const TIMEOUT_MS = 600_000;
const DEFAULT_NUM_CTX = 32768;
const MAX_OUTPUT_TOKENS = 8192;

export interface OllamaOpts {
  numCtx?: number;
  think?: boolean;
  promptedTools?: boolean;
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
  readonly promptedTools: boolean;

  constructor(readonly model: string, show: OllamaShow, opts: OllamaOpts = {}) {
    this.numCtx = opts.numCtx ?? Math.min(DEFAULT_NUM_CTX, show.contextLength ?? DEFAULT_NUM_CTX);
    this.think = opts.think ?? false;
    this.promptedTools = opts.promptedTools ?? false;
    this.info = {
      provider: "ollama",
      model,
      contextWindow: this.numCtx,
      vision: show.capabilities.includes("vision"),
      small: (show.paramSize ?? 0) < 30 || this.numCtx < 64000,
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
          if (this.promptedTools) texts.push(`<tool_result name="${p.name}">\n${p.isError ? `Error: ${body}` : body}\n</tool_result>`);
          else out.push({ role: "tool", tool_name: p.name, content: p.isError ? `Error: ${body}` : body });
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

  private signal(user?: AbortSignal): AbortSignal {
    const t = AbortSignal.timeout(TIMEOUT_MS);
    return user ? AbortSignal.any([user, t]) : t;
  }

  private async post(body: Record<string, unknown>, signal: AbortSignal | undefined): Promise<Response> {
    const host = ollamaHost();
    let res: Response;
    try {
      res = await fetch(`${host}/api/chat`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
        signal,
      });
    } catch (e) {
      throw this.networkError(e, host, signal);
    }
    return res;
  }

  private networkError(e: unknown, host: string, signal: AbortSignal | undefined): unknown {
    if (signal?.aborted) {
      if (signal.reason instanceof Error && signal.reason.name === "TimeoutError") return new ProviderError("Ollama did not finish within 600 s.");
      return e;
    }
    return new ProviderError(`Cannot reach Ollama at ${host}. Start it with \`ollama serve\`.`);
  }

  async step(req: StepRequest): Promise<StepResult> {
    const signal = this.signal(req.signal);
    const body: Record<string, unknown> = {
      model: this.model,
      messages: this.toNative(this.promptedTools && req.tools.length ? `${req.system}\n\n${promptedToolsText(req.tools)}` : req.system, req.messages),
      stream: true,
      options: { num_ctx: this.numCtx, num_predict: MAX_OUTPUT_TOKENS },
    };
    if (req.tools.length && !this.promptedTools)
      body.tools = req.tools.map((t) => ({ type: "function", function: { name: t.name, description: t.description, parameters: t.inputSchema } }));
    if (this.thinkOk) body.think = this.think;

    let res = await this.post(body, signal);
    if (res.status === 400 && "think" in body) {
      const err = await res.text();
      if (/think/i.test(err)) {
        this.thinkOk = false;
        delete body.think;
        res = await this.post(body, signal);
      } else throw new ProviderError(`Ollama rejected the request: ${err.slice(0, 300)}`);
    }
    if (!res.ok) {
      const txt = await res.text();
      let msg = txt;
      try {
        msg = JSON.parse(txt).error ?? txt;
      } catch {}
      throw new ProviderError(`Ollama error ${res.status}: ${String(msg).slice(0, 300)}`);
    }

    let content = "";
    let thinkField = "";
    const nativeCalls: { name: string; args: unknown }[] = [];
    let inTok = 0;
    let outTok = 0;
    let doneReason = "";
    const textOut: string[] = [];
    const thinkOut: string[] = [];
    const splitter = new ThinkSplitter((kind, s) => {
      (kind === "text" ? textOut : thinkOut).push(s);
      req.onDelta?.({ type: kind, text: s });
    });
    const handle = (line: string) => {
      if (!line.trim()) return;
      let j: any;
      try {
        j = JSON.parse(line);
      } catch {
        return;
      }
      if (j.error) throw new ProviderError(`Ollama error: ${String(j.error).slice(0, 300)}`);
      const m = j.message;
      if (m?.thinking) {
        thinkField += m.thinking;
        req.onDelta?.({ type: "thinking", text: m.thinking });
      }
      if (m?.content) {
        content += m.content;
        splitter.push(m.content);
      }
      for (const c of m?.tool_calls ?? []) {
        let args = c.function?.arguments ?? {};
        if (typeof args === "string") {
          try {
            args = JSON.parse(args);
          } catch {
            args = {};
          }
        }
        nativeCalls.push({ name: c.function?.name ?? "", args });
      }
      if (j.done) {
        inTok = j.prompt_eval_count ?? 0;
        outTok = j.eval_count ?? 0;
        doneReason = j.done_reason ?? "";
      }
    };
    try {
      const reader = res.body!.getReader();
      const dec = new TextDecoder();
      let buf = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf("\n")) >= 0) {
          handle(buf.slice(0, nl));
          buf = buf.slice(nl + 1);
        }
      }
      handle(buf + dec.decode());
    } catch (e) {
      if (e instanceof ProviderError) throw e;
      throw this.networkError(e, ollamaHost(), signal);
    }
    splitter.end();

    let text = textOut.join("").trim();
    const thinking = [thinkField.trim(), thinkOut.join("").trim()].filter(Boolean).join("\n\n");
    let n = lastCallNumber(req.messages);
    const parts: Part[] = [];
    let note: string | undefined;
    const calls = nativeCalls.map((c) => ({ ...c }));
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
    for (const c of calls) parts.push({ type: "tool_call", id: `call_${++n}`, name: c.name, args: c.args });
    const raw = { content, thinking: thinkField, tool_calls: nativeCalls };
    const result: StepResult = {
      message: { role: "assistant", parts, provider: "ollama", model: this.model, raw },
      usage: { inputTokens: inTok, outputTokens: outTok },
      stopReason: calls.length ? "tool_use" : doneReason === "length" ? "max_tokens" : "end",
    };
    if (note) result.note = note;
    return result;
  }

  async complete(system: string, text: string, signal?: AbortSignal): Promise<string> {
    const sig = this.signal(signal);
    const body: Record<string, unknown> = {
      model: this.model,
      messages: [{ role: "system", content: system }, { role: "user", content: text }],
      stream: false,
      options: { num_ctx: this.numCtx },
    };
    if (this.thinkOk) body.think = false;
    let res = await this.post(body, sig);
    if (res.status === 400 && "think" in body && /think/i.test(await res.clone().text())) {
      delete body.think;
      res = await this.post(body, sig);
    }
    if (!res.ok) throw new ProviderError(`Ollama error ${res.status}: ${(await res.text()).slice(0, 300)}`);
    const j: any = await res.json();
    return (j.message?.content ?? "").replace(/<think>[\s\S]*?<\/think>/g, "").trim();
  }
}
