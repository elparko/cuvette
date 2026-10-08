# Runs with the biostats adapter (student1908-sleep)

Date: 2026-10-08. Adapter: `catalog/biostats` 0.1.0 (draft). Model: `ollama:qwen3:8b`. Program: lifelines 0.30.3, statsmodels 0.15.0, pingouin 0.7.0, scipy 1.18.1.

Command (`<scratch>` is `/Volumes/T7/guided-analysis/tools/biostats-scratch/sleep1`):

```
GA_HOME=<scratch>/home node bin/ga.js -p "$(cat <scratch>/prompt.txt)" --adapter catalog/biostats \
  --model ollama:qwen3:8b --answers <scratch>/answers.json --allow all --output json
```

The prompt is plain prompts 1 and 2 of `prompt.md`, the CSV path, the column names, and "write every number in your final answer text". It has no tool names and no test names.
Answers file (the scientist): unit of replication subjects, alpha 0.05, paired true, test t, equal variance false, two-sided.

## Run 1 (session `20261008-120154-a0e6`)

| Quantity | Expected | Run 1 | Pass |
| --- | --- | --- | --- |
| mean paired difference | 1.58 (0.005) | 1.58 | yes |
| paired p, two-sided | 0.002833 (0.0001) | 0.0028 | yes |
| 95% CI | 0.700 to 2.460 (0.005) | 0.70 to 2.46 | yes |
| t statistic, df | 4.0621, 9 | in the tool result (4.062, 9) | yes |
| test chosen | paired by ID | paired, id_column ID | yes |
| unpaired Welch p (trap) | 0.07939 | not run | not tested |

Verdict: PASS. The model called inspect_table and then compare_two_groups with `paired: true` and `id_column: ID` on its own. The harness asked for paired, test, equal variance and sidedness. The answers file gave the values.
The answer text says the second drug gives more sleep, with effect size 1.28 (Cohen dz). It names the paired t-test.
The referee gave one info finding: the answer must name the test and the sidedness. The answer names the test but not the sidedness.
The trap was not tested. The model chose the paired test without a hint, so no second run was made. Prompt 3 (rank test) was not run.
