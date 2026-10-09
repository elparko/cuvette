import sys

import numpy as np
import pandas as pd
import statsmodels.api as sm

data = sys.argv[1]
otu = pd.read_csv(f"{data}/otutable.csv")
md = pd.read_csv(f"{data}/metadata.csv").set_index("id")

print("linear model like MaAsLin 2: vaginal births with complete data, 5 percent prevalence filter first, then total sum scaling over the kept features,")
print("log base 2 with half the smallest non-zero value of the feature, continuous columns as z-scores, GWG with adequate as reference")
nat = md[md["birth_type"] == "natural"].copy()
print(f"vaginal births {len(nat)}")
for col in ["gestational_age", "age_mother", "pre_pregnancy_BMI"]:
    nat[col] = pd.to_numeric(nat[col], errors="coerce")
nat["GWG"] = nat["GWG"].replace("", np.nan)
nat = nat.dropna(subset=["gestational_age", "GWG", "age_mother", "pre_pregnancy_BMI"])
print(f"samples with complete data {len(nat)}")
sub = otu.set_index("OTU")[list(nat.index)].T
keep = (sub > 0).sum(axis=0) >= 0.05 * len(nat)
kept = sub.loc[:, keep]
rel = kept.div(kept.sum(axis=1), axis=0)
print(f"features after the prevalence filter {rel.shape[1]}")
kleb = "RS_GCF_002269255.1"
print(f"{kleb} present in {int((sub[kleb] > 0).sum())} samples")


def z(v):
    return ((v - v.mean()) / v.std(ddof=1)).to_numpy()


design = pd.DataFrame(
    {
        "gestational_age": z(nat["gestational_age"]),
        "GWG_excess": (nat["GWG"] == "excess").astype(float).to_numpy(),
        "GWG_low": (nat["GWG"] == "low").astype(float).to_numpy(),
        "age_mother": z(nat["age_mother"]),
        "pre_pregnancy_BMI": z(nat["pre_pregnancy_BMI"]),
    }
)
X = sm.add_constant(design.to_numpy())
names = list(design.columns)
rows = []
for feat in rel.columns:
    y = rel[feat].to_numpy()
    y = np.log2(np.where(y == 0, y[y > 0].min() / 2, y))
    fit = sm.OLS(y, X).fit()
    for i, nm in enumerate(names):
        rows.append((feat, nm, fit.params[i + 1], fit.pvalues[i + 1]))
res = pd.DataFrame(rows, columns=["feature", "term", "coef", "p"])
m = len(res)
order = np.argsort(res["p"].to_numpy())
q = res["p"].to_numpy()[order] * m / (np.arange(m) + 1)
q = np.minimum(np.minimum.accumulate(q[::-1])[::-1], 1)
qs = np.empty(m)
qs[order] = q
res["q"] = qs
print(f"tests {m}, results with q <= 0.05: {int((res['q'] <= 0.05).sum())}")
top = res.sort_values("p").iloc[0]
print(f"smallest p: {top['feature']} {top['term']} coef {top['coef']:.6f} p {top['p']:.6g} q {top['q']:.6f}")
