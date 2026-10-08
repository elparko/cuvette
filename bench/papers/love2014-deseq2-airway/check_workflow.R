.libPaths(c("/Volumes/T7/guided-analysis/tools/R-airway", "/Volumes/T7/guided-analysis/tools/R-library"))
suppressPackageStartupMessages({ library(airway); library(DESeq2) })
cat("DESeq2", as.character(packageVersion("DESeq2")), "airway", as.character(packageVersion("airway")), "\n")

run <- function(label, dds) {
  cat("\n=====", label, "\n")
  cat("rows before filter:", nrow(dds), "\n")
  cat("assays:", paste(assayNames(dds), collapse = ","), "\n")
  smallestGroupSize <- 4
  keep <- rowSums(counts(dds) >= 10) >= smallestGroupSize
  dds <- dds[keep, ]
  cat("rows after filter:", nrow(dds), "\n")
  dds <- DESeq(dds, quiet = TRUE)
  res <- results(dds)
  summary(res)
  cat("padj<0.1:", sum(res$padj < 0.1, na.rm = TRUE), "\n")
  res.05 <- results(dds, alpha = 0.05)
  cat("padj<0.05 (alpha 0.05):", sum(res.05$padj < 0.05, na.rm = TRUE), "\n")
  invisible(res)
}

data(gse)
gse$cell <- gse$donor
gse$dex <- gse$condition
print(levels(gse$dex))
levels(gse$dex) <- c("untrt", "trt")
gse$dex <- relevel(gse$dex, "untrt")
r1 <- run("workflow: data(gse), ~ cell + dex", DESeqDataSet(gse, design = ~ cell + dex))

data(airway)
airway$dex <- relevel(airway$dex, "untrt")
r2 <- run("data(airway), ~ cell + dex", DESeqDataSet(airway, design = ~ cell + dex))

cts <- as.matrix(read.csv("/Volumes/T7/guided-analysis/data/love2014-deseq2-airway/airway_counts.csv", row.names = 1, check.names = FALSE))
cd <- read.csv("/Volumes/T7/guided-analysis/data/love2014-deseq2-airway/airway_coldata.csv", row.names = 1)
cd$dex <- relevel(factor(cd$dex), "untrt"); cd$cell <- factor(cd$cell)
cat("\nCSV identical to assay(airway):", identical(unname(cts), unname(assay(airway))), identical(rownames(cts), rownames(airway)), "\n")
r3 <- run("repo CSV, ~ cell + dex", DESeqDataSetFromMatrix(cts, cd, design = ~ cell + dex))
r4 <- run("repo CSV, ~ dex", DESeqDataSetFromMatrix(cts, cd, design = ~ dex))

g2 <- gse
assays(g2) <- assays(g2)["counts"]
assay(g2) <- round(assay(g2))
mode(assay(g2)) <- "integer"
r5 <- run("data(gse), counts only, no transcript length offset", DESeqDataSet(g2, design = ~ cell + dex))
