args <- commandArgs(FALSE)
source(file.path(dirname(sub("^--file=", "", args[grep("^--file=", args)])), "lib.R"))

run_tool(function() {
  p <- read_params()
  load_cardinal()
  x <- readRDS(p$image)
  method <- pick(p, "normalize", "tic")
  snr <- as.numeric(pick(p, "snr", 3))
  size <- as.numeric(pick(p, "sample_size", 0.1))
  tol <- as.numeric(pick(p, "tolerance", 0.5))
  units <- pick(p, "units", "mz")
  seed <- as.integer(pick(p, "seed", 1))
  if (!method %in% c("tic", "rms", "none")) fail("normalize must be tic, rms or none")
  set.seed(seed)
  if (method != "none") x <- normalize(x, method = method)
  pk <- peakProcess(x, SNR = snr, sampleSize = size, tolerance = tol, units = units)
  out <- out_path("peaks")
  saveRDS(pk, out)
  emit(list(
    ok = TRUE,
    summary = sprintf("%d peaks in %d spectra (normalize %s, SNR %s, tolerance %s %s, sample size %s, seed %s)", nrow(pk), ncol(pk), method, snr, tol, units, size, seed),
    metrics = list(n_peaks = nrow(pk), n_spectra = ncol(pk), mz_min = min(mz(pk)), mz_max = max(mz(pk))),
    data = list(peaks_file = out, normalize = method, snr = snr, sample_size = size, tolerance = tol, units = units, seed = seed),
    manualRoute = sprintf("set.seed(%s); x <- normalize(x, method=\"%s\"); pk <- peakProcess(x, SNR=%s, sampleSize=%s, tolerance=%s, units=\"%s\")", seed, method, snr, size, tol, units)
  ))
})
