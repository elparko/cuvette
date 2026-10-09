args <- commandArgs(FALSE)
here <- dirname(sub("^--file=", "", args[grep("^--file=", args)]))
source(file.path(here, "lib.R"))
source(file.path(here, "lib_mic.R"))

run_tool(function() {
  p <- read_params()
  load_amr()
  guideline <- pick(p, "guideline", NULL)
  if (is.null(guideline)) fail("give guideline, such as 'EUCAST 2024' or 'CLSI 2024'")
  known <- unique(AMR::clinical_breakpoints$guideline)
  if (!guideline %in% known) fail(sprintf("guideline '%s' is not in AMR %s. Choices: %s", guideline, pkg_version("AMR"), paste(known, collapse = ", ")))
  org <- pick(p, "organism", NULL)
  drugs <- as_list_arg(p$drugs)
  if (is.null(org) || !length(drugs)) fail("give organism (a species name) and drugs (one or more drug names or codes)")
  host <- pick(p, "host", "human")
  uti <- parse_uti(p)
  pkpd <- isTRUE(as.logical(pick(p, "include_pkpd", TRUE)))
  mo <- suppressMessages(suppressWarnings(as.mo(org, language = NULL)))
  if (is.na(mo) || as.character(mo) == "UNKNOWN") fail(sprintf("AMR does not know the organism '%s'. Write the full species name.", org))
  ladder <- 2^seq(-12, 10)
  rows <- lapply(drugs, function(d) {
    ab <- suppressMessages(suppressWarnings(as.ab(d)))
    if (is.na(ab)) fail(sprintf("AMR does not know the drug '%s'. Use the drug name or the code of AMR, such as CIP.", d))
    s <- as.character(suppressMessages(suppressWarnings(as.sir(as.mic(ladder), mo = mo, ab = ab, guideline = guideline, host = host, uti = uti, include_PKPD = pkpd))))
    has <- any(!is.na(s))
    data.frame(organism = as.character(mo_name(mo, language = NULL)), drug = ab_name(ab, language = NULL), guideline = guideline,
      s_if_mic_at_most = if (any(s == "S", na.rm = TRUE)) max(ladder[s == "S"], na.rm = TRUE) else NA,
      r_if_mic_above = if (any(s == "R", na.rm = TRUE)) max(c(ladder[s %in% c("S", "SDD", "I")], NA), na.rm = TRUE) else NA,
      has_breakpoint = has, stringsAsFactors = FALSE)
  })
  tab <- do.call(rbind, rows)
  write.csv(tab, out_path("breakpoints"), row.names = FALSE)
  metrics <- list(n_drugs = nrow(tab))
  for (i in seq_len(nrow(tab))) {
    tag <- clean_name(tab$drug[i])
    metrics[[paste0("s_max_", tag)]] <- tab$s_if_mic_at_most[i]
    metrics[[paste0("r_above_", tag)]] <- tab$r_if_mic_above[i]
  }
  per <- sprintf("%s: S if MIC <= %s, R if MIC > %s", tab$drug, ifelse(is.na(tab$s_if_mic_at_most), "none", tab$s_if_mic_at_most), ifelse(is.na(tab$r_if_mic_above), "none", tab$r_if_mic_above))
  emit(list(
    ok = TRUE,
    summary = sprintf("%s, %s, host %s, urinary tract %s. %s. Values are in mg/L on the 2-fold ladder; read the table for the range of I.", tab$organism[1], guideline, host, uti_label(uti), paste(per, collapse = "; ")),
    metrics = metrics,
    data = list(amr_version = pkg_version("AMR"), breakpoints_file = out_path("breakpoints")),
    table = table_of(tab, out_path("breakpoints")),
    manualRoute = sprintf("Look up the species and the drug in the %s breakpoint table (EUCAST: eucast.org Breakpoint tables; CLSI: M100 Table 2). Or run AMR::as.sir(AMR::as.mic(c(...)), mo = \"%s\", ab = \"<drug>\", guideline = \"%s\").", guideline, org, guideline)
  ))
})
