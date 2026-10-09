# Writes the test data files from data sets that ship with R.
# DNase: ELISA of recombinant DNase in rat serum (Davidian and Giltinan 1995), R package datasets.
# ryegrass: root length against ferulic acid (Inderjit et al. 2002), R package drc.
# Puromycin: enzyme velocity against substrate (Treloar 1974; Bates and Watts 1988), R package datasets.
out <- if (length(commandArgs(TRUE))) commandArgs(TRUE)[1] else "."
d <- datasets::DNase
r1 <- d[d$Run == 1, ]
std <- data.frame(plate = "run1", well = sprintf("S%02d", seq_len(nrow(r1))), type = "standard", sample = sprintf("std_%g", r1$conc), conc = r1$conc, signal = r1$density, dilution = 1)
r2 <- d[d$Run == 2, ]
smp <- data.frame(plate = "run1", well = sprintf("U%02d", seq_len(nrow(r2))), type = "sample", sample = sprintf("serum_%02d", as.integer(factor(r2$conc))), conc = NA, signal = r2$density, dilution = 10)
write.csv(rbind(std, smp), file.path(out, "dnase_elisa.csv"), row.names = FALSE, na = "")
write.csv(drc::ryegrass, file.path(out, "ryegrass.csv"), row.names = FALSE)
write.csv(datasets::Puromycin, file.path(out, "puromycin.csv"), row.names = FALSE)
