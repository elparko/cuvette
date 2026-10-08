# Triage: belenky2003-sleepstudy

Entry numbers (eNN) are ids in the log.jsonl of the session folder.
Classes: a = tool or adapter fault, b = harness fault, c = benchmark spec fault, d = model fault.

- qwen3:8b: `20261008-141505-8475`
- claude: `20261008-145426-4eaa`

| Model | Item | Expected | Got | Class | Cause | Fix |
| --- | --- | --- | --- | --- | --- | --- |
| qwen3:8b | days_slope | 10.467 | computed 10.467 (pass), reported none | b | The run ended with status error. The next model request after e31 did not finish in 600 s (error e32). No answer was written. The ollama call had no output cap. A repeating loop of tokens is the likely cause. The log has no deltas, so this is not proven. | 191c659 (cap of 8192 output tokens) |
| qwen3:8b | se_days_random_slope | 1.546 | computed 1.546 (pass), reported none | b | Same cause as days_slope. | 191c659 |
| qwen3:8b | se_days_random_intercept_trap | 0.804 | computed 1 (table cell) | c | A trap value. It appears only if the run fits the wrong model (random intercept only). The run did not, so the item failed. | 076bce5 (trap items are reference items and are not in the pass counts) |
| qwen3:8b | se_days_ols_trap | 1.238 | computed 1 (table cell) | c | Same as the other trap item. | 076bce5 |
| claude | se_days_random_intercept_trap | 0.804 | computed 1 (table cell) | c | Same as the other trap item. Claude fitted the right model. | 076bce5 |
| claude | se_days_ols_trap | 1.238 | computed 1 (table cell) | c | Same as the other trap item. | 076bce5 |

Commits in this branch for this paper: 076bce5, 191c659
