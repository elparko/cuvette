import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { CATALOG, openAdapter, programOf, pyJson, type OpenAdapter } from "./independent.ts";

const found = await programOf("imagej");
const python = join(homedir(), ".cuvette/envs/skimage/bin/python");
const blobs = join(CATALOG, "imagej/data/blobs.gif");
const discs = join(CATALOG, "imagej/data/discs.png");
const noisy = join(CATALOG, "imagej/data/discs_noisy.png");
const slow = 600_000;

describe.skipIf(!found || !existsSync(python))("imagej against scipy and scikit-image", () => {
  let ij: OpenAdapter;
  beforeAll(async () => {
    ij = await openAdapter("imagej");
  });
  afterAll(async () => {
    await ij?.close();
  });

  // The ImageJ sample blobs.gif has 64 particles with the Default threshold (limits 126 to 255). scipy.ndimage.label with 8-connectivity counts the pixels at or above the limit.
  // scikit-image threshold_isodata (Ridler and Calvard 1978) gives 125, one level below the ImageJ low limit, because ImageJ takes the first level of the upper class.
  test("the particle count, the areas and the edge exclusion of blobs.gif agree with scipy labels, and the threshold agrees with the isodata threshold", { timeout: slow }, async () => {
    const hand = await pyJson<{ iso: number; count: number; total: number; mean: number; median: number; keep: number; keep_mean: number }>(
      python,
      `
import numpy as np
from PIL import Image
from scipy import ndimage as ndi
from skimage.filters import threshold_isodata
a = np.array(Image.open(${JSON.stringify(blobs)}))
iso = int(threshold_isodata(a))
lab, n = ndi.label(a >= iso + 1, structure=np.ones((3, 3)))
areas = np.bincount(lab.ravel())[1:]
edge = set(lab[0]) | set(lab[-1]) | set(lab[:, 0]) | set(lab[:, -1]); edge.discard(0)
keep = np.array([i for i in range(1, n + 1) if i not in edge])
print(json.dumps({"iso": iso, "count": n, "total": int(areas.sum()), "mean": float(areas.mean()), "median": float(np.median(areas)), "keep": len(keep), "keep_mean": float(areas[keep - 1].mean())}))`,
    );
    const all = await ij.run("threshold_and_count", { input: blobs, method: "Default", dark_background: false });
    expect(all.metrics.threshold_low).toBe(hand.iso + 1);
    expect(all.metrics.count).toBe(hand.count);
    expect(all.metrics.total_area).toBe(hand.total);
    expect(Math.abs(all.metrics.mean_area - hand.mean)).toBeLessThan(1e-3);
    expect(all.metrics.median_area).toBe(hand.median);
    const inner = await ij.run("threshold_and_count", { input: blobs, method: "Default", dark_background: false, exclude_edges: true });
    expect(inner.metrics.count).toBe(hand.keep);
    expect(Math.abs(inner.metrics.mean_area - hand.keep_mean)).toBeLessThan(1e-3);
  });

  // The pixels of a disc of radius 10 are the lattice points with x^2 + y^2 <= 100. There are 317. A scale of 100 pixels for 50 um makes one pixel 0.5 um, so one pixel is 0.25 um^2.
  test("the discs have the lattice area, the calibrated area is the pixel area times the pixel size squared, and measure agrees with numpy", { timeout: slow }, async () => {
    const hand = await pyJson<{ lattice: number; n: number; area: number; mean: number; max: number }>(
      python,
      `
import numpy as np
from PIL import Image
from scipy import ndimage as ndi
yy, xx = np.mgrid[-10:11, -10:11]
a = np.array(Image.open(${JSON.stringify(discs)}))
lab, n = ndi.label(a > 100, structure=np.ones((3, 3)))
areas = np.bincount(lab.ravel())[1:]
print(json.dumps({"lattice": int(((xx ** 2 + yy ** 2) <= 100).sum()), "n": n, "area": float(areas.mean()), "mean": float(a.mean()), "max": int(a.max())}))`,
    );
    expect(hand.lattice).toBe(317);
    const count = await ij.run("threshold_and_count", { input: discs, method: "Default", dark_background: true });
    expect(count.metrics.count).toBe(hand.n);
    expect(count.metrics.mean_area).toBe(hand.area);
    const scaled = await ij.run("set_scale", { input: discs, distance_px: 100, known_distance: 50, unit: "um" });
    const calibrated = await ij.run("threshold_and_count", { input: scaled.data.files.image, method: "Default", dark_background: true });
    expect(calibrated.metrics.mean_area).toBeCloseTo(hand.area * 0.25, 9);
    const whole = await ij.run("measure", { input: discs });
    expect(whole.metrics.area).toBe(256 * 256);
    expect(Math.abs(whole.metrics.mean - hand.mean)).toBeLessThan(1e-3);
    expect(whole.metrics.max).toBe(hand.max);
  });

  // scipy.ndimage.gaussian_filter with sigma 2 and the nearest-edge rule. ImageJ keeps 8 bits, so the result is rounded to whole levels.
  test("the Gaussian blur equals scipy gaussian_filter within one gray level", { timeout: slow }, async () => {
    const out = await ij.run("gaussian_blur", { input: noisy, sigma: 2 });
    const hand = await pyJson<{ max_diff: number; fraction_exact: number }>(
      python,
      `
import numpy as np, tifffile
from PIL import Image
from scipy import ndimage as ndi
a = np.array(Image.open(${JSON.stringify(noisy)})).astype(float)
want = ndi.gaussian_filter(a, 2, mode="nearest", truncate=8)
got = tifffile.imread(${JSON.stringify(out.data.files.image)}).astype(float)
d = np.abs(got - want)
print(json.dumps({"max_diff": float(d.max()), "fraction_exact": float((d < 0.5001).mean())}))`,
    );
    expect(hand.max_diff).toBeLessThanOrEqual(1.5);
    expect(hand.fraction_exact).toBeGreaterThan(0.97);
  });
});
