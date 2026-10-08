args <- commandArgs(FALSE)
source(file.path(dirname(sub("^--file=", "", args[grep("^--file=", args)])), "lib.R"))

run_tool(function() {
  p <- read_params()
  path <- p$path
  if (!file.exists(path)) fail(paste("file not found:", path))
  load_cardinal()
  ext <- tolower(tools::file_ext(path))
  x <- if (ext == "rds") {
    readRDS(path)
  } else if (ext %in% c("rda", "rdata")) {
    e <- new.env()
    nm <- load(path, envir = e)
    obj <- pick(p, "object", nm[1])
    if (!obj %in% nm) fail(paste("object not in file. Objects:", paste(nm, collapse = ", ")))
    get(obj, envir = e)
  } else if (ext %in% c("imzml", "ibd")) {
    readMSIData(sub("\\.ibd$", ".imzML", path, ignore.case = TRUE), attach.only = FALSE)
  } else {
    fail("the file type must be .rds, .rda, .RData or .imzML")
  }
  if (!is(x, "MSImagingExperiment")) x <- as(x, "MSImagingExperiment")
  out <- out_path("image")
  saveRDS(x, out)
  mz <- mz(x)
  co <- coord(x)
  runs <- levels(run(x))
  emit(list(
    ok = TRUE,
    summary = sprintf("%d spectra, %d m/z values, m/z %.2f to %.2f, %d run(s)", ncol(x), nrow(x), min(mz), max(mz), length(runs)),
    metrics = list(n_spectra = ncol(x), n_features = nrow(x), mz_min = min(mz), mz_max = max(mz), n_runs = length(runs), x_min = min(co$x), x_max = max(co$x), y_min = min(co$y), y_max = max(co$y), centroided = isTRUE(centroided(x))),
    data = list(image_file = out, runs = runs, cardinal_version = cardinal_version()),
    manualRoute = sprintf("library(Cardinal); x <- readRDS(\"%s\")  # or readMSIData() for imzML", path)
  ))
})
