# Triage: andreasson2019-endotoxin-health

Entry numbers (eNN) are ids in the log.jsonl of the session folder.
Classes: a = tool or adapter fault, b = harness fault, c = benchmark spec fault, d = model fault.

- qwen3:8b: `20261008-180057-ae49`, computed 10/10, reported 7/7

No item failed.

Other findings:

- e85 to e102: the referee (qwen3:8b, the same model) gave 18 findings with severity error. They say that the coefficients, standard errors, p-values and confidence intervals have no source. Two causes:
  - Harness (b): the referee log cut the step summary and the metrics at 300 characters and left out the table rows. The p-values and confidence intervals of fit_mixed_model (e56) were only in the table rows. Fixed: the referee log now has the table rows (up to 20), the output file names, and longer summaries and metrics. The referee instructions explain that a claim labeled "measured nX" has a source.
  - Model (d): the coefficient findings (6.238, -1.786, -0.906 and others) are wrong even with the old log. These numbers were in the visible part of the summary of e56, and the claims list labeled them "measured n5". qwen3:8b ignored this.
  - Saved Claude runs (28 papers, 2026-10-08) have 8 referee findings of this kind. Most are correct. Two had the harness cause: a table value (schramm2012) and an output file name (gramfort2013) that the referee log did not show.
- e84: the claim check labels "1.54" in "1.54 × 10⁻⁸" as unsourced. The table of e56 has p = 1.54353e-8. The claim check does not read superscript exponents (10⁻⁸). Harness fault (b), not fixed.
- e33: the first Mann-Whitney call used the wrong rows (p 5.8e-05). The second call (e40) used endotoxin_exp2_general.csv and gave p 0.004163.
- e62, e67: calculate failed. The model used the name of a value as a function ("unknown function p"). Model fault.
- e84: -1.743 (a confidence bound for general health) has no source. Model fault.
