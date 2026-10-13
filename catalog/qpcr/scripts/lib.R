local({
  home <- Sys.getenv("HOME")
  cand <- c(Sys.getenv("CUVETTE_R_LIBS"), Sys.getenv("R_LIBS_USER"), "/Volumes/T7/guided-analysis/tools/R-library", file.path(home, ".cuvette", "R-library"))
  cand <- unique(cand[nzchar(cand) & dir.exists(cand)])
  if (length(cand)) {
    Sys.setenv(R_LIBS_USER = cand[1])
    .libPaths(c(cand, .libPaths()))
  }
})

sink(stderr(), type = "output")
options(warn = 1)

read_params <- function() jsonlite::fromJSON(commandArgs(trailingOnly = TRUE)[1], simplifyVector = TRUE)

pick <- function(p, key, default) {
  v <- p[[key]]
  if (is.null(v) || (length(v) == 1 && (is.na(v) || identical(v, "")))) default else v
}

need <- function(p, key, decision) {
  v <- pick(p, key, NULL)
  if (is.null(v)) fail(sprintf("%s is not set. It is the decision '%s'. Ask the scientist.", key, decision))
  v
}

emit <- function(x) {
  if (!is.null(x$data)) x <- c(x[names(x) != "data"], x$data)
  sink()
  cat(jsonlite::toJSON(x, auto_unbox = TRUE, digits = NA, na = "null", null = "null"), "\n")
  quit(save = "no", status = 0)
}

fail <- function(msg) emit(list(ok = FALSE, error = msg))

run_tool <- function(body) {
  script <- grep("^--file=", commandArgs(FALSE), value = TRUE)
  step <- if (length(script)) sub("\\.R$", "", basename(sub("^--file=", "", script[1]))) else "the R step"
  tryCatch(body(), error = function(e) {
    p <- tryCatch(read_params(), error = function(e2) list())
    where <- if (!is.null(p$data)) paste0(" on ", paste(p$data, collapse = ", ")) else ""
    fail(paste0(step, " failed", where, ". R says: ", conditionMessage(e)))
  })
}

out_path <- function(key) Sys.getenv(paste0("CUVETTE_OUTPUT_", toupper(key)))

table_of <- function(df, path = NULL, max_rows = 40) {
  rows <- lapply(seq_len(min(nrow(df), max_rows)), function(i) unname(lapply(df[i, , drop = FALSE], function(v) if (is.factor(v)) as.character(v) else v)))
  list(columns = names(df), rows = rows, n_rows = nrow(df), path = path)
}

read_data <- function(path) {
  if (is.null(path) || !nzchar(path)) fail("give the data file (a CSV file with a header row)")
  if (!file.exists(path)) fail(paste("file not found:", path))
  sep <- if (grepl("\\.(tsv|txt)$", path, ignore.case = TRUE)) "\t" else ","
  read.csv(path, sep = sep, check.names = FALSE, stringsAsFactors = FALSE, strip.white = TRUE)
}

need_column <- function(df, col, arg) {
  if (is.null(col) || !nzchar(col)) fail(sprintf("give the argument %s. Columns: %s", arg, paste(names(df), collapse = ", ")))
  if (!col %in% names(df)) fail(sprintf("%s '%s' is not a column of the data. Columns: %s", arg, col, paste(names(df), collapse = ", ")))
  col
}

default_col <- function(p, key, df, name) pick(p, key, if (name %in% names(df)) name else NULL)

numeric_column <- function(df, col, arg) {
  v <- suppressWarnings(as.numeric(df[[col]]))
  bad <- which(is.na(v) & !is.na(df[[col]]) & nzchar(as.character(df[[col]])))
  if (length(bad)) fail(sprintf("%s '%s' has text that is not a number in rows %s, such as '%s'", arg, col, paste(head(bad + 1, 5), collapse = ", "), df[[col]][bad[1]]))
  v
}

NON_DETECT <- c("undetermined", "n/a", "na", "no ct", "no cq", "nd", "-", "")

cq_column <- function(df, col) {
  raw <- trimws(as.character(df[[col]]))
  v <- suppressWarnings(as.numeric(raw))
  nd <- is.na(v) & (is.na(df[[col]]) | tolower(raw) %in% NON_DETECT)
  bad <- which(is.na(v) & !nd)
  if (length(bad)) fail(sprintf("cq_col '%s' has text that is not a Cq in rows %s, such as '%s'. Use a number, or Undetermined for no amplification.", col, paste(head(bad + 1, 5), collapse = ", "), raw[bad[1]]))
  list(cq = v, non_detect = nd)
}

as_list_arg <- function(v) {
  if (is.null(v)) return(character())
  v <- unlist(strsplit(as.character(unlist(v)), ","))
  v <- trimws(v)
  v[nzchar(v) & tolower(v) != "none"]
}

read_long <- function(p, need_group = FALSE) {
  df <- read_data(p$data)
  sample_col <- need_column(df, default_col(p, "sample_col", df, "sample"), "sample_col")
  gene_col <- need_column(df, default_col(p, "gene_col", df, "gene"), "gene_col")
  cq_col <- need_column(df, default_col(p, "cq_col", df, "cq"), "cq_col")
  group_col <- default_col(p, "group_col", df, "group")
  if (need_group && is.null(group_col)) fail(sprintf("give group_col, the column with the group of each sample. Columns: %s", paste(names(df), collapse = ", ")))
  if (!is.null(group_col)) need_column(df, group_col, "group_col")
  well_col <- default_col(p, "well_col", df, "well")
  if (!is.null(well_col)) need_column(df, well_col, "well_col")
  cq <- cq_column(df, cq_col)
  d <- data.frame(row = seq_len(nrow(df)) + 1, sample = as.character(df[[sample_col]]), gene = as.character(df[[gene_col]]), cq = cq$cq, non_detect = cq$non_detect, stringsAsFactors = FALSE)
  d$group <- if (is.null(group_col)) "all" else as.character(df[[group_col]])
  d$well <- if (is.null(well_col)) as.character(d$row) else as.character(df[[well_col]])
  subset_col <- pick(p, "subset_col", NULL)
  if (!is.null(subset_col)) {
    need_column(df, subset_col, "subset_col")
    val <- as_list_arg(pick(p, "subset_value", NULL))
    if (!length(val)) fail(sprintf("subset_col is set. Give subset_value, one or more values of '%s': %s", subset_col, paste(head(unique(df[[subset_col]]), 12), collapse = ", ")))
    miss <- setdiff(val, as.character(df[[subset_col]]))
    if (length(miss)) fail(sprintf("subset_value %s is not a value of '%s'. Values: %s", paste(miss, collapse = ", "), subset_col, paste(head(unique(df[[subset_col]]), 12), collapse = ", ")))
    d <- d[as.character(df[[subset_col]]) %in% val, ]
  }
  exclude <- as_list_arg(p$exclude)
  n_excluded <- 0
  if (length(exclude)) {
    hit <- d$well %in% exclude | as.character(d$row) %in% exclude
    miss <- setdiff(exclude, c(d$well, as.character(d$row)))
    if (length(miss)) fail(sprintf("exclude names wells that are not in the data: %s. Give values of the column '%s' or file row numbers.", paste(miss, collapse = ", "), if (is.null(well_col)) "(no well column)" else well_col))
    n_excluded <- sum(hit)
    d <- d[!hit, ]
  }
  cutoff <- as.numeric(pick(p, "cq_cutoff", 40))
  above <- is.finite(d$cq) & d$cq > cutoff
  d$non_detect[above] <- TRUE
  d$cq[above] <- NA
  if (!nrow(d)) fail("no rows are left after the subset and the exclusions")
  attr(d, "n_excluded") <- n_excluded
  attr(d, "cutoff") <- cutoff
  d
}

collapse_reps <- function(d, how) {
  if (!how %in% c("mean", "median")) fail(paste("replicates must be mean or median, not", how))
  f <- if (how == "mean") mean else median
  key <- paste(d$sample, d$gene, sep = "\r")
  out <- do.call(rbind, lapply(split(seq_len(nrow(d)), factor(key, levels = unique(key))), function(i) {
    x <- d$cq[i]
    ok <- is.finite(x)
    data.frame(sample = d$sample[i[1]], gene = d$gene[i[1]], group = d$group[i[1]], cq = if (any(ok)) f(x[ok]) else NA_real_, n_wells = length(i), n_detected = sum(ok), sd_wells = if (sum(ok) >= 2) sd(x[ok]) else NA_real_, stringsAsFactors = FALSE)
  }))
  rownames(out) <- NULL
  out
}

parse_efficiencies <- function(v, genes) {
  v <- pick(list(v = v), "v", "2")
  if (is.numeric(v) && length(v) == 1) return(setNames(rep(v, length(genes)), genes))
  txt <- paste(as.character(unlist(v)), collapse = ",")
  parts <- trimws(unlist(strsplit(txt, ",")))
  parts <- parts[nzchar(parts)]
  out <- setNames(rep(2, length(genes)), genes)
  for (pt in parts) {
    if (grepl("=", pt)) {
      kv <- trimws(strsplit(pt, "=")[[1]])
      if (!kv[1] %in% genes) fail(sprintf("efficiencies names the gene '%s', which is not in the data. Genes: %s", kv[1], paste(genes, collapse = ", ")))
      out[[kv[1]]] <- as.numeric(kv[2])
    } else out[] <- as.numeric(pt)
  }
  if (any(!is.finite(out)) || any(out <= 1 | out > 2.5)) fail(sprintf("efficiencies must be amplification factors from 1 to 2.5 (2 is 100 percent), such as 2 or Actb=1.93, Myc=2.07. Got: %s", txt))
  out
}

draw_both <- function(png_path, svg_path, width, height, draw) {
  if (nzchar(png_path)) {
    png(png_path, width = width * 150, height = height * 150, res = 150)
    draw()
    dev.off()
  }
  if (nzchar(svg_path)) {
    if (requireNamespace("svglite", quietly = TRUE)) svglite::svglite(svg_path, width = width, height = height) else svg(svg_path, width = width, height = height)
    draw()
    dev.off()
  }
}

plot_outputs <- function(keys = c("plot", "plot_svg")) {
  paths <- vapply(keys, out_path, "")
  lapply(Filter(nzchar, paths), function(p) list(path = p, kind = if (grepl("\\.png$", p)) "image" else "file", name = basename(p)))
}

fmt <- function(v, digits = 4) if (is.null(v) || length(v) == 0 || is.na(v)) "none" else trimws(formatC(v, digits = digits, format = "g"))

clean_name <- function(x) gsub("^_+|_+$", "", gsub("[^A-Za-z0-9]+", "_", x))

pkg_version <- function(p) tryCatch(as.character(packageVersion(p)), error = function(e) "not installed")
