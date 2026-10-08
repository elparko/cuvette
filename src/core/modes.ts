import type { LoadedAdapter } from "../adapters/manifest.ts";
import type { Args } from "./types.ts";

function fill(template: string, args: Args): string {
  return template.replace(/\{([\w.]+)\}/g, (m, k) => (args[k] === undefined ? m : String(args[k])));
}

export function instruction(adapter: LoadedAdapter | undefined, tool: string, args: Args, manualRoute?: string): string {
  const entry = adapter?.mapEntry(tool, args);
  if (!entry) return manualRoute || `Run ${tool} with ${JSON.stringify(args)}. This step has no manual route yet.`;
  const lines = [entry.route];
  for (const s of entry.steps) lines.push(`- ${fill(s, args)}`);
  for (const p of entry.params) {
    if (!(p.arg in args)) continue;
    const used = args[p.arg];
    let line = `- ${p.label}: ${String(used)}`;
    if (p.ui_default !== undefined && String(p.ui_default) !== String(used)) line += ` (the program shows ${String(p.ui_default)} by default; change it)`;
    lines.push(line);
  }
  if (entry.fidelity === "close" && entry.difference) lines.push(`Note: ${entry.difference}`);
  if (entry.fidelity === "code_only") lines.push("This step has no manual route in the program. Let the agent do it.");
  return lines.join("\n");
}

export function compareNote(note: string, metrics: Record<string, number>, tolerance = 0.02) {
  const seen = [...note.matchAll(/-?\d+(?:\.\d+)?(?:e-?\d+)?/gi)].map((m) => Number(m[0]));
  const named = new Map<string, number>();
  for (const m of note.matchAll(/([a-z_ ]+?)\s*[:=]\s*(-?\d+(?:\.\d+)?)/gi)) named.set(m[1].trim().toLowerCase().replace(/ /g, "_"), Number(m[2]));
  const differences: string[] = [];
  let checked = 0;
  for (const [k, v] of Object.entries(metrics)) {
    const close = (x: number) => Math.abs(x - v) <= Math.max(Math.abs(v) * tolerance, 1e-9);
    const given = named.get(k.toLowerCase());
    if (given !== undefined) {
      checked++;
      if (!close(given)) differences.push(`${k}: you got ${given}, the reference run got ${v}`);
    } else if (seen.some(close)) checked++;
  }
  return { checked, match: checked > 0 && differences.length === 0, differences };
}
