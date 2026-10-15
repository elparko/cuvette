import functools
import inspect
import os
import re
import warnings

import numpy as np
import pandas as pd

warnings.filterwarnings("ignore")


MISSING_TEXT = {"", "na", "n/a", "#n/a", "<na>", "null", "nan", "-", "—", "?", "."}

PLACEHOLDER_CELLS = {}


def _note_placeholders(fn):
    @functools.wraps(fn)
    def run(*args, **kwargs):
        PLACEHOLDER_CELLS.clear()
        result = fn(*args, **kwargs)
        n = sum(PLACEHOLDER_CELLS.values())
        if isinstance(result, dict) and result.get("ok") and n:
            result.setdefault("metrics", {})["n_placeholder_cells"] = n
            result["summary"] = result.get("summary", "") + " %d %s in numeric columns hold a placeholder (-, ? or .). The tool treats %s as missing." % (n, "cell" if n == 1 else "cells", "it" if n == 1 else "them")
        return result
    return run


def _keeps_text(cleaned):
    cells = cleaned.dropna().astype(str).str.strip()
    integers = cells[cells.str.fullmatch(r"[-+]?\d+")]
    return bool(cells.str.match(r"[-+]?0\d").any() or (integers.str.count(r"\d") > 15).any())


def _typed(path, enc):
    frame = pd.read_csv(path, encoding=enc)
    raw = pd.read_csv(path, encoding=enc, dtype=str, keep_default_na=False)
    placeholders = 0
    for column in frame.columns:
        if pd.api.types.is_object_dtype(frame[column]) or pd.api.types.is_string_dtype(frame[column]):
            text = raw[column].astype(str).str.strip().str.lower()
            hidden = text.isin(MISSING_TEXT)
            cleaned = raw[column].where(~hidden, np.nan)
            numbers = pd.to_numeric(cleaned, errors="coerce")
            if cleaned.notna().any() and not _keeps_text(cleaned) and numbers.notna().sum() == cleaned.notna().sum():
                placeholders += int((hidden & (text != "")).sum())
                cleaned = numbers
            frame[column] = cleaned
    PLACEHOLDER_CELLS[path] = placeholders
    return frame


def _read(path):
    path = os.path.expanduser(path)
    for enc in ("utf-8-sig", "cp1252"):
        try:
            return _typed(path, enc)
        except UnicodeDecodeError:
            pass
    return _typed(path, "latin-1")


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


def _names(value):
    if value is None:
        return []
    items = value.split(",") if isinstance(value, str) else value
    return [str(c).strip() for c in items if str(c).strip()]


def _subset(frame, subset):
    if not subset or str(subset).strip().lower() in ("all", "none"):
        return frame, ""
    try:
        kept = frame.query(subset)
    except Exception as e:
        return None, "The subset %r is not a valid row filter: %s. Write a pandas query such as \"smoke == 1\" or \"celltype == 'adeno'\". The columns are: %s." % (subset, e, ", ".join(map(str, frame.columns)))
    if kept.empty:
        return None, "The subset %r keeps no rows of %d." % (subset, len(frame))
    return kept, ""


def _parse_reference(reference):
    if not reference or (isinstance(reference, str) and reference.strip().lower() in ("first", "none", "default")):
        return {}
    if isinstance(reference, dict):
        return {str(k): str(v) for k, v in reference.items()}
    out = {}
    for part in str(reference).split(","):
        if "=" in part:
            k, v = part.split("=", 1)
            out[k.strip()] = v.strip()
    return out


def _level_order(series):
    levels = series.dropna().unique().tolist()
    try:
        return sorted(levels)
    except TypeError:
        return sorted(levels, key=str)


def _design(frame, covs, categorical=None, reference=None):
    forced = set(_names(categorical))
    refs = _parse_reference(reference)
    unknown = [c for c in list(forced) + list(refs) if c not in covs]
    if unknown:
        return None, None, "categorical and reference must name covariates of the model. Not covariates: %s." % ", ".join(unknown)
    parts, info = [], {}
    for c in covs:
        s = frame[c]
        if c in forced or not pd.api.types.is_numeric_dtype(s) or pd.api.types.is_bool_dtype(s):
            levels = _level_order(s)
            text = [str(v) for v in levels]
            ref = refs.get(c, text[0] if text else "")
            if ref not in text:
                return None, None, "The reference level %r is not a level of %s. The levels are: %s." % (ref, c, ", ".join(text))
            if len(levels) < 2:
                return None, None, "The covariate %s has one level only (%s). It cannot enter the model." % (c, ", ".join(text))
            as_text = s.map(lambda v: None if pd.isna(v) else str(v))
            cols = {}
            for lv in text:
                if lv != ref:
                    cols["%s[%s]" % (c, lv)] = (as_text == lv).astype(float).where(as_text.notna())
            parts.append(pd.DataFrame(cols, index=frame.index))
            info[c] = {"kind": "categorical", "reference": ref, "levels": text, "columns": list(cols)}
        else:
            parts.append(frame[[c]].astype(float))
            info[c] = {"kind": "numeric", "columns": [c]}
    return pd.concat(parts, axis=1), info, ""


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


def _note_missing_group(*arguments):
    def wrap(fn):
        @functools.wraps(fn)
        def run(*args, **kwargs):
            result = fn(*args, **kwargs)
            if not isinstance(result, dict) or not result.get("ok"):
                return result
            bound = inspect.signature(fn).bind(*args, **kwargs)
            bound.apply_defaults()
            columns = []
            for name in arguments:
                value = bound.arguments.get(name)
                columns += [value] if isinstance(value, str) else list(value or [])
            frame = _read(bound.arguments["path"])
            columns = [c for c in columns if c in frame.columns]
            dropped = int(frame[columns].isna().any(axis=1).sum()) if columns else 0
            result.setdefault("metrics", {})["n_dropped_missing_group"] = dropped
            if dropped:
                result["summary"] = result.get("summary", "") + " %d %s no group and %s left out." % (dropped, "row has" if dropped == 1 else "rows have", "is" if dropped == 1 else "are")
            return result
        return run
    return wrap


@_note_missing_group("group")
def compare_two_groups(path, outcome, group, test="t", paired=False, id_column=None, alternative="two-sided", alpha=0.05, equal_variance=False):
    from scipy import stats
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
        used = frame.dropna(subset=[id_column, group, outcome])
        repeats = int(used.loc[used.duplicated(subset=[id_column, group], keep=False), id_column].nunique())
        full = used.pivot_table(index=id_column, columns=group, values=outcome, aggfunc="mean")
        wide = full.dropna()
        unpaired = len(full) - len(wide)
        if unpaired:
            note += " The test leaves out %d %s that %s a value in only one group." % (unpaired, "subject" if unpaired == 1 else "subjects", "has" if unpaired == 1 else "have")
        if repeats:
            note += " %d %s more than one row in one group. The test uses the mean of these rows." % (repeats, "subject has" if repeats == 1 else "subjects have")
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
        blank = int(frame.loc[frame[group].isin(levels), outcome].isna().sum())
        if blank:
            note += " The test leaves out %d %s that %s no value for %s." % (blank, "row" if blank == 1 else "rows", "has" if blank == 1 else "have", outcome)
        if id_column:
            shared = set(frame.loc[frame[group] == first, id_column]) & set(frame.loc[frame[group] == second, id_column])
            if shared:
                note += " Warning: %d values of %s appear in both groups. The same subjects may be measured twice. An unpaired test then ignores the pairing." % (len(shared), id_column)
        if test == "t":
            res = stats.ttest_ind(x, y, equal_var=equal_variance, alternative=alternative)
            name = "Student t-test (equal variances)" if equal_variance else "Welch t-test (unequal variances)"
            statistic, dof = float(res.statistic), float(res.df)
            ci = res.confidence_interval(_ci_level(alpha))
            import pingouin as pg
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


@_note_missing_group("group")
def anova_oneway(path, outcome, group, variance="equal", posthoc="none", alpha=0.05):
    import pingouin as pg
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
        "metrics": _metrics({"F": f, "df_between": df1, "df_within": df2, "p_value": p, "eta_squared": eta2, "levene_p": levene_p, "n_groups": levels, "n": len(frame.dropna(subset=[outcome, group]))}),
        "data": {"test": name, "alpha": alpha, "significant": bool(p < alpha), "posthoc": posthoc},
        "outputs": _files(*outputs),
    }
    if posthoc != "none":
        if posthoc == "tukey":
            post = pg.pairwise_tukey(frame, dv=outcome, between=group).rename(columns={"p_tukey": "p_adjusted"})
        elif variance != "equal" or posthoc == "games-howell":
            if posthoc != "games-howell":
                result["summary"] += " The ANOVA does not assume equal variances, so the post-hoc test is Games-Howell, not %s." % {"bonf": "bonferroni"}.get(posthoc, posthoc)
            posthoc = "games-howell"
            result["data"]["posthoc"] = posthoc
            post = pg.pairwise_gameshowell(frame, dv=outcome, between=group).rename(columns={"pval": "p_adjusted"})
        else:
            post = pg.pairwise_tests(frame, dv=outcome, between=group, padjust=posthoc)
            post = post.rename(columns={"p_corr": "p_adjusted"})
        post["significant"] = post["p_adjusted"] < alpha
        keep = [c for c in ["A", "B", "mean_A", "mean_B", "diff", "p_adjusted", "significant"] if c in post.columns]
        if "diff" not in post.columns and "mean_A" in post.columns:
            post["diff"] = post["mean_A"] - post["mean_B"]
            keep.insert(4, "diff")
        post = post[keep]
        result["table"] = _table(post, "posthoc")
        result["outputs"] += _files(result["table"]["path"])
        result["summary"] += " Post-hoc: %s, %d pairs, %d significant at alpha %g." % (posthoc, len(post), int(post["significant"].sum()), alpha)
        result["metrics"]["n_pairs_significant"] = int(post["significant"].sum())
    return result


def adjust_pvalues(pvalues, method="holm", alpha=0.05):
    from statsmodels.stats.multitest import multipletests
    p = np.asarray(pvalues, dtype=float)
    valid = ~np.isnan(p)
    adjusted = np.full(len(p), np.nan)
    reject = np.zeros(len(p), dtype=bool)
    if valid.any():
        reject[valid], adjusted[valid], _, _ = multipletests(p[valid], alpha=alpha, method=method)
    frame = pd.DataFrame({"p_raw": p, "p_adjusted": adjusted, "reject": reject})
    skipped = int((~valid).sum())
    note = " %d missing p-values were left out of the count." % skipped if skipped else ""
    return {
        "ok": True,
        "summary": "%s correction of %d p-values at alpha %g: %d rejected.%s" % (method, int(valid.sum()), alpha, int(reject.sum()), note),
        "metrics": _metrics({"n_tests": int(valid.sum()), "n_rejected": int(reject.sum())}),
        "table": _table(frame, "adjusted_p"),
    }


def _coef_table(res, alpha):
    ci = res.conf_int(alpha=alpha)
    frame = pd.DataFrame({"term": res.params.index, "coef": res.params.values, "se": res.bse.values,
                          "p": res.pvalues.values, "ci_lo": ci[0].values, "ci_hi": ci[1].values})
    return frame


def fit_ols(path, formula, alpha=0.05, cov_type="nonrobust", cluster=None):
    import statsmodels.formula.api as smf
    frame = _read(path)
    kwargs = {}
    if cov_type == "cluster":
        if not cluster or cluster not in frame.columns:
            return _fail("cov_type cluster needs cluster, the column that names the unit of replication.")
        frame = frame.dropna(subset=[cluster])
        kwargs = {"groups": frame[cluster]}
    res = smf.ols(formula, frame).fit(cov_type=cov_type, cov_kwds=kwargs)
    table = _coef_table(res, alpha)
    dropped = len(frame) - int(res.nobs)
    metrics = {"n": res.nobs, "r_squared": res.rsquared, "aic": res.aic, "n_dropped": dropped}
    for _, r in table.iterrows():
        key = _key(r["term"])
        metrics["coef_" + key] = r["coef"]
        metrics["se_" + key] = r["se"]
    summary = "OLS %s, n = %d, R squared %.3f, standard errors: %s. %s" % (
        formula, res.nobs, res.rsquared, cov_type, "; ".join("%s %.4g (se %.4g)" % (r.term, r.coef, r.se) for r in table.itertuples()))
    if dropped:
        summary += ". Dropped %d of %d rows with a missing value." % (dropped, len(frame))
    return {"ok": True, "summary": summary, "metrics": _metrics(metrics), "table": _table(table, "ols")}


def fit_mixed_model(path, formula, groups, re_formula="1", reml=True, alpha=0.05):
    import statsmodels.formula.api as smf
    frame = _read(path)
    problem = _need(frame, [groups])
    if problem:
        return _fail(problem)
    spec = None if re_formula in ("1", "", None) else re_formula
    used = [c for c in frame.columns if c != groups and re.search(r"(?<![\w.])%s(?!\w)" % re.escape(str(c)), formula + " " + (spec or ""))] + [groups]
    missing = [c for c in used if frame[c].isna().any()]
    before = len(frame)
    frame = frame.dropna(subset=used)
    dropped = before - len(frame)
    model = smf.mixedlm(formula, frame, groups=frame[groups], re_formula=spec)
    res = model.fit(reml=reml)
    fe = res.fe_params.index
    ci = res.conf_int(alpha=alpha)
    table = pd.DataFrame({"term": fe, "coef": res.fe_params.values, "se": res.bse_fe.values, "p": res.pvalues[fe].values,
                          "ci_lo": ci.loc[fe, 0].values, "ci_hi": ci.loc[fe, 1].values})
    cov = np.atleast_2d(res.cov_re)
    metrics = {"n": res.nobs, "n_groups": len(res.model.group_labels), "n_dropped": dropped, "residual_variance": res.scale,
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
    out = {"ok": True, "summary": summary, "metrics": _metrics(metrics), "table": _table(table, "mixed_model")}
    if dropped:
        out["summary"] += " Dropped %d of %d rows with a missing value in %s." % (dropped, before, ", ".join(missing))
        out["manual_route"] = (
            'df = pandas.read_csv(%r).dropna(subset=%r)  # drops %d rows with a missing value\n'
            'statsmodels.formula.api.mixedlm(%r, df, groups=df[%r]%s).fit(reml=%s).summary()'
            % (path, used, dropped, formula, groups, "" if spec is None else ", re_formula=%r" % spec, bool(reml)))
    return out


def _key(term):
    return re.sub(r"\W+", "_", term).strip("_")


def _event_problem(series, name):
    values = set(series.dropna().unique().tolist())
    if values <= {0, 1, True, False}:
        return None
    shown = ", ".join(map(str, sorted(values, key=str)[:10]))
    return "The event column %s must hold 1 for an event and 0 for a censored subject. Its values are: %s. If the file uses 1 for censored and 2 for an event (as in R), recode it first." % (name, shown)


@_note_missing_group("group")
def kaplan_meier(path, duration, event, group=None, alpha=0.05, time_points=None, subset=None):
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    from lifelines import KaplanMeierFitter
    from lifelines.statistics import logrank_test, multivariate_logrank_test
    frame = _read(path)
    problem = _need(frame, [duration, event] + ([group] if group else []))
    if problem:
        return _fail(problem)
    frame, problem = _subset(frame, subset)
    if problem:
        return _fail(problem)
    problem = _event_problem(frame[event], event)
    if problem:
        return _fail(problem)
    used = [duration, event] + ([group] if group else [])
    before = len(frame)
    frame = frame.dropna(subset=used)
    dropped = before - len(frame)
    if frame.empty:
        return _fail("No row has a value in all of %s." % ", ".join(used))
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
    if subset:
        summary += " Rows: subset %s." % subset
        data["subset"] = subset
    if dropped:
        summary += " Dropped %d rows with a missing value." % dropped
        metrics["n_dropped"] = dropped
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


def fit_cox(path, duration, event, covariates, ties="efron", strata=None, alpha=0.05, categorical=None, reference=None, subset=None):
    from lifelines import CoxPHFitter
    from lifelines.statistics import proportional_hazard_test
    from lifelines.utils import concordance_index
    from statsmodels.duration.hazard_regression import PHReg
    frame = _read(path)
    covs = _names(covariates)
    strata_cols = _names(strata)
    if not covs:
        return _fail("The covariate list is empty. fit_cox needs at least one covariate column, for example the group column whose hazard ratio you want.")
    problem = _need(frame, [duration, event] + covs + strata_cols)
    if problem:
        return _fail(problem)
    frame, problem = _subset(frame, subset)
    if problem:
        return _fail(problem)
    raw = frame[[duration, event] + covs + strata_cols].dropna()
    dropped = len(frame) - len(raw)
    problem = _event_problem(raw[event], event)
    if problem:
        return _fail(problem)
    X, info, problem = _design(raw, covs, categorical, reference)
    if problem:
        return _fail(problem)
    terms = list(X.columns)
    data = pd.concat([raw[[duration, event]], X, raw[strata_cols]], axis=1)
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
        model = PHReg(data[duration].values, X.values, status=data[event].values, ties=ties,
                      strata=raw[strata_cols].astype(str).agg("|".join, axis=1).values if strata_cols else None)
        res = model.fit()
        ci = res.conf_int(alpha=alpha)
        table = pd.DataFrame({"term": terms, "coef": res.params, "hazard_ratio": np.exp(res.params), "se": res.bse, "p": res.pvalues,
                              "hr_ci_lo": np.exp(ci[:, 0]), "hr_ci_hi": np.exp(ci[:, 1])})
        lp = X.values @ res.params
        concordance = float(concordance_index(data[duration], -lp, data[event]))
        loglik = float(res.llf)
        ph_p = {}
    metrics = {"n": len(data), "events": int(data[event].sum()), "concordance": concordance, "log_likelihood": loglik, "n_dropped": dropped}
    term_keys = []
    for _, r in table.iterrows():
        key = _key(r["term"])
        metrics["coef_" + key] = r["coef"]
        metrics["hr_" + key] = r["hazard_ratio"]
        metrics["se_" + key] = r["se"]
        metrics["p_" + key] = r["p"]
        term_keys.append("p_" + key)
    if ph_p:
        metrics["ph_test_min_p"] = min(ph_p.values())
        for k, v in ph_p.items():
            metrics["ph_p_" + _key(k)] = v
    low = [k for k, v in ph_p.items() if v < alpha]
    refs = {c: v["reference"] for c, v in info.items() if v["kind"] == "categorical"}
    summary = "Cox model, ties %s, n = %d, %d events, concordance %.4g. %s." % (
        ties, len(data), metrics["events"], concordance,
        "; ".join("%s HR %.3g (%g%% CI %.3g to %.3g, p = %.3g)" % (r.term, r.hazard_ratio, 100 * (1 - alpha), r.hr_ci_lo, r.hr_ci_hi, r.p) for r in table.itertuples()))
    if refs:
        summary += " Reference levels: %s." % ", ".join("%s = %s" % kv for kv in refs.items())
    if subset:
        summary += " Rows: subset %s." % subset
    if dropped:
        summary += " Dropped %d rows with a missing value." % dropped
    if low:
        summary += " Proportional hazards test p below alpha for: %s." % ", ".join("%s (p = %.3g)" % (k, ph_p[k]) for k in low)
    return {"ok": True, "summary": summary, "metrics": _metrics(metrics),
            "data": {"ties": ties, "alpha": alpha, "ph_test_p": ph_p, "ph_violations": low, "reference_levels": refs, "subset": subset or "all", "p_terms": term_keys},
            "table": _table(table, "cox")}


def _binary_outcome(series, event, name):
    values = series.dropna()
    if event is not None and str(event).strip() != "":
        text = values.map(str)
        target = str(event).strip()
        if target not in set(text):
            return None, "The event value %r is not in the outcome column %s. Its values are: %s." % (target, name, ", ".join(sorted(set(text))[:10]))
        return series.map(lambda v: None if pd.isna(v) else float(str(v) == target)), ""
    levels = set(values.unique().tolist())
    if not levels <= {0, 1, True, False}:
        return None, "The outcome column %s is not coded 0 and 1. Give event, the value that counts as the event. Its values are: %s." % (name, ", ".join(map(str, sorted(levels, key=str)[:10])))
    return series.astype(float), ""


def fit_logistic(path, outcome, covariates, event=None, categorical=None, reference=None, subset=None, alpha=0.05):
    from scipy import stats
    import statsmodels.api as sm
    frame = _read(path)
    covs = _names(covariates)
    if not covs:
        return _fail("The covariate list is empty. fit_logistic needs at least one covariate column, for example the exposure whose odds ratio you want.")
    problem = _need(frame, [outcome] + covs)
    if problem:
        return _fail(problem)
    frame, problem = _subset(frame, subset)
    if problem:
        return _fail(problem)
    raw = frame[[outcome] + covs].dropna()
    dropped = len(frame) - len(raw)
    y, problem = _binary_outcome(raw[outcome], event, outcome)
    if problem:
        return _fail(problem)
    X, info, problem = _design(raw, covs, categorical, reference)
    if problem:
        return _fail(problem)
    exog = sm.add_constant(X, has_constant="add")
    try:
        res = sm.Logit(y, exog).fit(disp=0, maxiter=200)
    except Exception as e:
        return _fail("The logistic model of %s on %s did not fit: %s. A covariate level with all events or no events (separation) causes this. Check the cross-table of the outcome with each categorical covariate." % (outcome, ", ".join(covs), e))
    ci = res.conf_int(alpha=alpha)
    table = pd.DataFrame({"term": res.params.index, "coef": res.params.values, "se": res.bse.values, "z": res.tvalues.values, "p": res.pvalues.values,
                          "odds_ratio": np.exp(res.params.values), "or_ci_lo": np.exp(ci[0].values), "or_ci_hi": np.exp(ci[1].values)})
    events = int(y.sum())
    k = exog.shape[1] - 1
    metrics = {"n": int(res.nobs), "events": events, "non_events": int(res.nobs) - events, "n_dropped": dropped, "log_likelihood": res.llf,
               "null_log_likelihood": res.llnull, "lr_chi2": res.llr, "lr_df": res.df_model, "lr_p": res.llr_pvalue, "aic": res.aic,
               "pseudo_r2_mcfadden": res.prsquared, "events_per_parameter": min(events, int(res.nobs) - events) / k,
               "converged": int(bool(res.mle_retvals.get("converged", True)))}
    for r in table.itertuples():
        key = _key(r.term)
        metrics["coef_" + key] = r.coef
        metrics["se_" + key] = r.se
        metrics["p_" + key] = r.p
        metrics["or_" + key] = r.odds_ratio
        metrics["or_lo_" + key] = r.or_ci_lo
        metrics["or_hi_" + key] = r.or_ci_hi
    term_tests = []
    for c in covs:
        keep = ["const"] + [col for col in X.columns if col not in info[c]["columns"]]
        sub = sm.Logit(y, exog[keep]).fit(disp=0, maxiter=200)
        chi2 = 2 * (res.llf - sub.llf)
        df = len(info[c]["columns"])
        p = float(stats.chi2.sf(chi2, df))
        term_tests.append({"covariate": c, "lr_chi2": float(chi2), "df": df, "p": p})
        metrics["lrt_p_" + _key(c)] = p
        metrics["lrt_chi2_" + _key(c)] = chi2
    warnings_text = []
    if metrics["events_per_parameter"] < 10:
        warnings_text.append("Warning: %.1f events (of the rarer outcome) per model parameter, below 10. The odds ratios can be biased and unstable." % metrics["events_per_parameter"])
    big = [r.term for r in table.itertuples() if r.term != "const" and (abs(r.coef) > 10 or r.se > 50)]
    if big or not metrics["converged"]:
        warnings_text.append("Warning: the fit did not converge or has very large coefficients (%s). This is a sign of separation." % ", ".join(big))
    refs = {c: v["reference"] for c, v in info.items() if v["kind"] == "categorical"}
    level = 100 * (1 - alpha)
    rows = "; ".join("%s OR %.4g (%g%% CI %.4g to %.4g, p = %.3g)" % (r.term, r.odds_ratio, level, r.or_ci_lo, r.or_ci_hi, r.p) for r in table.itertuples() if r.term != "const")
    multi = [t for t in term_tests if t["df"] > 1]
    others = sorted(set(raw[outcome].map(str)) - {str(event)}) if event is not None else []
    against = " against %s" % (", ".join(others) if len(others) <= 6 else "%d other values" % len(others)) if event is not None else ""
    summary = "Logistic regression of %s%s%s, n = %d, %d events. %s. Likelihood-ratio test of the model: chi-square %.4g on %d df, p = %.4g. Wald confidence intervals." % (
        outcome, "" if event is None else " = %s" % event, against, res.nobs, events, rows, res.llr, res.df_model, res.llr_pvalue)
    if multi:
        summary += " Likelihood-ratio test of each categorical covariate: %s." % "; ".join("%s chi-square %.4g on %d df, p = %.4g" % (t["covariate"], t["lr_chi2"], t["df"], t["p"]) for t in multi)
    if refs:
        summary += " Reference levels: %s." % ", ".join("%s = %s" % kv for kv in refs.items())
    if subset:
        summary += " Rows: subset %s." % subset
    if dropped:
        summary += " Dropped %d rows with a missing value." % dropped
    if warnings_text:
        summary += " " + " ".join(warnings_text)
    return {"ok": True, "summary": summary, "metrics": _metrics(metrics),
            "data": {"event": "1" if event is None else str(event), "alpha": alpha, "ci_method": "Wald", "reference_levels": refs,
                     "term_tests": term_tests, "subset": subset or "all", "warnings": warnings_text},
            "table": _table(table, "logistic", 30)}


def _contingency(path, row, column, counts, subset):
    if counts is not None:
        try:
            table = np.asarray(counts, dtype=float)
        except (TypeError, ValueError):
            return None, None, None, None, "counts must be a table of whole numbers, one list for each row, such as [[12, 5], [3, 9]]."
        if table.ndim != 2 or min(table.shape) < 2:
            return None, None, None, None, "counts must have 2 or more rows and 2 or more columns. It has shape %s." % (table.shape,)
        if (table < 0).any() or (table != np.round(table)).any():
            return None, None, None, None, "counts must hold whole numbers of 0 or more."
        return table.astype(int), ["row%d" % (i + 1) for i in range(table.shape[0])], ["col%d" % (j + 1) for j in range(table.shape[1])], "", 0
    if not path or not row or not column:
        return None, None, None, None, "Give counts, or give path with row and column, the two categorical columns of the CSV file."
    frame = _read(path)
    problem = _need(frame, [row, column])
    if problem:
        return None, None, None, None, problem
    frame, problem = _subset(frame, subset)
    if problem:
        return None, None, None, None, problem
    dropped = int(frame[[row, column]].isna().any(axis=1).sum())
    tab = pd.crosstab(frame[row], frame[column])
    if min(tab.shape) < 2:
        return None, None, None, None, "The cross-table of %s by %s has shape %s. Each column needs 2 or more values." % (row, column, tab.shape)
    return tab.values.astype(int), [str(v) for v in tab.index], [str(v) for v in tab.columns], "", dropped


def _missing_note(n, columns):
    if not n:
        return ""
    return " Dropped %d %s with a missing value in %s." % (n, "row" if n == 1 else "rows", ", ".join(map(str, columns)))


def _table_frame(table, rows, cols, label="row"):
    frame = pd.DataFrame(table, columns=cols)
    frame.insert(0, label, rows)
    return frame


def chi_square_test(path=None, row=None, column=None, counts=None, correction=None, subset=None, alpha=0.05):
    from scipy import stats
    table, rows, cols, problem, dropped = _contingency(path, row, column, counts, subset)
    if problem:
        return _fail(problem)
    is_2x2 = table.shape == (2, 2)
    if is_2x2 and correction is None:
        return _fail("A 2x2 table needs correction: true for the Yates continuity correction or false for none. The decision chi_square_correction sets it.")
    use = bool(correction) and is_2x2
    chi2, p, dof, expected = stats.chi2_contingency(table, correction=use)
    n = int(table.sum())
    below = int((expected < 5).sum())
    cells = expected.size
    chi2_plain = stats.chi2_contingency(table, correction=False)[0] if use else chi2
    cramers_v = float(np.sqrt(chi2_plain / (n * (min(table.shape) - 1))))
    name = "Pearson chi-square test" + (" with Yates continuity correction" if use else "")
    summary = "%s, %d x %d table, n = %d: chi-square %.4g on %d df, p = %.4g (alpha %g). Cramer's V %.3g." % (name, table.shape[0], table.shape[1], n, chi2, dof, p, alpha, cramers_v)
    warning = ""
    summary += _missing_note(dropped, [row, column])
    if below:
        warning = "Warning: %d of %d cells (%.0f%%) have an expected count below 5 (smallest %.3g). The chi-square p-value can be wrong. Use fisher_exact." % (below, cells, 100.0 * below / cells, expected.min())
        summary += " " + warning
    out_tab = _table_frame(table, rows, cols, row or "row")
    exp_tab = _table_frame(np.round(expected, 6), rows, cols, row or "row")
    exp_path = _table(exp_tab, "expected_counts")["path"]
    return {"ok": True, "summary": summary,
            "metrics": _metrics({"chi2": chi2, "df": dof, "p_value": p, "n": n, "cramers_v": cramers_v, "min_expected": float(expected.min()),
                                 "n_cells_expected_below_5": below, "fraction_cells_expected_below_5": below / cells, "n_dropped": dropped}),
            "data": {"test": name, "correction": use, "alpha": alpha, "significant": bool(p < alpha), "warning": warning,
                     "expected": [[float(v) for v in r] for r in expected], "rows": rows, "columns": cols},
            "table": _table(out_tab, "observed_counts"), "outputs": _files(exp_path)}


def _fisher_rxc_exact(table, cap):
    from math import exp, lgamma
    t = np.asarray(table, int)
    if t.shape[0] > t.shape[1]:
        t = t.T
    r = t.sum(1).tolist()
    c = t.sum(0).tolist()
    n = int(t.sum())
    lf = [lgamma(i + 1) for i in range(n + 1)]
    const = sum(lf[x] for x in r) + sum(lf[x] for x in c) - lf[n]
    obs = sum(lf[x] for x in t.ravel())
    nr = len(r)
    state = {"p": 0.0, "visits": 0}

    def compositions(k, need, rem, acc, s, out):
        if k == nr - 1:
            if need <= rem[k]:
                out.append((acc + [need], s + lf[need]))
            return
        for x in range(max(0, need - sum(rem[k + 1:])), min(need, rem[k]) + 1):
            compositions(k + 1, need - x, rem, acc + [x], s + lf[x], out)

    def walk(j, rem, s):
        if j == len(c) - 1:
            state["visits"] += 1
            if state["visits"] > cap:
                raise OverflowError("more than %d tables have the margins of this table" % cap)
            total = s + sum(lf[x] for x in rem)
            if total >= obs - 1e-7 * max(1.0, abs(obs)):
                state["p"] += exp(const - total)
            return
        out = []
        compositions(0, c[j], rem, [], 0.0, out)
        for vec, sv in out:
            walk(j + 1, [a - b for a, b in zip(rem, vec)], s + sv)

    walk(0, r, 0.0)
    return min(1.0, state["p"])


def fisher_exact(path=None, row=None, column=None, counts=None, alternative="two-sided", subset=None, alpha=0.05, seed=1):
    from scipy import stats
    from scipy.stats.contingency import odds_ratio
    table, rows, cols, problem, dropped = _contingency(path, row, column, counts, subset)
    if problem:
        return _fail(problem)
    n = int(table.sum())
    metrics = {"n": n}
    data = {"alternative": alternative, "alpha": alpha, "rows": rows, "columns": cols}
    if table.shape == (2, 2):
        res = stats.fisher_exact(table, alternative=alternative)
        p = float(res.pvalue)
        cond = odds_ratio(table, kind="conditional")
        ci = cond.confidence_interval(confidence_level=1 - alpha, alternative=alternative)
        a, b, c_, d = table.ravel()
        sample_or = float(a * d / (b * c_)) if b * c_ else None
        metrics.update({"p_value": p, "odds_ratio": float(cond.statistic), "or_ci_lo": float(ci.low), "or_ci_hi": float(ci.high), "sample_odds_ratio": sample_or})
        data.update({"method": "exact (hypergeometric)", "odds_ratio_kind": "conditional maximum likelihood estimate, as in R fisher.test"})
        side = {"two-sided": "two-sided", "greater": "one-sided (odds ratio greater than 1)", "less": "one-sided (odds ratio less than 1)"}[alternative]
        summary = "Fisher exact test, 2x2 table, n = %d, %s: p = %.4g (alpha %g). Conditional odds ratio %.4g (%g%% CI %.4g to %.4g). The odds ratio compares the odds of column %s in row %s with row %s." % (
            n, side, p, alpha, cond.statistic, 100 * (1 - alpha), ci.low, ci.high, cols[0], rows[0], rows[1])
    else:
        if alternative != "two-sided":
            return _fail("A one-sided test needs a 2x2 table. This table is %d x %d. Use alternative two-sided." % table.shape)
        try:
            p = _fisher_rxc_exact(table, 500000)
            method = "exact (all tables with the same margins)"
        except OverflowError:
            mc = stats.fisher_exact(table, method=stats.MonteCarloMethod(n_resamples=100000, rng=np.random.default_rng(int(seed))))
            p = float(mc.pvalue)
            method = "Monte Carlo, 100000 random tables, seed %d (more than 500000 tables have these margins)" % int(seed)
        metrics["p_value"] = p
        data["method"] = method
        summary = "Fisher exact test, %d x %d table, n = %d, two-sided: p = %.4g (alpha %g). Method: %s." % (table.shape[0], table.shape[1], n, p, alpha, method)
    data["significant"] = bool(metrics["p_value"] < alpha)
    metrics["n_dropped"] = dropped
    summary += _missing_note(dropped, [row, column])
    return {"ok": True, "summary": summary, "metrics": _metrics(metrics), "data": data, "table": _table(_table_frame(table, rows, cols, row or "row"), "fisher_counts")}


def mcnemar_test(path=None, first=None, second=None, counts=None, method=None, subset=None, alpha=0.05):
    from scipy import stats
    from statsmodels.stats.contingency_tables import mcnemar
    if method not in ("exact", "chi-square", "chi-square-corrected"):
        return _fail("method must be exact, chi-square or chi-square-corrected. The decision mcnemar_method sets it.")
    if counts is not None:
        table, rows, cols, problem, dropped = _contingency(None, None, None, counts, None)
        if problem:
            return _fail(problem)
        if table.shape != (2, 2):
            return _fail("McNemar's test needs a 2x2 table of pairs. counts has shape %s." % (table.shape,))
    else:
        if not path or not first or not second:
            return _fail("Give counts, or give path with first and second, the two binary columns measured on the same subject (one row for each subject).")
        frame = _read(path)
        problem = _need(frame, [first, second])
        if problem:
            return _fail(problem)
        frame, problem = _subset(frame, subset)
        if problem:
            return _fail(problem)
        dropped = int(frame[[first, second]].isna().any(axis=1).sum())
        label = lambda v: str(int(v)) if isinstance(v, (float, np.floating)) and float(v).is_integer() else str(v)
        frame = frame[[first, second]].dropna().apply(lambda s: s.map(label))
        levels = sorted(set(frame[first]) | set(frame[second]))
        if len(levels) != 2:
            return _fail("The columns %s and %s must share exactly 2 values. They have: %s." % (first, second, ", ".join(levels)))
        tab = pd.crosstab(frame[first], frame[second]).reindex(index=levels, columns=levels, fill_value=0)
        table, rows, cols = tab.values.astype(int), levels, levels
    exact = method == "exact"
    res = mcnemar(table, exact=exact, correction=method == "chi-square-corrected")
    b, c = int(table[0, 1]), int(table[1, 0])
    n = int(table.sum())
    p1 = (table[0, 0] + table[0, 1]) / n
    p2 = (table[0, 0] + table[1, 0]) / n
    diff = float(p1 - p2)
    se = float(np.sqrt((b + c) - (b - c) ** 2 / n) / n)
    zc = stats.norm.ppf(1 - alpha / 2)
    p = float(res.pvalue)
    name = {"exact": "McNemar exact test (binomial on the discordant pairs)", "chi-square": "McNemar chi-square test",
            "chi-square-corrected": "McNemar chi-square test with continuity correction"}[method]
    first_name = first or "first"
    second_name = second or "second"
    summary = "%s, %d pairs, discordant pairs %d and %d: %sp = %.4g (alpha %g). Proportion with %s: %.4g in %s, %.4g in %s, difference %.4g (%g%% Wald CI %.4g to %.4g)." % (
        name, n, b, c, "" if exact else "statistic %.4g, " % res.statistic, p, alpha, rows[0], p1, first_name, p2, second_name, diff,
        100 * (1 - alpha), diff - zc * se, diff + zc * se)
    summary += _missing_note(dropped, [first, second])
    if b + c < 25 and not exact:
        summary += " Warning: only %d discordant pairs. The chi-square approximation is poor below 25. Use the exact method." % (b + c)
    metrics = {"n_pairs": n, "discordant_first_only": b, "discordant_second_only": c, "p_value": p, "proportion_first": p1, "proportion_second": p2,
               "difference": diff, "diff_ci_lo": diff - zc * se, "diff_ci_hi": diff + zc * se, "n_dropped": dropped}
    if not exact:
        metrics["statistic"] = float(res.statistic)
    return {"ok": True, "summary": summary, "metrics": _metrics(metrics),
            "data": {"test": name, "alpha": alpha, "significant": bool(p < alpha), "level": rows[0]},
            "table": _table(_table_frame(table, ["%s=%s" % (first_name, v) for v in rows], ["%s=%s" % (second_name, v) for v in cols], "pairs"), "mcnemar_pairs")}


for _name in ("inspect_table", "compare_two_groups", "anova_oneway", "fit_ols", "fit_mixed_model", "kaplan_meier", "fit_cox", "fit_logistic", "chi_square_test", "fisher_exact", "mcnemar_test"):
    globals()[_name] = _note_placeholders(globals()[_name])
