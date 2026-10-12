# Notes on a harness study: what Cuvette uses from it

Source: Fan, Zhang and others, "An Empirical Study of Harness Design for Coding Agents",
arXiv 2609.20804 (17 September 2026).

## What the study did

The study kept one model loop fixed and changed three parts of the harness:

- the context management
- the planning tool
- the tool set (predefined tools or bash only)

It tested four models on SWE-Bench Verified and Terminal-Bench 2.1 (176 settings).
It compared settings with a paired exact McNemar test on the same tasks.

## What it found

1. Context management helps most when the window is small. At 32k, 79% of the
   unmanaged SWE-Bench runs stopped with a full context. Most of the gain came
   from the prevention of that stop.
2. Cheap elision first, then an LLM summary only when the history is still too
   large, gave the same success as the other methods at the lowest cost.
3. Recall of elided output (a `recall_event` tool) gave no gain. Strong models
   almost never called it.
4. A plan tool kept weak models working long enough to make an edit. For strong
   models, it removed extra checks after the edit and made the runs about 30%
   cheaper.
5. Predefined tools helped models that are weak with bash. Bash-capable models
   were cheaper with bash only.
6. Stuck detection: a reminder after five identical calls, and a stop after eight
   identical failing calls.

## What changed in Cuvette

### Context management inside one turn (commit 0be9169)

Before, compaction needed two user turns. A benchmark run or a headless run has
one turn. Thus a long run on a 32k local model had no context management. The
qwen3:8b failure analysis found the same gap.

Now, before each step:

1. The estimate counts the system prompt, the tool schemas and the history.
2. Above 50% of the window, old tool output that is longer than 1,500 characters
   keeps its first 400 characters and a note. The note tells the model that the
   record keeps the full output. Only the live history changes.
3. Above 70%, one call summarizes the older messages under fixed headings. A
   second summary updates the first one.
4. The latest request, the current plan and the recent steps stay as they are.
   The recent steps are at least the last two model replies, up to 30% of the
   window.

The session keeps the request message of the current turn by identity. The
request text often starts with the harness notes (the decisions brief), so a text
check cannot find it.

Each new shortened output changes the prompt from that point. This makes the
prompt cache start again from that point, on Claude and on Ollama. On Claude, this
happens only above about 500k tokens.

The record, the claim check and the number trail use the record, not the live
history. Thus a shortened tool output does not change a result or a check.

### Paired comparison of two benchmark results (commit b68ae33)

`cuvette bench compare --results a.json,b.json [--model spec]` pairs each paper run
and item in the two files. It shows the four outcome counts and the exact McNemar
p value. Use it to test a harness change on the same papers before and after.

## What did not change, and why

- Recall tool: no gain in the study, and the record already keeps the full output.
- Bash only: Cuvette tools are program adapters with a decision record and a
  manual route. A shell cannot give the record of each number.
- Plan tool: Cuvette already has a plan that the scientist approves, and a nudge
  when plan steps are open.
- Stuck detection: after three identical calls in a row, Cuvette makes the third
  call fail and asks for the final answer. This is stricter than the study. A
  change is not necessary.

## How to check it on a local model

The check costs nothing, because it uses a local model. A 16k window makes the
largest earlier wolf2018 requests (21,717 tokens on 9 October, 28,893 on 8 October)
too large without compaction.

1. Run one paper on qwen3:8b with `numCtx` 16384.
2. Look for the notices that start with "The harness shortened" and for a
   `compaction` entry in the session record.
3. Run the same paper at 32768 and compare the two files with `cuvette bench compare`.

## Result of the local check (11 October 2026)

| Setting | Status | Computed items | Summaries | Shortened outputs | Largest request | Input tokens |
|---|---|---|---|---|---|---|
| wolf2018-scanpy, qwen3:8b, window 16,384 | answer | 6 of 6 | 5 | 3 | 14,843 | 155,030 |
| Same paper, window 32,768 (final benchmark, 9 October) | answer | 6 of 6 | 0 | 0 | 21,717 | 166,045 |

The 9 October request of 21,717 tokens is too large for a 16,384 window.

All context management happened inside one turn. The largest request stayed below
the window. This run used the first version of the change. In that version, the
summary removed the request when the request started with the harness notes. The
fix came after this run. The scores did not change. This is one run on one paper, so it shows no overflow. It does not show
an accuracy gain.

At this small window, the harness summarized five times in 14 model steps. Each
summary is one more model call. Look at this count before you make the window
smaller.
