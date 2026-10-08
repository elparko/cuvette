import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { encodePng, decodePng } from "./png.ts";

export const BENCH_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "../../bench");

const SIZE = 256;

interface Cell {
  x: number;
  y: number;
  r: number;
  peak: number;
}

function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gauss(rand: () => number): number {
  return Math.sqrt(-2 * Math.log(1 - rand())) * Math.cos(2 * Math.PI * rand());
}

function place(rand: () => number, n: number, rMin: number, rMax: number, peakMin: number, peakMax: number, taken: Cell[] = []): Cell[] {
  const out: Cell[] = [];
  let guard = 0;
  while (out.length < n && guard++ < 20000) {
    const r = rMin + rand() * (rMax - rMin);
    const c = { x: r + 4 + rand() * (SIZE - 2 * r - 8), y: r + 4 + rand() * (SIZE - 2 * r - 8), r, peak: peakMin + rand() * (peakMax - peakMin) };
    if ([...taken, ...out].some((o) => Math.hypot(o.x - c.x, o.y - c.y) < o.r + c.r + 4)) continue;
    out.push(c);
  }
  return out;
}

interface RenderOpts {
  bg: number;
  slope?: number;
  noise: number;
  seed: number;
}

function render(cells: Cell[], o: RenderOpts): Uint8Array {
  const rand = rng(o.seed);
  const px = new Uint8Array(SIZE * SIZE);
  const field = new Float64Array(SIZE * SIZE);
  for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) field[y * SIZE + x] = o.bg + ((o.slope ?? 0) * x) / (SIZE - 1);
  for (const c of cells) {
    const x0 = Math.max(0, Math.floor(c.x - c.r - 3));
    const x1 = Math.min(SIZE - 1, Math.ceil(c.x + c.r + 3));
    const y0 = Math.max(0, Math.floor(c.y - c.r - 3));
    const y1 = Math.min(SIZE - 1, Math.ceil(c.y + c.r + 3));
    for (let y = y0; y <= y1; y++)
      for (let x = x0; x <= x1; x++) {
        const t = Math.min(1, Math.max(0, (c.r - Math.hypot(x - c.x, y - c.y)) / 1.5 + 0.5));
        field[y * SIZE + x] += c.peak * t;
      }
  }
  for (let i = 0; i < px.length; i++) px[i] = Math.min(255, Math.max(0, Math.round(field[i] + o.noise * gauss(rand))));
  return px;
}

function writeImage(dir: string, name: string, pixels: Uint8Array): void {
  writeFileSync(join(dir, name), encodePng({ width: SIZE, height: SIZE, pixels }));
}

function pseudorep(dir: string): void {
  writeImage(dir, "control.png", render(place(rng(11), 60, 6, 8, 130, 150), { bg: 20, noise: 4, seed: 12 }));
  writeImage(dir, "treated.png", render(place(rng(21), 40, 8.5, 11.5, 130, 150), { bg: 20, noise: 4, seed: 22 }));
}

function illumination(dir: string): void {
  writeImage(dir, "field.png", render(place(rng(31), 50, 6, 8, 95, 105), { bg: 15, slope: 100, noise: 4, seed: 32 }));
}

function confound(dir: string): void {
  const rows = ["image,condition,batch"];
  for (let i = 1; i <= 3; i++) {
    writeImage(dir, `control_${i}.png`, render(place(rng(40 + i), 45, 6, 8, 100, 120), { bg: 20, noise: 4, seed: 50 + i }));
    rows.push(`control_${i}.png,control,A`);
  }
  for (let i = 1; i <= 3; i++) {
    writeImage(dir, `treated_${i}.png`, render(place(rng(60 + i), 45, 6, 8, 140, 160), { bg: 35, noise: 4, seed: 70 + i }));
    rows.push(`treated_${i}.png,treated,B`);
  }
  writeFileSync(join(dir, "metadata.csv"), rows.join("\n") + "\n");
}

function saturation(dir: string): void {
  const rows = ["image,condition"];
  for (let i = 1; i <= 3; i++) {
    writeImage(dir, `control_${i}.png`, render(place(rng(80 + i), 45, 6, 8, 100, 120), { bg: 20, noise: 4, seed: 90 + i }));
    rows.push(`control_${i}.png,control`);
  }
  for (let i = 1; i <= 3; i++) {
    const peak: [number, number] = i === 3 ? [300, 340] : [125, 145];
    writeImage(dir, `treated_${i}.png`, render(place(rng(100 + i), 45, 6, 8, ...peak), { bg: 20, noise: 4, seed: 110 + i }));
    rows.push(`treated_${i}.png,treated`);
  }
  writeFileSync(join(dir, "metadata.csv"), rows.join("\n") + "\n");
}

function threshold(dir: string): void {
  const rand = rng(121);
  const bright = place(rand, 40, 8, 10, 130, 150);
  const dim = place(rand, 10, 8, 10, 40, 50, bright);
  const debris = place(rand, 80, 1.5, 3, 110, 130, [...bright, ...dim]);
  writeImage(dir, "sample.png", render([...bright, ...dim, ...debris], { bg: 20, noise: 4, seed: 122 }));
}

export const GENERATORS: Record<string, (dir: string) => void> = { pseudorep, illumination, confound, saturation, threshold };

export function generate(name: string, dir: string): string[] {
  const gen = GENERATORS[name];
  if (!gen) throw new Error(`no dataset generator named "${name}"`);
  mkdirSync(dir, { recursive: true });
  gen(dir);
  return listFiles(dir);
}

function listFiles(dir: string): string[] {
  const names = ["control.png", "treated.png", "field.png", "metadata.csv", "sample.png"];
  for (let i = 1; i <= 3; i++) names.push(`control_${i}.png`, `treated_${i}.png`);
  return names.filter((n) => existsSync(join(dir, n))).sort();
}

export function hashFiles(dir: string): Record<string, string> {
  const content = (n: string): Buffer | Uint8Array => {
    const buf = readFileSync(join(dir, n));
    if (!n.endsWith(".png")) return buf;
    const g = decodePng(buf);
    return Buffer.concat([Buffer.from(`${g.width}x${g.height}:`), Buffer.from(g.pixels)]);
  };
  return Object.fromEntries(listFiles(dir).map((n) => [n, createHash("sha256").update(content(n)).digest("hex")]));
}

export function dataDir(id: string): string {
  return join(BENCH_DIR, id, "data");
}

export function ensureData(id: string, generator: string): string {
  const dir = dataDir(id);
  if (!existsSync(dir) || listFiles(dir).length === 0) generate(generator, dir);
  return dir;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  for (const name of Object.keys(GENERATORS)) {
    const dir = dataDir(name);
    console.log(name, generate(name, dir).join(" "));
  }
}
