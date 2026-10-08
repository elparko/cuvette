args <- commandArgs(FALSE)
source(file.path(dirname(sub("^--file=", "", args[grep("^--file=", args)])), "lib.R"))

run_tool(function() {
  p <- read_params()
  load_vegan()
  m <- read_community(p$community)
  rs <- rowSums(m)
  cols <- NULL
  env_info <- NULL
  if (!is.null(pick(p, "environment", NULL))) {
    env <- read_env(p$environment, rownames(m))
    env_info <- lapply(names(env), function(v) {
      x <- env[[v]]
      if (is.factor(x)) list(name = v, type = "factor", levels = as.list(levels(x)), counts = as.list(as.integer(table(x))))
      else list(name = v, type = "number", n_distinct = length(unique(x)), min = min(x), max = max(x))
    })
  }
  integer_valued <- all(m == round(m))
  emit(list(
    ok = TRUE,
    summary = sprintf("%d sites, %d species, %s values from %s to %s, %d empty sites", nrow(m), ncol(m), if (integer_valued) "whole-number" else "non-integer", format(min(m[m > 0])), format(max(m)), sum(rs == 0)),
    metrics = list(n_sites = nrow(m), n_species = ncol(m), n_empty_sites = sum(rs == 0), n_absent_species = sum(colSums(m) == 0), min_site_total = min(rs), max_site_total = max(rs), max_value = max(m), integer_valued = as.integer(integer_valued), fraction_zero = mean(m == 0)),
    data = list(environment = env_info, vegan_version = vegan_version()),
    table = table_of(data.frame(site = rownames(m), total = rs, richness = rowSums(m > 0)), NULL, 25),
    manualRoute = "comm <- read.csv(\"community.csv\", row.names=1); dim(comm); range(comm); rowSums(comm)"
  ))
})
