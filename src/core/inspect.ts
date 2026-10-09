import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runProcess } from "../adapters/kinds/common.ts";
import { scriptPython } from "../tools/run_script.ts";

export interface Inspection {
  ok: boolean;
  error?: string;
  kind: "folder" | "image" | "table" | "file";
  summary: string;
  colors: string[];
  kinds: string[];
  images_seen: boolean;
  previews: string[];
  tokens?: string[];
  groups?: { name: string; files: number; fields: number; samples: string[] }[];
  columns?: { name: string; type: string; values?: Record<string, number> }[];
}

const SCRIPT = join(fileURLToPath(new URL(".", import.meta.url)), "..", "tools", "inspect_data.py");

export async function inspectData(path: string, outDir: string, signal?: AbortSignal): Promise<Inspection> {
  const target = resolve(path);
  if (!existsSync(target)) return { ok: false, error: `No file or folder at ${target}.`, kind: "file", summary: "", colors: [], kinds: [], images_seen: false, previews: [] };
  const r = await runProcess([scriptPython(), "-I", SCRIPT, target, outDir], { signal, timeoutMs: 120_000, maxBytes: 4_000_000 });
  const line = r.stdout.trim().split("\n").at(-1) ?? "";
  try {
    return JSON.parse(line) as Inspection;
  } catch {
    return { ok: false, error: `The inspection did not run: ${(r.stderr || r.error || "no output").trim().split("\n").slice(-3).join(" ")}`, kind: "file", summary: "", colors: [], kinds: [], images_seen: false, previews: [] };
  }
}

export const STAINS: { color: string; rx: RegExp }[] = [
  { color: "blue", rx: /\b(dapi|hoechst|blue|nuclear stain|nuclei|nuclear|nucleus)\b/i },
  { color: "green", rx: /\b(green|gfp|fitc|alexa ?488|calcein)\b/i },
  { color: "far red", rx: /\b(far[- ]red|cy5|alexa ?647)\b/i },
  { color: "red", rx: /\b(?<!far[- ])(red|rfp|mcherry|tritc|texas red|alexa ?(568|594))\b/i },
];

export function absentStains(text: string, insp: Inspection): string[] {
  if (!insp.images_seen) return [];
  const present = new Set(insp.colors);
  if (insp.kinds.includes("fluorescence") && !insp.colors.length) return [];
  return [...new Set(STAINS.filter((s) => !present.has(s.color) && s.rx.test(text)).map((s) => s.color))];
}

export interface Grounded<Q> {
  kept: Q[];
  dropped: { question: string; reason: string }[];
}

export function groundQuestions<Q extends { question: string; options: string[] }>(qs: Q[], insp: Inspection | undefined): Grounded<Q> {
  if (!insp) return { kept: qs, dropped: [] };
  const kept: Q[] = [];
  const dropped: { question: string; reason: string }[] = [];
  const why = (colors: string[]) => `The data has no ${colors.join(" or ")} channel or stain. ${insp.summary}`;
  for (const q of qs) {
    const bad = absentStains(q.question, insp);
    if (bad.length) {
      dropped.push({ question: q.question, reason: why(bad) });
      continue;
    }
    const options = q.options.filter((o) => !absentStains(o, insp).length);
    if (q.options.length && !options.length) {
      dropped.push({ question: q.question, reason: why(absentStains(q.options.join(" "), insp)) });
      continue;
    }
    if (options.length < q.options.length) dropped.push({ question: `${q.question} (options: ${q.options.filter((o) => !options.includes(o)).join("; ")})`, reason: why(absentStains(q.options.join(" "), insp)) });
    kept.push({ ...q, options });
  }
  return { kept, dropped };
}
