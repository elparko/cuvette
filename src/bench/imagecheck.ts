import type { Gray } from "./png.ts";

export function otsu(img: Gray): number {
  const hist = new Array(256).fill(0);
  for (const p of img.pixels) hist[p]++;
  const total = img.pixels.length;
  let sum = 0;
  for (let i = 0; i < 256; i++) sum += i * hist[i];
  let wB = 0;
  let sumB = 0;
  let best = 0;
  let thr = 0;
  for (let t = 0; t < 256; t++) {
    wB += hist[t];
    if (!wB) continue;
    const wF = total - wB;
    if (!wF) break;
    sumB += t * hist[t];
    const between = wB * wF * (sumB / wB - (sum - sumB) / wF) ** 2;
    if (between > best) {
      best = between;
      thr = t;
    }
  }
  return thr;
}

export function components(img: Gray, keep: (v: number) => boolean): number[] {
  const { width: w, height: h, pixels } = img;
  const seen = new Uint8Array(w * h);
  const sizes: number[] = [];
  for (let s = 0; s < w * h; s++) {
    if (seen[s] || !keep(pixels[s])) continue;
    const stack = [s];
    seen[s] = 1;
    let n = 0;
    while (stack.length) {
      const i = stack.pop()!;
      n++;
      const x = i % w;
      const y = (i - x) / w;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const j = ny * w + nx;
        if (!seen[j] && keep(pixels[j])) {
          seen[j] = 1;
          stack.push(j);
        }
      }
    }
    sizes.push(n);
  }
  return sizes;
}

export function subtractColumnMedian(img: Gray): Gray {
  const { width: w, height: h, pixels } = img;
  const out = new Uint8Array(w * h);
  for (let x = 0; x < w; x++) {
    const col = Array.from({ length: h }, (_, y) => pixels[y * w + x]).sort((a, b) => a - b);
    const med = col[h >> 1];
    for (let y = 0; y < h; y++) out[y * w + x] = Math.max(0, pixels[y * w + x] - med);
  }
  return { width: w, height: h, pixels: out };
}
