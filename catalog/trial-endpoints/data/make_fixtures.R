.libPaths(c("/Volumes/T7/guided-analysis/tools/R-library", .libPaths()))
out <- dirname(sub("^--file=", "", grep("^--file=", commandArgs(FALSE), value = TRUE)[1]))

Rabbits <- array(c(0, 0, 6, 5, 3, 0, 3, 6, 6, 2, 0, 4, 5, 6, 1, 0, 2, 5, 0, 0),
  dim = c(2, 2, 5),
  dimnames = list(Delay = c("None", "1.5h"), Response = c("Cured", "Died"), Penicillin.Level = c("1/8", "1/4", "1/2", "1", "4")))
rows <- list()
for (k in seq_len(5)) for (i in 1:2) for (j in 1:2) {
  n <- Rabbits[i, j, k]
  if (n > 0) rows[[length(rows) + 1]] <- data.frame(level = dimnames(Rabbits)[[3]][k], delay = dimnames(Rabbits)[[1]][i], cured = as.integer(j == 1), n = n)
}
tab <- do.call(rbind, rows)
pat <- tab[rep(seq_len(nrow(tab)), tab$n), c("level", "delay", "cured")]
write.csv(pat, file.path(out, "rabbits_penicillin.csv"), row.names = FALSE)

suppressMessages(library(survRM2))
D <- rmst2.sample.data()
write.csv(data.frame(time = D$time, status = D$status, arm = D$arm), file.path(out, "pbc_rmst.csv"), row.names = FALSE)

shock <- "/Volumes/T7/guided-analysis/tools/metab-epi-trials/dl/shock"
s <- read.csv(file.path(shock, "survival_deident.csv"), na.strings = c("", ".", "NA"))
t <- read.csv(file.path(shock, "trial_deident.csv"), na.strings = c("", ".", "NA"))
m <- merge(t[, c("ID", "GROUP", "VITAL30", "agelt75")], s[, c("ID", "realsurv", "realcens")], by = "ID", all.x = TRUE)
m <- m[order(m$ID), ]
d <- data.frame(
  arm = ifelse(m$GROUP == 2, "early_revascularization", "medical_stabilization"),
  died_30d = as.integer(m$VITAL30 == 1),
  age_lt75 = as.integer(m$agelt75 == 2),
  time_days = round(m$realsurv, 4),
  death = 1L - as.integer(m$realcens))
write.csv(d, file.path(out, "shock_endpoints.csv"), row.names = FALSE, na = "")
