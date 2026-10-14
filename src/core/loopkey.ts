import { createHash } from "node:crypto";
import type { ToolOutput } from "./types.ts";

const DROPPED_KEY = /^(duration(_?(s|ms|seconds))?|elapsed(_?(s|ms|seconds))?|timings?|timestamps?|runtime(_?s)?|wall_?time(_?s)?|ts|script|pid|started|finished|started_at|finished_at|created_at|updated_at|(job|run|call|task|request)_?id)$/i;

const RULES: [RegExp, string][] = [
  [/\d{4}-\d\d-\d\d[T ]\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|[+-]\d\d:?\d\d)?/g, "<time>"],
  [/(?:\/private)?\/(?:var\/folders|tmp|var\/tmp)\/[^\s"'`,;)\]}]+|[A-Za-z]:\\[^\s"'`,;)\]}]*\\Temp\\[^\s"'`,;)\]}]+/g, "<tmp>"],
  [/\b(?:call_|toolu_)[A-Za-z0-9]{6,}\b|\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/g, "<id>"],
];

const EDGE = 20_000;
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function counters(rest: string): string {
  return rest.replace(/([\w.]+)-\d+(?=[\\/])/g, "$1-N").replace(/([\w]+)-\d+(?=\.\w{1,5}(?![\w]))/g, "$1-N");
}

export function normalizeText(s: string, workDir?: string): string {
  const cut = s.length > 2 * EDGE ? `${s.slice(0, EDGE)}[${s.length} characters]${s.slice(-EDGE)}` : s;
  const home = workDir ? cut.replace(new RegExp(`${escape(workDir)}([\\\\/][^\\s"'\`,;)\\]}]*)`, "g"), (_m, rest: string) => `<work>${counters(rest)}`) : cut;
  return RULES.reduce((t, [re, to]) => t.replace(re, to), home);
}

export function normalizeFileName(name: string, path: string, workDir?: string): string {
  return workDir && path.startsWith(workDir) ? counters(name) : name;
}

export function normalizeValue(v: unknown, workDir?: string): unknown {
  if (typeof v === "string") return normalizeText(v, workDir);
  if (Array.isArray(v)) return v.map((x) => normalizeValue(x, workDir));
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).filter(([k]) => !DROPPED_KEY.test(k)).map(([k, x]) => [k, normalizeValue(x, workDir)]));
  return v;
}

export function resultKey(o: ToolOutput, workDir?: string): string {
  const body = JSON.stringify(normalizeValue({ ok: o.ok, error: o.error, summary: o.summary, text: o.text, metrics: o.metrics, data: o.data, table: o.table }, workDir));
  const files = (o.outputs ?? []).map((f) => normalizeFileName(f.name ?? f.path.split(/[\\/]/).pop() ?? "", f.path, workDir));
  return createHash("sha1").update(body).update(JSON.stringify(files)).digest("hex");
}
