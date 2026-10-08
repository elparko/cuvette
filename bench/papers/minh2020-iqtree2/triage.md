# Triage: minh2020-iqtree2

Entry numbers (eNN) are ids in the log.jsonl of the session folder.
Classes: a = tool or adapter fault, b = harness fault, c = benchmark spec fault, d = model fault.

- qwen3:8b: `20261008-152353-06e1`

| Model | Item | Expected | Got | Class | Cause | Fix |
| --- | --- | --- | --- | --- | --- | --- |
| qwen3:8b | log_likelihood | -21152.54 | computed -21152.5377 (pass), reported none | b | The answer states **-21152.5377**. In claim checks e36 and e41 the value has the sign dropped (21152.5377), so no claim matches the logged negative value, and the review calls it unsourced. The sign is read only after a space or an opening bracket. A bold marker (**) before the minus sign hides it. The fix belongs in src/core/claims.ts (the sign pattern must accept * and _ before the sign). I did not make it because the coordinator owns that file now. | not fixed in this branch (see report) |

Other findings:

- e8 (a): align_sequences on a PHYLIP file returned "mafft failed:" with no reason. The model recovered in e26. Fixed in e9bc6f2: the tool says that the file is aligned, and algorithm has a default.

Commits in this branch for this paper: e9bc6f2
