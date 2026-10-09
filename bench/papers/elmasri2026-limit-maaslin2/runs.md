# Runs: elmasri2026-limit-maaslin2 (LIMIT cohort, MaAsLin 2)

Date: 2026-10-09. Model: claude:claude-haiku-5-5 (blind mode on). Adapter: microbiome 0.1.0 (draft). Programs: Maaslin2 1.26.0, ALDEx2 1.44.0, vegan 2.7.6, R 4.6.1.

Command:

```
node bin/ga.js bench papers --papers elmasri2026-limit-maaslin2 --models claude:claude-haiku-5-5 --runs 1
```

The harness answered each decision from `bench.yaml`: sample filter birth_type=natural, prevalence limit 0.05 for MaAsLin 2 and 0 for the distance, no rarefaction, MaAsLin 2 with the fixed effects gestational_age, GWG, age_mother and pre_pregnancy_BMI, reference GWG adequate, TSS, LOG, standardized columns, adjusted p limit 0.05, Bray-Curtis on relative abundances, 999 permutations, seed 1.

## Result summary

| Quantity | Paper or check | Run 3 (final) | Pass |
| --- | --- | --- | --- |
| Meconium samples in the study | 168 (paper) | 168 | yes |
| Samples in the model | 132 (paper) | 132 | yes |
| Associations with q at or below 0.05 | 1 (paper) | 1 | yes |
| q of the most significant OTU | 0.043 +/- 0.0005 (paper) | 0.042647 | yes |
| Samples that contain this OTU | 7 (paper) | 7 | yes |
| OTUs tested (reference, not printed) | 65 (check) | 65 | match |
| Kruskal-Wallis p of Shannon by GWG | 0.9917 +/- 0.005 (check) | 0.9917 | yes |
| PERMANOVA R2 of GWG | 0.0104 +/- 0.0005 (check) | 0.0104 | yes |
| PERMANOVA F of GWG | 0.678 +/- 0.005 (check) | 0.678 | yes |
| PERMANOVA p of GWG | 0.91 +/- 0.06 (check) | 0.904 | yes |

Verdict: computed 9 of 9 scored items and reported 9 of 9 in the final run. The first five items are printed in the paper. The last four are computed with the independent script `check_limit_diversity.py`, because the paper prints no number for them.

## Run 3 (final)

- Session: `20261009-035258-57f6`. 308 s, 33 model requests, 33 tool calls, 2 failed.
- The failed calls: the built-in `inspect_data` (blind mode hides the repository) and one `beta_diversity` call with the strata column `subject`, which the sample table does not have. The error named the column. The model repeated the call without strata.
- Leak check: 0 paths outside the allow list, 1 blocked read (`inspect_data`), 1 unsourced number (0.104875, a value that the model derived).

## Run 1 and run 2 (before the fix)

- Run 1, session `20261009-034501-3dac`: 5 of 5 scored items (the version without the diversity items).
- Run 2, session `20261009-034911-c4a1`: not kept. After the diversity items were added, the PERMANOVA F was 0.537 in the tool and 0.678 in the check. The decision for the prevalence limit applied to the distance as well as to MaAsLin 2, so the tool dropped rare OTUs before the distance. Fix: a separate decision `beta_min_prevalence` with the default 0 (tool fault, class a). Run 3 passes.
- In the same run 2 the model wrote 142 as the number of samples in the study. The prompt says 168. This is a model fault.
