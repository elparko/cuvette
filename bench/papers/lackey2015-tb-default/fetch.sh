#!/usr/bin/env bash
set -euo pipefail
D="${CUVETTE_DATA:-${GA_DATA:-/Volumes/T7/guided-analysis/data}}/lackey2015-tb-default"
mkdir -p "$D"
cd "$D"
curl -fsSL -o tb_raw.xls "https://zenodo.org/api/records/4992464/files/Lima%20TB%20Treatment%20Default%20Data.xls/content"
echo "c9977730439b4ca7a8477747336f7f6671c8e50a9f3643bffde5d8a777a66339  tb_raw.xls" | shasum -a 256 -c -

# Preprocessing, as in Fig 1 of the paper:
# 1. Drop the 15 patients with no treatment outcome (the file holds 1293 of the 1294 enrolled; the patient whose
#    treatment the doctor stopped is not in it).
# 2. Drop the 45 patients with a missing value in a variable of the original multivariable model (the 12 variables
#    with a bivariate p below 0.2: age, sex, poverty, prison, education, smoking, alcohol, drugs, rehab, MDR-TB, BMI,
#    HIV). 1233 patients remain, 127 of them defaulted.
# 3. Rename the columns to short names and add default (1 for the outcome Default, 0 for every other outcome).
uv run -q --no-project --with pandas==2.3.3 --with xlrd==2.0.1 python -I - "$D" <<'EOF'
import sys
import pandas as pd

d = sys.argv[1]
x = pd.read_excel(f"{d}/tb_raw.xls")
names = {"ID": "id", "Age": "age_group", "Sex": "sex", "Marital Status": "marital_status", "Poverty Level": "poverty",
         "Prison Hx": "prison", "Completed Secondary Education": "secondary_education", "Hx of Tobacco Use": "smoking",
         "Alcohol Use at Least Once Per Week": "alcohol_weekly", "History of Drug Use": "drug_use", "Hx of Rehab": "rehab",
         "MDR-TB": "mdr_tb", "Body Mass Index": "bmi", "Hx Chronic Disease": "chronic_disease", "HIV Status": "hiv_status",
         "Hx Diabetes Melitus": "diabetes", "Treatment Outcome": "outcome", "Time to Default (Days)": "days_to_default"}
x = x.rename(columns=names)
x = x[x["outcome"].notna()]
model = ["age_group", "sex", "poverty", "prison", "secondary_education", "smoking", "alcohol_weekly", "drug_use", "rehab", "mdr_tb", "bmi", "hiv_status"]
x = x.dropna(subset=model)
x.insert(x.columns.get_loc("outcome") + 1, "default", (x["outcome"] == "Default").astype(int))
x.to_csv(f"{d}/tb_default.csv", index=False)
print(len(x), "patients,", int(x["default"].sum()), "defaulted")
EOF
echo "7a0565b85355d2cddbdd217f055639538cf35be4daad72a3b9d53c3bcfe20000  tb_default.csv" | shasum -a 256 -c -
