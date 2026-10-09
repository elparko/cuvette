import type { SessionLike } from "./types.ts";

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

export function stopTurn(session: SessionLike): void {
  session.takeSteered?.();
  session.interrupt();
}

export function inputPlaceholder(session: SessionLike, busy: boolean): string {
  if (!busy) return "Ask for an analysis step, or type / for commands";
  return session.settings?.messages === "queue" ? "The agent is working. Your message waits until the turn ends." : "The agent is working. Your message goes in after the current step.";
}
