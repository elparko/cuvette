load_amr <- function() suppressMessages(suppressWarnings(library(AMR)))

read_mic_long <- function(p) {
  d <- read_table(p$data, "data")
  org_col <- pick(p, "organism_col", NULL)
  org_fixed <- pick(p, "organism", NULL)
  if (is.null(org_col) && is.null(org_fixed)) fail(sprintf("give organism_col (a column with the species) or organism (one species for all rows). Columns: %s", paste(head(names(d), 20), collapse = ", ")))
  if (!is.null(org_col)) need_column(d, org_col, "organism_col")
  id_col <- pick(p, "id_col", NULL)
  if (!is.null(id_col)) need_column(d, id_col, "id_col")
  group_cols <- as_list_arg(p$group_cols)
  for (g in group_cols) need_column(d, g, "group_cols")
  d$.isolate <- if (is.null(id_col)) as.character(seq_len(nrow(d))) else as.character(d[[id_col]])
  d$.organism <- if (is.null(org_col)) org_fixed else as.character(d[[org_col]])
  drug_col <- pick(p, "drug_col", NULL)
  if (!is.null(drug_col)) {
    need_column(d, drug_col, "drug_col")
    val_col <- need_column(d, pick(p, "value_col", "mic"), "value_col")
    long <- data.frame(.isolate = d$.isolate, .organism = d$.organism, drug = as.character(d[[drug_col]]), mic = as.character(d[[val_col]]), stringsAsFactors = FALSE)
    for (g in group_cols) long[[g]] <- d[[g]]
  } else {
    drug_cols <- as_list_arg(p$drug_cols)
    if (!length(drug_cols)) fail(sprintf("give drug_cols (the columns with one MIC for each drug) or drug_col and value_col (one row for each isolate and drug). Columns: %s", paste(head(names(d), 30), collapse = ", ")))
    for (g in drug_cols) need_column(d, g, "drug_cols")
    long <- do.call(rbind, lapply(drug_cols, function(g) {
      x <- data.frame(.isolate = d$.isolate, .organism = d$.organism, drug = g, mic = as.character(d[[g]]), stringsAsFactors = FALSE)
      for (k in group_cols) x[[k]] <- d[[k]]
      x
    }))
  }
  long$mic <- sub("^(<=|>=|<|>)\\s+", "\\1", trimws(long$mic))
  before <- nrow(long)
  long <- long[!is.na(long$mic) & nzchar(long$mic) & !tolower(long$mic) %in% c("na", "nd", "-"), ]
  if (!nrow(long)) fail("the data have no MIC values")
  list(long = long, group_cols = group_cols, n_no_value = before - nrow(long))
}

mic_numeric <- function(m) suppressWarnings(as.numeric(sub("^(<=|>=|<|>)", "", m)))
mic_operator <- function(m) ifelse(grepl("^<=", m), "<=", ifelse(grepl("^>=", m), ">=", ifelse(grepl("^<", m), "<", ifelse(grepl("^>", m), ">", ""))))

parse_uti <- function(p) {
  v <- tolower(as.character(pick(p, "uti", "auto")))
  if (v == "true") TRUE else if (v == "false") FALSE else NULL
}
uti_label <- function(u) if (is.null(u)) "auto" else if (u) "true" else "false"
bad_organism <- function(mo, raw) unique(raw[is.na(mo) | as.character(mo) == "UNKNOWN"])
