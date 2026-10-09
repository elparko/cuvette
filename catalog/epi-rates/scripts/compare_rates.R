args <- commandArgs(FALSE)
here <- dirname(sub("^--file=", "", args[grep("^--file=", args)]))
source(file.path(here, "lib.R"))
source(file.path(here, "epi_lib.R"))

read_pair <- function(p) {
  keys <- c("events", "person_time", "population")
  if (!is.null(pick(p, "data", NULL))) {
    df <- read_data(p$data, "the count table")
    gcol <- need_column(df, pick(p, "group_col", NULL), "group_col")
    ga <- pick(p, "group_a", NULL); gb <- pick(p, "group_b", NULL)
    g <- as.character(df[[gcol]])
    if (is.null(ga) || is.null(gb)) fail(sprintf("give group_a and group_b. Groups in column '%s': %s", gcol, paste(unique(g), collapse = ", ")))
    for (x in c(ga, gb)) if (!x %in% g) fail(sprintf("group '%s' is not in column '%s'. Groups: %s", x, gcol, paste(unique(g), collapse = ", ")))
    if (sum(g == ga) != 1 || sum(g == gb) != 1) fail(sprintf("column '%s' must have one row for each of '%s' and '%s'", gcol, ga, gb))
    out <- list(a = list(), b = list(), names = c(ga, gb))
    for (k in keys) {
      v <- column_values(df, p, paste0(k, "_col"))
      if (!is.null(v)) { out$a[[k]] <- v[g == ga]; out$b[[k]] <- v[g == gb] }
    }
    return(out)
  }
  out <- list(a = list(), b = list(), names = c(pick(p, "label_a", "group A"), pick(p, "label_b", "group B")))
  for (k in keys) {
    va <- num_value(p, paste0(k, "_a")); vb <- num_value(p, paste0(k, "_b"))
    if (xor(is.null(va), is.null(vb))) fail(sprintf("give both %s_a and %s_b, or neither", k, k))
    if (!is.null(va)) { out$a[[k]] <- va; out$b[[k]] <- vb }
  }
  out
}

run_tool(function() {
  suppressMessages(library(epitools))
  p <- read_params()
  lv <- level_args(p)
  z <- qnorm(1 - lv$alpha / 2)
  wording <- choice(p, "wording", c("exposure", "treatment"), "Exposure or treatment wording")
  rr_method <- choice(p, "rate_ratio_method", c("midp", "exact", "wald"), "Rate ratio interval")
  pr <- read_pair(p)
  a <- pr$a; b <- pr$b; nm <- pr$names
  if (is.null(a$events)) fail("give events (events_a and events_b, or events_col)")
  if (is.null(a$person_time) && is.null(a$population)) fail("give person_time (person_time_a and person_time_b) for rates, or population (population_a and population_b) for risks")
  m <- list(); lines <- character(); rows <- list()
  add <- function(name, est, lo = NA, hi = NA) { rows[[length(rows) + 1]] <<- data.frame(measure = name, estimate = est, lower = lo, upper = hi); }
  rr_est <- NULL; rr_lo <- NULL; rr_hi <- NULL

  if (!is.null(a$person_time)) {
    ea <- a$events; eb <- b$events; ta <- a$person_time; tb <- b$person_time
    if (ta <= 0 || tb <= 0) fail("person_time must be above 0 in both groups")
    if (ea == 0 && eb == 0) fail("both groups have 0 events. The rate ratio is not defined.")
    if (rr_method == "exact") {
      t <- poisson.test(c(ea, eb), c(ta, tb), conf.level = lv$conf)
      est <- unname(t$estimate); lo <- t$conf.int[1]; hi <- t$conf.int[2]; pv <- t$p.value
    } else {
      r <- suppressWarnings(rateratio(c(eb, ea, tb, ta), method = rr_method, conf.level = lv$conf))
      est <- r$measure[2, 1]; lo <- r$measure[2, 2]; hi <- r$measure[2, 3]
      pv <- r$p.value[2, if (rr_method == "wald") "wald" else "midp.exact"]
      if (rr_method == "midp") est <- (ea / ta) / (eb / tb)
    }
    rd <- ea / ta - eb / tb; rd_se <- sqrt(ea / ta^2 + eb / tb^2)
    m <- c(m, list(rate_a = ea / ta * lv$per, rate_b = eb / tb * lv$per, rate_ratio = est, rate_ratio_low = lo, rate_ratio_high = hi, rate_ratio_p = pv,
                   rate_difference = rd * lv$per, rate_difference_low = (rd - z * rd_se) * lv$per, rate_difference_high = (rd + z * rd_se) * lv$per))
    add("rate ratio", est, lo, hi); add("rate difference", rd * lv$per, (rd - z * rd_se) * lv$per, (rd + z * rd_se) * lv$per)
    lines <- c(lines, sprintf("Rate in %s %s and in %s %s per %g person-time units. Rate ratio %s (%s interval %s to %s, %s method, p %s). Rate difference %s (%s to %s).",
      nm[1], fmt(ea / ta * lv$per, 6), nm[2], fmt(eb / tb * lv$per, 6), lv$per, fmt(est, 6), pct(lv$conf), fmt(lo, 6), fmt(hi, 6), rr_method, fmt(pv, 4),
      fmt(rd * lv$per, 6), fmt((rd - z * rd_se) * lv$per, 6), fmt((rd + z * rd_se) * lv$per, 6)))
    rr_est <- est; rr_lo <- lo; rr_hi <- hi
    share <- ta / (ta + tb)
  }

  if (!is.null(a$population)) {
    ea <- a$events; eb <- b$events; na <- a$population; nb <- b$population
    if (any(c(ea, eb) != round(c(ea, eb)))) fail("events must be whole numbers")
    if (na <= 0 || nb <= 0) fail("population must be above 0 in both groups")
    if (ea > na || eb > nb) fail("events is larger than population in a group. A risk cannot be above 1.")
    ra <- ea / na; rb <- eb / nb
    rd <- ra - rb; rd_se <- sqrt(ra * (1 - ra) / na + rb * (1 - rb) / nb)
    rd_lo <- rd - z * rd_se; rd_hi <- rd + z * rd_se
    m <- c(m, list(risk_a = ra, risk_b = rb, risk_difference = rd, risk_difference_low = rd_lo, risk_difference_high = rd_hi))
    add("risk difference", rd, rd_lo, rd_hi)
    txt <- sprintf("Risk in %s %s (%g of %g) and in %s %s (%g of %g). Risk difference %s (%s interval %s to %s).",
                   nm[1], fmt(ra, 6), ea, na, nm[2], fmt(rb, 6), eb, nb, fmt(rd, 6), pct(lv$conf), fmt(rd_lo, 6), fmt(rd_hi, 6))
    if (ea > 0 && eb > 0) {
      rr <- ra / rb; rse <- sqrt(1 / ea - 1 / na + 1 / eb - 1 / nb)
      lo <- exp(log(rr) - z * rse); hi <- exp(log(rr) + z * rse)
      orr <- (ea / (na - ea)) / (eb / (nb - eb)); ose <- sqrt(1 / ea + 1 / (na - ea) + 1 / eb + 1 / (nb - eb))
      o_lo <- exp(log(orr) - z * ose); o_hi <- exp(log(orr) + z * ose)
      m <- c(m, list(risk_ratio = rr, risk_ratio_low = lo, risk_ratio_high = hi, risk_ratio_p = 2 * pnorm(-abs(log(rr) / rse)),
                     odds_ratio = orr, odds_ratio_low = o_lo, odds_ratio_high = o_hi))
      add("risk ratio", rr, lo, hi); add("odds ratio", orr, o_lo, o_hi)
      txt <- paste(txt, sprintf("Risk ratio %s (%s to %s). Odds ratio %s (%s to %s).", fmt(rr, 6), fmt(lo, 6), fmt(hi, 6), fmt(orr, 6), fmt(o_lo, 6), fmt(o_hi, 6)))
      rr_est <- rr; rr_lo <- lo; rr_hi <- hi; share <- na / (na + nb)
    } else {
      txt <- paste(txt, "A group has 0 events, so the Wald risk ratio and odds ratio are not defined.")
    }
    ard <- abs(rd)
    if (ard == 0) {
      txt <- paste(txt, "The risk difference is 0, so the number needed to treat is not defined.")
    } else {
      harm <- rd > 0
      nn <- 1 / ard
      same_sign <- rd_lo * rd_hi > 0
      label <- if (wording == "treatment") (if (harm) "number needed to harm" else "number needed to treat") else (if (harm) "number needed to harm" else "number needed to prevent")
      m <- c(m, list(nnt = nn, nnt_harm = as.numeric(harm), nnt_ci_includes_infinity = as.numeric(!same_sign)))
      if (same_sign) {
        lim <- sort(1 / abs(c(rd_lo, rd_hi)))
        m <- c(m, list(nnt_low = lim[1], nnt_high = lim[2]))
        add(label, nn, lim[1], lim[2])
        txt <- paste(txt, sprintf("The %s is %s (%s interval %s to %s) for the horizon: %s.", label, fmt(nn, 5), pct(lv$conf), fmt(lim[1], 5), fmt(lim[2], 5), pick(p, "time_horizon", "not stated")))
      } else {
        add(label, nn)
        a_lim <- 1 / abs(if (harm) rd_lo else rd_hi)
        other <- if (harm) "number needed to treat" else "number needed to harm"
        txt <- paste(txt, sprintf("The %s is %s. The interval of the risk difference includes 0, so the interval of the number needed goes from the %s %s through infinity to the %s %s (horizon: %s).",
          label, fmt(nn, 5), label, fmt(1 / abs(if (harm) rd_hi else rd_lo), 5), other, fmt(a_lim, 5), pick(p, "time_horizon", "not stated")))
      }
    }
    lines <- c(lines, txt)
  }

  if (!is.null(rr_est)) {
    af <- (rr_est - 1) / rr_est; af_lo <- (rr_lo - 1) / rr_lo; af_hi <- (rr_hi - 1) / rr_hi
    pe_raw <- pick(p, "exposure_prevalence", "sample")
    pe <- if (identical(as.character(pe_raw), "sample")) share else suppressWarnings(as.numeric(pe_raw))
    if (is.na(pe) || pe <= 0 || pe > 1) fail(sprintf("exposure_prevalence '%s' is not valid. Give 'sample' or a fraction above 0 and up to 1.", pe_raw))
    paf <- function(r) pe * (r - 1) / (1 + pe * (r - 1))
    m <- c(m, list(attributable_fraction = af, attributable_fraction_low = af_lo, attributable_fraction_high = af_hi,
                   population_attributable_fraction = paf(rr_est), population_attributable_fraction_low = paf(rr_lo), population_attributable_fraction_high = paf(rr_hi), exposure_prevalence = pe))
    add("attributable fraction in group A", af, af_lo, af_hi); add("population attributable fraction", paf(rr_est), paf(rr_lo), paf(rr_hi))
    extra <- ""
    if (wording == "treatment") { m <- c(m, list(relative_risk_reduction = 1 - rr_est)); extra <- sprintf(" Relative reduction %s.", fmt(1 - rr_est, 5)) }
    lines <- c(lines, sprintf("Attributable fraction in %s %s (%s to %s). Population attributable fraction %s (Levin formula, exposure prevalence %s, limits from the ratio interval).%s",
      nm[1], fmt(af, 5), fmt(af_lo, 5), fmt(af_hi, 5), fmt(paf(rr_est), 5), fmt(pe, 4), extra))
  }

  tab <- do.call(rbind, rows)
  if (nzchar(out_path("comparison"))) write.csv(tab, out_path("comparison"), row.names = FALSE)
  emit(list(
    ok = TRUE,
    summary = paste(sprintf("Group A is %s, the exposed or treated group. Group B is %s, the reference.", nm[1], nm[2]), paste(lines, collapse = " ")),
    metrics = m,
    table = table_of(tab, out_path("comparison")),
    manualRoute = "Stata: ir events_a events_b pt_a pt_b for rates, cs for risks (cs gives the attributable and population attributable fractions). OpenEpi: Two by Two Table or Person-Time. R: epitools::rateratio(), riskratio(), oddsratio()."
  ))
})
