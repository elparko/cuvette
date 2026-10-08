# Triage: andreasson2019-endotoxin-health

Entry numbers (eNN) are ids in the log.jsonl of the session folder.
Classes: a = tool or adapter fault, b = harness fault, c = benchmark spec fault, d = model fault.

- qwen3:8b: `20261008-180057-ae49`, computed 10/10, reported 7/7

No item failed.

Other findings:

- e85 to e102: the referee model gave 18 findings with severity error. They say that the coefficients, standard errors and p-values have no source. The numbers come from fit_mixed_model (e56), and the claim check labels them measured. The referee findings are wrong. Harness fault (referee), not fixed.
- e33: the first Mann-Whitney call used the wrong rows (p 5.8e-05). The second call (e40) used endotoxin_exp2_general.csv and gave p 0.004163.
- e62, e67: calculate failed. The model used the name of a value as a function ("unknown function p"). Model fault.
- e84: the answer has the unsourced numbers 1.54 (a p-value in the form 1.54 x 10^-8) and -1.743 (a confidence bound for general health). Model fault.
