import type { Message, Provider } from "./types.ts";

const SUMMARY_SYSTEM = `You summarize an analysis session so that the analysis can continue with less context. Keep: the scientist's question, the setup and decisions, every step with its tool, settings, output file paths and key numbers, open questions, deviations, and what the agent planned next. Write plain text, short lines. Do not add new facts.`;

export function estimateTokens(messages: Message[], system = ""): number {
  let chars = system.length;
  for (const m of messages)
    for (const p of m.parts) {
      if (p.type === "text" || p.type === "thinking") chars += p.text.length;
      else if (p.type === "tool_call") chars += JSON.stringify(p.args ?? {}).length + p.name.length;
      else if (p.type === "tool_result") chars += p.text.length + (p.images?.length ?? 0) * 3000;
      else chars += 3000;
    }
  return Math.ceil(chars / 3.5);
}

function turnStarts(messages: Message[]): number[] {
  return messages.flatMap((m, i) => (m.role === "user" && m.parts.some((p) => p.type === "text") && !m.parts.some((p) => p.type === "tool_result") ? [i] : []));
}

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

export function needsCompaction(messages: Message[], system: string, contextWindow: number, ratio = 0.7): boolean {
  return estimateTokens(messages, system) > contextWindow * ratio;
}

export async function compact(messages: Message[], provider: Provider, signal?: AbortSignal): Promise<{ summary: string; kept: Message[] } | null> {
  const starts = turnStarts(messages);
  if (starts.length < 2) return null;
  const cut = starts[starts.length - 1];
  const old = messages.slice(0, cut);
  const summary = await provider.complete(SUMMARY_SYSTEM, transcriptText(old), signal);
  const kept = messages.slice(cut).map((m) => ({ ...m, raw: undefined, parts: m.parts.filter((p) => p.type !== "thinking") }));
  return { summary, kept };
}

export function summaryMessage(summary: string): Message {
  return { role: "user", parts: [{ type: "text", text: `[Summary of the earlier part of this session]\n${summary}` }] };
}
