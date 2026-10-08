args <- commandArgs(FALSE)
source(file.path(dirname(sub("^--file=", "", args[grep("^--file=", args)])), "lib.R"))

run_tool(function() {
  p <- read_params()
  load_cardinal()
  obj <- readRDS(p$model)
  s <- as.numeric(pick(p, "s", NA))
  if (is.na(s)) s <- obj$s[1]
  idx <- match(s, obj$s)
  if (is.na(idx)) fail(paste("no model with s =", s, ". Fitted s values:", paste(obj$s, collapse = ", ")))
  m <- if (length(obj$s) == 1) obj$fit else obj$fit[[idx]]
  out <- out_path("map")
  png(out, width = 900, height = 600, res = 110)
  print(image(m, type = "class", main = sprintf("Segments, s = %s", s)))
  dev.off()
  sizes <- table(m$class)
  emit(list(
    ok = TRUE,
    summary = sprintf("segment map for s=%s with %d segments", s, length(sizes)),
    metrics = list(s = s, n_segments = length(sizes)),
    data = list(segment_sizes = as.list(setNames(as.integer(sizes), names(sizes)))),
    manualRoute = sprintf("image(fit[[%d]], type=\"class\")  # model s=%s", idx, s)
  ))
})
