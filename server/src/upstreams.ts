import { MAX_OUTPUT_TOKENS, PRICES, type Price } from "./pricing.ts";

export type Kind = "anthropic" | "openai";

export interface Upstream {
  kind: Kind;
  baseUrl: string;
  keySecretName: string;
  upstreamModel: string;
  price: Price;
  maxOutputTokens: number;
}

export type UpstreamTable = Map<string, Upstream>;

function defaults(): UpstreamTable {
  const table: UpstreamTable = new Map();
  for (const [name, price] of Object.entries(PRICES)) {
    table.set(name, { kind: "anthropic", baseUrl: "https://api.anthropic.com/v1", keySecretName: "ANTHROPIC_API_KEY", upstreamModel: name, price, maxOutputTokens: MAX_OUTPUT_TOKENS });
  }
  return table;
}

const bad = (name: string, why: string) => new Error(`UPSTREAMS "${name}": ${why}`);

function amount(name: string, field: string, v: unknown, fallback?: number): number {
  if (v === undefined && fallback !== undefined) return fallback;
  if (typeof v !== "number" || !Number.isFinite(v) || v < 0) throw bad(name, `price.${field} must be a number that is not negative.`);
  return v;
}

function parseEntry(name: string, e: any): Upstream {
  if (!e || typeof e !== "object" || Array.isArray(e)) throw bad(name, "the entry must be an object.");
  if (e.kind !== "anthropic" && e.kind !== "openai") throw bad(name, 'kind must be "anthropic" or "openai".');
  if (typeof e.base_url !== "string") throw bad(name, "base_url must be a string.");
  let url: URL;
  try {
    url = new URL(e.base_url);
  } catch {
    throw bad(name, "base_url is not a URL.");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") throw bad(name, "base_url must start with http:// or https://.");
  if (typeof e.key_secret_name !== "string" || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(e.key_secret_name)) throw bad(name, "key_secret_name must be the name of a Worker secret.");
  if (typeof e.upstream_model !== "string" || !e.upstream_model) throw bad(name, "upstream_model must be a string that is not empty.");
  if (!Number.isInteger(e.max_output_tokens) || e.max_output_tokens < 1) throw bad(name, "max_output_tokens must be a positive integer.");
  const p = e.price;
  if (!p || typeof p !== "object") throw bad(name, "price must be an object.");
  const input = amount(name, "input", p.input);
  const anthropic = e.kind === "anthropic";
  const price: Price = {
    input,
    output: amount(name, "output", p.output),
    cacheRead: amount(name, "cache_read", p.cache_read, input),
    cacheWrite5m: amount(name, "cache_write_5m", p.cache_write_5m, anthropic ? input * 1.25 : 0),
    cacheWrite1h: amount(name, "cache_write_1h", p.cache_write_1h, anthropic ? input * 2 : 0),
  };
  return { kind: e.kind, baseUrl: e.base_url.replace(/\/+$/, ""), keySecretName: e.key_secret_name, upstreamModel: e.upstream_model, price, maxOutputTokens: e.max_output_tokens };
}

export function loadUpstreams(raw: unknown): UpstreamTable {
  const table = defaults();
  if (raw === undefined || raw === null || raw === "") return table;
  let config: unknown = raw;
  if (typeof raw === "string") {
    try {
      config = JSON.parse(raw);
    } catch {
      throw new Error("UPSTREAMS is not valid JSON.");
    }
  }
  if (!config || typeof config !== "object" || Array.isArray(config)) throw new Error("UPSTREAMS must be a JSON object.");
  for (const [name, entry] of Object.entries(config)) table.set(name, parseEntry(name, entry));
  return table;
}

export function answerPrice(table: UpstreamTable, model: string): Price | undefined {
  const direct = table.get(model);
  if (direct?.kind === "anthropic") return direct.price;
  for (const u of table.values()) if (u.kind === "anthropic" && u.upstreamModel === model) return u.price;
  return undefined;
}
