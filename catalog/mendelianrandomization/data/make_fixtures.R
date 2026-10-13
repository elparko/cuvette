.libPaths(c(Sys.getenv("CUVETTE_R_LIBS", file.path(Sys.getenv("HOME"), ".cuvette", "R-library")), .libPaths()))
suppressMessages(library(MendelianRandomization))
here <- commandArgs(trailingOnly = TRUE)[1]
write.csv(data.frame(snp = sprintf("snp_%d", seq_along(ldlc)), beta_exposure = ldlc, se_exposure = ldlcse, beta_outcome = chdlodds, se_outcome = chdloddsse), file.path(here, "ldl_chd.csv"), row.names = FALSE)
write.csv(data.frame(snp = sprintf("snp_%d", seq_along(calcium)), beta_exposure = calcium, se_exposure = calciumse, beta_outcome = fastgluc, se_outcome = fastglucse), file.path(here, "calcium_glucose.csv"), row.names = FALSE)
write.table(calc.rho, file.path(here, "calcium_correlation.csv"), sep = ",", row.names = FALSE, col.names = FALSE)
write.csv(data.frame(snp = sprintf("snp_%d", seq_along(hdlc)), beta_exposure = hdlc, se_exposure = hdlcse, beta_outcome = chdlodds, se_outcome = chdloddsse), file.path(here, "hdl_chd.csv"), row.names = FALSE)
