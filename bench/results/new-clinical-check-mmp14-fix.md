# Paper benchmark 2026-10-08

Models: ollama:qwen3:8b. Runs per paper and model: 1.
Each cell: computed passes / reported passes. Computed: a logged number is within tolerance. Reported: the final answer states the value, labeled measured by the claim check.

| Model | Computed | Reported | Runs | Not answered |
| --- | --- | --- | --- | --- |
| ollama:qwen3:8b | 6/25 | 3/17 | 1 | 0 |

## Matrix

| Paper | ollama:qwen3:8b |
| --- | --- |
| kasurinen2018-mmp14-gastric | 6/25 / 3/17 |

## Process metrics

Sums over all runs of a model.

| Model | runs | seconds | requests | input tokens | output tokens | cache read | tool calls | failed calls | nudges | plan reminders | revisions | info | warning | error | unsourced | deviations | overwritten |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| ollama:qwen3:8b | 1 | 315 | 11 | 79388 | 1623 | 0 | 7 | 3 | 2 | 0 | 1 | 0 | 0 | 7 | 6 | 1 | 1 |

## Leak check

Blind mode: the file tools of the agent read only the allow list (the data folder of the paper, the folder of the run, program folders, system and temporary folders). Child processes cannot read the repository, the results, past benchmark runs, the reference folder or the harness home. Only the adapter processes can read the adapter folders. The session cwd is the work folder of the run.

Paths read: the paths in the tool calls and steps of the agent. Outside: paths not on the allow list. Blocked: reads that blind mode stopped. Unsourced and literature: claims in the final answer that no logged step holds. A number from memory shows up there.

| Paper | Model | Run | Sandbox | Paths read | Outside | Blocked | Unsourced | Literature |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| kasurinen2018-mmp14-gastric | ollama:qwen3:8b | 1 | on | 4 | 0 | 0 | 6 | 0 |

## Details

### kasurinen2018-mmp14-gastric | ollama:qwen3:8b | run 1

Status: answer. 315 s. 11 requests, 7 tool calls (3 failed), 2 nudges, 0 plan reminders, 6 unsourced.
Session: 20261008-181850-bf9d. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-08/ollama_qwen3_8b/kasurinen2018-mmp14-gastric/run1/home/sessions/20261008-181850-bf9d/log.jsonl
Leak check: 4 paths read, 0 outside the allow list, 0 blocked, 6 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-08/ollama_qwen3_8b/kasurinen2018-mmp14-gastric/run1/home/sessions/20261008-181850-bf9d/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| patients | 240 exact | pass 240 (n1 metrics.n_rows, entry 8) | not asked |
| events | 138 exact | pass 138 (n2 metrics.events, entry 14) | not asked |
| surv5_low | 0.4923 ±0.001 | pass 0.4922753 (n2 table.rows[0][4], entry 14) | pass 0.4923 via tolerance (n2, claim check 83) |
| surv5_high | 0.2211 ±0.001 | pass 0.2210526 (n2 table.rows[1][4], entry 14) | pass 0.2211 via tolerance (n2, claim check 83) |
| logrank_chi2 | 10.234 ±0.01 | pass 10.23372 (n2 metrics.logrank_chi2, entry 14) | not asked |
| logrank_p | 0.00138 ±0.0002 | pass 0.00137896 (n2 metrics.logrank_p, entry 14) | pass 0.0014 via tolerance (n2, claim check 83) |
| hr_unadjusted | 1.918 ±0.005 | FAIL 1.896547 (n3 metrics.coef_stage2, entry 44) | FAIL 1.57 (n3, claim check 83) |
| hr_unadjusted_ci_lo | 1.278 ±0.005 | FAIL 1.570851 (n3 table.rows[4][5], entry 44) | FAIL 1.57 (n3, claim check 83) |
| hr_unadjusted_ci_hi | 2.879 ±0.005 | FAIL 3.107963 (n3 metrics.coef_stage3, entry 44) | FAIL 2.33 (n3, claim check 83) |
| p_unadjusted | 0.00167 ±0.0002 | FAIL 0.0005372981 (n3 metrics.p_stage2, entry 44) | FAIL 0.0014 (n2, claim check 83) |
| hr_adjusted | 1.5487 ±0.005 | FAIL 1.570851 (n3 table.rows[4][5], entry 44) | FAIL 1.57 (n3, claim check 83) |
| hr_adjusted_ci_lo | 1.0205 ±0.005 | FAIL 0.9076619 (n3 metrics.coef_age_ge67, entry 44) | FAIL 0.5503 (n3, claim check 83) |
| hr_adjusted_ci_hi | 2.3504 ±0.005 | FAIL 2.332561 (n3 metrics.hr_diffuse, entry 44) | FAIL 2.33 (n3, claim check 83) |
| p_adjusted | 0.0399 ±0.0005 | FAIL 0.05 (n3 data.data.alpha, entry 44) | FAIL 0.0014 (n2, claim check 83) |
| hr_age_ge67 | 2.516 ±0.01 | FAIL 2.478521 (n3 metrics.hr_age_ge67, entry 44) | not asked |
| hr_stage2 | 6.876 ±0.02 | FAIL 6.662847 (n3 metrics.hr_stage2, entry 44) | not asked |
| hr_stage3 | 22.01 ±0.05 | FAIL 22.37541 (n3 metrics.hr_stage3, entry 44) | not asked |
| hr_stage4 | 74.45 ±0.2 | FAIL 74.78795 (n3 metrics.hr_stage4, entry 44) | not asked |
| hr_diffuse | 2.232 ±0.005 | FAIL 2.276567 (n3 table.rows[1][5], entry 44) | not asked |
| hr_intestinal | 3.542 ±0.005 | FAIL 3.547883 (n3 table.rows[0][6], entry 44) | FAIL 3.46 (n3, claim check 83) |
| hr_intestinal_ci_lo | 1.507 ±0.005 | FAIL 1.570851 (n3 table.rows[4][5], entry 44) | FAIL 1.57 (n3, claim check 83) |
| hr_intestinal_ci_hi | 8.329 ±0.02 | FAIL 8.112721 (n3 table.rows[2][5], entry 44) | FAIL 3.46 (n3, claim check 83) |
| p_intestinal | 0.00374 ±0.0005 | FAIL 0.0005372981 (n3 metrics.p_stage2, entry 44) | FAIL 0.0014 (n2, claim check 83) |
| hr_diffuse_type | 1.5355 ±0.005 | FAIL 1.570851 (n3 table.rows[4][5], entry 44) | FAIL 1.57 (n3, claim check 83) |
| p_diffuse_type | 0.0711 ±0.001 | FAIL 0.05 (n3 data.data.alpha, entry 44) | FAIL 0.0014 (n2, claim check 83) |

