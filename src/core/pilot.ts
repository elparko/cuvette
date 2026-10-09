import { existsSync, statSync } from "node:fs";
import type { AnalysisRecord } from "./record.ts";
import type { Args, Entry } from "./types.ts";

export const BATCH_FILES = 3;

const OUTPUT_ARG = /^(out|output|dest|save|work|session|cwd)/i;
const LOOP = /\bfor\s+[\w, ()]+\s+in\s+[^\n:]*\b(?:glob|rglob|listdir|scandir|walk|iterdir|list\.files)\b|\b(?:lapply|sapply|map)\s*\(\s*(?:list\.files|glob|os\.listdir|sorted\s*\(\s*glob)/;

const looksLikePath = (s: unknown) => typeof s === "string" && /^(?:\/|~\/|[A-Za-z]:\\)/.test(s);

function isDir(p: string): boolean {
  try {
    return existsSync(p) && statSync(p).isDirectory();
  } catch {
    return false;
  }
}

export function batchReason(tool: string, args: Args, declared = false, threshold = BATCH_FILES): string | undefined {
  if (declared) return `${tool} is a batch tool in its adapter.`;
  for (const [k, v] of Object.entries(args)) {
    if (OUTPUT_ARG.test(k)) continue;
    if (Array.isArray(v) && v.filter(looksLikePath).length >= threshold) return `${tool} gets ${v.length} input files in ${k}.`;
    if (looksLikePath(v) && isDir(String(v)) && k !== "code") return `${tool} gets the folder ${String(v)}.`;
  }
  if (tool === "run_script" && typeof args.code === "string" && LOOP.test(args.code)) return "The script loops over the files in a folder.";
  return undefined;
}

export interface PilotRun {
  entry: number;
  sample: string;
  values: Record<string, number>;
  images: string[];
  check: string;
  comparison: string[];
  reference?: { path: string; mode: string; values?: Record<string, number> };
  definitions: { measure: string; definition: string }[];
}

export function lastPilot(record: AnalysisRecord): PilotRun | undefined {
  const e = record.entries(["pilot_run"]).at(-1);
  return e ? ({ entry: e.id, ...(e.data as object) } as PilotRun) : undefined;
}

export function pilotState(record: AnalysisRecord): { approved?: Entry; stale?: string } {
  const approved = record.entries(["pilot_approved"]).at(-1);
  if (!approved) return {};
  const later = record.entries(["decision", "adapter"]).filter((e) => e.id > approved.id && (e.kind === "adapter" || (e.data.old !== undefined && e.data.old !== null)));
  const first = later[0];
  if (!first) return { approved };
  const what = first.kind === "adapter" ? `the program changed (${String(first.data.name)} loaded)` : String(first.data.key).startsWith("definition:") ? `the definition of ${String(first.data.key).slice(11)} changed` : `${String(first.data.key)} changed to ${JSON.stringify(first.data.new)}`;
  return { approved, stale: `${what} after the pilot` };
}

export function pilotText(p: Omit<PilotRun, "entry">): string {
  const lines = [`Pilot sample: ${p.sample}`, "", "Numbers"];
  for (const [k, v] of Object.entries(p.values)) {
    const def = p.definitions.find((d) => d.measure.toLowerCase() === k.toLowerCase());
    lines.push(`- ${k}: ${v}${def ? `. ${def.definition}` : ""}`);
  }
  if (p.comparison.length) lines.push("", "Against the reference", ...p.comparison.map((c) => `- ${c}`));
  else if (p.reference?.mode === "blind") lines.push("", "The reference is held back for the blind test. The harness compares every sample after the batch.");
  else lines.push("", "No reference to compare with. Judge the method from the QC images. A quick hand count of this sample is a good check.");
  if (p.images.length) lines.push("", "QC images (opened on screen)", ...p.images.map((i) => `- ${i}`));
  if (p.check) lines.push("", `The agent's check: ${p.check}`);
  return lines.join("\n");
}

export function pilotRows(record: AnalysisRecord): { columns: string[]; rows: (string | number)[][] } {
  const status = new Map<number, string>();
  for (const e of record.entries(["pilot_approved", "pilot_rejected"])) status.set(Number(e.data.run), e.kind === "pilot_approved" ? "approved" : `rejected${e.data.reason ? `: ${String(e.data.reason)}` : ""}`);
  const rows: (string | number)[][] = [];
  for (const e of record.entries(["pilot_run"])) {
    const d = e.data as unknown as Omit<PilotRun, "entry">;
    for (const [k, v] of Object.entries(d.values ?? {})) {
      const ref = Object.entries(d.reference?.values ?? {})[0];
      rows.push([e.id, d.sample, k, v, d.definitions?.find((x) => x.measure.toLowerCase() === k.toLowerCase())?.definition ?? "", ref ? `${ref[0]} = ${ref[1]}` : d.reference?.mode === "blind" ? "held back" : "none", status.get(e.id) ?? "waiting", (d.images ?? []).join("; ")]);
    }
  }
  return { columns: ["Run", "Sample", "Measure", "Value", "Definition", "Reference", "Status", "QC images"], rows };
}

export function validationRows(record: AnalysisRecord): { columns: string[]; rows: (string | number)[][]; summary: string[]; plot?: string } | undefined {
  const v = record.entries(["validation"]).at(-1);
  if (!v) return undefined;
  const pairs = (v.data.pairs as { sample: string; ours: number; ref: number; pilot: boolean }[]) ?? [];
  return {
    columns: ["Sample", "Agent", "Reference", "Difference", "Percent", "Pilot sample"],
    rows: pairs.map((p) => [p.sample, p.ours, p.ref, Number((p.ours - p.ref).toPrecision(6)), p.ref ? Number((((p.ours - p.ref) / p.ref) * 100).toFixed(1)) : "", p.pilot ? "yes" : ""]),
    summary: (v.data.summary as string[]) ?? [],
    plot: v.data.plot as string | undefined,
  };
}
