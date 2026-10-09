# Runs: kresken2021-temocillin (piperacillin/tazobactam and temocillin)

Date: 2026-10-09. Model: claude:claude-haiku-5-5 (blind mode on). Adapter: amr 0.1.0 (draft). Program: AMR 3.0.1.

Command:

```
node bin/ga.js bench papers --papers kresken2021-temocillin --models claude:claude-haiku-5-5 --runs 1
```

The harness answered each decision from `bench.yaml`: guideline EUCAST 2021, host human, urinary tract auto, limit signs standard, pharmacokinetic breakpoints on, susceptible means S and I, off-scale next dilution.

## Result summary

| Run | Computed | Reported | Note |
| --- | --- | --- | --- |
| 1 | 16/24 | 17/24 | AMR not found in blind mode (library folder outside the allow list). Fixed. |
| 2 (final) | 24/24 | 24/24 | 0 paths outside the allow list. |

`check.py` (pandas and plain Python, no AMR) gives the same 24 values (`check.out`). The paper prints the same 24 values.
