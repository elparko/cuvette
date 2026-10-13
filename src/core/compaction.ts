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

// A cut between the two halves of a surrogate pair leaves text that the Claude API refuses as JSON.
export function headText(s: string, n: number): string {
  if (s.length <= n) return s;
  const c = s.charCodeAt(n - 1);
  return s.slice(0, c >= 0xd800 && c <= 0xdbff ? n - 1 : n);
}

function tailText(s: string, n: number): string {
  const t = s.slice(-n);
  const c = t.charCodeAt(0);
  return c >= 0xdc00 && c <= 0xdfff ? t.slice(1) : t;
}

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
      else if (p.type === "tool_result") out.push(`result of ${p.name}: ${headText(p.text, 1500)}`);
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

export const pointerText = (callId: string) => `[The output is the same as the output of the earlier call ${callId} with the same input. It is still above in this conversation.]`;
const POINTER = /^\[The output is the same as the output of the earlier call (\S+) with the same input\. It is still above in this conversation\.\]$/;

function pointerTargets(messages: Message[]): Set<string> {
  const out = new Set<string>();
  for (const m of messages)
    for (const p of m.parts) {
      const hit = p.type === "tool_result" ? POINTER.exec(p.text) : null;
      if (hit) out.add(hit[1]!);
    }
  return out;
}

function resultTexts(messages: Message[], keep: (text: string) => boolean): Map<string, string> {
  const out = new Map<string, string>();
  for (const m of messages) for (const p of m.parts) if (p.type === "tool_result" && !POINTER.test(p.text) && keep(p.text)) out.set(p.callId, p.text);
  return out;
}

// A pointer gets the text of its earlier result when that result leaves the context or becomes shorter.
function fillPointers(messages: Message[], texts: Map<string, string>, to = messages.length): Message[] {
  const target = (p: Part) => (p.type === "tool_result" ? texts.get(POINTER.exec(p.text)?.[1] ?? "") : undefined);
  return messages.map((m, i) => {
    if (i >= to || !m.parts.some((p) => target(p) !== undefined)) return m;
    return { ...m, parts: m.parts.map((p) => (target(p) !== undefined ? { ...p, text: target(p)! } as Part : p)) };
  });
}

// Claude ties each thinking block to the exact history before it. After an edit, the thinking
// blocks after that point must go, or the API refuses the request. The text and tool calls stay.
export function dropThinking(messages: Message[], from = 0): Message[] {
  return messages.map((m, i) => (i < from || m.role !== "assistant" || (!m.raw && !m.parts.some((p) => p.type === "thinking")) ? m : { ...m, raw: undefined, parts: m.parts.filter((p) => p.type !== "thinking") }));
}

export function elideOld(messages: Message[], contextWindow: number): { messages: Message[]; elided: number } {
  const end = recentStart(messages, contextWindow);
  const needed = pointerTargets(messages.slice(end));
  let elided = 0;
  let first = -1;
  const out = messages.map((m, i) => {
    if (i >= end || !isResults(m)) return m;
    let changed = false;
    const parts = m.parts.map((p) => {
      if (p.type !== "tool_result" || needed.has(p.callId) || isElided(p.text) || (p.text.length <= BULKY_CHARS && !p.images?.length)) return p;
      changed = true;
      elided++;
      const head = p.text.length > KEEP_CHARS ? `${headText(p.text, KEEP_CHARS)}\n…\n` : `${p.text}\n`;
      return { type: "tool_result", callId: p.callId, name: p.name, text: head + elisionStub(p), ...(p.isError ? { isError: true } : {}) } as Part;
    });
    if (changed && first < 0) first = i;
    return changed ? { ...m, parts } : m;
  });
  return { messages: first < 0 ? out : dropThinking(fillPointers(out, resultTexts(out, isElided), end), first), elided };
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
  const prev = start ? (messages[0]!.parts[0] as { text: string }).text.slice(SUMMARY_HEAD.length).replace(/\n## Current plan\n[\s\S]*$/, "").trim() : "";
  const room = Math.max(4000, Math.floor(contextWindow * 3.5 * 0.6) - SUMMARY_SYSTEM.length - prev.length);
  const all = transcriptText(old);
  const text = all.length > room ? `[The harness left out the first ${all.length - room} characters.]\n${tailText(all, room)}` : all;
  const input = `${prev ? `Previous summary:\n${prev}\n\n` : ""}Older messages:\n${text}`;
  const summary = await provider.complete(SUMMARY_SYSTEM, input, signal);
  return { summary, ...(r >= 0 ? { request: messages[r] } : {}), kept: fillPointers(dropThinking(messages.slice(end)), resultTexts(old, () => true)) };
}

export function summaryMessage(summary: string): Message {
  return { role: "user", parts: [{ type: "text", text: `${SUMMARY_HEAD}\n${summary}` }] };
}
