.libPaths(c("/Volumes/T7/guided-analysis/tools/R-library", .libPaths()))
suppressMessages({library(DESeq2); library(edgeR)})
here <- commandArgs(trailingOnly = TRUE)[1]
cts <- read.csv(file.path(here, "tamoxifen_counts.csv"), check.names = FALSE)
smp <- read.csv(file.path(here, "tamoxifen_samples.csv"), check.names = FALSE)
m <- as.matrix(cts[, smp$sample])
rownames(m) <- cts$peak_id
sf <- smp$library_size / mean(smp$library_size)
cd <- data.frame(row.names = smp$sample, condition = factor(smp$condition, levels = c("Responsive", "Resistant")), tissue = factor(smp$tissue, levels = c("T47D", "MCF7", "BT474", "ZR75")))
deseq <- function(design, contrast, label) {
  dds <- DESeqDataSetFromMatrix(m, cd, design)
  sizeFactors(dds) <- sf
  dds <- DESeq(dds, fitType = "local", quiet = TRUE)
  res <- results(dds, contrast = contrast)
  s <- !is.na(res$padj) & res$padj <= 0.05
  cat(sprintf("DESeq2 %s: %d peaks with FDR <= 0.05 (%d up, %d down)\n", label, sum(s), sum(s & res$log2FoldChange > 0), sum(s & res$log2FoldChange < 0)))
}
deseq(~condition, c("condition", "Resistant", "Responsive"), "~ condition, Resistant against Responsive")
deseq(~tissue + condition, c("condition", "Resistant", "Responsive"), "~ tissue + condition, Resistant against Responsive")
deseq(~condition + tissue, c("tissue", "MCF7", "T47D"), "~ condition + tissue, MCF7 against T47D")
edger <- function(formula, coefname, label) {
  y <- DGEList(counts = m, lib.size = smp$library_size)
  mm <- model.matrix(formula, cd)
  y <- estimateDisp(y, mm)
  fit <- glmQLFit(y, mm)
  tt <- topTags(glmQLFTest(fit, coef = match(coefname, colnames(mm))), n = Inf)$table
  cat(sprintf("edgeR quasi-likelihood %s: %d peaks with FDR <= 0.05 (%d up, %d down)\n", label, sum(tt$FDR <= 0.05), sum(tt$FDR <= 0.05 & tt$logFC > 0), sum(tt$FDR <= 0.05 & tt$logFC < 0)))
}
edger(~condition, "conditionResistant", "~ condition, Resistant against Responsive")
edger(~tissue + condition, "conditionResistant", "~ tissue + condition, Resistant against Responsive")
edger(~condition + tissue, "tissueMCF7", "~ condition + tissue, MCF7 against T47D")
