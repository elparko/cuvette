import type { Tokens } from "./pricing.ts";

const num = (v: unknown): number | undefined => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : undefined);

export function openAiTokens(u: any): Tokens | undefined {
  if (!u || typeof u !== "object") return undefined;
  const prompt = num(u.prompt_tokens);
  const completion = num(u.completion_tokens);
  if (prompt === undefined || completion === undefined) return undefined;
  const cached = Math.min(num(u.prompt_tokens_details?.cached_tokens) ?? 0, prompt);
  return { input: prompt - cached, output: completion, cacheRead: cached, cacheWrite5m: 0, cacheWrite1h: 0 };
}

export class OpenAiUsage {
  tokens?: Tokens;
  done = false;
  private buffer = "";
  private decoder = new TextDecoder();

  push(chunk: Uint8Array): void {
    this.buffer = (this.buffer + this.decoder.decode(chunk, { stream: true })).replace(/\r\n/g, "\n");
    let end: number;
    while ((end = this.buffer.indexOf("\n\n")) >= 0) {
      this.event(this.buffer.slice(0, end));
      this.buffer = this.buffer.slice(end + 2);
    }
  }

  private event(block: string): void {
    const data: string[] = [];
    for (const line of block.split("\n")) if (line.startsWith("data:")) data.push(line.slice(5).replace(/^ /, ""));
    const text = data.join("\n");
    if (text.trim() === "[DONE]") {
      this.done = true;
      return;
    }
    let json: any;
    try {
      json = JSON.parse(text);
    } catch {
      return;
    }
    const t = openAiTokens(json?.usage);
    if (t) this.tokens = t;
  }
}
