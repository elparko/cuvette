# Writes the test data files from data sets in R packages.
# growthdata: 96 wells of OD over 24 hours, R package growthcurver (the data of the vignette).
# bactgrowth: bacterial growth with an antibiotic, R package growthrates. The file keeps the first experiment
# (strain D, concentration 0, replicate 1), the data of the easylinear example in the growthrates vignette.
.libPaths(c("/Volumes/T7/guided-analysis/tools/R-library", .libPaths()))
out <- if (length(commandArgs(TRUE))) commandArgs(TRUE)[1] else "."
write.csv(growthcurver::growthdata, file.path(out, "growthdata.csv"), row.names = FALSE)
b <- growthrates::bactgrowth
b <- b[b$strain == "D" & b$conc == 0 & b$replicate == 1, c("time", "value")]
names(b) <- c("time", "D_0_1")
write.csv(b, file.path(out, "bactgrowth_D_0_1.csv"), row.names = FALSE)
