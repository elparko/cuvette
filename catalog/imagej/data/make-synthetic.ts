import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { crc32, deflateSync } from "node:zlib";

const SIZE = 256;
const RADIUS = 10;

function rng(seed: number) {
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

function png(pixels: Uint8Array, w: number, h: number): Buffer {
  const raw = Buffer.alloc((w + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w + 1)] = 0;
    raw.set(pixels.subarray(y * w, (y + 1) * w), y * (w + 1) + 1);
  }
  const chunk = (type: string, data: Buffer) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body) >>> 0);
    return Buffer.concat([len, body, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 0;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}

export const GRID: [number, number][] = [];
for (const y of [42, 128, 214]) for (const x of [32, 96, 160, 224]) GRID.push([x, y]);

export const PAIRS: [number, number][] = [];
for (const y of [64, 192]) for (const x of [48, 128, 208]) PAIRS.push([x, y], [x, y]);

interface Spec {
  centers: [number, number][];
  background: (x: number, y: number) => number;
  disc: number | ((bg: number) => number);
  noise?: number;
  seed?: number;
}

function render(s: Spec): Uint8Array {
  const rand = rng(s.seed ?? 1);
  const px = new Uint8Array(SIZE * SIZE);
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const bg = s.background(x, y);
      const inside = s.centers.some(([cx, cy]) => (x - cx) ** 2 + (y - cy) ** 2 <= RADIUS ** 2);
      let v = bg;
      if (inside) v = typeof s.disc === "number" ? s.disc : s.disc(bg);
      if (s.noise) v += gauss(rand) * s.noise;
      px[y * SIZE + x] = Math.max(0, Math.min(255, Math.round(v)));
    }
  }
  return px;
}

export function discArea(): number {
  let n = 0;
  for (let y = -RADIUS; y <= RADIUS; y++) for (let x = -RADIUS; x <= RADIUS; x++) if (x * x + y * y <= RADIUS ** 2) n++;
  return n;
}

export function makeAll(dir: string): void {
  mkdirSync(dir, { recursive: true });
  const touching: [number, number][] = PAIRS.map(([x, y], i) => [x + (i % 2 === 0 ? -7 : 7), y]);
  const files: Record<string, Spec> = {
    "discs.png": { centers: GRID, background: () => 20, disc: 200 },
    "discs_touching.png": { centers: touching, background: () => 20, disc: 200 },
    "discs_gradient.png": { centers: GRID, background: (x) => 10 + (100 * x) / 255, disc: (bg) => bg + 70, noise: 2, seed: 2 },
    "discs_noisy.png": { centers: GRID, background: () => 40, disc: 120, noise: 25, seed: 3 },
    "discs_saturated.png": { centers: GRID, background: () => 120, disc: 255 },
  };
  for (const [name, spec] of Object.entries(files)) writeFileSync(join(dir, name), png(render(spec), SIZE, SIZE));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  makeAll(process.argv[2] ?? dirname(fileURLToPath(import.meta.url)));
  console.log(`disc area in pixels: ${discArea()}`);
}
