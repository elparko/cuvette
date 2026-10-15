import type { Provider } from "../core/types.ts";
import { ProviderError } from "../core/types.ts";
import { ClaudeProvider, DEFAULT_CLAUDE_MODEL } from "./claude.ts";
import { FakeProvider } from "./fake.ts";
import { OpenAIProvider } from "./openai.ts";
import type { Sleep } from "./retry.ts";
import { createOllama, ollamaHost, parseParamSize } from "./ollama.ts";

export { ClaudeProvider, FakeProvider, OpenAIProvider };
export { DEFAULT_CLAUDE_MODEL };

export interface ProviderOpts {
  effort?: string;
  numCtx?: number;
  think?: boolean;
  showThinking?: boolean;
  apiKey?: string;
  client?: any;
  cache?: "off" | "5m" | "1h";
  sleep?: Sleep;
  retries?: number;
}

export interface ModelListing {
  spec: string;
  label: string;
  local: boolean;
  tools: boolean;
  contextWindow: number;
}

export const CLAUDE_MODELS: ModelListing[] = [
  { spec: "claude:claude-opus-5-5", label: "Claude Opus 5.5 (default)", local: false, tools: true, contextWindow: 1_000_000 },
  { spec: "claude:claude-sonnet-5-5", label: "Claude Sonnet 5.5", local: false, tools: true, contextWindow: 1_000_000 },
  { spec: "claude:claude-haiku-5-5", label: "Claude Haiku 5.5", local: false, tools: true, contextWindow: 1_000_000 },
  { spec: "claude:claude-fable-5-1", label: "Claude Fable 5.1", local: false, tools: true, contextWindow: 1_000_000 },
];

export function modelSpecProblem(spec: string): string | undefined {
  const i = spec.indexOf(":");
  const kind = i < 0 ? spec : spec.slice(0, i);
  const rest = i < 0 ? "" : spec.slice(i + 1);
  if (kind === "claude" || kind === "fake") return undefined;
  if (kind === "ollama") return rest ? undefined : "Name an Ollama model, for example ollama:qwen3:8b";
  if (kind === "openai") {
    const bar = rest.lastIndexOf("|");
    return bar < 1 || bar === rest.length - 1 ? "Use openai:<base url>|<model>, for example openai:http://localhost:1234/v1|qwen3-8b" : undefined;
  }
  return "Use claude, claude:<id>, ollama:<model>, openai:<url>|<model>, or fake:<file>.";
}

export async function makeProvider(spec: string, opts: ProviderOpts = {}): Promise<Provider> {
  const i = spec.indexOf(":");
  const kind = i < 0 ? spec : spec.slice(0, i);
  const rest = i < 0 ? "" : spec.slice(i + 1);
  switch (kind) {
    case "claude":
      return new ClaudeProvider(rest || DEFAULT_CLAUDE_MODEL, opts);
    case "ollama":
      if (!rest) throw new ProviderError("Name an Ollama model, for example ollama:qwen3:8b");
      return createOllama(rest, opts);
    case "openai": {
      const bar = rest.lastIndexOf("|");
      if (bar < 1 || bar === rest.length - 1) throw new ProviderError("Use openai:<base url>|<model>, for example openai:http://localhost:1234/v1|qwen3-8b");
      return new OpenAIProvider(rest.slice(0, bar), rest.slice(bar + 1), opts);
    }
    case "fake":
      return rest ? FakeProvider.fromFile(rest) : new FakeProvider();
    default:
      throw new ProviderError(`Unknown model spec "${spec}". Use claude, claude:<id>, ollama:<model>, openai:<url>|<model>, or fake:<file>.`);
  }
}

export async function listModels(): Promise<ModelListing[]> {
  const list = [...CLAUDE_MODELS];
  try {
    const res = await fetch(`${ollamaHost()}/api/tags`, { signal: AbortSignal.timeout(1500) });
    if (!res.ok) return list;
    const j: any = await res.json();
    for (const m of j.models ?? []) {
      const caps: string[] | undefined = Array.isArray(m.capabilities) ? m.capabilities : undefined;
      const ctx = typeof m.details?.context_length === "number" ? m.details.context_length : 32768;
      const size = parseParamSize(m.details?.parameter_size);
      list.push({
        spec: `ollama:${m.name}`,
        label: `${m.name}${size ? ` (${m.details.parameter_size})` : ""}`,
        local: true,
        tools: caps ? caps.includes("tools") : true,
        contextWindow: Math.min(32768, ctx),
      });
    }
  } catch {}
  return list;
}
