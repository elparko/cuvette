args <- commandArgs(FALSE)
source(file.path(dirname(sub("^--file=", "", args[grep("^--file=", args)])), "lib.R"))

run_tool(function() {
  p <- read_params()
  load_vegan()
  m <- read_community(p$community)
  index <- pick(p, "index", "shannon")
  base <- switch(pick(p, "base", "e"), e = exp(1), `2` = 2, `10` = 10, as.numeric(pick(p, "base", "e")))
  S <- specnumber(m)
  H <- diversity(m, "shannon", base = base)
  df <- data.frame(site = rownames(m), richness = S, shannon = H, simpson = diversity(m, "simpson"), invsimpson = diversity(m, "invsimpson"), evenness = ifelse(S > 1, H / log(S, base = base), NA), stringsAsFactors = FALSE)
  main <- df[[index]]
  metrics <- list(n_sites = nrow(df), mean_index = mean(main, na.rm = TRUE), sd_index = sd(main, na.rm = TRUE), mean_richness = mean(S), first_site_index = main[1])
  data <- list(index = index, base = as.character(pick(p, "base", "e")), vegan_version = vegan_version())
  group <- pick(p, "group_by", NULL)
  png_out <- out_path("plot")
  if (!is.null(group) && !is.null(pick(p, "environment", NULL))) {
    env <- read_env(p$environment, rownames(m))
    if (!group %in% names(env)) fail(paste("group_by is not a column of the environment table:", group))
    g <- factor(env[[group]])
    tab <- aggregate(main, list(group = g), function(x) c(n = length(x), mean = mean(x), sd = sd(x)))
    data$group_means <- lapply(seq_len(nrow(tab)), function(i) list(group = as.character(tab$group[i]), n = tab$x[i, "n"], mean = tab$x[i, "mean"], sd = tab$x[i, "sd"]))
    metrics$n_groups <- nlevels(g)
    png(png_out, width = 800, height = 600, res = 110)
    boxplot(main ~ g, xlab = group, ylab = index, col = "grey85")
    stripchart(main ~ g, vertical = TRUE, method = "jitter", pch = 16, add = TRUE)
    dev.off()
  } else {
    png(png_out, width = 900, height = 600, res = 110)
    barplot(main, names.arg = df$site, las = 2, ylab = index, col = "grey70")
    dev.off()
  }
  out <- out_path("table")
  write.csv(df, out, row.names = FALSE)
  emit(list(
    ok = TRUE,
    summary = sprintf("%s over %d sites: mean %.3f, first site %.4f", index, nrow(df), metrics$mean_index, metrics$first_site_index),
    metrics = metrics,
    data = data,
    table = table_of(df, out, 25),
    manualRoute = sprintf("diversity(comm, index=\"shannon\", base=%s); diversity(comm, \"simpson\"); specnumber(comm)", if (identical(pick(p, "base", "e"), "e")) "exp(1)" else format(base))
  ))
})
