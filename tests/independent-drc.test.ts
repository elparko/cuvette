import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { openAdapter, programOf, rJson, type OpenAdapter } from "./independent.ts";

const rscript = await programOf("drc");
const slow = 600_000;

// Zhang, Chung and Oldenburg (1999): Z' = 1 - 3 (sd_high + sd_low) / |mean_high - mean_low|.
// The robust version replaces the mean by the median and the standard deviation by 1.4826 times the median absolute deviation.
// The blank wells are subtracted as their mean. percent_activity = 100 (signal - low) / (high - low), after the blank.
describe.skipIf(!rscript)("drc plate normalization against a hand computation in base R", () => {
  let drc: OpenAdapter;
  let root: string;
  let file: string;
  beforeAll(async () => {
    root = mkdtempSync(join(tmpdir(), "cuvette-drc-"));
    file = join(root, "plates.csv");
    const rows = ["plate,well,type,signal"];
    const rng = (seed: number) => () => (seed = (seed * 48271) % 2147483647) / 2147483647;
    const u = rng(17);
    for (const [plate, high, low, blank] of [["P1", 1000, 100, 20], ["P2", 1500, 150, 30]] as const) {
      for (let i = 0; i < 8; i++) rows.push(`${plate},H${i},high,${(high + 60 * (u() - 0.5)).toFixed(2)}`);
      for (let i = 0; i < 8; i++) rows.push(`${plate},L${i},low,${(low + 20 * (u() - 0.5)).toFixed(2)}`);
      for (let i = 0; i < 4; i++) rows.push(`${plate},B${i},blank,${(blank + 4 * (u() - 0.5)).toFixed(2)}`);
      for (let i = 0; i < 6; i++) rows.push(`${plate},S${i},sample,${(low + (high - low) * u()).toFixed(2)}`);
    }
    rows.push("P1,H8,high,1900.00");
    writeFileSync(file, rows.join("\n"));
    drc = await openAdapter("drc");
  });
  afterAll(async () => {
    await drc?.close();
    rmSync(root, { recursive: true, force: true });
  });

  test("Z', the control statistics and the normalized signal agree with the formulas for the mean and for the median", { timeout: slow }, async () => {
    const r = await rJson<Record<string, any>>(
      rscript!,
      `d <- read.csv(${JSON.stringify(file)})
      out <- list()
      for (stat in c("mean_sd", "median_mad")) for (p in c("P1", "P2")) {
        x <- d[d$plate == p, ]; b <- mean(x$signal[x$type == "blank"])
        h <- x$signal[x$type == "high"] - b; l <- x$signal[x$type == "low"] - b
        ctr <- if (stat == "mean_sd") mean else median; spr <- if (stat == "mean_sd") sd else function(v) 1.4826 * median(abs(v - median(v)))
        mh <- ctr(h); ml <- ctr(l); sh <- spr(h); sl <- spr(l)
        out[[paste(stat, p)]] <- list(z = 1 - 3 * (sh + sl) / abs(mh - ml), mh = mh, ml = ml, sh = sh, sl = sl, nh = length(h),
          first_sample = 100 * (x$signal[x$type == "sample"][1] - b - ml) / (mh - ml), sb = mh / ml)
      }
      out`,
    );
    for (const stat of ["mean_sd", "median_mad"]) {
      const out = await drc.run("normalize_plate", { data: file, signal_col: "signal", type_col: "type", plate_col: "plate", high_control: "high", low_control: "low", blank_label: "blank", normalization: "percent_activity", zprime_stat: stat });
      for (const p of ["P1", "P2"]) {
        const want = r[`${stat} ${p}`];
        const tag = p;
        expect(Math.abs(out.metrics[`p${tag}_z_prime`] - want.z)).toBeLessThan(1e-9);
        expect(Math.abs(out.metrics[`p${tag}_mean_high`] - want.mh)).toBeLessThan(1e-7);
        expect(Math.abs(out.metrics[`p${tag}_mean_low`] - want.ml)).toBeLessThan(1e-7);
        expect(Math.abs(out.metrics[`p${tag}_sd_high`] - want.sh)).toBeLessThan(1e-7);
        expect(Math.abs(out.metrics[`p${tag}_sd_low`] - want.sl)).toBeLessThan(1e-7);
        expect(Math.abs(out.metrics[`p${tag}_signal_to_background`] - want.sb)).toBeLessThan(1e-9);
      }
    }
  });
});
