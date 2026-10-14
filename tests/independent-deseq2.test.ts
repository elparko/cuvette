import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { CATALOG, openAdapter, programOf, rJson, type OpenAdapter } from "./independent.ts";

const rscript = await programOf("deseq2");
const data = join(CATALOG, "deseq2/data");
const slow = 600_000;
const hasEdger = rscript ? await rJson<boolean>(rscript, 'requireNamespace("edgeR", quietly = TRUE)').catch(() => false) : false;

interface Agreement {
  cor: number;
  median_diff: number;
  sig_deseq: number;
  sig_edger: number;
  both: number;
  sign_agree: number;
  edger_without_offsets?: number;
}

const edger = (o: { counts: string; coldata: string; lengths?: string; resultFile: string; terms: string; coef: string; reference: string; minCount: number; minSamples: number }) => `
  suppressMessages(library(edgeR))
  cts <- as.matrix(read.csv(${JSON.stringify(o.counts)}, row.names = 1)); cd <- read.csv(${JSON.stringify(o.coldata)}, row.names = 1)
  for (v in names(cd)) if (is.character(cd[[v]])) cd[[v]] <- factor(cd[[v]])
  cd[[${JSON.stringify(o.coef)}]] <- relevel(factor(cd[[${JSON.stringify(o.coef)}]]), ${JSON.stringify(o.reference)})
  keep <- rowSums(cts >= ${o.minCount}) >= ${o.minSamples}; cts <- cts[keep, ]
  des <- model.matrix(${o.terms}, cd)
  test_coef <- function(y) { y <- estimateDisp(y, des); topTags(glmQLFTest(glmQLFit(y, des), coef = grep(${JSON.stringify(o.coef)}, colnames(des), value = TRUE)), n = Inf, sort.by = "none")$table }
  without <- NULL
  if (${o.lengths ? "TRUE" : "FALSE"}) {
    len <- as.matrix(read.csv(${JSON.stringify(o.lengths ?? "")}, row.names = 1))[keep, ]
    nm <- len / exp(rowMeans(log(len))); nc <- cts / nm; eff <- calcNormFactors(nc) * colSums(nc); nm <- log(sweep(nm, 2, eff, "*"))
    y <- scaleOffset(DGEList(cts), nm)
    without <- sum(test_coef(calcNormFactors(DGEList(round(cts))))$FDR < 0.1)
  } else y <- calcNormFactors(DGEList(cts))
  tt <- test_coef(y)
  ds <- read.csv(${JSON.stringify(o.resultFile)}, row.names = 1)[rownames(tt), ]
  sd <- !is.na(ds$padj) & ds$padj < 0.1; se <- tt$FDR < 0.1
  list(cor = cor(ds$log2FoldChange, tt$logFC), median_diff = median(abs(ds$log2FoldChange - tt$logFC)), sig_deseq = sum(sd), sig_edger = sum(se), both = sum(sd & se),
       sign_agree = mean(sign(ds$log2FoldChange[sd & se]) == sign(tt$logFC[sd & se])), edger_without_offsets = without)`;

describe.skipIf(!rscript || !hasEdger)("DESeq2 against edgeR", () => {
  let deseq2: OpenAdapter;
  beforeAll(async () => {
    deseq2 = await openAdapter("deseq2");
  });
  afterAll(async () => {
    await deseq2?.close();
  });

  const airway = { counts: join(data, "airway_counts_subset.csv"), coldata: join(data, "airway_coldata.csv"), variable: "dex", reference_level: "untrt", test_level: "trt", min_count: 10, min_samples: 4, alpha: 0.1 };
  const edgerAirway = { counts: airway.counts, coldata: airway.coldata, coef: "dex", reference: "untrt", minCount: 10, minSamples: 4 };

  test("the number of genes tested equals the number of rows with at least 10 counts in at least 4 samples", { timeout: slow }, async () => {
    const rows = readFileSync(airway.counts, "utf8").trim().split("\n").slice(1).map((l) => l.split(",").slice(1).map(Number));
    const kept = rows.filter((r) => r.filter((v) => v >= 10).length >= 4).length;
    const out = await deseq2.run("run_deseq", { ...airway, design: "~ cell + dex" });
    expect(out.metrics!.n_genes_input).toBe(rows.length);
    expect(out.metrics!.n_genes_tested).toBe(kept);
  });

  // edgeR (Robinson, McCarthy and Smyth 2010) fits the same negative binomial model with its own code.
  // The tests differ (quasi-likelihood F test and Wald test), so the sets of genes are compared and not the exact count.
  test("the paired design gives the log2 fold changes and the significant genes of edgeR", { timeout: slow }, async () => {
    const out = await deseq2.run("run_deseq", { ...airway, design: "~ cell + dex" });
    const hand = await rJson<Agreement>(rscript!, edger({ ...edgerAirway, resultFile: String(out.data!.results_file), terms: "~ cell + dex" }));
    expect(hand.cor).toBeGreaterThan(0.995);
    expect(hand.median_diff).toBeLessThan(0.05);
    expect(hand.sign_agree).toBe(1);
    expect(hand.both / hand.sig_deseq).toBeGreaterThan(0.95);
    expect(hand.sig_deseq / hand.sig_edger).toBeGreaterThan(0.7);
    expect(hand.sig_deseq / hand.sig_edger).toBeLessThan(1.3);
  });

  test("the design without the donor term gives the log2 fold changes of edgeR and fewer significant genes than the paired design", { timeout: slow }, async () => {
    const paired = await deseq2.run("run_deseq", { ...airway, design: "~ cell + dex" });
    const out = await deseq2.run("run_deseq", { ...airway, design: "~ dex" });
    const hand = await rJson<Agreement>(rscript!, edger({ ...edgerAirway, resultFile: String(out.data!.results_file), terms: "~ dex" }));
    const handPaired = await rJson<Agreement>(rscript!, edger({ ...edgerAirway, resultFile: String(paired.data!.results_file), terms: "~ cell + dex" }));
    expect(hand.cor).toBeGreaterThan(0.995);
    expect(hand.median_diff).toBeLessThan(0.05);
    expect(hand.sign_agree).toBe(1);
    expect(hand.both / hand.sig_deseq).toBeGreaterThan(0.75);
    expect(handPaired.sig_edger).toBeGreaterThan(hand.sig_edger);
    expect(paired.metrics!.n_significant).toBeGreaterThan(out.metrics!.n_significant as number);
  });

  // The recipe for offsets is in the tximport vignette (section on edgeR): scale the lengths by their geometric mean, then use the log as offset.
  test("the result with transcript lengths and the result without lengths follow edgeR with and without offsets", { timeout: slow }, async () => {
    const tx = join(data, "tx");
    const common = { coldata: join(tx, "coldata.csv"), design: "~ donor + condition", variable: "condition", reference_level: "ctrl", test_level: "trt", min_count: 10, min_samples: 3, alpha: 0.1 };
    const withLengths = await deseq2.run("run_deseq", { ...common, counts: join(tx, "gene_counts.csv"), lengths: join(tx, "gene_length.csv"), input_type: "counts and lengths" });
    const without = await deseq2.run("run_deseq", { ...common, counts: join(tx, "gene_counts_rounded.csv"), input_type: "count matrix" });
    const edgerArgs = { coldata: common.coldata, terms: "~ donor + condition", coef: "condition", reference: "ctrl", minCount: 10, minSamples: 3 };
    const a = await rJson<Agreement>(rscript!, edger({ ...edgerArgs, counts: join(tx, "gene_counts.csv"), lengths: join(tx, "gene_length.csv"), resultFile: String(withLengths.data!.results_file) }));
    const b = await rJson<Agreement>(rscript!, edger({ ...edgerArgs, counts: join(tx, "gene_counts_rounded.csv"), resultFile: String(without.data!.results_file) }));
    expect(a.cor).toBeGreaterThan(0.999);
    expect(b.cor).toBeGreaterThan(0.999);
    expect(Math.abs(a.sig_deseq - a.sig_edger)).toBeLessThanOrEqual(2);
    expect(Math.abs(b.sig_deseq - b.sig_edger)).toBeLessThanOrEqual(2);
    expect(a.edger_without_offsets).toBeGreaterThan(a.sig_edger);
    expect(without.metrics!.n_significant).toBeGreaterThan(withLengths.metrics!.n_significant as number);
  });
});
