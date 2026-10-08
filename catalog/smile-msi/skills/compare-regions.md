---
name: compare-regions
description: Compare two regions or groups of a slide and find the features that differ. Use it when the scientist asks which lipids are higher in one tissue than in another.
---

# Compare two regions

Use this procedure for a question such as "Which lipids are different between endo and epi?"

1. Call `state`. Read the regions, the groups and the pixel count of each. If a slide is not open, call `open_slide`.
2. Ask the scientist which region is A and which is B. Do not guess. If the question names a rim, a core or a lesion, follow the build-regions skill and call `make_regions`. For other regions, ask the scientist to draw them, or stage them with `run_script`.
3. Check the decision record. The unit of replication, the normalization, the extraction tolerance, the q threshold and the minimum AUC must have values. If the normalization is open, run the sensitivity check before you ask.
4. Call `find_peaks` if the working feature set is empty (`n_features` is 0 in `state`).
5. Call `run_analysis` with `step_id` `roi_comparison`, `a` and `b`. For more than two groups, use `discriminating_features` with `groups`.
6. Read `summary`, `warning` and `metrics`. `n_q_pass` is the number of features with q at or below the threshold. `n_q_auc_pass` also needs the minimum AUC.
7. Show the manual route of the step. Show the top rows of the table.
8. Report the effect size (AUC, log2 fold change) with each p-value. If the unit of replication is pixels, say that the p-values describe pixels.
9. Call `annotate` for the top features. State each identity as putative.
10. Tell the scientist which conclusions hold for every normalization option and which depend on one option.

Stop and ask if `n_q_pass` is 0. Do not lower the threshold to find a result.
