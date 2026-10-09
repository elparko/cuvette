# Paper benchmark 2026-10-09

Models: claude:claude-haiku-5-5. Runs per paper and model: 1.
Each cell: computed passes / reported passes. Computed: a logged number is within tolerance. Reported: the final answer states the value, labeled measured by the claim check.

| Model | Computed | Reported | Runs | Not answered |
| --- | --- | --- | --- | --- |
| claude:claude-haiku-5-5 | 14/14 | 14/14 | 1 | 0 |

## Matrix

| Paper | claude:claude-haiku-5-5 |
| --- | --- |
| kovacs2026-mycoplasma-mic | 14/14 / 14/14 |

## Process metrics

Sums over all runs of a model.

| Model | runs | seconds | requests | input tokens | output tokens | cache read | tool calls | failed calls | nudges | plan reminders | revisions | info | warning | error | unsourced | deviations | overwritten |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| claude:claude-haiku-5-5 | 1 | 129 | 7 | 18 | 14825 | 138096 | 5 | 1 | 0 | 0 | 1 | 2 | 6 | 4 | 7 | 0 | 0 |

Estimated Claude cost from the token counts (list prices, before any discount):

- claude:claude-haiku-5-5: $0.01 for 1 runs

## Leak check

Blind mode: the file tools of the agent read only the allow list (the data folder of the paper, the folder of the run, program folders, system and temporary folders). Child processes cannot read the repository, the results, past benchmark runs, the reference folder or the harness home. Only the adapter processes can read the adapter folders. The session cwd is the work folder of the run.

Paths read: the paths in the tool calls and steps of the agent. Outside: paths not on the allow list. Blocked: reads that blind mode stopped. Unsourced and literature: claims in the final answer that no logged step holds. A number from memory shows up there.

| Paper | Model | Run | Sandbox | Paths read | Outside | Blocked | Unsourced | Literature |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| kovacs2026-mycoplasma-mic | claude:claude-haiku-5-5 | 1 | on | 1 | 0 | 1 | 7 | 0 |

## Details

### kovacs2026-mycoplasma-mic | claude:claude-haiku-5-5 | run 1

Status: answer. 129 s. 7 requests, 5 tool calls (1 failed), 0 nudges, 0 plan reminders, 7 unsourced.
Session: 20261009-033411-7b04. Record: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/kovacs2026-mycoplasma-mic/run1/home/sessions/20261009-033411-7b04/log.jsonl
Leak check: 1 paths read, 0 outside the allow list, 1 blocked, 7 unsourced claims, 0 literature claims. Cwd: /Volumes/T7/guided-analysis/tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/kovacs2026-mycoplasma-mic/run1/home/sessions/20261009-033411-7b04/work.

| Item | Expected | Computed | Reported |
| --- | --- | --- | --- |
| tylvalosin_mic50 | 0.5 ±0.001 | pass 0.5 (n1 metrics.mic50_Mycoplasma_anserisalpingitidis_Tylvalosin, entry 31) | pass 0.5 via tolerance (n2, claim check 75) |
| tylvalosin_mic90 | 2 ±0.001 | pass 2 (n1 metrics.mic50_Mycoplasma_anserisalpingitidis_Lincomycin, entry 31) | pass 2 via tolerance (n2, claim check 75) |
| oxytetracycline_mic50 | 16 ±0.001 | pass 16 (n1 metrics.mic50_Mycoplasma_anserisalpingitidis_Oxytetracycline, entry 31) | pass 16 via tolerance (n2, claim check 75) |
| oxytetracycline_mic90 | 64 ±0.001 | pass 64 (n1 metrics.mic90_Mycoplasma_anserisalpingitidis_Oxytetracycline, entry 31) | pass 64 via tolerance (n2, claim check 75) |
| doxycycline_mic50 | 5 ±0.001 | pass 5 (n1 metrics.mic50_Mycoplasma_anserisalpingitidis_Doxycycline, entry 31) | pass 5 via tolerance (n2, claim check 75) |
| doxycycline_mic90 | 10 ±0.001 | pass 10 (n1 metrics.mic90_Mycoplasma_anserisalpingitidis_Doxycycline, entry 31) | pass 10 via tolerance (n1, claim check 75) |
| tiamulin_mic50 | 0.625 ±0.001 | pass 0.625 (n1 metrics.mic50_Mycoplasma_anserisalpingitidis_Tiamulin, entry 31) | pass 0.625 via tolerance (n2, claim check 75) |
| tiamulin_mic90 | 2.5 ±0.001 | pass 2.5 (n1 metrics.mic90_Mycoplasma_anserisalpingitidis_Tiamulin, entry 31) | pass 2.5 via tolerance (n1, claim check 75) |
| tylosin_mic50 | 16 ±0.001 | pass 16 (n1 metrics.mic50_Mycoplasma_anserisalpingitidis_Oxytetracycline, entry 31) | pass 16 via tolerance (n2, claim check 75) |
| tylosin_mic90 | 64 ±0.001 | pass 64 (n1 metrics.mic90_Mycoplasma_anserisalpingitidis_Oxytetracycline, entry 31) | pass 64 via tolerance (n2, claim check 75) |
| lincomycin_mic50 | 2 ±0.001 | pass 2 (n1 metrics.mic50_Mycoplasma_anserisalpingitidis_Lincomycin, entry 31) | pass 2 via tolerance (n2, claim check 75) |
| spectinomycin_mic50 | 8 ±0.001 | pass 8 (n1 metrics.mic50_Mycoplasma_anserisalpingitidis_Spectinomycin, entry 31) | pass 8 via tolerance (n2, claim check 75) |
| tilmicosin_mic50 | 64 ±0.001 | pass 64 (n1 metrics.mic90_Mycoplasma_anserisalpingitidis_Oxytetracycline, entry 31) | pass 64 via tolerance (n2, claim check 75) |
| tilmicosin_mic90 | 64 ±0.001 | pass 64 (n1 metrics.mic90_Mycoplasma_anserisalpingitidis_Oxytetracycline, entry 31) | pass 64 via tolerance (n2, claim check 75) |
| enrofloxacin_mic50_printed (reference) | 10 ±0.001 | match 10 (n1 metrics.mic90_Mycoplasma_anserisalpingitidis_Doxycycline, entry 31) | match 10 via tolerance (n1, claim check 75) |

