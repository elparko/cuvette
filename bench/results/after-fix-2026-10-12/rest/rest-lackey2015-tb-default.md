# Paper benchmark 2026-10-12

Models: claude:claude-haiku-5-5. Runs per paper and model: 3.
Each cell: computed passes / reported passes. Computed: a logged number is within tolerance. Reported: the final answer states the value, labeled measured by the claim check.

| Model | Computed | Reported | Runs | Not answered |
| --- | --- | --- | --- | --- |
| claude:claude-haiku-5-5 | 90/90 | 62/84 | 3 | 0 |

## Matrix

| Paper | claude:claude-haiku-5-5 |
| --- | --- |
| lackey2015-tb-default | 90/90 / 62/84 |

## Process metrics

Sums over all runs of a model.

| Model | runs | seconds | requests | input tokens | output tokens | cache read | tool calls | failed calls | nudges | plan reminders | revisions | info | warning | error | unsourced | deviations | overwritten |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| claude:claude-haiku-5-5 | 3 | 352 | 37 | 90 | 41678 | 952148 | 44 | 1 | 0 | 3 | 2 | 10 | 17 | 2 | 4 | 4 | 4 |

Estimated Claude cost from the token counts (list prices, before any discount):

- claude:claude-haiku-5-5: $0.05 for 3 runs

## Leak check

Blind mode: the file tools of the agent read only the allow list (the data folder of the paper, the folder of the run, program folders, system and temporary folders). Child processes cannot read the repository, the results, past benchmark runs, the reference folder or the harness home. Only the adapter processes can read the adapter folders. The session cwd is the work folder of the run.

Paths read: the paths in the tool calls and steps of the agent. Outside: paths not on the allow list. Blocked: reads that blind mode stopped. Unsourced and literature: claims in the final answer that no logged step holds. A number from memory shows up there.

| Paper | Model | Run | Sandbox | Paths read | Outside | Blocked | Unsourced | Literature |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| lackey2015-tb-default | claude:claude-haiku-5-5 | 1 | on | 4 | 0 | 0 | 0 | 0 |
| lackey2015-tb-default | claude:claude-haiku-5-5 | 2 | on | 3 | 0 | 0 | 4 | 0 |
| lackey2015-tb-default | claude:claude-haiku-5-5 | 3 | on | 3 | 0 | 0 | 0 | 0 |

## Details

### lackey2015-tb-default | claude:claude-haiku-5-5 | run 1

Status: answer. 134 s. 14 requests, 14 tool calls (0 failed), 0 nudges, 1 plan reminders, 0 unsourced.
Session: 20261012-024713-9f0a. Record: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-a/bench-runs/lackey2015-tb-default/claude_claude-haiku-5-5/lackey2015-tb-default/run1/home/sessions/20261012-024713-9f0a/log.jsonl
Leak check: 4 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-a/bench-runs/lackey2015-tb-default/claude_claude-haiku-5-5/lackey2015-tb-default/run1/home/sessions/20261012-024713-9f0a/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| patients | 1233 exact | pass 1233 (n1 metrics.n_rows, entry 12) | not asked |
| defaulted | 127 exact | pass 127 (n7 metrics.events, entry 78) | not asked |
| p_age | 0.00604 ±0.0002 | pass 0.006038988 (n2 metrics.p_value, entry 39) | pass 0.00604 via tolerance (n8, claim check 151) |
| p_sex | 0.0000395 ±0.000005 | pass 0.00003945092 (n3 metrics.p_value, entry 42) | pass 0.0000395 via tolerance (n8, claim check 151) |
| p_marital | 0.6815 ±0.001 | pass 0.6814545 (n4 metrics.p_value, entry 45) | FAIL 0.742 (n8, claim check 151) |
| p_poverty | 0.03436 ±0.0005 | pass 0.03436349 (n5 metrics.p_value, entry 48) | pass 0.0344 via tolerance (n8, claim check 151) |
| or_drug | 4.7816 ±0.005 | pass 4.781551 (n7 metrics.or_drug_use_Yes, entry 78) | pass 4.78 via tolerance (n7, claim check 151) |
| or_drug_lo | 3.0522 ±0.005 | pass 3.052178 (n7 metrics.or_lo_drug_use_Yes, entry 78) | pass 3.05 via tolerance (n7, claim check 151) |
| or_drug_hi | 7.4907 ±0.005 | pass 7.490792 (n7 metrics.or_hi_drug_use_Yes, entry 78) | pass 7.49 via tolerance (n7, claim check 151) |
| or_underweight | 2.0795 ±0.005 | pass 2.079503 (n7 metrics.or_bmi_Underweight, entry 78) | pass 2.08 via tolerance (n7, claim check 151) |
| or_underweight_lo | 1.2137 ±0.005 | pass 1.213699 (n7 metrics.or_lo_bmi_Underweight, entry 78) | pass 1.21 via tolerance (n7, claim check 151) |
| or_underweight_hi | 3.5629 ±0.005 | pass 3.562935 (n7 metrics.or_hi_bmi_Underweight, entry 78) | pass 3.56 via tolerance (n7, claim check 151) |
| or_overweight | 0.8777 ±0.005 | pass 0.8777123 (n7 metrics.or_bmi_Overweight_Obese, entry 78) | pass 0.88 via tolerance (n7, claim check 151) |
| or_overweight_lo | 0.4445 ±0.005 | pass 0.4444368 (n7 metrics.or_lo_bmi_Overweight_Obese, entry 78) | pass 0.44 via tolerance (n7, claim check 151) |
| or_overweight_hi | 1.7333 ±0.005 | pass 1.733382 (n7 metrics.or_hi_bmi_Overweight_Obese, entry 78) | pass 1.73 via tolerance (n7, claim check 151) |
| or_mdr | 3.0385 ±0.005 | pass 3.038484 (n7 metrics.or_mdr_tb_Yes, entry 78) | pass 3.04 via tolerance (n7, claim check 151) |
| or_mdr_lo | 1.578 ±0.005 | pass 1.577974 (n7 metrics.or_lo_mdr_tb_Yes, entry 78) | pass 1.58 via tolerance (n7, claim check 151) |
| or_mdr_hi | 5.8507 ±0.005 | pass 5.850784 (n7 metrics.or_hi_mdr_tb_Yes, entry 78) | pass 5.85 via tolerance (n7, claim check 151) |
| or_alcohol | 2.222 ±0.005 | pass 2.221989 (n7 metrics.or_alcohol_weekly_Yes, entry 78) | pass 2.22 via tolerance (n7, claim check 151) |
| or_alcohol_lo | 1.4008 ±0.005 | pass 1.400785 (n7 metrics.or_lo_alcohol_weekly_Yes, entry 78) | pass 1.4 via tolerance (n7, claim check 151) |
| or_alcohol_hi | 3.5246 ±0.005 | pass 3.52462 (n7 metrics.or_hi_alcohol_weekly_Yes, entry 78) | pass 3.52 via tolerance (n7, claim check 151) |
| or_hiv_not_tested | 2.3031 ±0.005 | pass 2.303112 (n7 metrics.or_hiv_status_Test_not_done, entry 78) | pass 2.3 via tolerance (n7, claim check 151) |
| or_hiv_not_tested_lo | 1.5 ±0.005 | pass 1.499949 (n7 metrics.or_lo_hiv_status_Test_not_done, entry 78) | pass 1.5 via tolerance (n7, claim check 151) |
| or_hiv_not_tested_hi | 3.5363 ±0.005 | pass 3.536336 (n7 metrics.or_hi_hiv_status_Test_not_done, entry 78) | pass 3.54 via tolerance (n7, claim check 151) |
| or_hiv_positive | 1.3925 ±0.005 | pass 1.392486 (n7 metrics.or_hiv_status_Positive, entry 78) | pass 1.39 via tolerance (n7, claim check 151) |
| or_hiv_positive_lo | 0.4167 ±0.005 | pass 0.4166728 (n7 metrics.or_lo_hiv_status_Positive, entry 78) | pass 0.42 via tolerance (n7, claim check 151) |
| or_hiv_positive_hi | 4.6534 ±0.005 | pass 4.653571 (n7 metrics.or_hi_hiv_status_Positive, entry 78) | pass 4.65 via tolerance (n7, claim check 151) |
| or_no_secondary | 1.5499 ±0.005 | pass 1.549942 (n7 metrics.or_secondary_education_No, entry 78) | pass 1.55 via tolerance (n7, claim check 151) |
| or_no_secondary_lo | 1.0317 ±0.005 | pass 1.031655 (n7 metrics.or_lo_secondary_education_No, entry 78) | pass 1.03 via tolerance (n7, claim check 151) |
| or_no_secondary_hi | 2.3286 ±0.005 | pass 2.32861 (n7 metrics.or_hi_secondary_education_No, entry 78) | pass 2.33 via tolerance (n7, claim check 151) |

### lackey2015-tb-default | claude:claude-haiku-5-5 | run 2

Status: answer. 143 s. 14 requests, 18 tool calls (1 failed), 0 nudges, 1 plan reminders, 4 unsourced.
Session: 20261012-024927-bc4c. Record: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-a/bench-runs/lackey2015-tb-default/claude_claude-haiku-5-5/lackey2015-tb-default/run2/home/sessions/20261012-024927-bc4c/log.jsonl
Leak check: 3 paths read, 0 outside the allow list, 0 blocked, 4 unsourced claims, 0 literature claims. Cwd: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-a/bench-runs/lackey2015-tb-default/claude_claude-haiku-5-5/lackey2015-tb-default/run2/home/sessions/20261012-024927-bc4c/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| patients | 1233 exact | pass 1233 (n1 metrics.n_rows, entry 13) | not asked |
| defaulted | 127 exact | pass 127 (n7 metrics.events, entry 79) | not asked |
| p_age | 0.00604 ±0.0002 | pass 0.006038988 (n2 metrics.p_value, entry 40) | pass 0.006 via tolerance (n8, claim check 165) |
| p_sex | 0.0000395 ±0.000005 | pass 0.00003945092 (n3 metrics.p_value, entry 43) | pass 0.00004 via tolerance (n8, claim check 165) |
| p_marital | 0.6815 ±0.001 | pass 0.6814545 (n4 metrics.p_value, entry 46) | pass 0.68 via rounding (n4, claim check 165) |
| p_poverty | 0.03436 ±0.0005 | pass 0.03436349 (n5 metrics.p_value, entry 49) | pass 0.034 via tolerance (n8, claim check 165) |
| or_drug | 4.7816 ±0.005 | pass 4.781551 (n7 metrics.or_drug_use_Yes, entry 79) | FAIL 4.48 (n5, claim check 165) |
| or_drug_lo | 3.0522 ±0.005 | pass 3.052178 (n7 metrics.or_lo_drug_use_Yes, entry 79) | FAIL 2.49 (n13, claim check 165) |
| or_drug_hi | 7.4907 ±0.005 | pass 7.490792 (n7 metrics.or_hi_drug_use_Yes, entry 79) | FAIL 5.9 (n13, claim check 165) |
| or_underweight | 2.0795 ±0.005 | pass 2.079503 (n7 metrics.or_bmi_Underweight, entry 79) | FAIL 2.02 (n13, claim check 165) |
| or_underweight_lo | 1.2137 ±0.005 | pass 1.213699 (n7 metrics.or_lo_bmi_Underweight, entry 79) | FAIL 1.19 (n13, claim check 165) |
| or_underweight_hi | 3.5629 ±0.005 | pass 3.562935 (n7 metrics.or_hi_bmi_Underweight, entry 79) | FAIL 3.72 (n13, claim check 165) |
| or_overweight | 0.8777 ±0.005 | pass 0.8777123 (n7 metrics.or_bmi_Overweight_Obese, entry 79) | FAIL 0.86 (n13, claim check 165) |
| or_overweight_lo | 0.4445 ±0.005 | pass 0.4444368 (n7 metrics.or_lo_bmi_Overweight_Obese, entry 79) | FAIL 0.42 (n12, claim check 165) |
| or_overweight_hi | 1.7333 ±0.005 | pass 1.733382 (n7 metrics.or_hi_bmi_Overweight_Obese, entry 79) | FAIL 1.78 (n13, claim check 165) |
| or_mdr | 3.0385 ±0.005 | pass 3.038484 (n7 metrics.or_mdr_tb_Yes, entry 79) | FAIL 2.49 (n13, claim check 165) |
| or_mdr_lo | 1.578 ±0.005 | pass 1.577974 (n7 metrics.or_lo_mdr_tb_Yes, entry 79) | FAIL 1.57 (n13, claim check 165) |
| or_mdr_hi | 5.8507 ±0.005 | pass 5.850784 (n7 metrics.or_hi_mdr_tb_Yes, entry 79) | pass 5.9 via rounding (n13, claim check 165) |
| or_alcohol | 2.222 ±0.005 | pass 2.221989 (n7 metrics.or_alcohol_weekly_Yes, entry 79) | FAIL 2.29 (n13, claim check 165) |
| or_alcohol_lo | 1.4008 ±0.005 | pass 1.400785 (n7 metrics.or_lo_alcohol_weekly_Yes, entry 79) | FAIL 1.55 (n12, claim check 165) |
| or_alcohol_hi | 3.5246 ±0.005 | pass 3.52462 (n7 metrics.or_hi_alcohol_weekly_Yes, entry 79) | FAIL 3.72 (n13, claim check 165) |
| or_hiv_not_tested | 2.3031 ±0.005 | pass 2.303112 (n7 metrics.or_hiv_status_Test_not_done, entry 79) | FAIL 2.29 (n13, claim check 165) |
| or_hiv_not_tested_lo | 1.5 ±0.005 | pass 1.499949 (n7 metrics.or_lo_hiv_status_Test_not_done, entry 79) | FAIL 1.55 (n12, claim check 165) |
| or_hiv_not_tested_hi | 3.5363 ±0.005 | pass 3.536336 (n7 metrics.or_hi_hiv_status_Test_not_done, entry 79) | FAIL 3.72 (n13, claim check 165) |
| or_hiv_positive | 1.3925 ±0.005 | pass 1.392486 (n7 metrics.or_hiv_status_Positive, entry 79) | FAIL 1.55 (n12, claim check 165) |
| or_hiv_positive_lo | 0.4167 ±0.005 | pass 0.4166728 (n7 metrics.or_lo_hiv_status_Positive, entry 79) | pass 0.42 via tolerance (n12, claim check 165) |
| or_hiv_positive_hi | 4.6534 ±0.005 | pass 4.653571 (n7 metrics.or_hi_hiv_status_Positive, entry 79) | FAIL 4.48 (n5, claim check 165) |
| or_no_secondary | 1.5499 ±0.005 | pass 1.549942 (n7 metrics.or_secondary_education_No, entry 79) | pass 1.55 via tolerance (n12, claim check 165) |
| or_no_secondary_lo | 1.0317 ±0.005 | pass 1.031655 (n7 metrics.or_lo_secondary_education_No, entry 79) | pass 1.03 via tolerance (n12, claim check 165) |
| or_no_secondary_hi | 2.3286 ±0.005 | pass 2.32861 (n7 metrics.or_hi_secondary_education_No, entry 79) | FAIL 2.29 (n13, claim check 165) |

### lackey2015-tb-default | claude:claude-haiku-5-5 | run 3

Status: answer. 74 s. 9 requests, 12 tool calls (0 failed), 0 nudges, 1 plan reminders, 0 unsourced.
Session: 20261012-025151-ecbf. Record: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-a/bench-runs/lackey2015-tb-default/claude_claude-haiku-5-5/lackey2015-tb-default/run3/home/sessions/20261012-025151-ecbf/log.jsonl
Leak check: 3 paths read, 0 outside the allow list, 0 blocked, 0 unsourced claims, 0 literature claims. Cwd: /private/tmp/claude-501/-Users-parker-Code-guided-analysis/1838a63c-2a33-4afe-8a2a-f3a4d25b6244/scratchpad/w-rest-part-a/bench-runs/lackey2015-tb-default/claude_claude-haiku-5-5/lackey2015-tb-default/run3/home/sessions/20261012-025151-ecbf/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| patients | 1233 exact | pass 1233 (n1 metrics.n_rows, entry 12) | not asked |
| defaulted | 127 exact | pass 127 (n7 metrics.events, entry 69) | not asked |
| p_age | 0.00604 ±0.0002 | pass 0.006038988 (n2 metrics.p_value, entry 35) | pass 0.00604 via tolerance (n8, claim check 113) |
| p_sex | 0.0000395 ±0.000005 | pass 0.00003945092 (n3 metrics.p_value, entry 38) | pass 0.0000395 via tolerance (n8, claim check 113) |
| p_marital | 0.6815 ±0.001 | pass 0.6814545 (n4 metrics.p_value, entry 41) | FAIL 0.707 (n7, claim check 113) |
| p_poverty | 0.03436 ±0.0005 | pass 0.03436349 (n5 metrics.p_value, entry 44) | pass 0.0344 via tolerance (n8, claim check 113) |
| or_drug | 4.7816 ±0.005 | pass 4.781551 (n7 metrics.or_drug_use_Yes, entry 69) | pass 4.78 via tolerance (n7, claim check 113) |
| or_drug_lo | 3.0522 ±0.005 | pass 3.052178 (n7 metrics.or_lo_drug_use_Yes, entry 69) | pass 3.05 via tolerance (n7, claim check 113) |
| or_drug_hi | 7.4907 ±0.005 | pass 7.490792 (n7 metrics.or_hi_drug_use_Yes, entry 69) | pass 7.49 via tolerance (n7, claim check 113) |
| or_underweight | 2.0795 ±0.005 | pass 2.079503 (n7 metrics.or_bmi_Underweight, entry 69) | pass 2.08 via tolerance (n7, claim check 113) |
| or_underweight_lo | 1.2137 ±0.005 | pass 1.213699 (n7 metrics.or_lo_bmi_Underweight, entry 69) | pass 1.21 via tolerance (n7, claim check 113) |
| or_underweight_hi | 3.5629 ±0.005 | pass 3.562935 (n7 metrics.or_hi_bmi_Underweight, entry 69) | pass 3.56 via tolerance (n7, claim check 113) |
| or_overweight | 0.8777 ±0.005 | pass 0.8777123 (n7 metrics.or_bmi_Overweight_Obese, entry 69) | pass 0.88 via tolerance (n7, claim check 113) |
| or_overweight_lo | 0.4445 ±0.005 | pass 0.4444368 (n7 metrics.or_lo_bmi_Overweight_Obese, entry 69) | pass 0.44 via tolerance (n7, claim check 113) |
| or_overweight_hi | 1.7333 ±0.005 | pass 1.733382 (n7 metrics.or_hi_bmi_Overweight_Obese, entry 69) | pass 1.73 via tolerance (n7, claim check 113) |
| or_mdr | 3.0385 ±0.005 | pass 3.038484 (n7 metrics.or_mdr_tb_Yes, entry 69) | pass 3.04 via tolerance (n7, claim check 113) |
| or_mdr_lo | 1.578 ±0.005 | pass 1.577974 (n7 metrics.or_lo_mdr_tb_Yes, entry 69) | pass 1.58 via tolerance (n7, claim check 113) |
| or_mdr_hi | 5.8507 ±0.005 | pass 5.850784 (n7 metrics.or_hi_mdr_tb_Yes, entry 69) | pass 5.85 via tolerance (n7, claim check 113) |
| or_alcohol | 2.222 ±0.005 | pass 2.221989 (n7 metrics.or_alcohol_weekly_Yes, entry 69) | pass 2.22 via tolerance (n7, claim check 113) |
| or_alcohol_lo | 1.4008 ±0.005 | pass 1.400785 (n7 metrics.or_lo_alcohol_weekly_Yes, entry 69) | pass 1.4 via tolerance (n7, claim check 113) |
| or_alcohol_hi | 3.5246 ±0.005 | pass 3.52462 (n7 metrics.or_hi_alcohol_weekly_Yes, entry 69) | pass 3.52 via tolerance (n7, claim check 113) |
| or_hiv_not_tested | 2.3031 ±0.005 | pass 2.303112 (n7 metrics.or_hiv_status_Test_not_done, entry 69) | pass 2.3 via tolerance (n7, claim check 113) |
| or_hiv_not_tested_lo | 1.5 ±0.005 | pass 1.499949 (n7 metrics.or_lo_hiv_status_Test_not_done, entry 69) | pass 1.5 via tolerance (n7, claim check 113) |
| or_hiv_not_tested_hi | 3.5363 ±0.005 | pass 3.536336 (n7 metrics.or_hi_hiv_status_Test_not_done, entry 69) | pass 3.54 via tolerance (n7, claim check 113) |
| or_hiv_positive | 1.3925 ±0.005 | pass 1.392486 (n7 metrics.or_hiv_status_Positive, entry 69) | pass 1.39 via tolerance (n7, claim check 113) |
| or_hiv_positive_lo | 0.4167 ±0.005 | pass 0.4166728 (n7 metrics.or_lo_hiv_status_Positive, entry 69) | pass 0.42 via tolerance (n7, claim check 113) |
| or_hiv_positive_hi | 4.6534 ±0.005 | pass 4.653571 (n7 metrics.or_hi_hiv_status_Positive, entry 69) | pass 4.65 via tolerance (n7, claim check 113) |
| or_no_secondary | 1.5499 ±0.005 | pass 1.549942 (n7 metrics.or_secondary_education_No, entry 69) | pass 1.55 via tolerance (n7, claim check 113) |
| or_no_secondary_lo | 1.0317 ±0.005 | pass 1.031655 (n7 metrics.or_lo_secondary_education_No, entry 69) | pass 1.03 via tolerance (n7, claim check 113) |
| or_no_secondary_hi | 2.3286 ±0.005 | pass 2.32861 (n7 metrics.or_hi_secondary_education_No, entry 69) | pass 2.33 via tolerance (n7, claim check 113) |

