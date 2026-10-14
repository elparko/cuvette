import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { openAdapter, programOf, pyJson, rJson, type OpenAdapter } from "./independent.ts";

const rscript = await programOf("cardinal");
const python = join(homedir(), ".cuvette/envs/pyimzml/bin/python");
const slow = 600_000;
const planted = [510.0, 520.3, 540.2, 560.4, 580.1];

describe.skipIf(!rscript || !existsSync(python))("cardinal on a synthetic imzML file with planted regions", () => {
  let cardinal: OpenAdapter;
  let root: string;
  let file: string;
  beforeAll(async () => {
    root = mkdtempSync(join(tmpdir(), "cuvette-cardinal-"));
    file = join(root, "planted.imzML");
    cardinal = await openAdapter("cardinal");
    // pyimzML writes a 10 by 10 image. Columns 1 to 3 are region A (ions 520.3 and 560.4), columns 4 to 7 are region B (ion 540.2), columns 8 to 10 are region C (ion 580.1).
    // The ion 510.0 is in every pixel. Each pixel has its own intensity factor from 0.5 to 1.5, so the total ion current differs between pixels.
    await pyJson(
      python,
      `
import numpy as np
from pyimzml.ImzMLWriter import ImzMLWriter
rng = np.random.default_rng(11)
mz = np.round(np.arange(500, 600, 0.02), 4)
def peak(c, h): return h * np.exp(-0.5 * ((mz - c) / 0.05) ** 2)
with ImzMLWriter(${JSON.stringify(file)}, mode="continuous", spec_type="profile") as w:
    for y in range(1, 11):
        for x in range(1, 11):
            s = peak(510.0, 40)
            if x <= 3: s = s + peak(520.3, 100) + peak(560.4, 60)
            elif x <= 7: s = s + peak(540.2, 100)
            else: s = s + peak(580.1, 100)
            s = s * rng.uniform(0.5, 1.5) + 2 + rng.normal(0, 0.3, len(mz))
            w.addSpectrum(mz, np.maximum(s, 0), (x, y, 1))
print(json.dumps(1))`,
    );
  }, slow);
  afterAll(async () => {
    await cardinal?.close();
    rmSync(root, { recursive: true, force: true });
  });

  test("the loaded image has the size, the m/z range and the pixel grid that the file was written with", { timeout: slow }, async () => {
    const out = await cardinal.run("load_image", { path: file });
    expect(out.metrics).toMatchObject({ n_spectra: 100, n_features: 5000, n_runs: 1, x_min: 1, x_max: 10, y_min: 1, y_max: 10, centroided: 0 });
    expect(out.metrics.mz_min).toBeCloseTo(500, 6);
    expect(out.metrics.mz_max).toBeCloseTo(599.98, 6);
  });

  test("peak picking finds the planted ions, and the spatial shrunken centroids recover the three regions with the marker ion of each region on top", { timeout: slow * 2 }, async () => {
    const loaded = await cardinal.run("load_image", { path: file });
    const peaks = await cardinal.run("process_peaks", { image: loaded.data.image_file, normalize: "tic", snr: 10, sample_size: 1, tolerance: 0.5, units: "mz", seed: 1 });
    expect(peaks.metrics.n_peaks).toBe(planted.length);
    expect(peaks.metrics.n_spectra).toBe(100);
    const found = await rJson<number[]>(rscript!, `suppressMessages(library(Cardinal)); sort(as.numeric(mz(readRDS(${JSON.stringify(peaks.data.peaks_file)}))))`);
    planted.forEach((m, i) => expect(Math.abs(found[i] - m), `ion ${m}`).toBeLessThan(0.05));

    const seg = await cardinal.run("segment_image", { peaks: peaks.data.peaks_file, r: 1, k: 6, s: [4, 8], weights: "adaptive", seed: 1 });
    const truthCode = `
      suppressMessages(library(Cardinal))
      obj <- readRDS(${JSON.stringify(seg.data.model_file)})
      x <- coord(readRDS(${JSON.stringify(peaks.data.peaks_file)}))$x
      truth <- ifelse(x <= 3, "A", ifelse(x <= 7, "B", "C"))
      cls <- as.character(obj$fit[[1]]$class)
      tab <- table(truth, cls)
      list(purity = sum(apply(tab, 2, max)) / sum(tab), n_classes = ncol(tab), pairs = unname(apply(tab, 1, function(r) names(which.max(r)))))`;
    const hand = await rJson<{ purity: number; n_classes: number; pairs: string[] }>(rscript!, truthCode);
    expect(hand.n_classes).toBe(3);
    expect(hand.purity).toBe(1);
    expect(new Set(hand.pairs).size).toBe(3);

    const top = await cardinal.run("top_features", { model: seg.data.model_file, s: 4, n: 2 });
    expect(top.metrics.n_segments).toBe(3);
    const rows = top.table.rows as [string, number, number][];
    for (const cls of new Set(rows.map((r) => String(r[0])))) expect(rows.filter((r) => String(r[0]) === cls).length).toBeLessThanOrEqual(2);
    expect(new Set(rows.map((r) => String(r[0]))).size).toBe(3);
    rows.forEach((r) => expect(r[2]).toBeGreaterThan(0));
    const marker: Record<string, number[]> = { A: [520.3, 560.4], B: [540.2], C: [580.1] };
    ["A", "B", "C"].forEach((region, i) => {
      const cls = hand.pairs[i];
      const mzs = rows.filter((r) => String(r[0]) === cls).map((r) => r[1]);
      expect(mzs.some((m) => marker[region].some((p) => Math.abs(m - p) < 0.05)), `region ${region} class ${cls} ions ${mzs}`).toBe(true);
    });
  });
});
