import type { Tokens } from "./pricing.ts";

export interface UsageSeen {
  model?: string;
  started: boolean;
  finished: boolean;
  failed: boolean;
  start?: Tokens;
  total?: Tokens;
}

const num = (v: unknown): number | undefined => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : undefined);

export function mergeUsage(base: Tokens | undefined, u: any): Tokens {
  const t: Tokens = { ...(base ?? { input: 0, output: 0, cacheRead: 0, cacheWrite5m: 0, cacheWrite1h: 0 }) };
  if (!u || typeof u !== "object") return t;
  t.input = num(u.input_tokens) ?? t.input;
  t.output = num(u.output_tokens) ?? t.output;
  t.cacheRead = num(u.cache_read_input_tokens) ?? t.cacheRead;
  const cc = u.cache_creation;
  if (cc && typeof cc === "object") {
    t.cacheWrite5m = num(cc.ephemeral_5m_input_tokens) ?? t.cacheWrite5m;
    t.cacheWrite1h = num(cc.ephemeral_1h_input_tokens) ?? t.cacheWrite1h;
  } else if (num(u.cache_creation_input_tokens) !== undefined) {
    t.cacheWrite5m = num(u.cache_creation_input_tokens)!;
    t.cacheWrite1h = 0;
  }
  return t;
}

export class SseUsage {
  seen: UsageSeen = { started: false, finished: false, failed: false };
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
    let name = "";
    const data: string[] = [];
    for (const line of block.split("\n")) {
      if (line.startsWith("event:")) name = line.slice(6).trim();
      else if (line.startsWith("data:")) data.push(line.slice(5).replace(/^ /, ""));
    }
    if (name !== "message_start" && name !== "message_delta" && name !== "error") return;
    let json: any;
    try {
      json = JSON.parse(data.join("\n"));
    } catch {
      return;
    }
    if (name === "error") this.seen.failed = true;
    else if (name === "message_start") {
      const m = json?.message;
      if (typeof m?.model === "string") this.seen.model = m.model;
      this.seen.started = true;
      this.seen.start = mergeUsage(undefined, m?.usage);
      this.seen.total = this.seen.start;
    } else if (this.seen.started) {
      this.seen.total = mergeUsage(this.seen.total, json?.usage);
      this.seen.finished = true;
    }
  }
}
