# Runs with the vegan adapter (oksanen-vegan-dune)

Date: 2026-10-08. Adapter: `catalog/vegan` version 0.1.0 (draft). Model: `ollama:qwen3:8b`. Program: vegan 2.7.6 on R 4.6.1, macOS arm64. R library: `/Volumes/T7/guided-analysis/tools/R-library`.

Prompt: the guided question of `prompt.md`, the paths of the species table and the site table, and a request for the Shannon index of site 1, the PERMANOVA R2, F and p, the p of the dispersion test, an NMDS map with its stress, and every number in the answer text.

Command (`<scratch>` is `/Volumes/T7/guided-analysis/tools/R-scratch/vegan1`):

```
GA_HOME=<scratch>/home node bin/ga.js -p "$(cat <scratch>/prompt.txt)" \
  --adapter catalog/vegan --model ollama:qwen3:8b --answers <scratch>/answers.json --allow all --output json
```

Answers file: distance bray, transform none, index shannon, base e, terms Management, by terms, dispersion variable Management, k 2, trymax 20, permutations 999, strata none. The seed decision has owner agent, so the model chose it: it used seed 1234 in every call. The seed in `expected.yaml` is 1.

## Result

Session `20261008-121157-4e5a`. One run. It took about 11 minutes with the review. The model called inspect_community, diversity_indices, run_permanova, test_dispersion and run_nmds. It ran run_nmds with 2 and 3 dimensions as a sensitivity comparison.

| Quantity | Expected (`expected.yaml`) | Run | Pass |
| --- | --- | --- | --- |
| Shannon index of site 1 | 1.4405 (tolerance 0.001) | 1.4405 | pass |
| NMDS stress, Bray-Curtis, k = 2 | 0.1183 (tolerance 0.001) | 0.1183 | pass |
| PERMANOVA R2 of Management | 0.3416 (tolerance 0.001) | 0.3416 | pass |
| PERMANOVA F of Management | 2.767 (tolerance 0.01) | 2.767 | pass |
| PERMANOVA p, 999 permutations | 0.003 (tolerance 0.003) | 0.003 (seed 1234) | pass |
| dispersion test F | 1.951 (tolerance 0.01) | 1.951 | pass |

The dispersion p is 0.16 with seed 1234. It is not significant. The answer says that the spread does not differ.

## What went wrong

- The answer starts with a paragraph about "2.7 [no source]". The harness cut the version number 2.7.6 into 2.7 and flagged 2.7 as a number with no source. The model then wrote a paragraph about it. The review gave one error from the rule `unsourced_numbers` and one referee error about the same text. The harness treats a version number as a measured value. This is a fault in the harness, not in the adapter.
- The answer says "Number of random starts tried: 100". The tool result says 20 starts and 1 run converged. The number 100 is wrong. The review did not find it.
- The answer says that the stress is "usable" and that the plot is "a reasonable representation". It does not say that axes have no meaning. The answer does not give the number of permutations or the seed. The check `seed_not_reported` did not fire.
- The harness ran 4 PERMANOVA calls: one chosen run and three sensitivity runs of the decisions distance and permutations. Each took a few seconds.
- The model did not give the NMDS plot as a file path in the answer.
