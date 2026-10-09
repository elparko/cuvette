# Independent check of the numbers of Zhu et al. 2020, data set D2 (label-free E. coli spike-in), with limma only.
# It does not use the Cuvette adapter.
suppressMessages(library(limma))
path <- commandArgs(TRUE)[1]
pg <- read.delim(path, check.names = FALSE, stringsAsFactors = FALSE, quote = "")
cat("rows", nrow(pg), "\n")
pg <- pg[!(pg$Reverse %in% "+" | pg$Contaminant %in% "+"), ]
ecoli <- grepl("Escherichia|_ECOLI", pg$`Fasta headers`)
cat("after removal of Reverse and Contaminant", nrow(pg), " E. coli", sum(ecoli), "\n")
lfq <- grep("^LFQ intensity", names(pg), value = TRUE)
m <- as.matrix(pg[, lfq]); m[m == 0] <- NA; m <- log2(m)
grp <- factor(substr(sub("LFQ intensity ", "", lfq), 1, 1))
ok <- rowSums(!is.na(m[, grp == "L"])) >= 2 & rowSums(!is.na(m[, grp == "H"])) >= 2
cat("at least 2 values in each condition", sum(ok), "\n")
x <- m[ok, ]
for (tr in c(TRUE, FALSE)) {
  tt <- topTable(eBayes(lmFit(x, model.matrix(~ grp)), trend = tr), coef = 2, number = Inf, sort.by = "none")
  s <- tt$adj.P.Val < 0.01 & tt$logFC < 0
  cat(sprintf("limma trend=%s, adjusted p < 0.01, more abundant at the higher E. coli amount: %d true positives (E. coli), %d false positives (other)\n",
              tr, sum(ecoli[ok][s]), sum(!ecoli[ok][s])))
}
