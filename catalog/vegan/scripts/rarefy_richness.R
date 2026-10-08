args <- commandArgs(FALSE)
source(file.path(dirname(sub("^--file=", "", args[grep("^--file=", args)])), "lib.R"))

run_tool(function() {
  p <- read_params()
  load_vegan()
  m <- read_community(p$community)
  if (!all(m == round(m))) fail("rarefaction needs whole-number counts of individuals. This table has non-integer values")
  totals <- rowSums(m)
  size <- as.integer(pick(p, "sample_size", min(totals[totals > 0])))
  short <- rownames(m)[totals < size]
  keep <- totals >= size
  est <- rep(NA_real_, nrow(m))
  est[keep] <- as.numeric(rarefy(m[keep, , drop = FALSE], size))
  df <- data.frame(site = rownames(m), total = totals, observed = specnumber(m), rarefied = est, stringsAsFactors = FALSE)
  out <- out_path("table")
  write.csv(df, out, row.names = FALSE)
  png_out <- out_path("plot")
  png(png_out, width = 900, height = 600, res = 110)
  rarecurve(m[totals > 0, , drop = FALSE], step = max(1, floor(max(totals) / 40)), sample = size, xlab = "Individuals", ylab = "Species", label = FALSE)
  dev.off()
  emit(list(
    ok = TRUE,
    summary = sprintf("rarefied to %d individuals: mean %.3f species over %d sites, %d sites dropped for a smaller total", size, mean(est, na.rm = TRUE), sum(keep), length(short)),
    metrics = list(sample_size = size, n_sites_used = sum(keep), n_sites_dropped = length(short), mean_rarefied = mean(est, na.rm = TRUE), min_total = min(totals[totals > 0]), first_site_rarefied = est[1]),
    data = list(dropped_sites = as.list(short), vegan_version = vegan_version()),
    table = table_of(df, out, 25),
    manualRoute = sprintf("rarefy(comm, sample = %d); rarecurve(comm, sample = %d)", size, size)
  ))
})
