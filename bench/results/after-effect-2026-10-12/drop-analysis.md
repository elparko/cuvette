# Drop analysis: Haiku benchmark, before and after proposal 2.2

Before: commit 31f71fb, `bench/results/final-2026-10-09/*claude_haiku*.json`.
After: commit 19677a4, `bench/results/after-effect-2026-10-12/shards/after-haiku-s{0..3}.json`.
Each side has 53 papers x 3 runs (159 runs). Every run ended with status `answer`.

## Method

1. Join before and after by paper, run number and item key.
2. Use the `pass` field of `computed` and `reported` in each item. The scorer is `src/bench/papers-score.ts`. No rescore was done.
3. List each item that passed before and failed after (lost). List the reverse (gained).
4. Read the answer and `log.jsonl` of each lost run.
5. Measure the noise: count lost and gained items between two before runs of the same papers (before run 1 against before run 3, and so on).

My recount from the item fields: computed 1423 before and 1417 after. Reported 1141 before and 1130 after. These differ a little from the totals in the task text. The lost and gained lists below come from the item fields.

## Result

- Lost: 40 items. Gained: 23 items. Net: minus 17 of about 2570 items.
- Per run, after against before, same run number: lost 11, 14, 15 and gained 2, 8, 13.

## Noise level

Two before runs of the same papers also differ. Examples (lost, gained):

| Pair | Lost | Gained |
|---|---|---|
| before run 1 to before run 3 | 14 | 3 |
| before run 2 to before run 3 | 13 | 4 |
| after run 1 to after run 3 | 11 | 7 |
| after run 2 to after run 3 | 13 | 8 |

A net change of minus 10 occurs between two runs of the same code. The net change of minus 17 over three runs is about 1.2 standard deviations. It is not significant.

## Lost items by cause

Cause codes: a = noise, b = new rules of 2.2, c = other code change between 31f71fb and 19677a4, d = scorer.

| Paper, run | Items lost | What happened | Cause |
|---|---|---|---|
| oreshkova, 1 and 2 | 11 reported | The F and p values for acini area changed between runs. Run 3 gained 4 of them. Before run 3 had the same wrong values (26.78, 6.012). | a |
| bemis, 1 and 3 | 5 computed, 3 reported | The model stopped after peak picking and wrote "Waits for you" in place of calling `segment_image`. Before, the model called it and the harness answered the questions. Run 3 also used another sample fraction. | c (short-answer prompt, 394e60c), weak |
| gramfort, 3 | 5 reported | The final table listed only the id 1 count and the total. The five counts for id 2, 3, 4, 5 and 32 are missing. The computed values are correct. | c (394e60c: "one table, nothing more") |
| mahbod, 3 | 3 computed, 1 reported | The model ran only a 12-image pilot of one organ. It then argued about the object size and never ran the 665 images. | a |
| rossi, 2 and 3 | 2 computed | The model did not run the log-rank test. The item is optional (not in the answer). | a, possibly c (fewer extra steps) |
| yun, 2 and 3 | 1 computed, 2 reported | `lpc_cv_printed`: before the answer said "20" and passed by rounding. After the table said 20.03 and failed. The computed value was wrong in all runs. | d (rounding luck) |
| white, 2 | 2 reported | The model wrote 133,860 and 47,241 for the no-compensation counts. Different value, same step. | a |
| alexandrov, 2 and 3 | 2 reported | The item failed in before run 1 too. | a |
| palmer, 1 | 1 computed, 1 reported | The model asked for dataset ids and ran no count. Before, only run 1 passed. | a |
| andreasson, 2 | 1 computed | The model used `rank_test`. The item scores only the tool `compare_two_groups`. The p value 0.004163 is correct. | d (tool filter) |
| lackey, 2 | 1 reported | The p value for marital status is 0.71 (chi-square) in place of the Fisher value 0.6815. It passed in only one before run. | a |
| caicedo, 1 | 1 reported | It passed in only one before run. | a |

Classes (item counts): a about 26, c about 13, d about 4. No lost item is caused by the effect-size or interval rules of 2.2.

## Checks for the 2.2 rules and for retry

- Warnings `p_without_effect` (14 after, 9 before), `p_without_interval` (4), `family_uncorrected` (1). They occur in 3 of 17 runs that lost items (oreshkova 1 and 2, andreasson 2). None of the lost items traces to a rewrite, a rounding or a dropped value that the warning caused.
- No run hit a turn limit or token limit. All 159 runs ended with `answer`. Mean requests: 10.4 before, 9.6 after. Mean tool calls: 11.0 before, 10.3 after.
- The 2.2 prompt works: answers with "95% CI" went from 28 to 150 of 159. The score did not fall for this reason.
- Retry (6b24e51): 39 retry notices in 29 runs. All runs recovered. Only 4 retry runs lost an item (lackey 2, alexandrov 3, oreshkova 1, mahbod 1 has none). The losses there have other causes.
- Thinking-block drop (9b923a8) and context shortening (0825cee): no lost item traces to a context loss. No run shows a summary notice before a wrong value.

## Weak real effect

Prompt commit 394e60c (short final answers) is in the same range as 2.2. It adds "Be short", "The final answer has this form, and nothing more" and "Do not repeat the full answer".

- Runs with 6 requests or fewer: 41 before, 53 after.
- Runs with 8 requests or fewer: 64 before, 79 after.
- Answers shorter than 2000 characters: 13 before, 38 after.
- Gramfort run 3 lost 5 items because the one-table form dropped the per-id counts.
- Bemis runs 1 and 3 stopped early.

The size is small: about 10 to 13 of the 17 net items, and the data are consistent with noise.

## Verdict

The drop is noise, with one small possible regression. It comes from the short-answer prompt (394e60c), not from the 2.2 effect-size rules and not from retry.

- Net change: minus 17 items of about 2570. The same size appears between two before runs.
- Per paper: only oreshkova (minus 7), bemis (minus 6), gramfort (minus 5) and mahbod (minus 4) fall by more than 3. Oreshkova and mahbod are noise. Bemis and gramfort follow the short-answer form.

## Proposed fix (not applied)

Edit `src/core/prompt.ts`, rule "The final answer has this form, and nothing more". Add one sentence to item 2:

- "Put one row in the table for each number that the request asks for, and for each count."

Add a sentence to "Be short":

- "Do not stop to ask the scientist about a value that a tool question asks. Call the tool."

Then run the Haiku benchmark again. Use the same 53 papers and 3 runs. Add a before-to-before comparison, so the noise level is known.

Do not remove the 2.2 rules. They cost no items that this analysis can find.

## Scorer notes (not fixed)

- `scoreComputed` ignores nodes of another tool (`item.tool`). A correct value from `rank_test` fails for `mannwhitney_p`.
- `scoreReported` takes the nearest number in a claim. A confidence interval bound can match an item (caicedo run 1 picked 0.1053).
- A rounded value passes and a more exact wrong value fails (yun `lpc_cv_printed`).
