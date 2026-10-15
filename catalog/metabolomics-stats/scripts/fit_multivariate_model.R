args <- commandArgs(FALSE)
here <- dirname(sub("^--file=", "", args[grep("^--file=", args)]))
source(file.path(here, "lib.R"))
source(file.path(here, "table_lib.R"))

run_tool(function() {
  suppressMessages(library(ropls))
  p <- read_params()
  tb <- load_prepared(p)
  model <- pick(p, "model", "")
  if (!model %in% c("pca", "pls", "opls")) fail(sprintf("model '%s' is not valid. Valid: pca, pls, opls. pls on a group column is PLS-DA. opls on a group column is OPLS-DA.", model))
  scale_c <- pick(p, "scale", "")
  if (!scale_c %in% c("none", "center", "pareto", "standard")) fail(sprintf("scale '%s' is not valid. Valid: none, center, pareto, standard. This is the decision 'Scaling of the features'.", scale_c))
  n_pred <- pick(p, "n_predictive", "auto")
  n_ortho <- pick(p, "n_orthogonal", "auto")
  pred_i <- if (identical(as.character(n_pred), "auto")) NA else as.integer(n_pred)
  ortho_i <- if (model == "pls") 0 else if (identical(as.character(n_ortho), "auto")) NA else as.integer(n_ortho)
  if (model == "opls" && !is.na(pred_i) && pred_i != 1) fail("opls with a single response has 1 predictive component. Set n_predictive to 1 or auto.")
  cv <- as.integer(pick(p, "cv_segments", 7))
  perm <- as.integer(pick(p, "permutations", 20))
  holdout <- pick(p, "holdout", "none")
  if (!holdout %in% c("none", "odd")) fail(sprintf("holdout '%s' is not valid. Valid: none, odd. odd trains on the odd-numbered rows and tests on the others.", holdout))
  seed <- as.integer(pick(p, "seed", 1))
  vip_cut <- as.numeric(pick(p, "vip_cutoff", 1))
  set.seed(seed)

  x <- tb$x
  resp <- tb$resp
  classification <- !is.numeric(resp)
  if (model != "pca" && classification) {
    resp <- factor(resp, levels = unique(resp))
    if (nlevels(resp) < 2) fail(sprintf("response_column '%s' has one group. The model needs 2 or more.", tb$resp_col))
    if (model == "opls" && nlevels(resp) != 2) fail(sprintf("opls needs 2 groups and column '%s' has %d (%s). Use pls for more than 2 groups.", tb$resp_col, nlevels(resp), paste(levels(resp), collapse = ", ")))
  }
  if (model == "pca" && holdout != "none") fail("holdout does not apply to pca. Set holdout to none.")
  subset_arg <- if (holdout == "odd") "odd" else NULL
  if (holdout == "odd") perm <- 0

  fit <- if (model == "pca") opls(x, predI = pred_i, scaleC = scale_c, crossvalI = cv, fig.pdfC = "none", info.txtC = "none")
         else opls(x, resp, predI = pred_i, orthoI = ortho_i, crossvalI = cv, permI = perm, scaleC = scale_c, subset = subset_arg, fig.pdfC = "none", info.txtC = "none")
  sdf <- getSummaryDF(fit)
  if (nrow(sdf) == 0 || is.na(sdf[1, "pre"]) || sdf[1, "pre"] + sdf[1, "ort"] == 0) fail(sprintf("ropls built no model on %s with scale %s: no component passed the Q2 limit. Set n_predictive to 1 or more to force a model, and read Q2 before you trust it.", basename(p$data), scale_c))
  get <- function(col) if (col %in% names(sdf)) as.numeric(sdf[1, col]) else NA_real_
  metrics <- list(n_samples = nrow(x), n_features = ncol(x), r2x = get("R2X(cum)"), n_predictive = get("pre"), n_orthogonal = get("ort"), cv_segments = cv)
  if (model != "pca") {
    metrics <- c(metrics, list(r2y = get("R2Y(cum)"), q2 = get("Q2(cum)"), rmsee = get("RMSEE"), rmsep = get("RMSEP"), p_r2y = get("pR2Y"), p_q2 = get("pQ2"), permutations = perm))
  } else {
    pv <- fit@modelDF
    for (i in seq_len(min(3, nrow(pv)))) metrics[[sprintf("r2x_pc%d", i)]] <- as.numeric(pv[i, "R2X"])
  }

  scores <- getScoreMN(fit)
  vip <- if (model == "pca") NULL else getVipVn(fit)
  load1 <- getLoadingMN(fit)[, 1]
  feat_tab <- data.frame(feature = colnames(x), loading_p1 = as.numeric(load1[colnames(x)]), stringsAsFactors = FALSE)
  if (!is.null(vip)) {
    feat_tab$vip <- as.numeric(vip[colnames(x)])
    feat_tab <- feat_tab[order(-feat_tab$vip), ]
    metrics$n_vip_above_cutoff <- sum(feat_tab$vip >= vip_cut, na.rm = TRUE)
    metrics$vip_cutoff <- vip_cut
  }
  if (model != "pca" && classification) {
    tr <- if (holdout == "odd") getSubsetVi(fit) else seq_len(nrow(x))
    fitted_tr <- as.character(fitted(fit))
    metrics$train_accuracy <- mean(fitted_tr == as.character(resp[tr]))
    if (holdout == "odd") {
      te <- setdiff(seq_len(nrow(x)), tr)
      pr <- as.character(predict(fit, x[te, , drop = FALSE]))
      cm <- table(factor(as.character(resp[te]), levels = levels(resp)), factor(pr, levels = levels(resp)))
      metrics$holdout_n <- length(te)
      metrics$holdout_correct <- sum(diag(cm))
      metrics$holdout_accuracy <- sum(diag(cm)) / length(te)
    }
  }
  if (nzchar(out_path("features"))) write.csv(feat_tab, out_path("features"), row.names = FALSE)
  sc_df <- data.frame(sample = rownames(scores), scores, check.names = FALSE)
  has_ortho <- model == "opls" && metrics$n_orthogonal > 0
  if (has_ortho) sc_df$o1 <- getScoreMN(fit, orthoL = TRUE)[, 1]
  if (nzchar(out_path("scores"))) write.csv(sc_df, out_path("scores"), row.names = FALSE)

  draw_both(out_path("plot"), out_path("plot_svg"), 6, 5, function() {
    par(mar = c(4, 4, 3, 1))
    xs <- scores[, 1]
    ys <- if (has_ortho) getScoreMN(fit, orthoL = TRUE)[, 1] else if (ncol(scores) > 1) scores[, 2] else rep(0, length(xs))
    ylab <- if (has_ortho) "orthogonal score o1" else "score t2"
    grp <- if (classification) as.factor(tb$resp) else cut(tb$resp, 4)
    pal <- c("#1f618d", "#b03a2e", "#1e8449", "#7d3c98", "#b9770e", "#566573")
    col <- pal[(as.integer(grp) - 1) %% length(pal) + 1]
    plot(xs, ys, pch = 16, col = col, xlab = "score t1", ylab = ylab, main = sprintf("%s, %s scaling", toupper(model), scale_c))
    legend("topright", legend = levels(grp), col = pal[(seq_along(levels(grp)) - 1) %% length(pal) + 1], pch = 16, cex = 0.7, bty = "n")
  })

  top <- head(feat_tab, 10)
  top_txt <- if (!is.null(vip)) paste(sprintf("%s (VIP %s)", top$feature, fmt_num(top$vip)), collapse = "; ") else ""
  kind <- if (model == "pca") "PCA" else if (classification) (if (model == "pls") "PLS-DA" else "OPLS-DA") else (if (model == "pls") "PLS regression" else "OPLS regression")
  main <- if (model == "pca") sprintf("%s: %d components, cumulative R2X %s.", kind, metrics$n_predictive, fmt_num(metrics$r2x))
          else sprintf("%s: %d predictive and %d orthogonal component(s). R2X %s, R2Y %s, Q2 %s, RMSEE %s%s.%s", kind, metrics$n_predictive, metrics$n_orthogonal, fmt_num(metrics$r2x), fmt_num(metrics$r2y), fmt_num(metrics$q2), fmt_num(metrics$rmsee),
                  if (!is.na(metrics$rmsep)) sprintf(", RMSEP %s", fmt_num(metrics$rmsep)) else "",
                  if (perm > 0) sprintf(" Permutation test with %d permutations: p(R2Y) %s, p(Q2) %s.", perm, fmt_num(metrics$p_r2y), fmt_num(metrics$p_q2)) else " No permutation test.")
  extra <- ""
  if (!is.null(metrics$holdout_n)) extra <- sprintf(" Test set of %d samples: %d correct (%s), training accuracy %s.", metrics$holdout_n, metrics$holdout_correct, fmt_num(metrics$holdout_accuracy), fmt_num(metrics$train_accuracy))
  else if (!is.null(metrics$train_accuracy)) extra <- sprintf(" Training accuracy %s.", fmt_num(metrics$train_accuracy))
  if (!is.null(vip)) extra <- paste0(extra, sprintf(" %d of %d features have VIP of %s or more. Top: %s.", metrics$n_vip_above_cutoff, ncol(x), fmt_num(vip_cut), top_txt))
  warn <- if (model != "pca" && ncol(x) > nrow(x)) " The table has more features than samples, so PLS fits noise easily. Trust Q2 and the permutation test, not R2Y." else ""
  emit(list(
    ok = TRUE,
    summary = sprintf("ropls %s, %d samples, %d features, scale %s, %d-fold cross-validation. %s%s%s", pkg_version("ropls"), nrow(x), ncol(x), scale_c, cv, main, extra, warn),
    metrics = metrics,
    data = list(model = kind, scale = scale_c, response_column = tb$resp_col, features_file = out_path("features"), scores_file = out_path("scores"), ropls_version = pkg_version("ropls"), seed = seed),
    table = table_of(feat_tab, out_path("features"), 15),
    outputs = c(plot_outputs(), lapply(Filter(nzchar, c(out_path("features"), out_path("scores"))), function(f) list(path = f, kind = "table", name = basename(f)))),
    manualRoute = sprintf("library(ropls); m <- opls(x, y, predI = %s, orthoI = %s, crossvalI = %d, permI = %d, scaleC = \"%s\"); getVipVn(m)", if (is.na(pred_i)) "NA" else pred_i, if (is.na(ortho_i)) "NA" else ortho_i, cv, perm, scale_c)
  ))
})
