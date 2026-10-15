import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve as resolvePath } from "node:path";
import { fileURLToPath } from "node:url";
import { AccountError, CUVETTE_NOTICE, getAccount, NOT_SIGNED_IN } from "./account.ts";
import { hostedMode } from "./hosted.ts";
import { KEY_GUIDE } from "./keyhelp.ts";
import { claudeKey, cuvetteToken, keyProblem, saveClaudeKey } from "./credentials.ts";
import { changeSetting, find, resolve } from "./settings.ts";
import { DEFAULT_CLAUDE_MODEL, listedClaudeIds } from "../providers/index.ts";

export type ModelChoice = "claude" | "cuvette" | "local";

export const CHOICES: { id: ModelChoice; label: string; help: string }[] = [
  { id: "claude", label: "Use Claude (needs an API key)", help: "Claude does the analysis. You pay Anthropic for each request. No key yet? Choose this, then ask for help to get a key." },
  { id: "local", label: "Use a local model (Ollama, free, runs on this Mac)", help: "A model on this Mac does the analysis. Nothing leaves the Mac. Small models make more mistakes than Claude." },
];

export const APP_CHOICES: { id: ModelChoice; label: string; help: string }[] = [
  CHOICES[0]!,
  { id: "cuvette", label: "Pay Cuvette for inference", help: `You sign in, and you pay Cuvette with a plan or a top-up. You need no API key. ${CUVETTE_NOTICE}` },
  CHOICES[1]!,
];

export const choicesFor = (env: Record<string, string | undefined> = process.env) => (hostedMode(env) ? APP_CHOICES : CHOICES);

export const hostedSignedIn = (env: Record<string, string | undefined> = process.env): boolean => hostedMode(env) && cuvetteToken(env).from !== "none";

export const RECOMMENDED_LOCAL = "qwen3:8b";
export const SAMPLE_DIR = resolvePath(dirname(fileURLToPath(import.meta.url)), "../../samples/sleep");
export const SAMPLE_REQUEST = "Is drug 2 better than drug 1? The data are in sleep.csv: extra hours of sleep for 10 patients, each measured with both drugs.";

export interface Ctx {
  cwd?: string;
  env?: Record<string, string | undefined>;
  fetch?: typeof fetch;
}

export interface OllamaState {
  reachable: boolean;
  models: string[];
  recommended?: string;
}

export interface FirstStartState {
  needed: boolean;
  hasKey: boolean;
  model: string;
  ollama: OllamaState;
}

export async function ollamaState(ctx: Ctx = {}): Promise<OllamaState> {
  const env = ctx.env ?? process.env;
  const host = (env.OLLAMA_HOST || "http://localhost:11434").replace(/\/$/, "");
  try {
    const res = await (ctx.fetch ?? fetch)(`${host}/api/tags`, { signal: AbortSignal.timeout(1500) });
    if (!res.ok) return { reachable: false, models: [] };
    const j = (await res.json()) as { models?: { name: string; capabilities?: string[] }[] };
    const all = j.models ?? [];
    const models = all.filter((m) => !Array.isArray(m.capabilities) || m.capabilities.includes("tools")).map((m) => m.name);
    const recommended = models.find((m) => m === RECOMMENDED_LOCAL) ?? models.find((m) => m.startsWith("qwen3")) ?? models[0];
    return { reachable: true, models, recommended };
  } catch {
    return { reachable: false, models: [] };
  }
}

export function savedModel(ctx: Ctx = {}): string {
  return String(resolve(find("model")!, { cwd: ctx.cwd ?? process.cwd(), env: ctx.env }).value ?? "claude");
}

export function needsFirstStart(ctx: Ctx = {}): boolean {
  const env = ctx.env ?? process.env;
  return claudeKey(env).from === "none" && savedModel(ctx).startsWith("claude") && !hostedSignedIn(env);
}

export async function firstStartState(ctx: Ctx = {}): Promise<FirstStartState> {
  return { needed: needsFirstStart(ctx), hasKey: claudeKey(ctx.env ?? process.env).from !== "none", model: savedModel(ctx), ollama: await ollamaState(ctx) };
}

export async function chooseClaude(key: string, ctx: Ctx & { check?: (key: string) => Promise<{ ok: boolean; text: string }> } = {}): Promise<{ ok: boolean; text: string }> {
  const k = key.trim();
  const problem = keyProblem(k);
  if (problem) return { ok: false, text: problem };
  const check = ctx.check ?? (await import("../providers/claude.ts")).checkClaudeKey;
  const r = await check(k);
  if (!r.ok) return r;
  const path = saveClaudeKey(k);
  await changeSetting({ cwd: ctx.cwd ?? process.cwd(), env: ctx.env }, "model", "claude", "user");
  return { ok: true, text: `${r.text} Saved the key to ${path}. The model is Claude.` };
}

export const firstListedModel = (models: string[]): string | undefined => {
  const listed = listedClaudeIds();
  return models.find((m) => listed.includes(m));
};

export async function keepModelInPlan(ctx: Ctx, models: string[]): Promise<string | undefined> {
  const saved = savedModel(ctx);
  if (saved !== "cuvette" && !saved.startsWith("cuvette:")) return undefined;
  if (!models.length || models.includes(saved.slice("cuvette:".length) || DEFAULT_CLAUDE_MODEL)) return undefined;
  const next = firstListedModel(models);
  if (!next) return undefined;
  await changeSetting({ cwd: ctx.cwd ?? process.cwd(), env: ctx.env }, "model", `cuvette:${next}`, "user");
  return next;
}

export async function chooseCuvette(ctx: Ctx = {}, opts: { onlyIfNoKey?: boolean } = {}): Promise<{ ok: boolean; text: string }> {
  const env = ctx.env ?? process.env;
  if (cuvetteToken(env).from === "none") return { ok: false, text: NOT_SIGNED_IN };
  if (opts.onlyIfNoKey && claudeKey(env).from !== "none") return { ok: true, text: "You are signed in to Cuvette. The model stays the same." };
  let id: string | undefined;
  try {
    id = firstListedModel((await getAccount({ env, fetch: ctx.fetch })).models);
  } catch (e) {
    if (!(e instanceof AccountError)) throw e;
  }
  await changeSetting({ cwd: ctx.cwd ?? process.cwd(), env: ctx.env }, "model", id ? `cuvette:${id}` : "cuvette", "user");
  return { ok: true, text: `You are signed in to Cuvette. The model is Claude${id ? ` (${id})` : ""}, paid through Cuvette.` };
}

export async function chooseLocal(model: string | undefined, ctx: Ctx = {}): Promise<{ ok: boolean; text: string; model: string }> {
  const name = (model?.trim() || RECOMMENDED_LOCAL).replace(/^ollama:/, "");
  await changeSetting({ cwd: ctx.cwd ?? process.cwd(), env: ctx.env }, "model", `ollama:${name}`, "user");
  const o = await ollamaState(ctx);
  const text = !o.reachable
    ? `Saved the model ollama:${name}. Ollama does not run on this Mac yet. Install it: brew install ollama (or download https://ollama.com/download). Then get the model: ollama pull ${name}.`
    : !o.models.includes(name)
      ? `Saved the model ollama:${name}. Ollama does not have it yet. Get it: ollama pull ${name}.`
      : `Saved the model ollama:${name}.`;
  return { ok: o.reachable && o.models.includes(name), text, model: `ollama:${name}` };
}

export function sampleFolder(): string {
  const docs = join(homedir(), "Documents");
  return join(existsSync(docs) ? docs : homedir(), "Cuvette sample");
}

export function copySample(dest = sampleFolder()): { folder: string; file: string; request: string } {
  mkdirSync(dest, { recursive: true });
  const file = join(dest, "sleep.csv");
  copyFileSync(join(SAMPLE_DIR, "sleep.csv"), file);
  return { folder: dest, file, request: SAMPLE_REQUEST };
}
