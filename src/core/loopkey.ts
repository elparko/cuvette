import { createHash } from "node:crypto";
import type { ToolOutput } from "./types.ts";

const DROPPED_KEY = /duration|elapsed|timing|timestamp|runtime|wall_?time|^(ts|script|pid|started|finished|started_at|finished_at|created_at|updated_at|(job|run|call|task|request)_?id)$/i;

const RULES: [RegExp, string][] = [
  [/\d{4}-\d\d-\d\d[T ]\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|[+-]\d\d:?\d\d)?/g, "<time>"],
  [/(?:\/private)?\/(?:var\/folders|tmp|var\/tmp)\/[^\s"'`]+|[A-Za-z]:\\[^\s"'`]*\\Temp\\[^\s"'`]+/g, "<tmp>"],
  [/\b(?:call_|toolu_)[A-Za-z0-9]{6,}\b|\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/g, "<id>"],
  [/([\w.]+)-\d+(?=[\\/])/g, "$1-N"],
  [/([\\/][\w.]*?)-\d+(?=\.\w{1,5}\b)/g, "$1-N"],
];

const EDGE = 20_000;

export function normalizeText(s: string): string {
  const cut = s.length > 2 * EDGE ? `${s.slice(0, EDGE)}[${s.length} characters]${s.slice(-EDGE)}` : s;
  return RULES.reduce((t, [re, to]) => t.replace(re, to), cut);
}

export function normalizeFileName(s: string): string {
  return normalizeText(s).replace(/([\w]+)-\d+(?=\.\w{1,5}$)/, "$1-N");
}

export function normalizeValue(v: unknown): unknown {
  if (typeof v === "string") return normalizeText(v);
  if (Array.isArray(v)) return v.map(normalizeValue);
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).filter(([k]) => !DROPPED_KEY.test(k)).map(([k, x]) => [k, normalizeValue(x)]));
  return v;
}

export function resultKey(o: ToolOutput): string {
  const body = JSON.stringify(normalizeValue({ ok: o.ok, error: o.error, summary: o.summary, text: o.text, metrics: o.metrics, data: o.data, table: o.table }));
  const files = (o.outputs ?? []).map((f) => normalizeFileName(f.name ?? f.path.split(/[\\/]/).pop() ?? ""));
  return createHash("sha1").update(body).update(JSON.stringify(files)).digest("hex");
}
