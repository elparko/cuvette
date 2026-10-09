import type { Message, ModelInfo, Part, Provider, StepRequest, StepResult } from "../core/types.ts";
import { ProviderError } from "../core/types.ts";
import { extractTextToolCall, lastCallNumber, splitThink } from "./text.ts";
import { localUrl } from "../core/phi.ts";

const TIMEOUT_MS = 600_000;

export interface OpenAIOpts {
  numCtx?: number;
}

export class OpenAIProvider implements Provider {
  info: ModelInfo;
  private base: string;

  constructor(baseUrl: string, readonly model: string, opts: OpenAIOpts = {}) {
    this.base = baseUrl.replace(/\/+$/, "");
    this.info = { provider: "openai", model, contextWindow: opts.numCtx ?? 32768, vision: false, small: true, local: localUrl(this.base) };
  }

  toNative(system: string, messages: Message[]): unknown[] {
    const out: any[] = [{ role: "system", content: system }];
    for (const m of messages) {
      if (m.role === "assistant") {
        const text = m.parts.filter((p) => p.type === "text").map((p) => (p as any).text).join("\n\n");
        const calls = m.parts.filter((p) => p.type === "tool_call") as Extract<Part, { type: "tool_call" }>[];
        const msg: any = { role: "assistant", content: text || null };
        if (calls.length)
          msg.tool_calls = calls.map((c) => ({ id: c.id, type: "function", function: { name: c.name, arguments: JSON.stringify(c.args ?? {}) } }));
        out.push(msg);
        continue;
      }
      const texts: string[] = [];
      for (const p of m.parts) {
        if (p.type === "tool_result") {
          const body = (p.text || "(no output)") + (p.images?.length ? "\n(image not shown to this model)" : "");
          out.push({ role: "tool", tool_call_id: p.callId, content: p.isError ? `Error: ${body}` : body });
        } else if (p.type === "text") texts.push(p.text);
        else if (p.type === "image") texts.push("(image not shown to this model)");
      }
      if (texts.length) out.push({ role: "user", content: texts.join("\n\n") });
    }
    return out;
  }

  private async post(body: Record<string, unknown>, user?: AbortSignal): Promise<any> {
    const t = AbortSignal.timeout(TIMEOUT_MS);
    const signal = user ? AbortSignal.any([user, t]) : t;
    const headers: Record<string, string> = { "content-type": "application/json" };
    if (process.env.OPENAI_API_KEY) headers.authorization = `Bearer ${process.env.OPENAI_API_KEY}`;
    let res: Response;
    try {
      res = await fetch(`${this.base}/chat/completions`, { method: "POST", headers, body: JSON.stringify(body), signal });
    } catch (e) {
      if (user?.aborted) throw e;
      if (t.aborted) throw new ProviderError("The model server did not answer within 600 s.");
      throw new ProviderError(`Cannot reach the model server at ${this.base}. Check that it is running.`);
    }
    if (!res.ok) {
      const txt = await res.text();
      let msg = txt;
      try {
        const j = JSON.parse(txt);
        msg = j.error?.message ?? j.error ?? txt;
      } catch {}
      if (res.status === 401 || res.status === 403) throw new ProviderError("The model server rejected the credentials. Set OPENAI_API_KEY.");
      throw new ProviderError(`Model server error ${res.status}: ${String(msg).slice(0, 300)}`);
    }
    return res.json();
  }

  async step(req: StepRequest): Promise<StepResult> {
    const body: Record<string, unknown> = { model: this.model, messages: this.toNative(req.system, req.messages), stream: false };
    if (req.tools.length)
      body.tools = req.tools.map((t) => ({ type: "function", function: { name: t.name, description: t.description, parameters: t.inputSchema } }));
    const j = await this.post(body, req.signal);
    const choice = j.choices?.[0];
    if (!choice) throw new ProviderError("The model server returned no choices.");
    const m = choice.message ?? {};
    const split = splitThink(m.content ?? "");
    let text = split.text;
    const thinking = [m.reasoning_content ?? m.reasoning ?? "", split.thinking].map((s: string) => s.trim()).filter(Boolean).join("\n\n");
    let n = lastCallNumber(req.messages);
    const parts: Part[] = [];
    let note: string | undefined;
    if (thinking) {
      parts.push({ type: "thinking", text: thinking });
      req.onDelta?.({ type: "thinking", text: thinking });
    }
    const native: any[] = m.tool_calls ?? [];
    const calls: Part[] = native.map((c) => {
      const id = c.id || `call_${++n}`;
      const raw = c.function?.arguments;
      if (raw && typeof raw === "object") return { type: "tool_call", id, name: c.function.name, args: raw };
      if (!raw) return { type: "tool_call", id, name: c.function?.name ?? "", args: {} };
      try {
        return { type: "tool_call", id, name: c.function.name, args: JSON.parse(raw) };
      } catch (e) {
        return { type: "tool_call", id, name: c.function.name, args: {}, parseError: `Arguments are not valid JSON (${(e as Error).message}): ${String(raw).slice(0, 200)}` };
      }
    });
    if (!calls.length && text) {
      const hit = extractTextToolCall(text, req.tools.map((t) => t.name));
      if (hit) {
        calls.push({ type: "tool_call", id: `call_${++n}`, name: hit.name, args: hit.args });
        text = hit.rest;
        note = "converted a tool call written as text";
      }
    }
    if (text) {
      parts.push({ type: "text", text });
      req.onDelta?.({ type: "text", text });
    }
    parts.push(...calls);
    const u = j.usage ?? {};
    const result: StepResult = {
      message: { role: "assistant", parts, provider: "openai", model: this.model, raw: m },
      usage: { inputTokens: u.prompt_tokens ?? 0, outputTokens: u.completion_tokens ?? 0 },
      stopReason: calls.length ? "tool_use" : choice.finish_reason === "length" ? "max_tokens" : "end",
    };
    if (note) result.note = note;
    return result;
  }

  async complete(system: string, text: string, signal?: AbortSignal): Promise<string> {
    const j = await this.post({ model: this.model, messages: [{ role: "system", content: system }, { role: "user", content: text }], stream: false }, signal);
    return splitThink(j.choices?.[0]?.message?.content ?? "").text;
  }
}
