import itertools
import os
import warnings

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import pingouin as pg
import scikit_posthocs as sp
import statsmodels.api as sm
import statsmodels.formula.api as smf
from scipy import stats
from statsmodels.stats.multitest import multipletests

warnings.filterwarnings("ignore")

ADJUST = {"bonferroni": "bonferroni", "holm": "holm", "sidak": "sidak", "fdr_bh": "fdr_bh", "none": None}


def _fail(message):
    return {"ok": False, "error": message}


MISSING_TEXT = {"", "NA", "N/A", "n/a", "NaN", "nan", "null", "NULL", "Null"}


def _typed(path, enc):
    frame = pd.read_csv(path, encoding=enc)
    raw = pd.read_csv(path, encoding=enc, dtype=str, keep_default_na=False)
    for column in frame.columns:
        if frame[column].dtype == object:
            frame[column] = raw[column].where(~raw[column].str.strip().isin(MISSING_TEXT), np.nan)
    return frame


def _read(path):
    path = os.path.expanduser(path)
    for enc in ("utf-8-sig", "cp1252"):
        try:
            return _typed(path, enc)
        except UnicodeDecodeError:
            pass
    return _typed(path, "latin-1")


def _need(frame, columns):
    missing = [c for c in columns if c not in frame.columns]
    if missing:
        return "Unknown column: %s. The columns are: %s." % (", ".join(missing), ", ".join(map(str, frame.columns)))
    return None


def _list(v):
    if v is None:
        return []
    if isinstance(v, str):
        return [x.strip() for x in v.split(",") if x.strip()]
    return [str(x).strip() for x in v if str(x).strip()]


def _clean(v):
    if isinstance(v, (float, np.floating)):
        return None if np.isnan(v) else float(v)
    if isinstance(v, np.integer):
        return int(v)
    if isinstance(v, np.bool_):
        return bool(v)
    return v


def _table(frame, name, limit=30):
    path = os.path.join(os.getcwd(), name + ".csv")
    frame.to_csv(path, index=False)
    rows = [[_clean(v) for v in r] for r in frame.head(limit).itertuples(index=False, name=None)]
    return {"columns": [str(c) for c in frame.columns], "rows": rows, "n_rows": int(len(frame)), "path": path}


def _key(text):
    return "".join(c if c.isalnum() else "_" for c in str(text)).strip("_")


def _style():
    plt.rcParams.update({
        "font.size": 9, "font.family": "sans-serif", "font.sans-serif": ["Arial", "Helvetica", "DejaVu Sans"],
        "axes.spines.top": False, "axes.spines.right": False, "svg.fonttype": "none",
    })


def _save(fig, stem):
    png = os.path.join(os.getcwd(), stem + ".png")
    svg = os.path.join(os.getcwd(), stem + ".svg")
    fig.savefig(png, dpi=200, bbox_inches="tight")
    fig.savefig(svg, bbox_inches="tight")
    plt.close(fig)
    return [{"path": png, "kind": "image", "name": os.path.basename(png)}, {"path": svg, "kind": "file", "name": os.path.basename(svg)}]


def _fmt_p(p):
    return "< 0.0001" if p < 1e-4 else "%.4g" % p


def _cell_comparisons(d, outcome, factors, mse, df_resid, compare_within, method):
    cells = d.groupby(factors, observed=True)[outcome].agg(["mean", "count"]).reset_index()
    cells["label"] = cells[factors].astype(str).agg(" / ".join, axis=1)
    pairs = []
    if compare_within:
        other = [f for f in factors if f != compare_within]
        for lvl, sub in cells.groupby(compare_within, observed=True):
            for (_, a), (_, b) in itertools.combinations(sub.iterrows(), 2):
                pairs.append((a, b, "%s = %s" % (compare_within, lvl)))
    else:
        for (_, a), (_, b) in itertools.combinations(cells.iterrows(), 2):
            pairs.append((a, b, "all cells"))
    rows = []
    for a, b, fam in pairs:
        diff = float(b["mean"] - a["mean"])
        se = float(np.sqrt(mse * (1.0 / a["count"] + 1.0 / b["count"])))
        t = diff / se
        rows.append({"family": fam, "group_a": a["label"], "group_b": b["label"], "mean_a": float(a["mean"]), "mean_b": float(b["mean"]),
                     "diff_b_minus_a": diff, "se": se, "t": t, "df": df_resid, "p_raw": float(2 * stats.t.sf(abs(t), df_resid))})
    out = pd.DataFrame(rows)
    if out.empty:
        return out
    if method == "tukey":
        k = len(cells) if not compare_within else int(cells.groupby(compare_within, observed=True).size().max())
        out["p_adjusted"] = [float(stats.studentized_range.sf(abs(t) * np.sqrt(2), k, df_resid)) for t in out["t"]]
    elif ADJUST.get(method):
        out["p_adjusted"] = multipletests(out["p_raw"], method=ADJUST[method])[1]
    else:
        out["p_adjusted"] = out["p_raw"]
    return out


def anova_factorial(path, outcome, factors, ss_type=None, posthoc="none", compare_within=None, alpha=0.05):
    factors = _list(factors)
    if len(factors) < 2:
        return _fail("factors needs 2 or 3 column names. For one factor, use anova_oneway.")
    if len(factors) > 3:
        return _fail("factors has %d columns. The tool takes 2 or 3." % len(factors))
    if ss_type not in (1, 2, 3, "1", "2", "3", "I", "II", "III"):
        return _fail("ss_type is missing or not 1, 2 or 3. The type of sums of squares is a decision.")
    ss_type = {"I": 1, "II": 2, "III": 3}.get(ss_type, ss_type)
    ss_type = int(ss_type)
    frame = _read(path)
    problem = _need(frame, [outcome] + factors)
    if problem:
        return _fail(problem)
    if compare_within and compare_within not in factors:
        return _fail("compare_within %s is not one of the factors (%s)." % (compare_within, ", ".join(factors)))
    before = len(frame)
    d = frame.dropna(subset=[outcome] + factors).copy()
    dropped = before - len(d)
    for f in factors:
        d[f] = d[f].astype(str)
    if not pd.api.types.is_numeric_dtype(d[outcome]):
        return _fail("The outcome column %s is not numeric." % outcome)
    rhs = "*".join("C(Q('%s'), Sum)" % f for f in factors)
    model = smf.ols("Q('%s') ~ %s" % (outcome, rhs), data=d).fit()
    try:
        table = sm.stats.anova_lm(model, typ=ss_type)
    except Exception as e:
        return _fail("statsmodels anova_lm (type %d) stopped on %s ~ %s: %s" % (ss_type, outcome, " x ".join(factors), e))
    names = {}
    for term in table.index:
        if term == "Residual":
            names[term] = "Residual"
        else:
            parts = [p.split("'")[1] for p in term.split(":") if "'" in p]
            names[term] = " x ".join(parts) if parts else term
    table = table.rename(index=names)
    if "Intercept" in table.index:
        table = table.drop(index="Intercept")
    ss_res = float(table.loc["Residual", "sum_sq"])
    df_res = float(table.loc["Residual", "df"])
    mse = ss_res / df_res
    out = pd.DataFrame({"term": table.index, "df": table["df"].values, "sum_sq": table["sum_sq"].values,
                        "mean_sq": table["sum_sq"].values / table["df"].values, "F": table["F"].values, "p": table["PR(>F)"].values})
    out["partial_eta_sq"] = [None if t == "Residual" else float(s / (s + ss_res)) for t, s in zip(out["term"], out["sum_sq"])]
    counts = d.groupby(factors, observed=True).size()
    full = int(np.prod([d[f].nunique() for f in factors]))
    balanced = bool(counts.nunique() == 1 and len(counts) == full)
    metrics = {"n": len(d), "n_dropped": dropped, "df_residual": df_res, "mse": mse, "n_cells": int(len(counts)), "balanced": int(balanced)}
    for r in out.itertuples():
        if r.term == "Residual":
            continue
        k = _key(r.term.replace(" x ", "_x_"))
        metrics["F_" + k] = float(r.F)
        metrics["p_" + k] = float(r.p)
        metrics["df_" + k] = float(r.df)
    levene = stats.levene(*[g[outcome].values for _, g in d.groupby(factors, observed=True)], center="mean")
    metrics["levene_p"] = float(levene.pvalue)
    result = {"ok": True, "metrics": metrics,
              "data": {"ss_type": ss_type, "factors": factors, "balanced": balanced, "alpha": alpha, "posthoc": posthoc},
              "table": _table(out, "anova_factorial")}
    summary = "%d-way ANOVA of %s (type %s sums of squares, n = %d%s, %s design): %s. Residual df %g. Levene p = %s." % (
        len(factors), outcome, {1: "I", 2: "II", 3: "III"}[ss_type], len(d), ", %d rows dropped for a missing value" % dropped if dropped else "",
        "balanced" if balanced else "unbalanced",
        "; ".join("%s F(%g, %g) = %.4g, p = %s" % (r.term, r.df, df_res, r.F, _fmt_p(r.p)) for r in out.itertuples() if r.term != "Residual"),
        df_res, _fmt_p(levene.pvalue))
    if not balanced and ss_type == 1:
        summary += " The design is unbalanced, so type I results depend on the order of the factors."
    if posthoc and posthoc != "none":
        post = _cell_comparisons(d, outcome, factors, mse, df_res, compare_within, posthoc)
        post["significant"] = post["p_adjusted"] < alpha
        result["table"] = _table(post, "posthoc")
        result["data"]["anova_table"] = out.round(10).to_dict(orient="records")
        metrics["n_comparisons"] = len(post)
        metrics["n_significant"] = int(post["significant"].sum())
        summary += " Comparisons of cell means (pooled error, %s, %s): %d of %d with adjusted p < %g." % (
            posthoc, "within each level of %s" % compare_within if compare_within else "all cells", metrics["n_significant"], len(post), alpha)
    _style()
    x, lines = factors[0], factors[1]
    fig, ax = plt.subplots(figsize=(5, 3.4))
    g = d.groupby([x, lines], observed=True)[outcome].agg(["mean", "sem"]).reset_index()
    xs = sorted(d[x].unique())
    for i, (lv, sub) in enumerate(g.groupby(lines, observed=True)):
        sub = sub.set_index(x).reindex(xs)
        ax.errorbar(range(len(xs)), sub["mean"], yerr=sub["sem"], marker="o", capsize=3, label="%s = %s" % (lines, lv))
    ax.set_xticks(range(len(xs)))
    ax.set_xticklabels(xs)
    ax.set_xlabel(x)
    ax.set_ylabel("%s (mean ± SEM)" % outcome)
    ax.legend(fontsize=7, frameon=False)
    if len(factors) == 3:
        ax.set_title("Pooled over %s" % factors[2], fontsize=8)
    result["outputs"] = _save(fig, "interaction_plot")
    result["summary"] = summary
    return result


def anova_repeated(path, outcome, within, subject, between=None, correction=None, alpha=0.05):
    if correction not in ("greenhouse-geisser", "none", "auto"):
        return _fail("correction is missing or not known. Use greenhouse-geisser, none or auto. The sphericity correction is a decision.")
    frame = _read(path)
    problem = _need(frame, [outcome, within, subject] + ([between] if between else []))
    if problem:
        return _fail(problem)
    d = frame.dropna(subset=[outcome, within, subject] + ([between] if between else [])).copy()
    d[within] = d[within].astype(str)
    reps = d.groupby([subject, within]).size()
    note = ""
    if reps.max() > 1:
        d = d.groupby([subject, within] + ([between] if between else []), as_index=False)[outcome].mean()
        note = " Some subjects have more than one row for one level of %s; the tool used the mean of those rows." % within
    levels = d[within].nunique()
    complete = d.groupby(subject)[within].nunique()
    incomplete = int((complete < levels).sum())
    if incomplete:
        d = d[d[subject].isin(complete[complete == levels].index)]
        note += " Removed %d subjects with a missing level of %s." % (incomplete, within)
    if between:
        t = pg.mixed_anova(data=d, dv=outcome, within=within, subject=subject, between=between, correction=True)
        row = t[t["Source"] == within].iloc[0]
        brow = t[t["Source"] == between].iloc[0]
        irow = t[t["Source"] == "Interaction"].iloc[0]
        if levels > 2 and pd.isna(row.get("eps")):
            return _fail("pingouin gave no Greenhouse-Geisser epsilon for %s. Update pingouin to 0.5 or later, or set correction none." % within)
        eps = float(row["eps"]) if pd.notna(row.get("eps")) else 1.0
        W = float(row["W_spher"]) if "W_spher" in t.columns else float("nan")
        p_spher = float(row["p_spher"]) if "p_spher" in t.columns else float("nan")
        df1, df2 = float(row["DF1"]), float(row["DF2"])
        F, p_unc = float(row["F"]), float(row["p_unc"])
        p_gg = float(stats.f.sf(F, df1 * eps, df2 * eps))
        Fi, pi = float(irow["F"]), float(irow["p_unc"])
        pi_gg = float(stats.f.sf(Fi, float(irow["DF1"]) * eps, float(irow["DF2"]) * eps))
        table = t
    else:
        t = pg.rm_anova(data=d, dv=outcome, within=within, subject=subject, correction=True, detailed=True)
        row = t.iloc[0]
        df1, df2 = float(t.loc[0, "DF"]), float(t.loc[1, "DF"])
        F, p_unc = float(row["F"]), float(row["p_unc"])
        eps = float(row["eps"])
        p_gg = float(row["p_GG_corr"]) if "p_GG_corr" in t.columns else float(stats.f.sf(F, df1 * eps, df2 * eps))
        W = float(row["W_spher"]) if "W_spher" in t.columns else float("nan")
        p_spher = float(row["p_spher"]) if "p_spher" in t.columns else float("nan")
        table = t
    use_gg = correction == "greenhouse-geisser" or (correction == "auto" and levels > 2 and p_spher < alpha)
    p_rep = p_gg if use_gg else p_unc
    n_subj = int(d[subject].nunique())
    metrics = {"F": F, "df_effect": df1, "df_error": df2, "p_uncorrected": p_unc, "epsilon_gg": eps, "p_gg": p_gg, "p_reported": p_rep,
               "mauchly_W": W, "mauchly_p": p_spher, "n_subjects": n_subj, "n_levels": levels, "n_subjects_removed": incomplete}
    summary = "Repeated-measures ANOVA of %s over %s (%d levels, %d subjects): F(%g, %g) = %.4g, p = %s uncorrected; Greenhouse-Geisser epsilon %.4f, corrected df %.3g and %.4g, p = %s. Mauchly W = %.4g, p = %s. Reported (%s): p = %s." % (
        outcome, within, levels, n_subj, df1, df2, F, _fmt_p(p_unc), eps, df1 * eps, df2 * eps, _fmt_p(p_gg), W, _fmt_p(p_spher),
        "Greenhouse-Geisser" if use_gg else "no correction", _fmt_p(p_rep))
    if between:
        metrics.update({"F_between": float(brow["F"]), "p_between": float(brow["p_unc"]), "df_between": float(brow["DF1"]),
                        "F_interaction": Fi, "p_interaction": pi, "p_interaction_gg": pi_gg})
        summary += " Between-subject factor %s: F(%g, %g) = %.4g, p = %s. Interaction: F = %.4g, p = %s (GG %s)." % (
            between, float(brow["DF1"]), float(brow["DF2"]), float(brow["F"]), _fmt_p(float(brow["p_unc"])), Fi, _fmt_p(pi), _fmt_p(pi_gg))
    summary += note
    _style()
    fig, ax = plt.subplots(figsize=(5, 3.4))
    order = sorted(d[within].unique(), key=lambda v: (float(v) if str(v).replace(".", "", 1).lstrip("-").isdigit() else np.inf, str(v)))
    pos = {v: i for i, v in enumerate(order)}
    for _, sub in d.groupby(subject):
        sub = sub.assign(_x=sub[within].map(pos)).sort_values("_x")
        ax.plot(sub["_x"], sub[outcome], color="#BBBBBB", lw=0.6)
    m = d.groupby(within)[outcome].mean().reindex(order)
    ax.plot(range(len(order)), m.values, color="#0072B2", lw=2, marker="o", label="mean")
    ax.set_xticks(range(len(order)))
    ax.set_xticklabels(order)
    ax.set_xlabel(within)
    ax.set_ylabel(outcome)
    ax.set_title("Each line is one subject", fontsize=8)
    return {"ok": True, "summary": summary, "metrics": metrics,
            "data": {"correction": correction, "used_greenhouse_geisser": bool(use_gg), "alpha": alpha},
            "table": _table(table.round(10), "anova_repeated"), "outputs": _save(fig, "repeated_measures")}


def kruskal_dunn(path, outcome, group, p_adjust=None, alpha=0.05):
    if p_adjust not in ADJUST:
        return _fail("p_adjust is missing or not known. Use bonferroni, holm, sidak, fdr_bh or none. The correction is a decision.")
    frame = _read(path)
    problem = _need(frame, [outcome, group])
    if problem:
        return _fail(problem)
    d = frame.dropna(subset=[outcome, group]).copy()
    d[group] = d[group].astype(str)
    groups = sorted(d[group].unique())
    if len(groups) < 2:
        return _fail("The group column %s has %d level. Kruskal-Wallis needs 2 or more." % (group, len(groups)))
    samples = [d.loc[d[group] == g, outcome].values for g in groups]
    H, p = stats.kruskal(*samples)
    N = len(d)
    ranks = stats.rankdata(d[outcome].values)
    d["_rank"] = ranks
    _, tcounts = np.unique(d[outcome].values, return_counts=True)
    tie = float(np.sum(tcounts ** 3 - tcounts)) / (12.0 * (N - 1))
    rows = []
    for a, b in itertools.combinations(groups, 2):
        ra, rb = d.loc[d[group] == a, "_rank"], d.loc[d[group] == b, "_rank"]
        se = np.sqrt((N * (N + 1) / 12.0 - tie) * (1.0 / len(ra) + 1.0 / len(rb)))
        z = float((rb.mean() - ra.mean()) / se)
        rows.append({"group_a": a, "group_b": b, "mean_rank_a": float(ra.mean()), "mean_rank_b": float(rb.mean()), "z": z,
                     "p_raw": float(2 * stats.norm.sf(abs(z)))})
    post = pd.DataFrame(rows)
    post["p_adjusted"] = multipletests(post["p_raw"], method=ADJUST[p_adjust])[1] if ADJUST[p_adjust] else post["p_raw"]
    check = sp.posthoc_dunn(d, val_col=outcome, group_col=group, p_adjust=ADJUST[p_adjust])
    post["p_adjusted_scikit_posthocs"] = [float(check.loc[r.group_a, r.group_b]) for r in post.itertuples()]
    post["significant"] = post["p_adjusted"] < alpha
    medians = d.groupby(group)[outcome].median()
    metrics = {"H": float(H), "df": len(groups) - 1, "p_value": float(p), "n": N, "n_groups": len(groups),
               "n_pairs_significant": int(post["significant"].sum()), "min_p_adjusted": float(post["p_adjusted"].min())}
    summary = "Kruskal-Wallis test of %s by %s (n = %d, %d groups): chi-squared %.4f, df %d, p = %s. Dunn test (%s): %d of %d pairs with adjusted p < %g. Medians: %s." % (
        outcome, group, N, len(groups), H, len(groups) - 1, _fmt_p(p), p_adjust, metrics["n_pairs_significant"], len(post), alpha,
        ", ".join("%s %.4g" % (k, v) for k, v in medians.items()))
    best = post.sort_values("p_adjusted").head(3)
    summary += " Smallest adjusted p: %s." % "; ".join("%s vs %s z = %.3f, p = %.4g" % (r.group_a, r.group_b, r.z, r.p_adjusted) for r in best.itertuples())
    _style()
    fig, ax = plt.subplots(figsize=(max(3.5, 0.9 * len(groups) + 1.5), 3.4))
    ax.boxplot(samples, showfliers=False)
    rng = np.random.default_rng(0)
    for i, s in enumerate(samples):
        ax.scatter(i + 1 + rng.uniform(-0.12, 0.12, len(s)), s, s=10, color="#0072B2", alpha=0.7)
    ax.set_xticks(range(1, len(groups) + 1))
    ax.set_xticklabels(groups)
    ax.set_xlabel(group)
    ax.set_ylabel(outcome)
    ax.set_title("Kruskal-Wallis p = %s" % _fmt_p(p), fontsize=8)
    return {"ok": True, "summary": summary, "metrics": metrics, "data": {"p_adjust": p_adjust, "alpha": alpha},
            "table": _table(post, "dunn"), "outputs": _save(fig, "kruskal_wallis")}


def friedman_test(path, outcome, within, subject, p_adjust=None, alpha=0.05):
    if p_adjust not in ADJUST:
        return _fail("p_adjust is missing or not known. Use bonferroni, holm, sidak, fdr_bh or none. The correction is a decision.")
    frame = _read(path)
    problem = _need(frame, [outcome, within, subject])
    if problem:
        return _fail(problem)
    d = frame.dropna(subset=[outcome, within, subject]).copy()
    d[within] = d[within].astype(str)
    wide = d.pivot_table(index=subject, columns=within, values=outcome, aggfunc="mean")
    removed = int(wide.isna().any(axis=1).sum())
    wide = wide.dropna()
    if wide.shape[1] < 3 or len(wide) < 2:
        return _fail("Friedman needs 3 or more levels of %s and 2 or more complete subjects. It has %d levels and %d complete subjects. For 2 levels, use rank_test with paired true." % (within, wide.shape[1], len(wide)))
    chi2, p = stats.friedmanchisquare(*[wide[c].values for c in wide.columns])
    rows = []
    for a, b in itertools.combinations(wide.columns, 2):
        w = stats.wilcoxon(wide[b], wide[a])
        rows.append({"level_a": a, "level_b": b, "median_diff_b_minus_a": float(np.median(wide[b] - wide[a])), "W": float(w.statistic), "p_raw": float(w.pvalue)})
    post = pd.DataFrame(rows)
    post["p_adjusted"] = multipletests(post["p_raw"], method=ADJUST[p_adjust])[1] if ADJUST[p_adjust] else post["p_raw"]
    post["significant"] = post["p_adjusted"] < alpha
    k = wide.shape[1]
    kendall_w = float(chi2 / (len(wide) * (k - 1)))
    metrics = {"chi2": float(chi2), "df": k - 1, "p_value": float(p), "n_subjects": len(wide), "n_removed": removed, "kendall_w": kendall_w,
               "n_pairs_significant": int(post["significant"].sum())}
    summary = "Friedman test of %s over %s (%d levels, %d subjects%s): chi-squared %.4f, df %d, p = %s, Kendall W %.3f. Pairwise Wilcoxon signed-rank (%s): %d of %d pairs with adjusted p < %g." % (
        outcome, within, k, len(wide), ", %d removed for a missing level" % removed if removed else "", chi2, k - 1, _fmt_p(p), kendall_w, p_adjust,
        metrics["n_pairs_significant"], len(post), alpha)
    _style()
    fig, ax = plt.subplots(figsize=(4.5, 3.4))
    for _, r in wide.iterrows():
        ax.plot(range(k), r.values, color="#BBBBBB", lw=0.6, marker="o", ms=2)
    ax.plot(range(k), wide.median().values, color="#0072B2", lw=2, marker="o", label="median")
    ax.set_xticks(range(k))
    ax.set_xticklabels(wide.columns)
    ax.set_xlabel(within)
    ax.set_ylabel(outcome)
    ax.set_title("Each line is one subject; blue is the median", fontsize=8)
    return {"ok": True, "summary": summary, "metrics": metrics, "data": {"p_adjust": p_adjust},
            "table": _table(post, "friedman_pairs"), "outputs": _save(fig, "friedman")}


def rank_test(path, outcome, group, paired=False, id_column=None, alternative="two-sided", method=None):
    if method not in ("exact", "asymptotic"):
        return _fail("method is missing or not exact or asymptotic. The p value method is a decision.")
    frame = _read(path)
    problem = _need(frame, [outcome, group] + ([id_column] if id_column else []))
    if problem:
        return _fail(problem)
    levels = sorted(frame[group].dropna().unique().tolist())
    if len(levels) != 2:
        return _fail("The group column must have exactly 2 levels. It has %d: %s." % (len(levels), levels))
    first, second = levels
    note = ""
    approximated = method != "exact"
    if paired:
        if not id_column:
            return _fail("A paired rank test needs id_column, the column that names the same subject in both groups.")
        full = frame.pivot_table(index=id_column, columns=group, values=outcome, aggfunc="mean")
        wide = full.dropna()
        unpaired = len(full) - len(wide)
        if unpaired:
            note += " The test leaves out %d %s with a value in only one group." % (unpaired, "subject" if unpaired == 1 else "subjects")
        diff = (wide[second] - wide[first]).values
        zeros = int((diff == 0).sum())
        ties = len(diff) - len(np.unique(np.abs(diff[diff != 0])))
        if method == "exact" and (zeros or ties > 0):
            note += " The differences have %d zeros and %d tied absolute values, so scipy cannot give an exact p; it used the normal approximation." % (zeros, max(ties, 0))
            approximated = True
            res = stats.wilcoxon(diff, alternative=alternative, method="approx", correction=True)
        else:
            res = stats.wilcoxon(diff, alternative=alternative, method="exact" if method == "exact" else "approx", correction=method != "exact")
        name, n1, n2 = "Wilcoxon signed-rank test", len(diff), len(diff)
        stat_name = "V (sum of positive ranks)"
        statistic = float(np.sum(stats.rankdata(np.abs(diff[diff != 0]))[diff[diff != 0] > 0]))
        estimate = float(np.median(diff))
    else:
        x = frame.loc[frame[group] == second, outcome].dropna().values
        y = frame.loc[frame[group] == first, outcome].dropna().values
        tied = len(np.concatenate([x, y])) - len(np.unique(np.concatenate([x, y])))
        m = method
        if method == "exact" and tied:
            note = " The data have %d tied values, so scipy cannot give an exact p; it used the normal approximation." % tied
            m = "asymptotic"
            approximated = True
        res = stats.mannwhitneyu(x, y, alternative=alternative, method=m, use_continuity=True)
        name, n1, n2 = "Mann-Whitney U test", len(y), len(x)
        stat_name = "U of the second group (R calls it W)"
        statistic = float(res.statistic)
        estimate = float(np.median(np.subtract.outer(x, y)))
    p = float(res.pvalue)
    used = "exact" if not approximated else "normal approximation with continuity correction"
    summary = "%s of %s, %s against %s, %s, %s p: %s = %.4g, p = %s. Estimate (%s): %.4g.%s" % (
        name, outcome, second, first, alternative, used, stat_name, statistic, _fmt_p(p),
        "median of the paired differences" if paired else "Hodges-Lehmann shift, second minus first", estimate, note)
    return {"ok": True, "summary": summary,
            "metrics": {"statistic": statistic, "p_value": p, "n_a": n1, "n_b": n2, "estimate": estimate, "exact": int(used == "exact")},
            "data": {"test": name, "p_method": used, "alternative": alternative, "direction": "%s minus %s" % (second, first)}}
