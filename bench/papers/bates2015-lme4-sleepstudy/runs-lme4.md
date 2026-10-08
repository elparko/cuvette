# Runs with the lme4 adapter (bates2015-lme4-sleepstudy)

Date: 2026-10-08. Adapter: `catalog/lme4` version 0.1.0 (draft). Model: `ollama:qwen3:8b`. Program: lme4 2.0.6 and lmerTest 3.2.1 on R 4.6.1, macOS arm64. R library: `/Volumes/T7/guided-analysis/tools/R-library`.

Prompt: the guided question of `prompt.md`, the path of the data table, a request for the fixed effects, the random-effect standard deviations and the REML criterion, a plot of each subject with the fitted line, and every number in the answer text. Run 1 asks for a likelihood ratio test of Days in general words. Run 2 asks to compare the model with the same model without the Days effect and to give the chi-square, the degrees of freedom and the p value.

Command (`<scratch>` is `/Volumes/T7/guided-analysis/tools/R-scratch/lme41`; run 2 uses `prompt2.txt` and `home2`):

```
GA_HOME=<scratch>/home node bin/ga.js -p "$(cat <scratch>/prompt.txt)" \
  --adapter catalog/lme4 --model ollama:qwen3:8b --answers <scratch>/answers.json --allow all --output json
```

Answers file (both runs): formula `Reaction ~ Days + (Days | Subject)`, REML true, p values Satterthwaite, reduced model `Reaction ~ 1 + (Days | Subject)`, comparison method ML, replicate subjects.

## Results

| Run | Session | Time | Pass |
| --- | --- | --- | --- |
| 1 | `20261008-122250-7d49` | 11.5 minutes | fail (no likelihood ratio test) |
| 2 | `20261008-123439-af18` | 7.2 minutes | pass |

Numbers of run 2 against `expected.yaml` (run 1 has the same fit numbers):

| Quantity | Expected | Run 2 | Pass |
| --- | --- | --- | --- |
| fixed effect (Intercept) | 251.405 (tolerance 0.01) | 251.405 | pass |
| fixed effect Days | 10.467 (tolerance 0.01) | 10.467 | pass |
| REML criterion | 1743.6 (tolerance 0.1) | 1743.6283 | pass |
| SD of Subject intercept | 24.74 (tolerance 0.05) | 24.741 | pass |
| SD of Subject Days | 5.92 (tolerance 0.05) | 5.922 | pass |
| residual SD | 25.59 (tolerance 0.05) | 25.592 | pass |
| correlation of intercept and slope | 0.066 (tolerance 0.01) | 0.0656 | pass |
| likelihood ratio chi-square for Days | 23.54 (tolerance 0.1) | 23.537 | pass |
| number of subjects | 18 (tolerance 0) | 18 | pass |

## What went wrong

- Run 1: the model did not call compare_models. The answer has no chi-square. The answer says that a plot was drawn. The log shows that plot_model ran once.
- Run 2: the answer says that the random slopes "are significant". No tool tested the random slope. The check `observation_as_replicate` and the other checks did not find this claim. The answer should say that the model fits a random slope and that the standard deviation is 5.92.
- Both runs: the harness gave the error `number_from_comparison` for 6.825, 36.838 and 6.771. These are the standard error and t values of the chosen Satterthwaite fit. The sensitivity run with Kenward-Roger gives the same numbers to four digits. The error is false. The deseq2 runs show the same kind of fault.
- Run 2: the version number 3.2.1 of lmerTest is flagged as an unsourced number "3.2" and the answer shows "3.2 [no source].1". This is the same fault as in the vegan run. It is a fault in the harness.
- The model gave the plot as a sentence. It does not name the file.
- Each run did 3 fits: the chosen fit and 2 sensitivity runs of the p value method. The sensitivity check of the decision `p_value_method` compared only the Days estimate, which does not change. After the runs I added the p value of each term to the metrics and added `p_Days` to the comparison. I did not run the emulation again after this change.
