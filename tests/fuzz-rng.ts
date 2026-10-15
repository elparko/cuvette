// A small seeded generator (mulberry32) for the fuzz tests.
// Set CUVETTE_FUZZ=<n> to multiply the run count. Set CUVETTE_FUZZ_SEED=<n> to move every seed.

export const FUZZ_SCALE = Math.max(1, Number(process.env.CUVETTE_FUZZ) || 1);
export const FUZZ_SEED = Number(process.env.CUVETTE_FUZZ_SEED) || 0;

export class Rng {
  private s: number;
  constructor(seed: number) {
    this.s = (seed + FUZZ_SEED) >>> 0;
  }
  next(): number {
    let t = (this.s = (this.s + 0x6d2b79f5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  int(lo: number, hi: number): number {
    return lo + Math.floor(this.next() * (hi - lo + 1));
  }
  bool(p = 0.5): boolean {
    return this.next() < p;
  }
  pick<T>(xs: readonly T[]): T {
    return xs[Math.floor(this.next() * xs.length)]!;
  }
  logUniform(lo: number, hi: number): number {
    return Math.exp(Math.log(lo) + this.next() * (Math.log(hi) - Math.log(lo)));
  }
  string(alphabet: string | readonly string[], min: number, max: number): string {
    const chars = typeof alphabet === "string" ? [...alphabet] : alphabet;
    let out = "";
    for (let n = this.int(min, max); n > 0; n--) out += this.pick(chars);
    return out;
  }
  bytes(n: number): Buffer {
    return Buffer.from(Array.from({ length: n }, () => this.int(0, 255)));
  }
}

export function runs(n: number): number {
  return n * FUZZ_SCALE;
}

export function msFor(f: () => void): number {
  if (process.platform === "win32") {
    const start = performance.now();
    f();
    return performance.now() - start;
  }
  const t = process.cpuUsage();
  f();
  const d = process.cpuUsage(t);
  return (d.user + d.system) / 1000;
}

// Linear growth gives a ratio near 4 for a four times longer input. A quadratic cost gives about 16.
export function linear(make: (n: number) => string, run: (s: string) => void, n = 10000): { small: number; big: number; ok: boolean } {
  run(make(200));
  const best = (size: number) => Math.min(...Array.from({ length: 5 }, () => msFor(() => run(make(size)))));
  const small = best(n);
  const big = best(4 * n);
  return { small, big, ok: big < 40 || big < (process.platform === "win32" ? Math.max(small, 10) : small) * 9 };
}
