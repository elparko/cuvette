load_flowcore <- function() suppressMessages(suppressWarnings(library(flowCore)))

list_files <- function(v, what = "files") {
  v <- as_list_arg(v)
  if (!length(v)) fail(sprintf("give %s, a list of FCS paths or one folder", what))
  out <- character()
  for (x in v) {
    if (dir.exists(x)) out <- c(out, sort(list.files(x, pattern = "\\.fcs$", full.names = TRUE, ignore.case = TRUE)))
    else if (grepl("[*?]", x)) out <- c(out, sort(Sys.glob(x)))
    else out <- c(out, x)
  }
  missing <- out[!file.exists(out)]
  if (length(missing)) fail(sprintf("file not found: %s", paste(head(missing, 5), collapse = ", ")))
  if (!length(out)) fail(sprintf("no FCS file in %s", paste(v, collapse = ", ")))
  unique(out)
}

read_fcs <- function(path) {
  ff <- tryCatch(read.FCS(path, transformation = FALSE, truncate_max_range = FALSE, emptyValue = FALSE), error = function(e) fail(sprintf("cannot read %s as an FCS file. R says: %s", path, conditionMessage(e))))
  ff
}

channel_table <- function(ff) {
  pd <- pData(parameters(ff))
  data.frame(channel = pd$name, marker = ifelse(is.na(pd$desc), "", pd$desc), stringsAsFactors = FALSE)
}

resolve_channel <- function(ff, name, arg = "channel") {
  ct <- channel_table(ff)
  hit <- which(ct$channel == name)
  if (!length(hit)) hit <- which(ct$marker == name)
  if (!length(hit)) hit <- which(toupper(ct$channel) == toupper(name))
  if (!length(hit)) hit <- which(toupper(ct$marker) == toupper(name))
  if (length(hit) != 1) fail(sprintf("%s '%s' is not a channel or marker of the file. Channels: %s", arg, name, paste(ct$channel, collapse = ", ")))
  ct$channel[hit]
}

apply_compensation <- function(ff, comp, comp_file) {
  if (comp == "none") return(ff)
  if (comp == "file") {
    if (is.null(comp_file) || !file.exists(comp_file)) fail("compensation is 'file', so give comp_file, a CSV matrix with the channel names in the header and one row for each channel")
    m <- as.matrix(read.csv(comp_file, check.names = FALSE, row.names = 1))
    colnames(m) <- trimws(colnames(m))
    rownames(m) <- trimws(rownames(m))
    miss <- setdiff(colnames(m), colnames(ff))
    if (length(miss)) fail(sprintf("the compensation matrix has channels that the file does not have: %s", paste(miss, collapse = ", ")))
    return(compensate(ff, m))
  }
  if (comp == "keyword") {
    sp <- spillover(ff)
    sp <- sp[!vapply(sp, is.null, TRUE)]
    if (!length(sp)) fail(sprintf("compensation is 'keyword', but %s has no SPILL or SPILLOVER keyword", basename(ff@description[["FILENAME"]])))
    return(compensate(ff, sp[[1]]))
  }
  fail("compensation must be none, keyword or file")
}

transform_exprs <- function(x, channels, tr, cofactor) {
  if (tr == "none") return(x)
  if (tr == "asinh") {
    for (ch in channels) x[, ch] <- asinh(x[, ch] / cofactor)
    return(x)
  }
  if (tr == "log10") {
    for (ch in channels) x[, ch] <- log10(pmax(x[, ch], 1))
    return(x)
  }
  fail("transform must be none, asinh or log10")
}

parse_ranges <- function(v) {
  v <- as_list_arg(v)
  lapply(v, function(s) {
    parts <- strsplit(s, ":", fixed = TRUE)[[1]]
    if (length(parts) != 3) fail(sprintf("pregate '%s' must look like FSC-A:50000:250000 (channel, low, high; use min or max for no limit)", s))
    lo <- if (parts[2] %in% c("min", "")) -Inf else as.numeric(parts[2])
    hi <- if (parts[3] %in% c("max", "")) Inf else as.numeric(parts[3])
    if (is.na(lo) || is.na(hi)) fail(sprintf("pregate '%s' has a limit that is not a number", s))
    list(channel = trimws(parts[1]), lo = lo, hi = hi)
  })
}

parse_thresholds <- function(v) {
  v <- as_list_arg(v)
  out <- list()
  for (s in v) {
    kv <- strsplit(s, "=", fixed = TRUE)[[1]]
    if (length(kv) != 2 || is.na(suppressWarnings(as.numeric(kv[2])))) fail(sprintf("threshold '%s' must look like CD4=2500 (marker or channel, then a number)", s))
    out[[trimws(kv[1])]] <- as.numeric(kv[2])
  }
  out
}

pop_tag <- function(x) clean_name(gsub("-( |$)", "neg\\1", gsub("\\+( |$)", "pos\\1", x)))
