# The processing steps of the R code of Thaqi et al. 2026 (Zenodo 10.5281/zenodo.18680101, 13.02.26_Scientific_Data.R),
# written out with limma only, for the table of data/bovine_lfq.tsv. It does not use the Cuvette adapter.
suppressMessages(library(limma))
path <- commandArgs(TRUE)[1]
data <- read.table(path, header = TRUE, sep = "\t", quote = "", check.names = FALSE)
f <- data[data$`Only identified by site` != "+" & data$Reverse != "+" & data$`Potential contaminant` != "+", ]
cat("after flags", nrow(f), "\n")
f <- f[!is.na(suppressWarnings(as.numeric(f$Peptides))) & as.numeric(f$Peptides) > 1, ]
cat("peptides>1", nrow(f), "\n")
lfq <- grep("^LFQ intensity\\s", names(f), value = TRUE)
roman <- c("I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X")
nm <- sub("LFQ intensity ", "", lfq)
grp <- match(sub("-\\d+$", "", nm), roman)
m <- as.matrix(f[, lfq]); colnames(m) <- paste0("T", grp, "_", sub(".*-", "", nm))
m[m <= 0] <- NA; m <- log2(m)
ok <- Reduce(`|`, lapply(1:10, function(g) rowSums(!is.na(m[, grp == g])) >= ceiling(0.7 * sum(grp == g))))
m <- m[ok, ]
cat("valid in 6 of 8 in one group", nrow(m), "\n")
cm <- cor(m, use = "pairwise.complete.obs")
mc <- apply(cm, 1, function(x) mean(x[x < 0.999999 & is.finite(x)]))
cat("samples with mean correlation below 0.6:", sum(mc < 0.6), "\n")
vals <- m[!is.na(m)]
set.seed(1)
miss <- which(is.na(m))
m[miss] <- rnorm(length(miss), mean(vals) - 1.8 * sd(vals), 0.3 * sd(vals))
cat("imputed values", length(miss), "\n")
qn <- function(x) { r <- apply(x, 2, rank, ties.method = "min"); avg <- rowMeans(apply(x, 2, sort)); x[] <- avg[r]; x }
E <- qn(m)
run <- function(a, b) {
  ca <- grep(paste0("^", a, "_"), colnames(E), value = TRUE); cb <- grep(paste0("^", b, "_"), colnames(E), value = TRUE)
  g <- factor(c(rep(a, length(ca)), rep(b, length(cb))), levels = c(a, b))
  des <- model.matrix(~0 + g); colnames(des) <- levels(g)
  fit <- eBayes(contrasts.fit(lmFit(E[, c(ca, cb)], des), makeContrasts(contrasts = paste0(b, "-", a), levels = des)), robust = TRUE)
  tab <- topTable(fit, number = Inf, sort.by = "none")
  cat(sprintf("%s vs %s: higher in %s %d, higher in %s %d\n", a, b, a, sum(tab$logFC < -1 & tab$adj.P.Val < 0.05), b, sum(tab$logFC > 1 & tab$adj.P.Val < 0.05)))
}
for (p in list(c("T1", "T4"), c("T3", "T5"), c("T4", "T6"), c("T5", "T6"), c("T6", "T7"), c("T7", "T10"))) run(p[1], p[2])
