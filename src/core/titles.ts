import type { AnalysisRecord } from "./record.ts";
import type { Entry, Provider } from "./types.ts";
import { stepNumbers } from "./housekeeping.ts";

export interface SessionTitle {
  title: string;
  description: string;
}

const SYSTEM = `You name an analysis session for a list of past sessions. Reply with JSON only: {"title": "...", "description": "..."}.
title: at most 70 characters. Name what was measured or compared, and on what data. Example: "Efferocytosis count, treated vs control hand counts".
description: one plain sentence, at most 200 characters. Say what was done and the main result with its number. Example: "Counted red-positive cells in 36 fields with Cellpose and compared them with the hand counts; Cuvette found 97% of the cells."
Use only facts from the text. No marketing words.`;

const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s);
const oneLine = (s: string) => s.replace(/[\r\n\u0085\u2028\u2029]+/g, " / ");

export function titleInput(record: AnalysisRecord): string {
  const ask = record.entries(["user"]).filter((e) => !e.data.during).map((e) => String(e.data.text ?? ""));
  const plan = record.entries(["plan_approved", "plan"]).at(-1);
  const nodes = record.nodes().filter((n) => !n.sensitivityOf);
  const steps = stepNumbers(nodes);
  const lines = nodes.filter((n) => steps.has(n.id)).slice(0, 25).map((n) => `${steps.get(n.id)}. ${clip(oneLine(n.summary || n.tool), 160)}`);
  const answer = record.entries(["assistant"]).filter((e) => e.data.final).at(-1);
  return [
    `Requests:\n${ask.slice(0, 3).map((a) => `- ${clip(a, 400)}`).join("\n")}`,
    plan ? `Plan:\n${clip(String(plan.data.text ?? ""), 1200)}` : "",
    lines.length ? `Steps:\n${lines.join("\n")}` : "",
    answer ? `Answer:\n${clip(String(answer.data.text ?? ""), 1500)}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

export function parseTitle(text: string): SessionTitle | undefined {
  const m = /\{[\s\S]*\}/.exec(text);
  if (!m) return undefined;
  try {
    const j = JSON.parse(m[0]) as Record<string, unknown>;
    const title = String(j.title ?? "").replace(/\s+/g, " ").trim();
    const description = String(j.description ?? "").replace(/\s+/g, " ").trim();
    return title ? { title: clip(title, 90), description: clip(description, 260) } : undefined;
  } catch {
    return undefined;
  }
}

export async function describeSession(provider: Provider, record: AnalysisRecord, signal?: AbortSignal): Promise<SessionTitle | undefined> {
  return parseTitle(await provider.complete(SYSTEM, titleInput(record), signal));
}

export function changedAnalysis(entries: Entry[]): boolean {
  return entries.some((e) => (e.kind === "node" && !e.data.sensitivityOf) || e.kind === "plan_approved" || e.kind === "pilot_approved" || (e.kind === "assistant" && e.data.final));
}

export function lastTitle(entries: Entry[]): SessionTitle | undefined {
  const e = entries.filter((x) => x.kind === "title").at(-1);
  return e ? { title: String(e.data.title ?? ""), description: String(e.data.description ?? "") } : undefined;
}
