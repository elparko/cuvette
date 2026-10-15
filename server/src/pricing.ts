export interface Price {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite5m: number;
  cacheWrite1h: number;
}

export interface Tokens {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite5m: number;
  cacheWrite1h: number;
}

const list = (input: number, output: number, cacheRead: number, cacheWrite5m: number): Price => ({ input, output, cacheRead, cacheWrite5m, cacheWrite1h: input * 2 });

export const PRICES: Record<string, Price> = {
  "claude-opus-5-5": list(4, 20, 0.2, 5),
  "claude-sonnet-5-5": list(2, 10, 0.2, 2.5),
  "claude-haiku-5-5": list(0.1, 0.5, 0.01, 0.125),
  "claude-fable-5-1": list(10, 50, 0.25, 12.5),
};

const MOST_EXPENSIVE = PRICES["claude-fable-5-1"]!;

export const MAX_OUTPUT_TOKENS = 64000;

export function priceOf(model: string): Price | undefined {
  return Object.hasOwn(PRICES, model) ? PRICES[model] : undefined;
}

export function listCost(price: Price | undefined, t: Tokens): number {
  const p = price ?? MOST_EXPENSIVE;
  return (t.input * p.input + t.output * p.output + t.cacheRead * p.cacheRead + t.cacheWrite5m * p.cacheWrite5m + t.cacheWrite1h * p.cacheWrite1h) / 1e6;
}

export function reservationCost(price: Price, bodyBytes: number, maxTokens: number): number {
  const input = Math.ceil(bodyBytes / 2);
  return listCost(price, { input, output: maxTokens, cacheRead: 0, cacheWrite5m: 0, cacheWrite1h: 0 });
}
