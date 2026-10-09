# Runs: hahne2009-flowcore-compdata (spillover from single-stain controls)

Date: 2026-10-09. Model: claude:claude-haiku-5-5 (blind mode on). Adapter: flowcore 0.1.0 (draft). Program: flowCore 2.24.0.

Command:

```
node bin/ga.js bench papers --papers hahne2009-flowcore-compdata --models claude:claude-haiku-5-5 --runs 1
```

The harness answered each decision from `bench.yaml`: positive cutoff 80th percentile of the unstained control, log scale of 4 decades, no scatter gate.

## Result summary

Computed 12/12 and reported 12/12 in the first run. `check_spillover.py` (NumPy and flowio, no flowCore) gives the same matrix (`check_spillover.out`). The maximum difference to the reference matrix compref is 0.000325.
