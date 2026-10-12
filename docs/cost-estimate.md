# Cost estimate and spend limit

The plan card shows a cost range before the scientist approves the plan. The scientist sets a spend limit in Settings.

## What the card shows

- A Claude model: "About $0.40 to $1.20 with Sonnet."
- A local model: "Free: runs on this computer."
- A limit that leaves less money than the estimate: the card adds "Your limit has $0.30 left this month."

## How the range is made

The fit script is `scripts/fit-estimate.ts`. It reads the benchmark runs of 9 October 2026. It uses the 480 Claude runs of 53 papers.

1. It computes the cost of each run from the token counts and the prices in `src/core/spend.ts`.
2. For each model, it fits `log(cost) = a + b * log(steps)`. Steps are the analysis steps that the run executed (`metrics.nodes`).
3. It takes the 2nd and the 98th percentile of the residuals as the low and high edge of the range.
4. It writes the constants to `src/core/estimate-table.ts`.

To fit again, run `npx tsx scripts/fit-estimate.ts --write`. Add a folder of run files as an argument to use other data.

## Held-out check

The script holds out 20% of the papers, fits on the rest, and counts the held-out runs whose cost falls in the range. It does this 200 times with random splits of papers.

| Model | Runs | One split | 200 splits | High edge / low edge |
| --- | --- | --- | --- | --- |
| Opus 5.5 | 160 | 34 of 34 | 93.3% | 3.7 |
| Sonnet 5.5 | 161 | 31 of 33 | 94.3% | 4.2 |
| Haiku 5.5 | 159 | 33 of 33 | 93.4% | 5.4 |

The target was 90% or more. A 5th to 95th percentile band gave 85.8% to 88.1%, which is too low. The 2nd to 98th band is wide: the high edge is about four times the low edge.

## Limits of the fit

- The runs do not record the number of plan steps. The fit uses the number of executed steps. The card counts the plan steps and ignores the skipped ones.
- The runs do not record the size of the data summary. The range does not use it.
- A model without runs (Fable) uses the Sonnet range, scaled by the ratio of token prices. The mix of tokens is the mean mix of the Sonnet runs.
- The prices are the list prices in `src/core/spend.ts`. Fit again if a price changes or if the agent changes the way it uses tokens.

## Spend limit

- The setting is `budgetUsd` ("Budget per month"). It is in the Settings page and in `/settings`.
- `CUVETTE_BUDGET_USD` wins over the setting. If the variable is not a positive number, the harness uses the setting.
- At 100% of the limit, Claude requests stop. This did not change.
- At 80%, an interactive session asks one question: continue, switch to a cheaper model, or stop. The cheaper model is Sonnet for Opus and Fable, and Haiku for Sonnet. Haiku has no cheaper model, so the card has two choices.
- The card appears once. It appears again only after the spend falls below 80% (a new month or a higher limit) and rises again.
- A headless run, and a run without a person at the terminal, logs one notice and continues to the limit.
- A local model has no spend, so it never asks.
- The status line shows the spend of the session.
