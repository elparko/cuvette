export interface CostFit {
  a: number;
  b: number;
  lo: number;
  hi: number;
}

export const COST_FITS: Record<string, CostFit> = {
  "claude-haiku-5-5": { a: -5.3043, b: 0.472, lo: -0.7984, hi: 0.8968 },
  "claude-opus-5-5": { a: -1.8932, b: 0.427, lo: -0.6276, hi: 0.6854 },
  "claude-sonnet-5-5": { a: -2.6026, b: 0.3417, lo: -0.6965, hi: 0.7617 },
};

export const REFERENCE_MODEL = "claude-sonnet-5-5";

export const TOKEN_MIX = {"inputTokens":20,"outputTokens":4604,"cacheRead":125447,"cacheWrite":27391};
