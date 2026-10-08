args <- commandArgs(FALSE)
source(file.path(dirname(sub("^--file=", "", args[grep("^--file=", args)])), "lib.R"))

run_tool(function() {
  p <- read_params()
  found <- detect_input(p$counts, p$lengths)
  p$input_type <- found$type
  if (found$type == "counts and lengths" && !nzchar(pick(p, "lengths", ""))) {
    m <- read_numbers(p$counts)
    emit(list(
      ok = TRUE,
      summary = sprintf("Detected input type: counts and lengths (%s). %d genes, %d samples. Give the length table of tximport (lengths), or use the quant files with a tx2gene table.", found$reason, nrow(m), ncol(m)),
      metrics = list(n_genes = nrow(m), n_samples = ncol(m)),
      data = list(detected_input_type = found$type, detected_because = found$reason, has_lengths = FALSE, whole_number_counts = FALSE)
    ))
  }
  if (p$input_type == "SummarizedExperiment rds" || p$input_type == "transcript quantification") load_deseq()
  input <- load_input(p)
  m <- input$counts
  cd <- input$coldata
  cols <- lapply(names(cd), function(n) {
    v <- cd[[n]]
    lv <- if (is.numeric(v)) NULL else sort(unique(as.character(v)))
    list(column = n, type = if (is.numeric(v)) "number" else "text", n_levels = length(lv), levels = paste(lv, collapse = ", "))
  })
  df <- data.frame(column = sapply(cols, `[[`, "column"), type = sapply(cols, `[[`, "type"), n_levels = sapply(cols, `[[`, "n_levels"), levels = sapply(cols, `[[`, "levels"), stringsAsFactors = FALSE)
  offsets <- !is.null(input$length)
  emit(list(
    ok = TRUE,
    summary = sprintf("Detected input type: %s (%s). %d genes, %d samples, %d coldata columns, %d zero-count genes. %s", found$type, found$reason, nrow(m), ncol(m), ncol(cd), sum(rowSums(m) == 0), if (offsets) "Transcript lengths are present, so run_deseq uses them as offsets." else "No transcript lengths."),
    metrics = list(n_genes = nrow(m), n_samples = ncol(m), n_columns = ncol(cd), n_zero_genes = sum(rowSums(m) == 0), min_library_size = round(min(colSums(m))), max_library_size = round(max(colSums(m)))),
    data = list(detected_input_type = found$type, detected_because = found$reason, input_type = input$type, import = input$import, has_lengths = offsets, whole_number_counts = whole(m)),
    table = table_of(df, NULL, 30),
    manualRoute = sprintf("# input: %s\n%s", input$type, input$import)
  ))
})
