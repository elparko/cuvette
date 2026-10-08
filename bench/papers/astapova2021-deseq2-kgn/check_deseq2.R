lib <- Sys.getenv("GA_R_LIBS", "/Volumes/T7/guided-analysis/tools/R-library")
if (dir.exists(lib)) .libPaths(c(lib, .libPaths()))
suppressMessages(library(DESeq2))
m <- read.delim(gzfile(commandArgs(TRUE)[1]), row.names = 1, check.names = FALSE)
cat("genes", nrow(m), "samples", ncol(m), "duplicated ids", sum(duplicated(rownames(m))), "all integer", all(m == round(m)), "\n")
cd <- data.frame(row.names = colnames(m), treatment = factor(sub("[0-9_]+$", "", colnames(m)), levels = c("VEH", "DHT")), experiment = factor(sub("^[A-Z]+", "", colnames(m))))
print(cd)
for (f in c("~ experiment + treatment", "~ treatment")) {
  dds <- DESeqDataSetFromMatrix(as.matrix(m), cd, as.formula(f))
  dds <- DESeq(dds, quiet = TRUE)
  for (a in c(0.05, 0.1)) {
    r <- results(dds, contrast = c("treatment", "DHT", "VEH"), alpha = a)
    s <- !is.na(r$padj) & r$padj < a
    cat(f, "| alpha", a, "| significant", sum(s), "up", sum(s & r$log2FoldChange > 0), "down", sum(s & r$log2FoldChange < 0), "| raw p < 0.05", sum(r$pvalue < 0.05, na.rm = TRUE), "\n")
  }
}
cat("DESeq2", as.character(packageVersion("DESeq2")), "R", R.version.string, "\n")
