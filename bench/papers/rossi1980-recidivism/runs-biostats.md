# Runs with the biostats adapter (rossi1980-recidivism)

Date: 2026-10-08. Adapter: `catalog/biostats` 0.1.0 (draft). Model: `ollama:qwen3:8b`. Program: lifelines 0.30.3, statsmodels 0.15.0.

Command (`<scratch>` is `/Volumes/T7/guided-analysis/tools/biostats-scratch/rossi1`):

```
GA_HOME=<scratch>/home node bin/ga.js -p "$(cat <scratch>/prompt.txt)" --adapter catalog/biostats \
  --model ollama:qwen3:8b --answers <scratch>/answers.json --allow all --output json
```

The prompt is the plain request of `prompt.md` with the path and the column names. It asks for the effect size, the concordance and the assumption check.
Answers file (the scientist): unit of replication subjects, alpha 0.05, covariates fin, age, race, wexp, mar, paro, prio, ties efron, no strata.

## Run 1 (session `20261008-121049-36fa`)

| Quantity | Expected | Run 1 | Pass |
| --- | --- | --- | --- |
| hazard ratio fin | 0.684 (0.002) | 0.684 | yes |
| 95% CI of hazard ratio fin | 0.470 to 0.996 (computed) | 0.470 to 0.996 | yes |
| p for fin | 0.0474 (0.001) | 0.0474 | yes |
| hazard ratio age, p | 0.944, 0.0090 | 0.944, 0.00903 | yes |
| concordance | 0.64 (0.005) | 0.6403 | yes |
| proportional hazards p for age | 0.0007 (0.0005) | 0.0007, reported as a violation | yes |
| covariates and ties | all seven, Efron | all seven, Efron | yes |

Verdict: PASS on every number. The model found the assumption failure for age, and also named wexp (p = 0.0068, true).
Faults in the answer text (model, not adapter):
- It calls the proportional hazards p-value an "Efron test". The test is a rank-transformed score test. Efron is the ties method.
- It says "31.6 percent reduction in risk" and "5.6 percent per year". The numbers follow from the hazard ratios, but a hazard ratio is a rate ratio, not a risk ratio. The referee flagged these as errors.
- It does not state that the interval nearly touches 1, in words. It says the interval is wide.
Only one run was made.
