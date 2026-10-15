import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { CATALOG, openAdapter, programOf, pyJson, rJson, type OpenAdapter } from "./independent.ts";

const rscript = await programOf("cytof");
const python = join(homedir(), ".cuvette/envs/flowkit/bin/python");
const folder = join(CATALOG, "cytof/data/synthetic");
const metadata = join(folder, "metadata.csv");
const slow = 600_000;
const cells = (text: string) => text.trim().split("\n").map((l) => l.split(",").map((c) => c.replace(/^"|"$/g, "")));

const readAll = `
import numpy as np, flowio, glob, os
files = sorted(glob.glob(${JSON.stringify(folder)} + "/*.fcs"))
ev, ids = [], []
for f in files:
    fd = flowio.FlowData(f)
    e = np.array(fd.events, dtype=np.float64).reshape(-1, fd.channel_count)
    ev.append(e); ids += [os.path.basename(f)[:-4]] * len(e)
E = np.vstack(ev); ids = np.array(ids)
`;

describe.skipIf(!rscript || !existsSync(python))("cytof against flowio, numpy and direct edgeR, limma and lme4 calls", () => {
  let cytof: OpenAdapter;
  let clustering: Awaited<ReturnType<OpenAdapter["run"]>>;
  let frequencies: Awaited<ReturnType<OpenAdapter["run"]>>;
  beforeAll(async () => {
    cytof = await openAdapter("cytof");
    clustering = await cytof.run("cluster_cells", { files: folder, markers: "CD3,CD19,CD14,pErk", cofactor: 5, xdim: 4, ydim: 4, n_metaclusters: 3, seed: 1, label_channel: "truth" });
    frequencies = await cytof.run("population_frequencies", { cells: clustering.data.cells_file, population_column: "metacluster" });
  }, slow);
  afterAll(async () => {
    await cytof?.close();
  });

  test("the file summary agrees with flowio for the cell counts and the range of each channel in the first file", { timeout: slow }, async () => {
    const hand = await pyJson<{ counts: Record<string, number>; min: number[]; med: number[]; max: number[] }>(
      python,
      `${readAll}
F = E[ids == ids[0]]
print(json.dumps({"counts": {k: int((ids == k).sum()) for k in dict.fromkeys(ids)}, "min": F.min(0).tolist(), "med": np.median(F, 0).tolist(), "max": F.max(0).tolist()}))`,
    );
    const out = await cytof.run("inspect_fcs", { files: folder });
    expect(out.metrics.n_cells_total).toBe(Object.values(hand.counts).reduce((a, b) => a + b, 0));
    expect(out.data.cells_per_file).toEqual(hand.counts);
    const channels = out.data.channels as { min: number; median: number; max: number; marker: string }[];
    channels.forEach((c, i) => {
      expect(c.min).toBeCloseTo(hand.min[i], 4);
      expect(c.median).toBeCloseTo(hand.med[i], 4);
      expect(c.max).toBeCloseTo(hand.max[i], 4);
    });
    expect(channels.map((c) => c.marker)).toEqual(["CD3", "CD19", "CD14", "pErk", "truth"]);
    expect([out.data.label_channels].flat()).toEqual(["truth"]);
    expect(out.data.channel_stats_file).toBe("p1_ref.fcs");
  });

  // The cells table is checked against flowio: same order as the sorted files, the purity against the planted label is 1, and the median of each metacluster is the numpy median of asinh(x / 5).
  test("the clusters separate the planted populations and the metacluster medians equal the numpy medians of the arcsinh values", { timeout: slow }, async () => {
    const table = cells(await readFile(clustering.data.cells_file, "utf8"));
    const col = (n: string) => table[0].indexOf(n);
    const body = table.slice(1);
    const meta = body.map((r) => Number(r[col("metacluster")]));
    const label = body.map((r) => Number(r[col("label")]));
    const sample = body.map((r) => r[col("sample_id")]);
    const hand = await pyJson<{ ids: string[]; truth: number[]; medians: Record<string, number[]> }>(
      python,
      `${readAll}
meta = np.array(${JSON.stringify(meta)})
a = np.arcsinh(E[:, :4] / 5)
print(json.dumps({"ids": ids.tolist(), "truth": E[:, 4].astype(int).tolist(), "medians": {str(k): np.median(a[meta == k], 0).tolist() for k in sorted(set(meta.tolist()))}}))`,
    );
    expect(sample).toEqual(hand.ids);
    expect(label).toEqual(hand.truth);
    const tally = new Map<string, number>();
    meta.forEach((m, i) => tally.set(`${m}/${label[i]}`, (tally.get(`${m}/${label[i]}`) ?? 0) + 1));
    const purity = [...new Set(meta)].reduce((sum, m) => sum + Math.max(...[...tally].filter(([k]) => k.startsWith(`${m}/`)).map(([, n]) => n)), 0) / meta.length;
    expect(purity).toBeGreaterThan(0.95);
    expect(new Set(meta).size).toBe(3);
    const med = cells(await readFile((clustering.table as { path: string }).path, "utf8"));
    const mc = (n: string) => med[0].indexOf(n);
    for (const r of med.slice(1)) {
      const want = hand.medians[r[mc("metacluster")]];
      ["CD3", "CD19", "CD14", "pErk"].forEach((m, j) => expect(Math.abs(Number(r[mc(m)]) - want[j]), `metacluster ${r[0]} ${m}`).toBeLessThan(1e-6));
      expect(Number(r[mc("cells")])).toBe(meta.filter((v) => v === Number(r[mc("metacluster")])).length);
      expect(Number(r[mc("percent")])).toBeCloseTo((100 * Number(r[mc("cells")])) / meta.length, 9);
    }
  });

  test("the counts and the percents of each population in each sample agree with a tally of the cells table", { timeout: slow }, async () => {
    const table = cells(await readFile(clustering.data.cells_file, "utf8"));
    const col = (n: string) => table[0].indexOf(n);
    const tally = new Map<string, Map<string, number>>();
    for (const r of table.slice(1)) {
      const m = tally.get(r[col("metacluster")]) ?? new Map<string, number>();
      m.set(r[col("sample_id")], (m.get(r[col("sample_id")]) ?? 0) + 1);
      tally.set(r[col("metacluster")], m);
    }
    const totals = new Map<string, number>();
    for (const r of table.slice(1)) totals.set(r[col("sample_id")], (totals.get(r[col("sample_id")]) ?? 0) + 1);
    const counts = cells(await readFile(frequencies.data.counts_file, "utf8"));
    const percent = cells(await readFile(frequencies.data.percent_file, "utf8"));
    for (const [i, row] of counts.slice(1).entries()) {
      counts[0].slice(1).forEach((sampleId, j) => {
        const n = tally.get(row[0])?.get(sampleId) ?? 0;
        expect(Number(row[j + 1])).toBe(n);
        expect(Number(percent[i + 1][j + 1])).toBeCloseTo((100 * n) / totals.get(sampleId)!, 9);
      });
    }
  });

  // edgeR (Robinson, McCarthy, Smyth 2010) glmFit and glmLRT with the design ~ condition + patient_id, called here without diffcyt. voom (Law 2014) with lmFit and eBayes. lme4 glmer for the binomial model.
  test("the differential abundance tests agree with direct calls of edgeR, limma and lme4, for the reference level and for the paired design", { timeout: slow }, async () => {
    const counts = frequencies.data.counts_file;
    const direct = await rJson<Record<string, number[]>>(
      rscript!,
      `suppressMessages({library(edgeR); library(limma); library(lme4)})
      cm <- as.matrix(read.csv(${JSON.stringify(counts)}, row.names = 1, check.names = FALSE))
      md <- read.csv(${JSON.stringify(metadata)}); md <- md[match(colnames(cm), md$sample_id), ]
      out <- list()
      for (ref in c("ref", "stim")) {
        other <- setdiff(c("ref", "stim"), ref)
        cond <- factor(md$condition, levels = c(ref, other)); pat <- factor(md$patient_id)
        for (paired in c(FALSE, TRUE)) {
          design <- if (paired) model.matrix(~ cond + pat) else model.matrix(~ cond)
          y <- estimateDisp(DGEList(cm), design, trend.method = "none")
          lrt <- glmLRT(glmFit(y, design), coef = 2)
          out[[paste("edgeR", ref, paired)]] <- as.numeric(lrt$table$PValue)
          v <- voom(DGEList(cm), design, plot = FALSE)
          ef <- eBayes(lmFit(v, design))
          out[[paste("voom", ref, paired)]] <- as.numeric(ef$p.value[, 2])
        }
        tot <- colSums(cm)
        out[[paste("glmm", ref)]] <- sapply(rownames(cm), function(p) {
          d <- data.frame(k = cm[p, ], n = tot, cond = cond, s = factor(colnames(cm)))
          m <- suppressMessages(glmer(cbind(k, n - k) ~ cond + (1 | s), data = d, family = binomial))
          coef(summary(m))[2, 4]
        })
      }
      out`,
    );
    for (const ref of ["ref", "stim"]) {
      for (const paired of [false, true]) {
        for (const method of ["edgeR", "voom"]) {
          const res = await cytof.run("differential_abundance", { counts, metadata, condition: "condition", reference: ref, pair_by: paired ? "patient_id" : "none", method, fdr: 0.05 });
          const rows = cells(await readFile(res.table.path!, "utf8"));
          const pc = rows[0].indexOf("p");
          const popCol = rows[0].indexOf("population");
          const want = direct[`${method} ${ref} ${paired ? "TRUE" : "FALSE"}`];
          const names = cells(await readFile(counts, "utf8")).slice(1).map((r) => r[0]);
          for (const r of rows.slice(1)) {
            const w = want[names.indexOf(r[popCol])];
            expect(Math.abs(Number(r[pc]) / w - 1), `${method} ${ref} paired ${paired} population ${r[popCol]}`).toBeLessThan(1e-6);
          }
        }
      }
      const glmm = await cytof.run("differential_abundance", { counts, metadata, condition: "condition", reference: ref, pair_by: "none", method: "glmm", fdr: 0.05 });
      const rows = cells(await readFile(glmm.table.path!, "utf8"));
      const names = cells(await readFile(counts, "utf8")).slice(1).map((r) => r[0]);
      const want = direct[`glmm ${ref}`];
      for (const r of rows.slice(1)) {
        const w = want[names.indexOf(r[rows[0].indexOf("population")])];
        expect(Math.abs(Number(r[rows[0].indexOf("p")]) / w - 1), `glmm ${ref} population ${r[0]}`).toBeLessThan(1e-3);
      }
    }
  });

  test("the log2 ratio of a population is the log2 of the ratio of the mean percents, positive when the other condition is higher", { timeout: slow }, async () => {
    const res = await cytof.run("differential_abundance", { counts: frequencies.data.counts_file, metadata, condition: "condition", reference: "ref", method: "edgeR", fdr: 0.05 });
    const rows = cells(await readFile(res.table.path!, "utf8"));
    const percent = cells(await readFile(frequencies.data.percent_file, "utf8"));
    const md = cells(await readFile(metadata, "utf8")).slice(1);
    const condOf = Object.fromEntries(md.map((r) => [r[0], r[1]]));
    const mean = (pop: string, cond: string) => {
      const row = percent.slice(1).find((r) => r[0] === pop)!;
      const v = percent[0].slice(1).map((s, j) => [s, Number(row[j + 1])] as const).filter(([s]) => condOf[s] === cond).map(([, x]) => x);
      return v.reduce((a, b) => a + b, 0) / v.length;
    };
    for (const r of rows.slice(1)) {
      const pop = r[rows[0].indexOf("population")];
      expect(Number(r[rows[0].indexOf("log2_ratio")])).toBeCloseTo(Math.log2(mean(pop, "stim") / mean(pop, "ref")), 9);
      expect(Number(r[rows[0].indexOf("mean_percent_ref")])).toBeCloseTo(mean(pop, "ref"), 9);
    }
  });
});
