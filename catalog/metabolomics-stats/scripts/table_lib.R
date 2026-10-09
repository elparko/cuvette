load_prepared <- function(p) {
  df <- read_table(p$data, "prepared table")
  id_col <- need_column(df, pick(p, "id_column", names(df)[1]), "id_column")
  resp <- need_column(df, pick(p, "response_column", ""), "response_column")
  meta <- as_list_arg(p$meta_columns)
  bad_meta <- setdiff(meta, names(df))
  if (length(bad_meta)) fail(sprintf("meta_columns names column(s) that are not in the table: %s. Columns: %s", paste(bad_meta, collapse = ", "), paste(head(names(df), 20), collapse = ", ")))
  feat <- setdiff(names(df), c(id_col, resp, meta))
  non_num <- feat[!vapply(df[feat], is.numeric, TRUE)]
  if (length(non_num)) fail(sprintf("column(s) %s are not numeric and are not named in meta_columns. Name them in meta_columns or remove them.", paste(head(non_num, 5), collapse = ", ")))
  if (length(feat) < 2) fail(sprintf("the table has %d feature column(s). The tool needs at least 2.", length(feat)))
  x <- as.matrix(df[feat])
  rownames(x) <- df[[id_col]]
  list(df = df, x = x, id = df[[id_col]], resp = df[[resp]], resp_col = resp, features = feat, id_col = id_col)
}

fmt_num <- function(v, digits = 3) trimws(formatC(v, digits = digits, format = "g"))
