import type { SessionLike } from "./types.ts";
import { usageLong, usageShort, type UsageSummary } from "../core/spend.ts";

export type Routed = { t: "none" } | { t: "send"; text: string } | { t: "queue"; text: string } | { t: "steer"; text: string; now: boolean; note: string };

export function steerNote(now: boolean): string {
  return now ? "Sent now. The current step stops, and the agent reads your message." : "Sent. The agent reads it after the current step.";
}

export function routeMessage(session: SessionLike, raw: string, busy: boolean, forceNow = false): Routed {
  const text = raw.trim();
  if (!text) return { t: "none" };
  if (!busy) return { t: "send", text };
  const now = forceNow || text.startsWith("!");
  const body = text.startsWith("!") ? text.slice(1).trim() : text;
  if (!body) return { t: "none" };
  if (!session.steer || (!now && session.settings?.messages === "queue")) return { t: "queue", text: body };
  session.steer(body, now);
  return { t: "steer", text: body, now, note: steerNote(now) };
}

export function nextQueued(session: SessionLike, queue: string[]): { next?: string; rest: string[] } {
  const [next, ...rest] = [...(session.takeSteered?.() ?? []), ...queue];
  return { next, rest };
}

export function stopTurn(session: SessionLike, queued: string[] = []): string[] {
  const dropped = [...(session.takeSteered?.() ?? []), ...queued];
  session.interrupt();
  return dropped;
}

export function droppedNote(dropped: string[], restored: boolean): string {
  const shown = dropped.map((m) => `"${m.length > 60 ? `${m.slice(0, 59)}…` : m}"`).join(", ");
  const one = dropped.length === 1;
  return `The agent did not read ${one ? "this message" : `these ${dropped.length} messages`}: ${shown}. ${restored ? `${one ? "It is" : "They are"} back in the input box.` : "Type again if you still need it."}`;
}

export function inputPlaceholder(session: SessionLike, busy: boolean): string {
  if (!busy) return "Ask for an analysis step, or type / for commands";
  return session.settings?.messages === "queue" ? "The agent is working. Your message waits until the turn ends." : "The agent is working. Your message goes in after the current step.";
}

export function activityText(state: string, purpose?: string, tool?: string): string {
  if (state === "running") return purpose || (tool ? `Running ${tool.replace(/_/g, " ")}` : "Working");
  if (state === "waiting") return "Waiting for your answer";
  return state === "thinking" && purpose ? purpose : "Thinking about the next step";
}

export function usageOf(session: SessionLike): UsageSummary | undefined {
  const u = session.usage?.();
  return u && u.steps ? u : undefined;
}

export function usageFields(session: SessionLike): { usage: string; usageLong: string } {
  const u = usageOf(session);
  return u ? { usage: usageShort(u), usageLong: usageLong(u) } : { usage: "", usageLong: "" };
}
