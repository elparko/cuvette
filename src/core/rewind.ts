import type { AnalysisRecord } from "./record.ts";
import type { Message } from "./types.ts";

export interface RewindPoint {
  n: number;
  kind: "message" | "stage";
  entry: number;
  upTo: number;
  label: string;
  ts: string;
  text?: string;
}

const clip = (s: string, n = 70) => {
  const one = s.replace(/\s+/g, " ").trim();
  return one.length > n ? one.slice(0, n - 1) + "…" : one;
};

export function rewindPoints(record: AnalysisRecord): RewindPoint[] {
  const all = record.entries();
  const out: Omit<RewindPoint, "n">[] = [];
  for (const e of record.live(["user", "clarify", "plan_approved", "pilot_approved"])) {
    if (e.kind === "user") {
      if (e.data.internal || e.data.during) continue;
      const text = String(e.data.text ?? "");
      out.push({ kind: "message", entry: e.id, upTo: e.id - 1, label: `You wrote: ${clip(text)}`, ts: e.ts, text });
      continue;
    }
    if (e.kind === "clarify" && e.data.action !== "answered") continue;
    const reply = all.find((x) => x.id > e.id && x.kind === "message" && (x.data.message as Message).role === "user");
    const upTo = reply && !record.setAside(reply.id) ? reply.id : e.id;
    const label =
      e.kind === "clarify"
        ? `Questions answered (${((e.data.answers as string[]) ?? []).length})`
        : e.kind === "plan_approved"
          ? `Analysis confirmed, version ${String(e.data.version)}`
          : `Demonstration on ${String(e.data.sample)} confirmed`;
    out.push({ kind: "stage", entry: e.id, upTo, label, ts: e.ts });
  }
  return out.sort((a, b) => a.entry - b.entry).map((p, i) => ({ ...p, n: i + 1 }));
}

export function pointTime(p: RewindPoint): string {
  const d = new Date(p.ts);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function pointsText(points: RewindPoint[]): string {
  if (!points.length) return "No point to return to yet.";
  return points.map((p) => `${String(p.n).padStart(2)}. ${pointTime(p)}  ${p.label}`).join("\n");
}

export interface RewindResult {
  point: RewindPoint;
  nodes: string[];
  decisions: { key: string; from: unknown; to: unknown }[];
  text?: string;
}

export function rewindText(r: RewindResult, steps: Map<string, number> = new Map()): string {
  const name = (id: string) => (steps.has(id) ? `step ${steps.get(id)}` : id);
  const parts = [`Returned to: ${r.point.label}.`];
  parts.push(r.nodes.length ? `${r.nodes.length === 1 ? "One result is" : `${r.nodes.length} results are`} marked rewound: ${r.nodes.map(name).join(", ")}. The files stay in the folder.` : "No result is marked rewound.");
  if (r.decisions.length) parts.push(`Decisions returned to their earlier values: ${r.decisions.map((d) => `${d.key} ${JSON.stringify(d.from)} to ${JSON.stringify(d.to)}`).join("; ")}.`);
  if (r.text) parts.push(`Your message was: "${clip(r.text, 200)}". Type it again or change it.`);
  return parts.join(" ");
}
