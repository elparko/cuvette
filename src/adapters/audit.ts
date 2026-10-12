import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { dollars, costUsd } from "../core/spend.ts";
import type { Provider } from "../core/types.ts";
import { makeProvider } from "../providers/index.ts";
import { fileHash, listFiles } from "./source.ts";
import { ROOT } from "../root.ts";

export const REVIEW_PROMPT = join(ROOT, "registry-template/.github/review-prompt.md");
export const REVIEW_MODEL = "claude:claude-sonnet-5-5";

export type Verdict = "pass" | "needs-changes" | "reject" | "unknown";

export interface Audit {
  verdict: Verdict;
  reasons: string[];
  cost: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
}

export interface LintSummary {
  ok: boolean;
  errors: string[];
  warnings: string[];
}

const FILE_CAP = 60_000;
const TOTAL_CAP = 300_000;
const OUTPUT_ESTIMATE = 1500;

export const reviewPrompt = () => readFileSync(REVIEW_PROMPT, "utf8");

export function bundle(dir: string, lint: LintSummary): string {
  const out = [`Lint result: ${lint.ok ? "passes" : "fails"}. Errors: ${lint.errors.length}. Warnings: ${lint.warnings.length}.`, ...lint.errors.slice(0, 20).map((e) => `error: ${e}`), ...lint.warnings.slice(0, 20).map((w) => `warning: ${w}`), ""];
  let used = 0;
  for (const f of listFiles(dir)) {
    const p = join(dir, f);
    const size = statSync(p).size;
    const buf = readFileSync(p);
    const binary = buf.subarray(0, 2048).includes(0);
    if (binary) {
      out.push(`=== FILE ${f} (binary, ${size} bytes, sha256 ${fileHash(p)}) ===`);
      continue;
    }
    const cap = f.startsWith("data/") ? 1000 : Math.min(FILE_CAP, Math.max(0, TOTAL_CAP - used));
    const text = buf.toString("utf8");
    used += Math.min(text.length, cap);
    out.push(`=== FILE ${f} (${size} bytes) ===`, text.slice(0, cap), text.length > cap ? `[cut after ${cap} characters]` : "", `=== END ${f} ===`);
  }
  return out.join("\n");
}

const modelId = (spec: string) => spec.replace(/^claude:/, "");

export function estimateReview(dir: string, lint: LintSummary, spec = REVIEW_MODEL): { tokens: number; usd: number; text: string } {
  const tokens = Math.ceil((reviewPrompt().length + bundle(dir, lint).length) / 3.5);
  const usd = costUsd(modelId(spec), { inputTokens: tokens, outputTokens: OUTPUT_ESTIMATE });
  return { tokens, usd, text: `about ${dollars(usd)} with ${modelId(spec)} (${Math.round(tokens / 1000)}k tokens in)` };
}

export function parseVerdict(text: string): { verdict: Verdict; reasons: string[] } {
  const v = /^\s*VERDICT:\s*(pass|needs-changes|reject)\b/im.exec(text)?.[1]?.toLowerCase() as Verdict | undefined;
  const reasons = text.split("\n").filter((l) => /^\s*[-*]\s+\S/.test(l)).map((l) => l.replace(/^\s*[-*]\s+/, "").trim()).slice(0, 14);
  return v ? { verdict: v, reasons } : { verdict: "unknown", reasons: ["The reply had no VERDICT line. Treat the adapter as not reviewed.", ...reasons] };
}

export async function runReview(dir: string, lint: LintSummary, opts: { model?: string; provider?: Provider } = {}): Promise<Audit> {
  const spec = opts.model ?? REVIEW_MODEL;
  const provider = opts.provider ?? (await makeProvider(spec));
  const r = await provider.step({ system: reviewPrompt(), tools: [], messages: [{ role: "user", parts: [{ type: "text", text: bundle(dir, lint) }] }] });
  const text = r.message.parts.flatMap((p) => (p.type === "text" ? [p.text] : [])).join("\n");
  const { verdict, reasons } = parseVerdict(text);
  const model = provider.info.model || modelId(spec);
  return { verdict, reasons, model, cost: dollars(costUsd(model, r.usage)), inputTokens: r.usage.inputTokens, outputTokens: r.usage.outputTokens };
}

export function auditLines(a: Audit): string[] {
  return [
    `Claude review: ${a.verdict}.`,
    ...a.reasons.map((r) => `  - ${r}`),
    `Review cost: ${a.cost} (${a.model}, ${a.inputTokens} tokens in, ${a.outputTokens} tokens out).`,
    "The review is advice. It does not replace reading the code.",
  ];
}
