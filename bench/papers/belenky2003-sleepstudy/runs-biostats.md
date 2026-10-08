# Runs with the biostats adapter (belenky2003-sleepstudy)

Date: 2026-10-08. Adapter: `catalog/biostats` 0.1.0 (draft). Model: `ollama:qwen3:8b`. Program: statsmodels 0.15.0.

Command (`<scratch>` is `/Volumes/T7/guided-analysis/tools/biostats-scratch/sstudy1`):

```
GA_HOME=<scratch>/home node bin/ga.js -p "$(cat <scratch>/prompt.txt)" --adapter catalog/biostats \
  --model ollama:qwen3:8b --answers <scratch>/answers.json --allow all --output json
```

The prompt is the plain request of `prompt.md` with the path and the column names. It says that people differ in start and slope.
Answers file (the scientist): unit of replication repeated measures, alpha 0.05, formula `Reaction ~ Days`, random effects `~Days`, REML true.

## Run 1 (session `20261008-122008-d080`)

| Quantity | Expected | Run 1 | Pass |
| --- | --- | --- | --- |
| Days slope | 10.467 (0.01) | 10.47 | yes |
| SE of Days, random slope | 1.546 (0.01) | 1.55 | yes |
| 95% CI of Days | 7.44 to 13.50 (computed) | 7.44 to 13.50 | yes |
| intercept variance | 612.10 (0.5) | 612.1 | yes |
| slope variance | 35.07 (0.1) | 35.07 | yes |
| groups, method | 18, REML | 18, REML | yes |
| residual variance | 654.94 (0.5) | not in the answer text | not stated |

Verdict: PASS. The model read the skill `model-repeated-measures`, called inspect_table, then fit_mixed_model. Its first call used `re_formula: "1"`. The harness replaced the value with `~Days` from the answers file. The model then called fit_mixed_model again with `~Days`.
The answer text lists the settings from the decision record. The referee gave two info findings about the confidence interval, which the tool result holds.
The OLS trap (standard error 1.238) was not tested. The prompt names the subject effect, so the model did not use fit_ols. Only one run was made.
