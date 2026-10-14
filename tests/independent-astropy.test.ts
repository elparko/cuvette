import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { CATALOG, openAdapter, programOf, pyJson, type OpenAdapter } from "./independent.ts";

const found = await programOf("astropy");
const python = join(homedir(), ".cuvette/envs/astropy/bin/python");
const noisy = join(CATALOG, "astropy/data/gaussians_noisy.fits");
const slow = 600_000;

// Hand computation with numpy and scipy. The image is read with astropy.io.fits and nothing else from astropy or photutils.
const image = `
import numpy as np
from astropy.io import fits
from scipy import integrate
img = np.array(fits.getdata(${JSON.stringify(noisy)}), dtype=float)
def clip(values, sigma, maxiters):
    v = values[np.isfinite(values)]
    for _ in range(maxiters):
        m, s = np.median(v), np.std(v)
        keep = (v >= m - sigma * s) & (v <= m + sigma * s)
        if keep.all(): break
        v = v[keep]
    return v
def overlap(cx, cy, r, x0, x1, y0, y1):
    lo, hi = max(x0, cx - r), min(x1, cx + r)
    if lo >= hi: return 0.0
    def f(x):
        h = np.sqrt(max(r * r - (x - cx) ** 2, 0.0))
        return max(0.0, min(y1, cy + h) - max(y0, cy - h))
    cuts = sorted({lo, hi} | {c for c in (cx - np.sqrt(max(r * r - (y - cy) ** 2, 0)) for y in (y0, y1)) if lo < c < hi} | {c for c in (cx + np.sqrt(max(r * r - (y - cy) ** 2, 0)) for y in (y0, y1)) if lo < c < hi} | ({cx} if lo < cx < hi else set()))
    return sum(integrate.quad(f, a, b, epsabs=1e-12, epsrel=1e-12, limit=200)[0] for a, b in zip(cuts[:-1], cuts[1:]))
def aperture_sum(cx, cy, r):
    total, area = 0.0, 0.0
    for j in range(max(0, int(cy - r) - 1), min(img.shape[0], int(cy + r) + 2)):
        for i in range(max(0, int(cx - r) - 1), min(img.shape[1], int(cx + r) + 2)):
            a = overlap(cx, cy, r, i - 0.5, i + 0.5, j - 0.5, j + 0.5)
            total += a * img[j, i]; area += a
    return total, area
def ring_median(cx, cy, r_in, r_out, sigma, maxiters):
    jj, ii = np.mgrid[0:img.shape[0], 0:img.shape[1]]
    d = np.hypot(ii - cx, jj - cy)
    v = img[(d >= r_in) & (d < r_out)]
    return float(np.median(clip(v, sigma, maxiters)))
`;

describe.skipIf(!found || !existsSync(python))("astropy adapter against numpy and scipy", () => {
  let astro: OpenAdapter;
  let root: string;
  beforeAll(async () => {
    root = mkdtempSync(join(tmpdir(), "cuvette-astropy-"));
    astro = await openAdapter("astropy");
  });
  afterAll(async () => {
    await astro?.close();
    rmSync(root, { recursive: true, force: true });
  });

  // Sigma clipping with the median as centre and the population standard deviation, until nothing is clipped. A value on the limit stays.
  test("the clipped statistics and the number of kept pixels agree with a numpy clipping loop", { timeout: slow }, async () => {
    const hand = await pyJson<{ mean: number; median: number; std: number; kept: number; total: number }[]>(
      python,
      `${image}
out = []
for sigma, iters in ((3.0, 10), (2.0, 3), (4.5, 50)):
    v = clip(img.ravel(), sigma, iters)
    out.append({"mean": v.mean(), "median": np.median(v), "std": v.std(), "kept": len(v), "total": img.size})
print(json.dumps(out))`,
    );
    const runs = [
      { clip_sigma: 3, clip_maxiters: 10 },
      { clip_sigma: 2, clip_maxiters: 3 },
      { clip_sigma: 4.5, clip_maxiters: 50 },
    ];
    for (const [i, args] of runs.entries()) {
      const out = await astro.run("clip_statistics", { path: noisy, ...args });
      expect(Math.abs(out.metrics.mean - hand[i].mean)).toBeLessThan(1e-4);
      expect(Math.abs(out.metrics.median - hand[i].median)).toBeLessThan(1e-4);
      expect(Math.abs(out.metrics.std - hand[i].std)).toBeLessThan(1e-4);
      expect(out.metrics.n_kept).toBe(hand[i].kept);
      expect(out.metrics.n_clipped).toBe(hand[i].total - hand[i].kept);
    }
  });

  // Aperture sum: each pixel adds its value times the area that it shares with the circle. Pixel i covers x from i-0.5 to i+0.5 (0-based centres).
  // The ring median uses the pixels whose centre is in the ring, with sigma clipping. The net flux is the sum minus the ring median times the area inside the image.
  test("the aperture sum, the ring background and the net flux agree with the exact circle overlap of each pixel", { timeout: slow }, async () => {
    const xs = [97.9, 147.25, 313.5, 3.3, 497.2];
    const ys = [254.08, 113.43, 129.74, 150.4, 20.6];
    const hand = await pyJson<{ raw: number; bkg: number; net: number; area_in: number }[]>(
      python,
      `${image}
out = []
for cx, cy in zip(${JSON.stringify(xs)}, ${JSON.stringify(ys)}):
    raw, area = aperture_sum(cx, cy, 5.5)
    bkg = ring_median(cx, cy, 9.0, 14.0, 3.0, 10)
    out.append({"raw": raw, "bkg": bkg, "net": raw - bkg * area, "area_in": area})
print(json.dumps(out))`,
    );
    const out = await astro.run("measure_apertures", { path: noisy, radius: 5.5, x: xs, y: ys, local_background: "annulus", annulus_inner: 9, annulus_outer: 14 });
    const rows = out.table.rows as number[][];
    const columns = out.table.columns as string[];
    const col = (name: string) => columns.indexOf(name);
    rows.slice(0, xs.length).forEach((row, i) => {
      expect(Math.abs(row[col("aperture_sum")] - hand[i].raw)).toBeLessThan(1e-6 * Math.max(1, Math.abs(hand[i].raw)));
      expect(Math.abs(row[col("area_in_image")] - hand[i].area_in)).toBeLessThan(1e-6);
      expect(Math.abs(row[col("background_per_pixel")] - hand[i].bkg)).toBeLessThan(1e-4);
      expect(Math.abs(row[col("net_flux")] - hand[i].net)).toBeLessThan(1e-3);
    });
    expect(out.metrics.n_at_edge).toBe(2);
    expect(out.metrics.aperture_area).toBeCloseTo(Math.PI * 5.5 * 5.5, 8);
  });

  // The TAN projection (Calabretta and Greisen 2002, equations 54 and 55 for the zenithal case) with the pixel scale of the header.
  // The FITS pixel number is the 0-based position plus 1. The native pole is at CRVAL, and LONPOLE is 180 degrees.
  test("the sky positions of pixels agree with the TAN projection written out by hand", { timeout: slow }, async () => {
    const x = [0, 249, 499, 123.4, 10.25];
    const y = [0, 149, 299, 77.7, 280.5];
    const hand = await pyJson<{ ra: number[]; dec: number[]; scale: number }>(
      python,
      `
import numpy as np
from astropy.io import fits
h = fits.getheader(${JSON.stringify(noisy)})
x = np.array(${JSON.stringify(x)}); y = np.array(${JSON.stringify(y)})
u = h["CDELT1"] * (x + 1 - h["CRPIX1"]); v = h["CDELT2"] * (y + 1 - h["CRPIX2"])
R = np.hypot(u, v)
phi = np.arctan2(u, -v)
theta = np.arctan2(180 / np.pi, R)
a0, d0 = np.radians(h["CRVAL1"]), np.radians(h["CRVAL2"])
dphi = phi - np.pi
dec = np.arcsin(np.sin(theta) * np.sin(d0) + np.cos(theta) * np.cos(d0) * np.cos(dphi))
ra = a0 + np.arctan2(-np.cos(theta) * np.sin(dphi), np.sin(theta) * np.cos(d0) - np.cos(theta) * np.sin(d0) * np.cos(dphi))
print(json.dumps({"ra": (np.degrees(ra) % 360).tolist(), "dec": np.degrees(dec).tolist(), "scale": (abs(h["CDELT1"]) + abs(h["CDELT2"])) / 2 * 3600}))`,
    );
    const out = await astro.run("pixel_to_sky", { path: noisy, x, y });
    const rows = out.table.rows as number[][];
    const columns = out.table.columns as string[];
    rows.forEach((row, i) => {
      expect(Math.abs(row[columns.indexOf("ra_deg")] - hand.ra[i])).toBeLessThan(1e-9);
      expect(Math.abs(row[columns.indexOf("dec_deg")] - hand.dec[i])).toBeLessThan(1e-9);
    });
    const info = await astro.run("inspect_fits", { path: noisy });
    expect(info.metrics.pixel_scale_arcsec).toBeCloseTo(hand.scale, 6);
  });
});
