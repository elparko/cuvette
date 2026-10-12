import type { Message, Part, Provider, ToolSchema } from "./types.ts";

const SUMMARY_SYSTEM = `You summarize the older part of an analysis session so that the analysis can continue with less context. You can get a previous summary too. Then update it: keep the facts that are still true, remove old facts, and add the new events.
Write plain text, short lines, under these headings. Leave out a heading only if it is empty.
## Question
The scientist's question and request, exactly.
## Setup and decisions
The decisions of the scientist, with each value.
## Steps done
Each step: the tool, the settings, the output file paths and the key numbers.
## Errors and fixes
Each error, and how the agent corrected it, or that it is still open.
## Open questions and deviations
## Next step
The next action, as the most recent messages show it.
Keep exact file paths, tool names, numbers and error text. Do not add new facts.`;

export const ELIDE_AT = 0.5;
export const SUMMARIZE_AT = 0.7;
const RECENT_SHARE = 0.3;
const BULKY_CHARS = 1500;
const KEEP_CHARS = 400;
const SUMMARY_HEAD = "[Summary of the earlier part of this session]";

function partChars(p: Part): number {
  if (p.type === "text" || p.type === "thinking") return p.text.length;
  if (p.type === "tool_call") return JSON.stringify(p.args ?? {}).length + p.name.length;
  if (p.type === "tool_result") return p.text.length + (p.images?.length ?? 0) * 3000;
  return 3000;
}

const messageChars = (m: Message) => m.parts.reduce((n, p) => n + partChars(p), 0);

export function estimateTokens(messages: Message[], system = "", tools: ToolSchema[] = []): number {
  let chars = system.length + (tools.length ? JSON.stringify(tools).length : 0);
  for (const m of messages) chars += messageChars(m);
  return Math.ceil(chars / 3.5);
}

const isResults = (m: Message) => m.parts.some((p) => p.type === "tool_result");
const isSummary = (m: Message | undefined) => !!m && m.role === "user" && m.parts[0]?.type === "text" && m.parts[0].text.startsWith(SUMMARY_HEAD);

export function transcriptText(messages: Message[]): string {
  const out: string[] = [];
  for (const m of messages)
    for (const p of m.parts) {
      if (p.type === "text") out.push(`${m.role}: ${p.text}`);
      else if (p.type === "tool_call") out.push(`tool call ${p.name} ${JSON.stringify(p.args)}`);
      else if (p.type === "tool_result") out.push(`result of ${p.name}: ${p.text.slice(0, 1500)}`);
    }
  return out.join("\n");
}

// The recent window starts at an assistant message, holds at least the last two
// assistant messages, and grows back while it fits in its share of the window.
export function recentStart(messages: Message[], contextWindow: number): number {
  const budget = contextWindow * RECENT_SHARE * 3.5;
  let start = messages.length;
  let chars = 0;
  let assistants = 0;
  for (let i = messages.length - 1; i >= 0; i--) {
    chars += messageChars(messages[i]!);
    if (messages[i]!.role !== "assistant") continue;
    assistants++;
    if (assistants > 2 && chars > budget) break;
    start = i;
  }
  return start;
}

export function elisionStub(p: Extract<Part, { type: "tool_result" }>): string {
  const lines = p.text.split("\n").length;
  const images = p.images?.length ? ` and ${p.images.length} image(s)` : "";
  return `[Older tool output shortened: ${lines} lines, ${p.text.length} characters${images}. The record keeps the full output. Run the tool again or read the output file if you need it.]`;
}

const isElided = (text: string) => text.includes("[Older tool output shortened:");

export function elideOld(messages: Message[], contextWindow: number): { messages: Message[]; elided: number } {
  const end = recentStart(messages, contextWindow);
  let elided = 0;
  const out = messages.map((m, i) => {
    if (i >= end || !isResults(m)) return m;
    let changed = false;
    const parts = m.parts.map((p) => {
      if (p.type !== "tool_result" || isElided(p.text) || (p.text.length <= BULKY_CHARS && !p.images?.length)) return p;
      changed = true;
      elided++;
      const head = p.text.length > KEEP_CHARS ? `${p.text.slice(0, KEEP_CHARS)}\n…\n` : `${p.text}\n`;
      return { type: "tool_result", callId: p.callId, name: p.name, text: head + elisionStub(p), ...(p.isError ? { isError: true } : {}) } as Part;
    });
    return changed ? { ...m, parts } : m;
  });
  return { messages: out, elided };
}

export interface Summarized {
  summary: string;
  request?: Message;
  kept: Message[];
}

// Summarizes the messages between the start of the history and the recent window.
// The previous summary is updated, and the request of the current turn stays as it is.
export async function summarizeOld(messages: Message[], provider: Provider, contextWindow: number, signal?: AbortSignal, request?: Message): Promise<Summarized | null> {
  const start = isSummary(messages[0]) ? 1 : 0;
  const end = recentStart(messages, contextWindow);
  if (end <= start) return null;
  const at = request ? messages.indexOf(request) : -1;
  const r = at >= start && at < end ? at : -1;
  const old = messages.slice(start, end).filter((_, i) => i + start !== r);
  if (!old.length) return null;
  const prev = start ? (messages[0]!.parts[0] as { text: string }).text.slice(SUMMARY_HEAD.length).trim() : "";
  const input = `${prev ? `Previous summary:\n${prev}\n\n` : ""}Older messages:\n${transcriptText(old)}`;
  const summary = await provider.complete(SUMMARY_SYSTEM, input, signal);
  return { summary, ...(r >= 0 ? { request: messages[r] } : {}), kept: messages.slice(end) };
}

export function summaryMessage(summary: string): Message {
  return { role: "user", parts: [{ type: "text", text: `${SUMMARY_HEAD}\n${summary}` }] };
}
