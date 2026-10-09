args <- commandArgs(FALSE)
source(file.path(dirname(sub("^--file=", "", args[grep("^--file=", args)])), "lib.R"))

run_tool(function() {
  suppressMessages(library(DiffBind))
  p <- read_params()
  sheet <- pick(p, "sample_sheet", NULL)
  if (is.null(sheet)) fail("give sample_sheet, the path of the DiffBind sample sheet (a CSV file with the columns SampleID, Condition, bamReads and Peaks)")
  if (!file.exists(sheet)) fail(paste("sample_sheet: file not found:", sheet))
  sheet <- normalizePath(sheet)
  raw <- tryCatch(read.csv(sheet, check.names = FALSE, stringsAsFactors = FALSE, strip.white = TRUE), error = function(e) fail(paste("sample_sheet", sheet, "cannot be read as a CSV file:", conditionMessage(e))))
  need_cols <- c("SampleID", "bamReads", "Peaks")
  miss <- setdiff(need_cols, names(raw))
  if (length(miss)) fail(sprintf("sample_sheet %s has no column %s. Columns: %s", sheet, paste(miss, collapse = ", "), paste(names(raw), collapse = ", ")))
  base <- dirname(sheet)
  resolve <- function(f) if (grepl("^(/|[A-Za-z]:)", f)) f else file.path(base, f)
  for (col in intersect(c("bamReads", "bamControl", "Peaks"), names(raw))) {
    gone <- !is.na(raw[[col]]) & nzchar(raw[[col]]) & !file.exists(vapply(raw[[col]], resolve, ""))
    if (any(gone)) fail(sprintf("sample_sheet %s: the file '%s' in column %s (sample %s) does not exist. Paths in the sheet are relative to the folder of the sheet: %s", sheet, raw[[col]][which(gone)[1]], col, raw$SampleID[which(gone)[1]], base))
  }
  min_overlap <- as.integer(pick(p, "min_overlap", 2))
  if (!is.finite(min_overlap) || min_overlap < 1 || min_overlap > nrow(raw)) fail(sprintf("min_overlap must be between 1 and the number of samples (%d), not %s", nrow(raw), pick(p, "min_overlap", 2)))
  summits <- as.integer(pick(p, "summits", 200))
  if (!is.finite(summits) || summits < 0) fail("summits must be 0 or more (base pairs). Use 0 to keep the original peak width.")
  old <- setwd(base)
  on.exit(setwd(old), add = TRUE)
  dba_obj <- dba(sampleSheet = sheet, config = data.frame(doBlacklist = FALSE, doGreylist = FALSE, RunParallel = FALSE, minQCth = as.integer(pick(p, "min_mapping_quality", 15))))
  dba_obj <- dba.count(dba_obj, minOverlap = min_overlap, summits = if (summits == 0) FALSE else summits, bSubControl = FALSE, bParallel = FALSE, score = DBA_SCORE_READS)
  info <- dba.show(dba_obj)
  reads <- sapply(dba_obj$peaks, function(x) x$Reads)
  pk <- dba_obj$peaks[[1]]
  colnames(reads) <- info$ID
  ids <- sprintf("%s:%d-%d", pk$Chr, pk$Start, pk$End)
  counts <- data.frame(peak_id = ids, chr = pk$Chr, start = pk$Start, end = pk$End, reads, check.names = FALSE, stringsAsFactors = FALSE)
  samples <- data.frame(sample = info$ID, info[, intersect(c("Tissue", "Factor", "Condition", "Treatment", "Replicate"), names(info)), drop = FALSE], library_size = as.numeric(info$Reads), frip = as.numeric(info$FRiP), peak_reads = colSums(reads), check.names = FALSE, stringsAsFactors = FALSE)
  names(samples) <- tolower(names(samples))
  if (nzchar(out_path("counts"))) write.csv(counts, out_path("counts"), row.names = FALSE)
  if (nzchar(out_path("samples"))) write.csv(samples, out_path("samples"), row.names = FALSE)
  metrics <- list(n_sites = nrow(counts), n_samples = ncol(reads), min_overlap = min_overlap, summits = summits, peak_width = if (summits == 0) NA_real_ else 2 * summits + 1, mean_frip = mean(samples$frip), min_frip = min(samples$frip), total_peak_reads = sum(reads))
  for (i in seq_len(nrow(samples))) {
    metrics[[paste0("library_size_", samples$sample[i])]] <- samples$library_size[i]
    metrics[[paste0("frip_", samples$sample[i])]] <- samples$frip[i]
  }
  warns <- character()
  low <- samples$sample[samples$frip < 0.05]
  if (length(low)) warns <- c(warns, sprintf("FRiP below 0.05 for %s: few reads fall in peaks, so the signal can be weak", paste(low, collapse = ", ")))
  emit(list(
    ok = TRUE,
    summary = sprintf("%d consensus sites (a site is in at least %d samples), %d samples, peak width %s. Reads counted without control subtraction. FRiP (fraction of reads in peaks) %.2f to %.2f.%s", nrow(counts), min_overlap, ncol(reads), if (summits == 0) "as called" else sprintf("%d bp around the summit", 2 * summits + 1), min(samples$frip), max(samples$frip), if (length(warns)) paste0(" Warnings: ", paste(warns, collapse = "; "), ".") else ""),
    metrics = metrics,
    data = list(counts_file = out_path("counts"), samples_file = out_path("samples"), warnings = as.list(warns), diffbind_version = as.character(packageVersion("DiffBind"))),
    table = table_of(samples, out_path("samples")),
    manualRoute = "library(DiffBind); tam <- dba(sampleSheet = \"samples.csv\"); tam <- dba.count(tam, minOverlap = 2, summits = 200, bSubControl = FALSE); dba.peakset(tam, bRetrieve = TRUE)"
  ))
})
