import os
import re
import warnings

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import pingouin as pg
import statsmodels.formula.api as smf
from lifelines import CoxPHFitter, KaplanMeierFitter
from lifelines.statistics import logrank_test, multivariate_logrank_test, proportional_hazard_test
from lifelines.utils import concordance_index
from scipy import stats
from statsmodels.duration.hazard_regression import PHReg
from statsmodels.stats.multitest import multipletests

warnings.filterwarnings("ignore")


def _read(path):
    return pd.read_csv(os.path.expanduser(path))


def _fail(message):
    return {"ok": False, "error": message}


def _need(frame, columns):
    missing = [c for c in columns if c not in frame.columns]
    if missing:
        return "Unknown column: %s. The columns are: %s." % (", ".join(missing), ", ".join(map(str, frame.columns)))
    return None


def _clean(value):
    if isinstance(value, (np.floating, float)):
        return None if np.isnan(value) else float(value)
    if isinstance(value, np.integer):
        return int(value)
    if isinstance(value, np.bool_):
        return bool(value)
    return value


def _table(frame, name, limit=15):
    path = os.path.join(os.getcwd(), name + ".csv")
    frame.to_csv(path, index=False)
    rows = [[_clean(v) for v in r] for r in frame.head(limit).itertuples(index=False, name=None)]
    return {"columns": [str(c) for c in frame.columns], "rows": rows, "n_rows": int(len(frame)), "path": path}


def _files(*paths):
    out = []
    for p in paths:
        kind = "image" if p.endswith(".png") else "table" if p.endswith(".csv") else "file"
        out.append({"path": p, "kind": kind, "name": os.path.basename(p)})
    return out


def _metrics(values):
    return {k: float(v) if isinstance(v, (float, np.floating)) else int(v) for k, v in values.items() if v is not None}


def _ci_level(alpha):
    return 1 - alpha


def inspect_table(path):
    frame = _read(path)
    rows = []
    for c in frame.columns:
        s = frame[c]
        numeric = pd.api.types.is_numeric_dtype(s)
        rows.append([str(c), str(s.dtype), int(s.isna().sum()), int(s.nunique()),
                     float(s.min()) if numeric else None, float(s.max()) if numeric else None,
                     ", ".join(map(str, s.dropna().unique()[:5]))])
    table = pd.DataFrame(rows, columns=["column", "dtype", "n_missing", "n_unique", "min", "max", "first_values"])
    return {
        "ok": True,
        "summary": "%d rows x %d columns." % frame.shape,
        "metrics": _metrics({"n_rows": len(frame), "n_columns": frame.shape[1]}),
        "table": _table(table, "columns"),
    }


def compare_two_groups(path, outcome, group, test="t", paired=False, id_column=None, alternative="two-sided", alpha=0.05, equal_variance=False):
    frame = _read(path)
    problem = _need(frame, [outcome, group] + ([id_column] if id_column else []))
    if problem:
        return _fail(problem)
    levels = sorted(frame[group].dropna().unique().tolist())
    if len(levels) != 2:
        return _fail("The group column must have exactly 2 levels. It has %d: %s." % (len(levels), levels))
    first, second = levels
    note = ""
    if paired:
        if not id_column:
            return _fail("A paired test needs id_column, the column that names the same subject in both groups.")
        wide = frame.pivot_table(index=id_column, columns=group, values=outcome, aggfunc="mean").dropna()
        x, y = wide[second].values, wide[first].values
        n1 = n2 = len(wide)
        diff = x - y
        if test == "t":
            res = stats.ttest_1samp(diff, 0.0, alternative=alternative)
            name = "paired t-test"
            statistic, dof = float(res.statistic), float(res.df)
            ci = res.confidence_interval(_ci_level(alpha))
            effect = float(diff.mean() / diff.std(ddof=1))
            effect_name = "cohen_dz"
        else:
            res = stats.wilcoxon(diff, alternative=alternative)
            name = "Wilcoxon signed-rank test"
            statistic, dof = float(res.statistic), None
            ci = None
            effect, effect_name = None, ""
        estimate = float(diff.mean())
    else:
        x = frame.loc[frame[group] == second, outcome].dropna().values
        y = frame.loc[frame[group] == first, outcome].dropna().values
        n1, n2 = len(y), len(x)
        if id_column:
            shared = set(frame.loc[frame[group] == first, id_column]) & set(frame.loc[frame[group] == second, id_column])
            if shared:
                note = " Warning: %d values of %s appear in both groups. The same subjects may be measured twice. An unpaired test then ignores the pairing." % (len(shared), id_column)
        if test == "t":
            res = stats.ttest_ind(x, y, equal_var=equal_variance, alternative=alternative)
            name = "Student t-test (equal variances)" if equal_variance else "Welch t-test (unequal variances)"
            statistic, dof = float(res.statistic), float(res.df)
            ci = res.confidence_interval(_ci_level(alpha))
            effect = float(pg.compute_effsize(x, y, eftype="cohen"))
            effect_name = "cohen_d"
        else:
            res = stats.mannwhitneyu(x, y, alternative=alternative)
            name = "Mann-Whitney U test"
            statistic, dof = float(res.statistic), None
            ci = None
            effect, effect_name = None, ""
        estimate = float(x.mean() - y.mean())
    p = float(res.pvalue)
    data = {
        "test": name,
        "alternative": alternative,
        "direction": "%s minus %s" % (second, first),
        "alpha": alpha,
        "significant": bool(p < alpha),
    }
    row = {"test": name, "group_a": first, "group_b": second, "n_a": n1, "n_b": n2, "mean_diff_b_minus_a": estimate,
           "statistic": statistic, "df": dof, "p": p, "ci_lo": float(ci.low) if ci else None, "ci_hi": float(ci.high) if ci else None,
           effect_name or "effect": effect}
    sided = {"two-sided": "two-sided", "greater": "one-sided (%s greater)" % second, "less": "one-sided (%s less)" % second}[alternative]
    summary = "%s, %s: %s minus %s = %.4g, statistic %.4g, p = %.4g (alpha %g).%s" % (name, sided, second, first, estimate, statistic, p, alpha, note)
    metrics = {"n_a": n1, "n_b": n2, "mean_diff": estimate, "statistic": statistic, "df": dof, "p_value": p,
               "ci_lo": float(ci.low) if ci else None, "ci_hi": float(ci.high) if ci else None, "effect_size": effect,
               "mean_a": float(np.mean(y)), "mean_b": float(np.mean(x))}
    return {"ok": True, "summary": summary, "metrics": _metrics(metrics), "data": data,
            "table": _table(pd.DataFrame([row]), "two_group_test")}


def anova_oneway(path, outcome, group, variance="equal", posthoc="none", alpha=0.05):
    posthoc = {"bonferroni": "bonf"}.get(posthoc, posthoc)
    frame = _read(path)
    problem = _need(frame, [outcome, group])
    if problem:
        return _fail(problem)
    levels = frame[group].nunique()
    if levels < 3:
        return _fail("One-way ANOVA needs 3 or more groups. This column has %d. Use compare_two_groups." % levels)
    if variance == "equal":
        table = pg.anova(frame, dv=outcome, between=group, detailed=True)
        name = "one-way ANOVA"
        f, p = float(table.loc[0, "F"]), float(table.loc[0, "p_unc"])
        df1, df2 = float(table.loc[0, "DF"]), float(table.loc[1, "DF"])
        eta2 = float(table.loc[0, "np2"])
    else:
        table = pg.welch_anova(frame, dv=outcome, between=group)
        name = "Welch ANOVA"
        f, p = float(table.loc[0, "F"]), float(table.loc[0, "p_unc"])
        df1, df2 = float(table.loc[0, "ddof1"]), float(table.loc[0, "ddof2"])
        eta2 = float(table.loc[0, "np2"])
    levene = pg.homoscedasticity(frame, dv=outcome, group=group)
    levene_p = float(levene.loc["levene", "pval"])
    outputs = [_table(table.round(10), "anova")["path"]]
    result = {
        "ok": True,
        "summary": "%s: F(%g, %.4g) = %.4g, p = %.4g, partial eta squared %.3f. Levene test of equal variances p = %.3g." % (name, df1, df2, f, p, eta2, levene_p),
        "metrics": _metrics({"F": f, "df_between": df1, "df_within": df2, "p_value": p, "eta_squared": eta2, "levene_p": levene_p, "n_groups": levels, "n": len(frame)}),
        "data": {"test": name, "alpha": alpha, "significant": bool(p < alpha), "posthoc": posthoc},
        "outputs": _files(*outputs),
    }
    if posthoc != "none":
        if posthoc == "tukey":
            post = pg.pairwise_tukey(frame, dv=outcome, between=group).rename(columns={"p_tukey": "p_adjusted"})
        elif variance != "equal" or posthoc == "games-howell":
            post = pg.pairwise_gameshowell(frame, dv=outcome, between=group).rename(columns={"pval": "p_adjusted"})
        else:
            post = pg.pairwise_tests(frame, dv=outcome, between=group, padjust=posthoc)
            post = post.rename(columns={"p_corr": "p_adjusted"})
        post["significant"] = post["p_adjusted"] < alpha
        keep = [c for c in ["A", "B", "mean_A", "mean_B", "diff", "p_adjusted", "significant"] if c in post.columns]
        if "diff" not in post.columns and "mean_A" in post.columns:
            post["diff"] = post["mean_B"] - post["mean_A"]
            keep.insert(4, "diff")
        post = post[keep]
        result["table"] = _table(post, "posthoc")
        result["outputs"] += _files(result["table"]["path"])
        result["summary"] += " Post-hoc: %s, %d pairs, %d significant at alpha %g." % (posthoc, len(post), int(post["significant"].sum()), alpha)
        result["metrics"]["n_pairs_significant"] = int(post["significant"].sum())
    return result


def adjust_pvalues(pvalues, method="holm", alpha=0.05):
    p = np.asarray(pvalues, dtype=float)
    reject, adjusted, _, _ = multipletests(p, alpha=alpha, method=method)
    frame = pd.DataFrame({"p_raw": p, "p_adjusted": adjusted, "reject": reject})
    return {
        "ok": True,
        "summary": "%s correction of %d p-values at alpha %g: %d rejected." % (method, len(p), alpha, int(reject.sum())),
        "metrics": _metrics({"n_tests": len(p), "n_rejected": int(reject.sum())}),
        "table": _table(frame, "adjusted_p"),
    }


def _coef_table(res, alpha):
    ci = res.conf_int(alpha=alpha)
    frame = pd.DataFrame({"term": res.params.index, "coef": res.params.values, "se": res.bse.values,
                          "p": res.pvalues.values, "ci_lo": ci[0].values, "ci_hi": ci[1].values})
    return frame


def fit_ols(path, formula, alpha=0.05, cov_type="nonrobust", cluster=None):
    frame = _read(path)
    kwargs = {}
    if cov_type == "cluster":
        if not cluster or cluster not in frame.columns:
            return _fail("cov_type cluster needs cluster, the column that names the unit of replication.")
        frame = frame.dropna(subset=[cluster])
        kwargs = {"groups": frame[cluster]}
    res = smf.ols(formula, frame).fit(cov_type=cov_type, cov_kwds=kwargs)
    table = _coef_table(res, alpha)
    metrics = {"n": res.nobs, "r_squared": res.rsquared, "aic": res.aic}
    for _, r in table.iterrows():
        key = _key(r["term"])
        metrics["coef_" + key] = r["coef"]
        metrics["se_" + key] = r["se"]
    return {"ok": True, "summary": "OLS %s, n = %d, R squared %.3f, standard errors: %s. %s" % (
        formula, res.nobs, res.rsquared, cov_type, "; ".join("%s %.4g (se %.4g)" % (r.term, r.coef, r.se) for r in table.itertuples())),
        "metrics": _metrics(metrics), "table": _table(table, "ols")}


def fit_mixed_model(path, formula, groups, re_formula="1", reml=True, alpha=0.05):
    frame = _read(path)
    problem = _need(frame, [groups])
    if problem:
        return _fail(problem)
    spec = None if re_formula in ("1", "", None) else re_formula
    model = smf.mixedlm(formula, frame, groups=frame[groups], re_formula=spec)
    res = model.fit(reml=reml)
    fe = res.fe_params.index
    ci = res.conf_int(alpha=alpha)
    table = pd.DataFrame({"term": fe, "coef": res.fe_params.values, "se": res.bse_fe.values, "p": res.pvalues[fe].values,
                          "ci_lo": ci.loc[fe, 0].values, "ci_hi": ci.loc[fe, 1].values})
    cov = np.atleast_2d(res.cov_re)
    metrics = {"n": res.nobs, "n_groups": len(res.model.group_labels), "residual_variance": res.scale,
               "group_variance": cov[0, 0], "log_likelihood": res.llf, "converged": int(bool(res.converged))}
    if cov.shape[0] > 1:
        metrics["slope_variance"] = cov[1, 1]
        metrics["intercept_slope_covariance"] = cov[0, 1]
    for _, r in table.iterrows():
        key = _key(r["term"])
        metrics["coef_" + key] = r["coef"]
        metrics["se_" + key] = r["se"]
    random = "random intercept" if spec is None else "random effects %s" % spec
    summary = "Mixed model %s, %s by %s, %s. n = %d, %d groups. %s. Group variance %.4g, residual variance %.4g." % (
        formula, random, groups, "REML" if reml else "ML", res.nobs, metrics["n_groups"],
        "; ".join("%s %.4g (se %.4g)" % (r.term, r.coef, r.se) for r in table.itertuples()), cov[0, 0], res.scale)
    return {"ok": True, "summary": summary, "metrics": _metrics(metrics), "table": _table(table, "mixed_model")}


def _key(term):
    return re.sub(r"\W+", "_", term).strip("_")


def kaplan_meier(path, duration, event, group=None, alpha=0.05, time_points=None):
    frame = _read(path)
    problem = _need(frame, [duration, event] + ([group] if group else []))
    if problem:
        return _fail(problem)
    times = [float(t) for t in (time_points or [])]
    fig, ax = plt.subplots(figsize=(6, 4))
    rows = []
    medians = {}
    labels = [(None, frame)] if not group else [(g, d) for g, d in frame.groupby(group)]
    for label, d in labels:
        km = KaplanMeierFitter(alpha=alpha).fit(d[duration], d[event], label=str(label) if label is not None else "all")
        km.plot_survival_function(ax=ax, ci_show=True)
        med = km.median_survival_time_
        medians[str(label)] = None if np.isinf(med) else float(med)
        row = {"group": "all" if label is None else label, "n": len(d), "events": int(d[event].sum()),
               "median": None if np.isinf(med) else float(med)}
        for t in times:
            row["S(%g)" % t] = float(km.predict(t))
        rows.append(row)
    ax.set_xlabel(duration)
    ax.set_ylabel("Survival probability")
    plot = os.path.join(os.getcwd(), "kaplan_meier.png")
    fig.savefig(plot, dpi=100, bbox_inches="tight")
    plt.close(fig)
    metrics = {"n": len(frame), "events": int(frame[event].sum())}
    data = {"alpha": alpha, "median_by_group": medians}
    summary = "Kaplan-Meier: %d subjects, %d events." % (len(frame), metrics["events"])
    if group:
        levels = frame[group].nunique()
        if levels == 2:
            g1, g2 = [d for _, d in frame.groupby(group)]
            lr = logrank_test(g1[duration], g2[duration], g1[event], g2[event])
        else:
            lr = multivariate_logrank_test(frame[duration], frame[group], frame[event])
        metrics.update({"logrank_chi2": float(lr.test_statistic), "logrank_p": float(lr.p_value), "logrank_df": levels - 1})
        summary += " Log-rank test across %d groups: chi-square %.4g, p = %.4g." % (levels, lr.test_statistic, lr.p_value)
    for r in rows:
        for k, v in r.items():
            if k.startswith("S(") and v is not None and r["group"] == "all":
                metrics["survival_" + k[2:-1]] = v
    return {"ok": True, "summary": summary, "metrics": _metrics(metrics), "data": data,
            "table": _table(pd.DataFrame(rows), "kaplan_meier"), "outputs": _files(plot)}


def fit_cox(path, duration, event, covariates, ties="efron", strata=None, alpha=0.05):
    frame = _read(path)
    covs = [c.strip() for c in (covariates.split(",") if isinstance(covariates, str) else covariates) if c.strip()]
    strata_cols = [s.strip() for s in (strata.split(",") if isinstance(strata, str) else (strata or [])) if s.strip()]
    problem = _need(frame, [duration, event] + covs + strata_cols)
    if problem:
        return _fail(problem)
    data = frame[[duration, event] + covs + strata_cols].dropna()
    if ties == "efron":
        cph = CoxPHFitter(alpha=alpha).fit(data, duration, event, strata=strata_cols or None)
        s = cph.summary
        table = pd.DataFrame({"term": s.index, "coef": s["coef"].values, "hazard_ratio": s["exp(coef)"].values, "se": s["se(coef)"].values,
                              "p": s["p"].values, "hr_ci_lo": s["exp(coef) lower %g%%" % (100 * (1 - alpha))].values,
                              "hr_ci_hi": s["exp(coef) upper %g%%" % (100 * (1 - alpha))].values})
        concordance = float(cph.concordance_index_)
        loglik = float(cph.log_likelihood_)
        try:
            ph = proportional_hazard_test(cph, data, time_transform="rank").summary
            ph_p = {k: float(v) for k, v in ph["p"].items()}
        except Exception:
            ph_p = {}
    else:
        model = PHReg(data[duration].values, data[covs].values, status=data[event].values, ties=ties,
                      strata=data[strata_cols].astype(str).agg("|".join, axis=1).values if strata_cols else None)
        res = model.fit()
        ci = res.conf_int(alpha=alpha)
        table = pd.DataFrame({"term": covs, "coef": res.params, "hazard_ratio": np.exp(res.params), "se": res.bse, "p": res.pvalues,
                              "hr_ci_lo": np.exp(ci[:, 0]), "hr_ci_hi": np.exp(ci[:, 1])})
        lp = data[covs].values @ res.params
        concordance = float(concordance_index(data[duration], -lp, data[event]))
        loglik = float(res.llf)
        ph_p = {}
    metrics = {"n": len(data), "events": int(data[event].sum()), "concordance": concordance, "log_likelihood": loglik}
    for _, r in table.iterrows():
        metrics["coef_" + r["term"]] = r["coef"]
        metrics["hr_" + r["term"]] = r["hazard_ratio"]
        metrics["se_" + r["term"]] = r["se"]
        metrics["p_" + r["term"]] = r["p"]
    if ph_p:
        metrics["ph_test_min_p"] = min(ph_p.values())
    low = [k for k, v in ph_p.items() if v < alpha]
    summary = "Cox model, ties %s, n = %d, %d events, concordance %.4g. %s." % (
        ties, len(data), metrics["events"], concordance,
        "; ".join("%s HR %.3g (p = %.3g)" % (r.term, r.hazard_ratio, r.p) for r in table.itertuples()))
    if low:
        summary += " Proportional hazards test p below alpha for: %s." % ", ".join(low)
    return {"ok": True, "summary": summary, "metrics": _metrics(metrics),
            "data": {"ties": ties, "alpha": alpha, "ph_test_p": ph_p, "ph_violations": low},
            "table": _table(table, "cox")}
