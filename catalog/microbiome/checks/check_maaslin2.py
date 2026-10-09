import sys

import numpy as np
import pandas as pd
import statsmodels.api as sm
import statsmodels.formula.api as smf

data = sys.argv[1]
x = pd.read_csv(f"{data}/hmp2_taxonomy.tsv", sep="\t", index_col=0)
meta = pd.read_csv(f"{data}/hmp2_metadata.tsv", sep="\t", index_col=0)
meta = meta.loc[x.index]
complete = meta[["diagnosis", "antibiotics", "age", "subject"]].notna().all(axis=1)
x = x[complete]
meta = meta[complete]

rel = x.div(x.sum(axis=1), axis=0)
feature = "Faecalibacterium prausnitzii"
y = rel[feature].to_numpy()
pseudo = y[y > 0].min() / 2
y_log = np.log2(np.where(y == 0, pseudo, y))

df = pd.DataFrame(
    {
        "y": y_log,
        "diagnosis": pd.Categorical(meta["diagnosis"].to_numpy(), categories=["nonIBD", "CD", "UC"]),
        "antibiotics": pd.Categorical(meta["antibiotics"].to_numpy(), categories=["No", "Yes"]),
        "age": ((meta["age"] - meta["age"].mean()) / meta["age"].std(ddof=1)).to_numpy(),
        "subject": meta["subject"].to_numpy(),
        "site": meta["site"].to_numpy(),
    }
)

print("samples with missing values are removed first, as the cuvette tool does")
print("linear model, TSS, log base 2 with half of the smallest non-zero value as pseudo-count, age as z-score")
print(f"feature {feature}, n {len(df)}")
fit = smf.ols("y ~ diagnosis + antibiotics + age", data=df).fit()
for name in ["diagnosis[T.CD]", "diagnosis[T.UC]", "antibiotics[T.Yes]", "age"]:
    print(f"{name} coef {fit.params[name]:.6f} stderr {fit.bse[name]:.6f} p {fit.pvalues[name]:.4g}")

print("mixed model with a random intercept for the subject (REML)")
mfit = smf.mixedlm("y ~ diagnosis + antibiotics + age", data=df, groups=df["subject"], missing="drop").fit(reml=True)
for name in ["diagnosis[T.CD]", "diagnosis[T.UC]", "antibiotics[T.Yes]", "age"]:
    print(f"{name} coef {mfit.params[name]:.6f} stderr {mfit.bse[name]:.6f}")
