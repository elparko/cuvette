import csv
import sys
from pathlib import Path

import numpy as np
from scipy import stats
from statsmodels.stats.contingency_tables import StratifiedTable
from statsmodels.stats.proportion import confint_proportions_2indep

data = Path(sys.argv[1])


def two_by_two(x1, n1, x0, n0, label):
    print(f"== {label}: {x1}/{n1} against {x0}/{n0}")
    d = x1 / n1 - x0 / n0
    print(f"risk difference {d:.6f}")
    for name, method in (("wald", "wald"), ("newcombe", "newcomb"), ("miettinen_nurminen", "score")):
        lo, hi = confint_proportions_2indep(x1, n1, x0, n0, method=method, compare="diff", alpha=0.05)
        print(f"rd {name} {lo:.6f} {hi:.6f}")
    rr = (x1 / n1) / (x0 / n0)
    se = np.sqrt(1 / x1 - 1 / n1 + 1 / x0 - 1 / n0)
    print(f"rr {rr:.6f} {np.exp(np.log(rr) - 1.959964 * se):.6f} {np.exp(np.log(rr) + 1.959964 * se):.6f}")
    orr = (x1 * (n0 - x0)) / ((n1 - x1) * x0)
    se = np.sqrt(1 / x1 + 1 / (n1 - x1) + 1 / x0 + 1 / (n0 - x0))
    print(f"or {orr:.6f} {np.exp(np.log(orr) - 1.959964 * se):.6f} {np.exp(np.log(orr) + 1.959964 * se):.6f}")
    tab = np.array([[x1, n1 - x1], [x0, n0 - x0]])
    print(f"chi2 uncorrected p {stats.chi2_contingency(tab, correction=False)[1]:.6f}")
    print(f"chi2 continuity p {stats.chi2_contingency(tab, correction=True)[1]:.6f}")
    print(f"fisher p {stats.fisher_exact(tab)[1]:.6f}")


two_by_two(71, 152, 84, 150, "SHOCK 30-day deaths")
two_by_two(30, 200, 36, 200, "made-up non-inferiority counts")
two_by_two(56, 70, 48, 80, "made-up counts 2")

rows = list(csv.DictReader(open(data / "rabbits_penicillin.csv")))
levels = sorted({r["level"] for r in rows})
tables = []
a_l, n1_l, c_l, n0_l = [], [], [], []
for lev in levels:
    sub = [r for r in rows if r["level"] == lev]
    a = sum(int(r["cured"]) for r in sub if r["delay"] == "None")
    n1 = sum(1 for r in sub if r["delay"] == "None")
    c = sum(int(r["cured"]) for r in sub if r["delay"] == "1.5h")
    n0 = sum(1 for r in sub if r["delay"] == "1.5h")
    a_l.append(a); n1_l.append(n1); c_l.append(c); n0_l.append(n0)
    tables.append(np.array([[a, n1 - a], [c, n0 - c]]))
print("== Rabbits (penicillin), strata", levels)
print("a", a_l, "n1", n1_l, "c", c_l, "n0", n0_l)
st = StratifiedTable(tables)
print(f"pooled OR {st.oddsratio_pooled:.6f} CI {st.oddsratio_pooled_confint()[0]:.6f} {st.oddsratio_pooled_confint()[1]:.6f}")
print(f"pooled RR {st.riskratio_pooled:.6f}")
r = st.test_null_odds(correction=False)
print(f"CMH no correction {r.statistic:.6f} p {r.pvalue:.6f}")
r = st.test_null_odds(correction=True)
print(f"CMH correction {r.statistic:.6f} p {r.pvalue:.6f}")
ok = [t for t in tables if 0 < t[0, 0] + t[1, 0] < t.sum()]
st2 = StratifiedTable(ok)
print(f"strata with events in both outcome classes: {len(ok)} of {len(tables)}; pooled OR of these {st2.oddsratio_pooled:.6f}")
r = st2.test_equal_odds(adjust=False)
print(f"Breslow-Day {r.statistic:.6f} p {r.pvalue:.6f}")
r = st2.test_equal_odds(adjust=True)
print(f"Tarone {r.statistic:.6f} p {r.pvalue:.6f}")

a = np.array(a_l, float); n1 = np.array(n1_l, float); c = np.array(c_l, float); n0 = np.array(n0_l, float)
n = n1 + n0
w = n1 * n0 / n
rd = np.sum(w * (a / n1 - c / n0)) / np.sum(w)
b = n1 - a; dd = n0 - c
var = np.sum((a * b * n0**3 + c * dd * n1**3) / (n1 * n0 * n**2)) / np.sum(w) ** 2
se = np.sqrt(var)
print(f"MH risk difference {rd:.6f} se {se:.6f} CI {rd - 1.959964 * se:.6f} {rd + 1.959964 * se:.6f}")

rr_num = np.sum(a * n0 / n)
rr_den = np.sum(c * n1 / n)
rr_mh = rr_num / rr_den
var_rr = np.sum((n1 * n0 * (a + c) - a * c * n) / n**2) / (rr_num * rr_den)
print(f"MH risk ratio {rr_mh:.6f} CI {np.exp(np.log(rr_mh) - 1.959964 * np.sqrt(var_rr)):.6f} {np.exp(np.log(rr_mh) + 1.959964 * np.sqrt(var_rr)):.6f}")
