import { COST_FITS, REFERENCE_MODEL, TOKEN_MIX, type CostFit } from "./estimate-table.ts";
import { costUsd, CUVETTE_MARKUP, dollars, modelPrice } from "./spend.ts";

export interface CostRange {
  low: number;
  high: number;
}

const NAMES: [string, string][] = [
  ["opus", "Opus"],
  ["sonnet", "Sonnet"],
  ["haiku", "Haiku"],
  ["fable", "Fable"],
];

export const FREE_TEXT = "Free: runs on this computer.";

export function modelName(model: string): string {
  const id = model.replace(/^claude:/, "");
  return NAMES.find(([key]) => id.includes(key))?.[1] ?? id;
}

function band(f: CostFit, steps: number): CostRange {
  const mid = f.a + f.b * Math.log(Math.max(1, steps));
  return { low: Math.exp(mid + f.lo), high: Math.exp(mid + f.hi) };
}

export function estimateCost(model: string, steps: number): CostRange | undefined {
  const r = listEstimate(model.replace(/^(claude|cuvette):/, ""), steps);
  const k = model.startsWith("cuvette:") ? CUVETTE_MARKUP : 1;
  return r && { low: r.low * k, high: r.high * k };
}

function listEstimate(id: string, steps: number): CostRange | undefined {
  const own = COST_FITS[id];
  if (own) return band(own, steps);
  if (!modelPrice(id)) return undefined;
  const scale = costUsd(id, TOKEN_MIX) / costUsd(REFERENCE_MODEL, TOKEN_MIX);
  const ref = band(COST_FITS[REFERENCE_MODEL]!, steps);
  return { low: ref.low * scale, high: ref.high * scale };
}

const down = (n: number) => Math.floor(n * 100) / 100;
const up = (n: number) => Math.ceil(n * 100) / 100;

export function estimateText(model: string, steps: number, local: boolean, remaining?: number): string {
  if (local) return FREE_TEXT;
  const r = estimateCost(model, steps);
  if (!r) return "";
  const low = down(r.low);
  const high = up(r.high);
  const range = low < 0.01 ? `Up to about ${dollars(high)}` : `About ${dollars(low)} to ${dollars(high)}`;
  const text = `${range} with ${modelName(model)}.`;
  return remaining !== undefined && high > remaining ? `${text} Your limit has ${dollars(Math.max(0, remaining))} left this month.` : text;
}
