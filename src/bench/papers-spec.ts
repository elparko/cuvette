import { existsSync, readdirSync, readFileSync } from "node:fs";
import { isAbsolute, join } from "node:path";
import { parse as parseYaml } from "yaml";
import { z } from "zod";
import { ROOT } from "../root.ts";

export const PAPERS_DIR = join(ROOT, "bench/papers");
export const DEFAULT_DATA_ROOT = "/Volumes/T7/guided-analysis/data";

const Item = z
  .strictObject({
    key: z.string().regex(/^[a-z0-9][a-z0-9_]*$/),
    description: z.string().default(""),
    value: z.number(),
    tolerance: z.number().nonnegative().optional(),
    exact: z.boolean().optional(),
    abs: z.boolean().default(false),
    in_answer: z.boolean().default(true),
    trap: z.boolean().default(false),
    optional: z.boolean().default(false),
    from_comparison: z.boolean().default(false),
    reference: z.boolean().default(false),
    tool: z.string().optional(),
    code: z.string().optional(),
  })
  .refine((i) => (i.tolerance === undefined) !== (i.exact === undefined), { message: "give exactly one of tolerance or exact" })
  .refine((i) => i.exact !== false, { message: "exact must be true when given" });

const Values = z.record(z.string(), z.unknown());

export const PaperSpec = z
  .strictObject({
    adapters: z.array(z.string()).min(1),
    prompt: z.string().min(20),
    setup: z.union([Values, z.string()]).default({}),
    answers: z.union([Values, z.string()]).default({}),
    allow: z.union([z.literal("all"), z.array(z.string())]).default("all"),
    timeout_s: z.number().int().positive().default(900),
    data: z.array(z.string()).default([]),
    plan: z.boolean().default(false),
    items: z.array(Item).min(1),
  })
  .refine((s) => new Set(s.items.map((i) => i.key)).size === s.items.length, { message: "item keys must be unique" });

export type PaperSpec = z.infer<typeof PaperSpec>;
export type PaperItem = PaperSpec["items"][number];
export type Paper = PaperSpec & { id: string; dir: string };

export function dataRoot(): string {
  return process.env.CUVETTE_BENCH_DATA || DEFAULT_DATA_ROOT;
}

export function resolveData(p: string): string {
  return isAbsolute(p) ? p : join(dataRoot(), p);
}

export function fillPrompt(prompt: string): string {
  return prompt.replaceAll("{data}", dataRoot());
}

export function paperIds(dir = PAPERS_DIR): string[] {
  return readdirSync(dir).filter((d) => existsSync(join(dir, d, "bench.yaml"))).sort();
}

export function loadPaper(id: string, dir = PAPERS_DIR): Paper {
  const folder = join(dir, id);
  const file = join(folder, "bench.yaml");
  if (!existsSync(file)) throw new Error(`no bench.yaml for ${id}`);
  const parsed = PaperSpec.safeParse(parseYaml(readFileSync(file, "utf8")));
  if (!parsed.success) throw new Error(`${id}/bench.yaml: ${parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`);
  return { ...parsed.data, id, dir: folder };
}

function fillData(x: unknown): unknown {
  if (typeof x === "string") return fillPrompt(x);
  if (Array.isArray(x)) return x.map(fillData);
  if (x && typeof x === "object") return Object.fromEntries(Object.entries(x).map(([k, v]) => [k, fillData(v)]));
  return x;
}

export function readValues(paper: Paper, which: "setup" | "answers"): Record<string, unknown> {
  const v = paper[which];
  const values = typeof v === "string" ? JSON.parse(readFileSync(isAbsolute(v) ? v : join(paper.dir, v), "utf8")) : v;
  return fillData(values) as Record<string, unknown>;
}

export function missingData(paper: Paper): string[] {
  return paper.data.map(resolveData).filter((p) => !existsSync(p));
}
