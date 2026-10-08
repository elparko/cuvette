args <- commandArgs(FALSE)
source(file.path(dirname(sub("^--file=", "", args[grep("^--file=", args)])), "lib.R"))

run_tool(function() {
  p <- read_params()
  load_lme4()
  fit <- readRDS(p$model)
  re <- as.data.frame(lme4::ranef(fit, condVar = TRUE))
  df <- data.frame(group = re$grpvar, level = as.character(re$grp), term = re$term, estimate = re$condval, sd = re$condsd, stringsAsFactors = FALSE)
  out <- out_path("table")
  write.csv(df, out, row.names = FALSE)
  byterm <- tapply(df$estimate, paste(df$group, df$term, sep = ":"), function(x) c(mean = mean(x), sd = sd(x), min = min(x), max = max(x)))
  emit(list(
    ok = TRUE,
    summary = sprintf("%d conditional modes for %s", nrow(df), paste(unique(paste(df$group, df$term, sep = ":")), collapse = ", ")),
    metrics = list(n_rows = nrow(df)),
    data = list(spread = lapply(byterm, as.list)),
    table = table_of(df, out, 25),
    manualRoute = "ranef(fit, condVar = TRUE)"
  ))
})
