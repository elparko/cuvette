# Writes livak_ct.csv and livak_dilution.csv from the example data of the R package pcr 1.2.2 (inst/extdata).
# ct1.csv: c-myc and GAPDH Ct in brain and kidney, 6 samples each (Livak and Schmittgen 2001; Ahmed and Kim 2018, Table 2).
# ct3.csv: c-myc and GAPDH Ct of a dilution series, 7 amounts in triplicate (Ahmed and Kim 2018, Table 1).
# Run: Rscript data/make_fixtures.R data
.libPaths(c("/Volumes/T7/guided-analysis/tools/R-library", .libPaths()))
out <- if (length(commandArgs(TRUE))) commandArgs(TRUE)[1] else "."
f <- system.file("extdata", package = "pcr")
ct1 <- read.csv(file.path(f, "ct1.csv"))
w <- data.frame(sample = sprintf("s%02d", 1:12), group = rep(c("brain", "kidney"), each = 6))
long <- rbind(cbind(w, gene = "c_myc", cq = ct1$c_myc), cbind(w, gene = "GAPDH", cq = ct1$GAPDH))
long$well <- sprintf("%s-%s", long$sample, long$gene)
write.csv(long[, c("well", "sample", "group", "gene", "cq")], file.path(out, "livak_ct.csv"), row.names = FALSE)
ct3 <- read.csv(file.path(f, "ct3.csv"))
amount <- rep(c(1, 0.5, 0.2, 0.1, 0.05, 0.02, 0.01), each = 3)
dil <- rbind(data.frame(gene = "c_myc", quantity = amount, cq = ct3$c_myc), data.frame(gene = "GAPDH", quantity = amount, cq = ct3$GAPDH))
write.csv(dil, file.path(out, "livak_dilution.csv"), row.names = FALSE)
