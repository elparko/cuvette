# Triage: hochman1999-shock-trial

Entry numbers (eNN) are ids in the log.jsonl of the session folder.
Classes: a = tool or adapter fault, b = harness fault, c = benchmark spec fault, d = model fault.

- claude-haiku-5-5 (blind, adapter 0.1.0): `20261009-042323-2ead`, 137 s, computed 18/18 (17 scored items and 1 reference item), reported 17/17. Report: `bench/results/papers-2026-10-09-trials-haiku.md`.
- Leak check: 0 paths outside the allow list, 0 blocked reads, 2 unsourced claims. Both are the model's own conversions ("-0.205149 times 100", "up to 20.5%"), not numbers from memory.
- Two earlier runs of the same paper (adapter 0.1.0, earlier prompt) had the same computed score and reported 12/17 and 11/17.

| Run | Item | Class | Cause | Fix |
| --- | --- | --- | --- | --- |
| 1 | rd30, rd30_ci_low, surv1_diff and its limits | c | The tools give fractions. The prompt asked for percent. The model wrote "-9.3 percentage points". The claim check reads a percent only after a % sign or the word "percent", so it did not match -0.093. | The prompt now asks for a number with the % sign after it, and a % sign after each interval limit. Run 3 reports 17/17. |
| 2 | same items | c | The prompt said "in percent, with the % sign". The model still wrote "points" and put the sign after the last limit only. | Same fix as run 1. |
| all | duplicate rows | d | The model reported two identical rows (file rows 255 and 276) as possible copies. The table has no patient identifier. Two patients with the same arm, age flag and follow-up day look the same. | none. The model kept both rows and asked the scientist, as the standards say. |

Items of the papers that do not reproduce with the Zenodo data (not in the benchmark; see expected.yaml):

- 6-month mortality of the early revascularization arm: the 1999 abstract prints 50.3%. The data give 49.3% as a count (75 of 152) and as a Kaplan-Meier estimate. The medical arm gives 63.1% as a Kaplan-Meier estimate, as printed.
- 6-year survival: 32.8% and 19.6% printed; 32.4% and 19.4% in the data.
- 1-year relative risk of death 0.72 (0.54 to 0.95) of the 2001 abstract: a Cox model that stops at 1 year gives 0.75 (0.56 to 1.01).
- Age under 75 years, 1-year survival: 51.6% and 33.3% printed; 51.6% and 33.9% in the data.
- The Zenodo survival file has 301 patients. The medical stabilization arm lacks one patient (trial ID 166), so the survival numbers differ in the last digit from the final trial data in some papers.

Other findings:

- The model asked no setup question. It took every decision from the decision record, and the tools refused no call.
- The model did not state the survRM2 version. It said so in the "Uncertain" list. The tool result carries no package version.
