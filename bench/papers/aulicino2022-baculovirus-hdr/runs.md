# Runs: aulicino2022-baculovirus-hdr (percent mCherry-positive cells, HDR and HITI-2c)

Date: 2026-10-09. Model: claude:claude-haiku-5-5 (blind mode on). Adapter: flowcore 0.1.0 (draft). Program: flowCore 2.24.0.

Command:

```
node bin/ga.js bench papers --papers aulicino2022-baculovirus-hdr --models claude:claude-haiku-5-5 --runs 1
```

The harness answered each decision from `bench.yaml`: control percentile 99.9, no scatter gate, no compensation, no transform, Welch test, no correction.

## Result summary

| Run | Computed | Reported | Note |
| --- | --- | --- | --- |
| 1 | 5/8 | 5/8 | `control` took one file. Fixed. |
| 2 | 7/8 | 8/8 | A repeated population doubled the samples. Fixed. |
| 3 (final) | 8/8 | 8/8 | 0 paths outside the allow list. |

`check.py` (fcsparser, NumPy and SciPy, no flowCore) gives the same numbers (`check.out`): cutoff 3791.17, HDR 4.419 (SD 0.146), HITI-2c 20.903 (SD 2.256), Welch p 0.006018.
