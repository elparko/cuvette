# Runs with the cardinal adapter (bemis2015-cardinal)

Date: 2026-10-08. Adapter: `catalog/cardinal` version 0.1.0 (draft). Model: `ollama:qwen3:8b`. Program: Cardinal 3.14.0 on R 4.6.1, macOS arm64. R library: `/Volumes/T7/guided-analysis/tools/R-library`.

Prompt: the guided question of `prompt.md`, the path of `pig206.rda`, and a request for the number of spectra, m/z values and peaks, the segments of each model, the reported model and the top ions.

Command (`<scratch>` is `/Volumes/T7/guided-analysis/tools/R-scratch/card1`):

```
GA_HOME=<scratch>/home node bin/ga.js -p "$(cat <scratch>/prompt.txt)" \
  --adapter catalog/cardinal --model ollama:qwen3:8b --answers <scratch>/answers.json --allow all --output json
```

Answers file: normalize tic, SNR 3, tolerance 0.5, sample size 0.1, seed 1, r 2, k 8, weights adaptive, sparsity 32. These values come from the package vignette (`paper.md`), not from the paper. A person must confirm them.

## Result

Session `20261008-112242-8559`. One run. It took 5.5 minutes in total (tool calls and review included). The model called load_image, process_peaks, segment_image, top_features and plot_segments once each.

| Quantity | Expected (`expected.yaml`) | Run | Pass |
| --- | --- | --- | --- |
| pig206 spectra | 4959 (tolerance 0) | 4959 | pass |
| pig206 m/z values | 10200 (tolerance 0) | 10200 | pass |
| peaks after peakProcess | 687 (tolerance 10) | 687 | pass |
| segments, s=32 | 6 (tolerance 1) | 6 | pass |
| segments, s=64 | 3 (tolerance 1) | 3 | pass |
| segments, s=2, 4, 8, 16 | not in the expected file (vignette: 8) | 8, 8, 8, 8 | not checked |
| paper numbers (11 segments, 92, 153, 23) | null (five-section data) | not applicable | not applicable |

The final answer gives every number in the table. It reports s = 32 and lists one top ion for each segment (m/z 187.36, 261.48, 215.40, 509.03, 253.57, 537.11). The answer names no organ. It says that a segment is not a tissue type.

## What went wrong

- The model asked for s = 16 in top_features. The decision `sparsity` (32) replaced it. The harness works as intended here.
- The top-ion table in the answer has one ion for each segment, not ten. The tool returned the ranked table. The model read only the preview rows.
- The answer says "Cardinal version 3.14.0" and the review marked the number as unsourced, because the tokenizer splits 3.14.0. The Cardinal version is in the tool result.
- The review reported 13 findings (2 harness checks, 11 from the referee model). The referee findings say that numbers such as the AIC values and the segment sizes are not in the log. They are in the log (`segment_image` result). These findings are false. The answer shown to the scientist has the note "Numbers marked [no source] do not match a logged tool result".
- The answer says that s = 32 has the lowest AIC and BIC. This is true in the result table (AIC 2372.04, BIC 7774.47).

## Limits

- The expected numbers are from the vignette for one section. The paper numbers (five sections, 11 segments) cannot be reproduced with this data.
- The segment numbering depends on the seed. The test uses seed 1, as the vignette does.
- Peak count and segment counts match the vignette for Cardinal 3.14.0 with seed 1. Other versions or seeds can differ.
- I did not compare the ion list with the vignette hand-picked peaks, except that m/z 537.11 (segment 6 here) matches the vignette liver peak 537.08 and m/z 187.36 matches its heart peak.
