import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { openAdapter, programOf, pyJson, rJson, type OpenAdapter } from "./independent.ts";

const found = await programOf("chromatography");
const rscript = await programOf("vegan");
const python = join(homedir(), ".cuvette/envs/chromatography/bin/python");
const slow = 600_000;

describe.skipIf(!found || !rscript || !existsSync(python))("chromatography adapter against R and numpy", () => {
  let chrom: OpenAdapter;
  let root: string;
  beforeAll(async () => {
    root = mkdtempSync(join(tmpdir(), "cuvette-chromatography-"));
    chrom = await openAdapter("chromatography");
  });
  afterAll(async () => {
    await chrom?.close();
    rmSync(root, { recursive: true, force: true });
  });

  // Weighted least squares in R: lm(area ~ conc, weights = w). R squared is the weighted value that summary.lm prints.
  // The limits follow ICH Q2(R1): LOD = 3.3 s / slope and LOQ = 10 s / slope, with s the residual standard deviation of the unweighted residuals.
  test("the calibration line, R squared and the limits agree with lm for each weighting, with and without the origin", { timeout: slow }, async () => {
    const conc = [0.5, 1, 2, 5, 10, 20];
    const area = [52.1, 98.7, 205.3, 489.9, 1010.2, 1985.5];
    const r = await rJson<Record<string, { slope: number; intercept: number; r2: number; s: number }>>(
      rscript!,
      `x <- c(${conc.join(",")}); y <- c(${area.join(",")})
      fit <- function(w, origin) {
        m <- if (origin) lm(y ~ x + 0, weights = w) else lm(y ~ x, weights = w)
        co <- coef(m); res <- y - predict(m); dof <- length(x) - length(co)
        list(slope = unname(co["x"]), intercept = if (origin) 0 else unname(co[1]), r2 = summary(m)$r.squared, s = sqrt(sum(res^2) / dof))
      }
      out <- list()
      for (wn in c("none", "1/x", "1/x2")) for (o in c(TRUE, FALSE)) {
        w <- switch(wn, none = rep(1, 6), "1/x" = 1 / x, "1/x2" = 1 / x^2)
        out[[paste(wn, o)]] <- fit(w, o)
      }
      out`,
    );
    for (const weighting of ["none", "1/x", "1/x2"]) {
      for (const origin of [true, false]) {
        const want = r[`${weighting} ${origin ? "TRUE" : "FALSE"}`];
        const out = await chrom.run("calibration_curve", { concentrations: conc, areas: area, through_origin: origin, weighting });
        expect(Math.abs(out.metrics.slope / want.slope - 1)).toBeLessThan(1e-9);
        expect(Math.abs(out.metrics.intercept - want.intercept)).toBeLessThan(1e-7);
        expect(Math.abs(out.metrics.r_squared - want.r2)).toBeLessThan(1e-9);
        expect(Math.abs(out.metrics.lod / ((3.3 * want.s) / want.slope) - 1)).toBeLessThan(1e-9);
        expect(Math.abs(out.metrics.loq / ((10 * want.s) / want.slope) - 1)).toBeLessThan(1e-9);
      }
    }
  });

  test("the area between two times is the trapezoid sum, with a straight baseline between the signals at two times", { timeout: slow }, async () => {
    const file = join(root, "trace.csv");
    const want = await pyJson<{ plain: number; corrected: number; height: number; rt: number; width: number }>(
      python,
      `
import numpy as np
t = np.arange(0, 10, 0.02)
y = 120 * np.exp(-0.5 * ((t - 5.01) / 0.18) ** 2) + 3.0 + 0.4 * t
with open(${JSON.stringify(file)}, "w") as f:
    f.write("time,signal\\n")
    for a, b in zip(t, y): f.write("%r,%r\\n" % (float(a), float(b)))
sel = (t >= 4.2) & (t <= 5.8)
tt, yy = t[sel], y[sel]
def area(x, v): return float(np.sum((v[1:] + v[:-1]) / 2 * np.diff(x)))
i4, i6 = np.argmin(abs(t - 4.2)), np.argmin(abs(t - 5.8))
line = np.interp(tt, [4.2, 5.8], [y[i4], y[i6]])
c = yy - line
k = int(np.argmax(c)); half = c[k] / 2; above = np.where(c >= half)[0]
print(json.dumps({"plain": area(tt, yy), "corrected": area(tt, c), "height": float(c[k]), "rt": float(tt[k]), "width": float(tt[above[-1]] - tt[above[0]])}))`,
    );
    const plain = await chrom.run("area_in_window", { path: file, start: 4.2, end: 5.8 });
    expect(Math.abs(plain.metrics.area / want.plain - 1)).toBeLessThan(1e-9);
    const out = await chrom.run("area_in_window", { path: file, start: 4.2, end: 5.8, baseline_points: [4.2, 5.8] });
    expect(Math.abs(out.metrics.area / want.corrected - 1)).toBeLessThan(1e-9);
    expect(Math.abs(out.metrics.height - want.height)).toBeLessThan(1e-9);
    expect(Math.abs(out.metrics.retention_time - want.rt)).toBeLessThan(1e-9);
    expect(Math.abs(out.metrics.width_at_half_height - want.width)).toBeLessThan(1e-9);
  });

  test("the concentrations from areas invert the calibration line and flag the samples outside the standards", { timeout: slow }, async () => {
    const out = await chrom.run("quantify_areas", { areas: [100, 500, 3000], slope: 100, intercept: 4, unit: "mM", lowest_standard: 0.5, highest_standard: 20 });
    const rows = out.table.rows as [string, number, number, boolean][];
    expect(rows.map((r) => r[2])).toEqual([0.96, 4.96, 29.96]);
    expect(rows.map((r) => r[3])).toEqual([true, true, false]);
    expect(out.metrics.n_outside_range).toBe(1);
  });

  // Analytic integral of a Gaussian: height x sigma x sqrt(2 pi). A data system reports this value in signal times time.
  test("the peak area in signal times time equals the analytic Gaussian integral and the summed signal is that value divided by the time step", { timeout: slow }, async () => {
    const file = join(root, "gauss.csv");
    const step = 0.02;
    const rows = ["time,signal"];
    for (let i = 0; i < 500; i++) rows.push(`${i * step},${120 * Math.exp(-0.5 * ((i * step - 5) / 0.18) ** 2)}`);
    writeFileSync(file, rows.join("\n"));
    const want = 120 * 0.18 * Math.sqrt(2 * Math.PI);
    const out = await chrom.run("integrate_peaks", { path: file, baseline: "none", prominence: 0.01 });
    expect(out.metrics.n_peaks).toBe(1);
    expect(Math.abs(out.metrics.area_signal_time_1 / want - 1)).toBeLessThan(0.01);
    expect(Math.abs(out.metrics.area_1 / (want / step) - 1)).toBeLessThan(0.01);
    expect(out.table.columns).toContain("area_signal_time");
    const window = await chrom.run("area_in_window", { path: file, start: 3, end: 7 });
    expect(Math.abs(out.metrics.area_signal_time_1 / window.metrics.area - 1)).toBeLessThan(0.01);
  });
});
