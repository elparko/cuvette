# Paper benchmark 2026-10-09

Models: claude:claude-haiku-5-5. Runs per paper and model: 1.
Each cell: computed passes / reported passes. Computed: a logged number is within tolerance. Reported: the final answer states the value, labeled measured by the claim check.

| Model | Computed | Reported | Runs | Not answered |
| --- | --- | --- | --- | --- |
| claude:claude-haiku-5-5 | 17/17 | 17/17 | 1 | 0 |

## Matrix

| Paper | claude:claude-haiku-5-5 |
| --- | --- |
| hochman1999-shock-trial | 17/17 / 17/17 |

## Process metrics

Sums over all runs of a model.

| Model | runs | seconds | requests | input tokens | output tokens | cache read | tool calls | failed calls | nudges | plan reminders | revisions | info | warning | error | unsourced | deviations | overwritten |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| claude:claude-haiku-5-5 | 1 | 137 | 7 | 20 | 13734 | 138393 | 9 | 0 | 0 | 0 | 1 | 4 | 6 | 1 | 2 | 8 | 8 |

Estimated Claude cost from the token counts (list prices, before any discount):

- claude:claude-haiku-5-5: $0.01 for 1 runs

## Leak check

Blind mode: the file tools of the agent read only the allow list (the data folder of the paper, the folder of the run, program folders, system and temporary folders). Child processes cannot read the repository, the results, past benchmark runs, the reference folder or the harness home. Only the adapter processes can read the adapter folders. The session cwd is the work folder of the run.

Paths read: the paths in the tool calls and steps of the agent. Outside: paths not on the allow list. Blocked: reads that blind mode stopped. Unsourced and literature: claims in the final answer that no logged step holds. A number from memory shows up there.

| Paper | Model | Run | Sandbox | Paths read | Outside | Blocked | Unsourced | Literature |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| hochman1999-shock-trial | claude:claude-haiku-5-5 | 1 | on | 2 | 0 | 0 | 2 | 0 |

## Details

### hochman1999-shock-trial | claude:claude-haiku-5-5 | run 1

Status: answer. 137 s. 7 requests, 9 tool calls (0 failed), 0 nudges, 0 plan reminders, 2 unsourced.
Session: 20261009-042323-2ead. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/hochman1999-shock-trial/run1/home/sessions/20261009-042323-2ead/log.jsonl
Leak check: 2 paths read, 0 outside the allow list, 0 blocked, 2 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/hochman1999-shock-trial/run1/home/sessions/20261009-042323-2ead/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| n_early | 152 exact | pass 152 (n4 metrics.n_a, entry 55) | pass 152 via tolerance (n5, claim check 128) |
| n_medical | 150 exact | pass 150 (n4 metrics.n_b, entry 55) | pass 150 via tolerance (n4, claim check 128) |
| mortality30_early | 0.467 ±0.001 | pass 0.4671053 (n4 metrics.risk_a, entry 55) | pass 0.467 via tolerance (n4, claim check 128) |
| mortality30_medical | 0.56 ±0.001 | pass 0.56 (n4 metrics.risk_b, entry 55) | pass 0.56 via tolerance (n4, claim check 128) |
| rd30 | -0.093 ±0.001 | pass -0.09289474 (n4 metrics.rd, entry 55) | pass -0.093 via tolerance (n9, claim check 128) |
| rd30_ci_low | -0.205 ±0.001 | pass -0.2051493 (n4 metrics.rd_ci_low, entry 55) | pass -0.205 via tolerance (n9, claim check 128) |
| rd30_ci_high | 0.019 ±0.001 | pass 0.01903706 (n7 metrics.rd_ci_high, entry 93) | pass 0.019 via tolerance (n7, claim check 128) |
| p30 | 0.11 ±0.006 | pass 0.1063389 (n4 metrics.test_p, entry 55) | pass 0.1063 via tolerance (n4, claim check 128) |
| hr | 0.74 ±0.005 | pass 0.7382611 (n8 metrics.hr, entry 96) | pass 0.738 via tolerance (n8, claim check 128) |
| hr_ci_low | 0.57 ±0.005 | pass 0.5712074 (n5 metrics.hr_ci_low, entry 71) | pass 0.571 via tolerance (n5, claim check 128) |
| hr_ci_high | 0.97 ±0.005 | pass 0.9699647 (n5 metrics.rmtl_ratio_ci_high, entry 71) | pass 0.968 via tolerance (n8, claim check 128) |
| logrank_p | 0.03 ±0.005 | pass 0.02790277 (n5 metrics.hr_p, entry 71) | pass 0.02735 via tolerance (n5, claim check 128) |
| surv1_early | 0.467 ±0.001 | pass 0.4671053 (n5 metrics.surv_a, entry 71) | pass 0.467 via tolerance (n4, claim check 128) |
| surv1_medical | 0.336 ±0.001 | pass 0.3355705 (n5 metrics.surv_b, entry 71) | pass 0.336 via tolerance (n5, claim check 128) |
| surv1_diff | 0.132 ±0.001 | pass 0.1315348 (n5 metrics.surv_diff, entry 71) | pass 0.132 via tolerance (n5, claim check 128) |
| surv1_diff_ci_low | 0.022 ±0.001 | pass 0.02181158 (n5 metrics.surv_diff_ci_low, entry 71) | pass 0.022 via tolerance (n5, claim check 128) |
| surv1_diff_ci_high | 0.241 ±0.001 | pass 0.241258 (n5 metrics.surv_diff_ci_high, entry 71) | pass 0.241 via tolerance (n5, claim check 128) |
| rmst_diff (reference) | 224.26 ±0.5 | match 224.2616 (n5 metrics.rmst_diff, entry 71) | not asked |

