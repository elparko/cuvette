import { readFileSync } from "node:fs";
import type { Message, ModelInfo, Provider, StepRequest, StepResult, ToolSchema } from "../core/types.ts";

export interface FakeStep {
  text?: string;
  thinking?: string;
  calls?: { name: string; args: unknown }[];
  stop?: "max_tokens";
}

export type FakeStepFn = (messages: Message[], tools: ToolSchema[]) => FakeStep;
export type FakeScript = FakeStep[] | FakeStepFn | { steps: FakeStep[] | FakeStepFn; complete?: string; completeDelayMs?: number; completeError?: string };

export interface RecordedRequest {
  system: string;
  tools: ToolSchema[];
  messages: Message[];
}

export class FakeProvider implements Provider {
  info: ModelInfo = { provider: "fake", model: "fake", contextWindow: 1_000_000, vision: false, small: false };
  requests: RecordedRequest[] = [];
  private steps: FakeStep[] | FakeStepFn;
  private completeText: string;
  private completeDelayMs: number;
  completeGate?: Promise<void>;
  private completeError?: string;
  private index = 0;
  private callNo = 0;

  constructor(script: FakeScript = []) {
    const obj = Array.isArray(script) || typeof script === "function" ? { steps: script, complete: undefined } : script;
    this.steps = obj.steps;
    this.completeText = obj.complete ?? "No findings.";
    this.completeError = "completeError" in obj ? obj.completeError : undefined;
    this.completeDelayMs = "completeDelayMs" in obj ? (obj.completeDelayMs ?? 0) : 0;
  }

  static fromFile(path: string): FakeProvider {
    return new FakeProvider(JSON.parse(readFileSync(path, "utf8")));
  }

  async step(req: StepRequest): Promise<StepResult> {
    this.requests.push({ system: req.system, tools: req.noToolCalls ? [] : req.tools, messages: [...req.messages] });
    const i = this.index++;
    const s: FakeStep = typeof this.steps === "function" ? this.steps(req.messages, req.tools) : (this.steps[i] ?? { text: "done" });
    const parts: Message["parts"] = [];
    if (s.thinking) {
      parts.push({ type: "thinking", text: s.thinking });
      req.onDelta?.({ type: "thinking", text: s.thinking });
    }
    if (s.text) {
      parts.push({ type: "text", text: s.text });
      req.onDelta?.({ type: "text", text: s.text });
    }
    for (const c of s.calls ?? []) parts.push({ type: "tool_call", id: `call_${++this.callNo}`, name: c.name, args: c.args });
    const chars = req.messages.reduce((n, m) => n + JSON.stringify(m.parts).length, req.system.length);
    return {
      message: { role: "assistant", parts, provider: "fake", model: "fake" },
      usage: { inputTokens: Math.ceil(chars / 4), outputTokens: Math.ceil(JSON.stringify(parts).length / 4) },
      stopReason: s.stop ?? (s.calls?.length ? "tool_use" : "end"),
    };
  }

  async complete(_system?: string, _text?: string, signal?: AbortSignal): Promise<string> {
    if (this.completeError) throw new Error(this.completeError);
    if (this.completeDelayMs) {
      await new Promise<void>((resolve, reject) => {
        if (signal?.aborted) return reject(new Error("aborted"));
        const timer = setTimeout(resolve, this.completeDelayMs);
        signal?.addEventListener("abort", () => (clearTimeout(timer), reject(new Error("aborted"))), { once: true });
      });
    }
    if (this.completeGate) {
      const gate = this.completeGate;
      await new Promise<void>((resolve, reject) => {
        if (signal?.aborted) return reject(new Error("aborted"));
        signal?.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
        void gate.then(resolve);
      });
    }
    return this.completeText;
  }
}
