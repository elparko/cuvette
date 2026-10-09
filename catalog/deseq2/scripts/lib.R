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

read_params <- function() {
  jsonlite::fromJSON(commandArgs(trailingOnly = TRUE)[1], simplifyVector = TRUE)
}

pick <- function(p, key, default) {
  v <- p[[key]]
  if (is.null(v) || (length(v) == 1 && is.na(v))) default else v
}

emit <- function(x) {
  if (!is.null(x$data)) x <- c(x[names(x) != "data"], x$data)
  sink()
  cat(jsonlite::toJSON(x, auto_unbox = TRUE, digits = NA, na = "null", null = "null"), "\n")
  quit(save = "no", status = 0)
}

fail <- function(msg) emit(list(ok = FALSE, error = msg))

run_tool <- function(body) {
  script <- basename(sub("^--file=", "", grep("^--file=", commandArgs(FALSE), value = TRUE)[1]))
  tryCatch(body(), error = function(e) {
    p <- tryCatch(read_params(), error = function(x) list())
    fail(sprintf("%s stopped on the counts input %s: %s", script, pick(p, "counts", "(not given)"), conditionMessage(e)))
  })
}

out_path <- function(key) Sys.getenv(paste0("CUVETTE_OUTPUT_", toupper(key)))

table_of <- function(df, path = NULL, max_rows = 12) {
  rows <- lapply(seq_len(min(nrow(df), max_rows)), function(i) unname(lapply(df[i, , drop = FALSE], function(v) if (is.factor(v)) as.character(v) else v)))
  list(columns = names(df), rows = rows, n_rows = nrow(df), path = path)
}

INPUT_TYPES <- c("count matrix", "transcript quantification", "counts and lengths", "SummarizedExperiment rds")
QUANT_FILE <- "(^|/)(quant\\.sf(\\.gz)?|abundance\\.(h5|tsv))$|\\.(genes|isoforms)\\.results(\\.gz)?$"
ANNOTATION_COLUMNS <- c("Geneid", "Chr", "Start", "End", "Strand", "Length")

need_file <- function(path, what = "file") {
  if (is.null(path) || !nzchar(path)) fail(paste("give the", what))
  if (!file.exists(path)) fail(paste("file not found:", path))
  path
}

quant_program <- function(f) {
  if (grepl("quant\\.sf", f)) "salmon" else if (grepl("abundance\\.", f)) "kallisto" else "rsem"
}

read_numbers <- function(path) {
  first <- readLines(path, n = 50)
  first <- first[!startsWith(first, "#")]
  sep <- if (grepl("\t", first[1])) "\t" else ","
  df <- read.table(path, sep = sep, header = TRUE, check.names = FALSE, stringsAsFactors = FALSE, comment.char = "#", quote = "\"")
  df <- df[, !names(df) %in% ANNOTATION_COLUMNS[-1] | names(df) == names(df)[1], drop = FALSE]
  m <- as.matrix(df[, -1, drop = FALSE])
  if (!is.numeric(m)) fail(paste("the table has text in the sample columns:", path))
  rownames(m) <- df[[1]]
  m
}

name_hit <- function(names, s) {
  i <- which(names == s)
  if (length(i) != 1) i <- which(startsWith(names, paste0(s, ".")) | startsWith(names, paste0(s, "_")))
  if (length(i) != 1) i <- which(grepl(s, names, fixed = TRUE))
  if (length(i) == 1) i else NA_integer_
}

read_htseq_folder <- function(dir, samples) {
  files <- list.files(dir, full.names = TRUE)
  if (is.null(samples)) samples <- sub("\\.[^.]*$", "", basename(files))
  cols <- lapply(samples, function(s) {
    f <- files[name_hit(basename(files), s)]
    if (is.na(f)) fail(paste("need one HTSeq file that starts with the sample name", s, "in", dir))
    df <- read.table(f, sep = "\t", header = FALSE, stringsAsFactors = FALSE)
    df <- df[!startsWith(df[[1]], "__"), ]
    setNames(df[[2]], df[[1]])
  })
  m <- do.call(cbind, cols)
  colnames(m) <- samples
  m
}

match_samples <- function(m, samples) {
  if (is.null(samples) || all(samples %in% colnames(m))) return(m)
  short <- sub("\\.(bam|sam|cram)$", "", basename(colnames(m)))
  hit <- sapply(samples, function(s) name_hit(short, s))
  if (anyNA(hit)) fail(paste("samples of the sample table without a column in the counts:", paste(samples[is.na(hit)], collapse = ", ")))
  m <- m[, hit, drop = FALSE]
  colnames(m) <- samples
  m
}

whole <- function(m) all(m == round(m), na.rm = TRUE)

detect_input <- function(path, lengths = NULL) {
  need_file(path, "input file")
  if (grepl("\\.rds$", path, ignore.case = TRUE)) return(list(type = INPUT_TYPES[4], reason = "the file is a saved R object (.rds)"))
  if (dir.exists(path)) {
    q <- list.files(path, pattern = QUANT_FILE, recursive = TRUE)
    if (length(q)) return(list(type = INPUT_TYPES[2], reason = sprintf("the folder has %d %s files", length(q), quant_program(q[1]))))
    return(list(type = INPUT_TYPES[1], reason = "the folder has one count file for each sample (HTSeq)"))
  }
  if (!is.null(lengths) && nzchar(lengths)) return(list(type = INPUT_TYPES[3], reason = "a length table was given with the counts"))
  m <- read_numbers(path)
  if (!whole(m)) return(list(type = INPUT_TYPES[3], reason = "the counts are not whole numbers, so they are estimated counts from Salmon, kallisto or RSEM and need the length table"))
  list(type = INPUT_TYPES[1], reason = "the table has whole-number counts")
}

input_type_of <- function(p) {
  given <- pick(p, "input_type", "")
  if (!nzchar(given)) return(detect_input(p$counts, p$lengths)$type)
  hit <- INPUT_TYPES[startsWith(tolower(INPUT_TYPES), tolower(given))]
  if (length(hit) != 1) fail(paste("input_type must be one of:", paste(INPUT_TYPES, collapse = ", ")))
  hit
}

quant_files <- function(dir, cd) {
  if ("files" %in% names(cd)) {
    f <- as.character(cd$files)
    return(setNames(ifelse(file.exists(f), f, file.path(dir, f)), rownames(cd)))
  }
  all <- list.files(dir, pattern = QUANT_FILE, recursive = TRUE)
  all <- all[!grepl("isoforms", all) | !any(grepl("genes\\.results", all))]
  f <- sapply(rownames(cd), function(s) {
    hit <- all[sapply(strsplit(all, "/"), function(parts) any(parts == s | startsWith(parts, paste0(s, "."))))]
    if (length(hit) > 1) hit <- hit[grepl(if (requireNamespace("rhdf5", quietly = TRUE)) "\\.h5$" else "\\.tsv$", hit)]
    if (length(hit) != 1) fail(paste("need one quantification file for the sample", s, "in", dir, "(in a folder named for the sample, or a file name that starts with it)"))
    hit
  })
  setNames(file.path(dir, f), rownames(cd))
}

read_tx2gene <- function(path) {
  need_file(path, "transcript-to-gene table (tx2gene)")
  sep <- if (grepl("\t", readLines(path, n = 1))) "\t" else ","
  df <- read.table(path, sep = sep, header = TRUE, stringsAsFactors = FALSE, quote = "\"")
  if (ncol(df) < 2) fail("the tx2gene table needs two columns: transcript id, gene id")
  df[, 1:2]
}

run_tximport <- function(p, cd) {
  suppressMessages(library(tximport))
  files <- quant_files(p$counts, cd)
  program <- quant_program(files[1])
  gene_level <- program == "rsem" && grepl("genes\\.results", files[1])
  if (grepl("\\.h5$", files[1]) && !requireNamespace("rhdf5", quietly = TRUE)) fail("abundance.h5 needs the R package rhdf5. Install it, or use abundance.tsv")
  args <- list(files, type = program)
  if (gene_level) args <- c(args, list(txIn = FALSE, txOut = FALSE))
  else {
    t2g <- read_tx2gene(pick(p, "tx2gene", ""))
    first <- if (grepl("\\.h5$", files[1])) rhdf5::h5read(files[1], "aux/ids") else read.delim(files[1], nrows = 2000, stringsAsFactors = FALSE)[[1]]
    bar <- any(grepl("|", first, fixed = TRUE))
    ids <- sub("\\|.*", "", first)
    version <- any(grepl("\\.\\d+$", ids)) && !any(grepl("\\.\\d+$", t2g[[1]]))
    args <- c(args, list(tx2gene = t2g, ignoreAfterBar = bar, ignoreTxVersion = version))
    if (program == "rsem") args$txIn <- TRUE
  }
  txi <- suppressMessages(do.call(tximport, args))
  list(counts = txi$counts, length = txi$length, import = sprintf("tximport(type = \"%s\")%s on %d files", program, if (gene_level) " of gene results" else ", with tx2gene", length(files)), program = program, files = files)
}

load_input <- function(p) {
  type <- input_type_of(p)
  is_rds <- grepl("\\.rds$", need_file(p$counts, "input file"), ignore.case = TRUE)
  if (is_rds != (type == INPUT_TYPES[4])) fail(sprintf("the input type is %s, but %s %s an .rds file. Give a file of this input type as counts, or ask the scientist to change the input type", type, p$counts, if (is_rds) "is" else "is not"))
  program <- NULL
  len_name <- NA
  cd <- if (!is.null(p$coldata) && nzchar(p$coldata)) read_coldata(p$coldata) else NULL
  if (type == INPUT_TYPES[4]) {
    suppressMessages(library(SummarizedExperiment))
    obj <- readRDS(need_file(p$counts, "rds file"))
    if (!is(obj, "SummarizedExperiment")) fail(paste("the rds file holds a", class(obj)[1], "and not a SummarizedExperiment or DESeqDataSet"))
    an <- assayNames(obj)
    counts <- if ("counts" %in% an) assay(obj, "counts") else assay(obj, 1)
    cfa <- metadata(obj)$countsFromAbundance
    len_name <- intersect(c("avgTxLength", "length"), an)[1]
    len <- if (!is.na(len_name) && (is.null(cfa) || cfa == "no")) assay(obj, len_name) else NULL
    if (is.null(cd)) cd <- as.data.frame(colData(obj))
    import <- sprintf("readRDS(), a %s with the assays %s", class(obj)[1], paste(an, collapse = ", "))
  } else if (type == INPUT_TYPES[2]) {
    if (is.null(cd)) fail("give the sample table (coldata)")
    t <- run_tximport(p, cd)
    counts <- t$counts
    len <- t$length
    import <- t$import
    program <- t$program
  } else if (type == INPUT_TYPES[3]) {
    counts <- read_numbers(need_file(p$counts, "count table"))
    len <- read_numbers(need_file(pick(p, "lengths", ""), "length table (lengths)"))
    if (!identical(dim(len), dim(counts)) || !identical(rownames(len), rownames(counts))) fail("the length table must have the same genes and samples as the count table, in the same order")
    len <- match_samples(len, rownames(cd))
    import <- "read.csv() of the counts and of the average transcript lengths"
  } else {
    counts <- if (dir.exists(p$counts)) read_htseq_folder(p$counts, rownames(cd)) else read_numbers(need_file(p$counts, "count table"))
    len <- NULL
    import <- if (dir.exists(p$counts)) "one HTSeq file for each sample" else "read.csv() of the count table"
  }
  if (is.null(cd)) fail("give the sample table (coldata)")
  counts <- match_samples(counts, rownames(cd))
  if (!is.null(len)) len <- len[, colnames(counts), drop = FALSE]
  cd <- cd[colnames(counts), , drop = FALSE]
  if (is.null(len) && !whole(counts)) {
    fail(paste("the counts are not whole numbers. They look like estimated counts from Salmon, kallisto or RSEM.",
      "Do not round them into a count matrix: use the input type transcript quantification (the quant files and a tx2gene table)",
      "or counts and lengths (the counts and length tables of tximport), so that DESeq2 uses the transcript length offsets"))
  }
  n_zero_len <- if (is.null(len)) 0 else sum(len <= 0 | is.na(len))
  if (n_zero_len) len[len <= 0 | is.na(len)] <- 1
  list(type = type, counts = counts, length = len, coldata = cd, import = import, program = program, length_assay = len_name, n_zero_length = n_zero_len)
}

make_dds <- function(input, design) {
  if (is.null(input$length)) {
    m <- input$counts
    storage.mode(m) <- "integer"
    return(DESeqDataSetFromMatrix(m, input$coldata, design = design))
  }
  txi <- list(counts = input$counts, length = input$length, countsFromAbundance = "no")
  suppressMessages(DESeqDataSetFromTximport(txi, input$coldata, design = design))
}

read_counts <- function(path) {
  m <- read_numbers(need_file(path))
  if (!whole(m)) fail("the counts are not whole numbers")
  m
}

read_coldata <- function(path) {
  need_file(path, "sample table (coldata)")
  df <- read.csv(path, check.names = FALSE, stringsAsFactors = FALSE)
  rownames(df) <- df[[1]]
  df[, -1, drop = FALSE]
}

load_deseq <- function() suppressMessages(library(DESeq2))
