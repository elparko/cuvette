# Paper benchmark

The paper benchmark runs a model on the same request for many tools. It scores the numbers that the tools make and the numbers that the model reports.

## What it measures

Each paper has a file `bench/papers/<id>/bench.yaml`. The file holds the request, the setup values, the answers of the scientist, and the expected numbers (items). The values and tolerances come from `expected.yaml`.

The benchmark gives two scores for each item.

- **Computed.** A number in the session record is within the tolerance. The benchmark looks at the numbers of the main steps. It ignores the comparison runs. This score measures the tools and the harness.
- **Reported.** The final answer states the value. The claim check must label the number "measured". This score measures the model. A number with no source does not count.

The benchmark picks the logged number nearest to the expected value. The report names that number, its node, its path, and its log entry. A reviewer can check each item.

An item with `in_answer: false` has a computed score only. The request does not ask the model to state that value.

### Item flags

- `in_answer: false` — computed score only.
- `from_comparison: true` — the computed score also reads the comparison runs. Use it for a value that only a comparison run gives. An example is the count for a database that the setup does not choose.
- `tool: <name>` — the computed score reads only the nodes of that tool. Use it when another tool logs a number that is near the expected value by chance.
- `reference: true` — the item shows a value that is not part of the score. It can be a value that the request does not ask for, or a trap value (the result of a wrong method). It can also be a value from another method, such as a published number of a different program. The report shows "match" or "differs". The pass counts do not include the item.

### Matching rules

- Tolerance is absolute. `exact: true` means the number must be equal.
- `abs: true` compares the absolute value. Use it when the sign depends on the order of the groups.
- A reported number also passes if it equals the expected value rounded to the digits that the answer shows. The report marks this as "via rounding". The answer must show at least two significant digits: "1.6" passes for 1.58, "2" does not. A reported zero never passes this way. Exact items never pass this way.
- The final claim check before the final answer counts. A number in an earlier draft does not count.

## Process metrics

For each run the report gives:

- duration, model requests, input, output, and cache tokens
- tool calls and failed tool calls
- nudges and plan reminders (messages that start with `[Notes from the harness]`)
- review findings by severity, and unsourced numbers
- deviations (values that differ from the setup) and overwritten values
- the end state: answer, error, timeout, or no answer

## How to run it

1. Fetch the data with `bench/papers/<id>/fetch.sh`. The benchmark skips a paper whose data is missing.
2. Check the specs: `cuvette bench papers --models ollama:qwen3:8b --dry-run`
3. Run it: `cuvette bench papers --papers student1908-sleep,white2021-flowkit --models ollama:qwen3:8b,claude --runs 3`

Options:

- `--papers id,id` or `all` (default).
- `--models spec,spec`. Specs are `claude`, `claude:<id>`, `ollama:<name>`, and `openai:<base url>|<model>`.
- `--runs N` sets the runs for each paper and model. The default is 1.
- `--out file` sets the report name. The benchmark writes `<file>.md` and `<file>.json`. The default is `bench/results/papers-<date>-<models>.md`.
- `--dry-run` checks the model specs, the adapters, and the data paths. It runs no model.

Runs are sequential. Each run uses a new `CUVETTE_HOME` under `$CUVETTE_DRIVE_ROOT/tools/bench-runs/<date>/`. Without `CUVETTE_DRIVE_ROOT` or its folder, the run folder is in the system temporary folder. The author sets `CUVETTE_DRIVE_ROOT=/Volumes/T7/guided-analysis`, the folder on the external drive of the author. The session record of each run stays there. The report names its path. The benchmark copies `credentials.json` from the real `CUVETTE_HOME` so that Claude runs find the key.

The benchmark uses the code of the headless mode (`cuvette -p`). It answers the questions of the harness from `answers`, applies `setup`, and allows the tools in `allow`. A run stops when it reaches `timeout_s`.

Environment variable `CUVETTE_BENCH_DATA` sets the data root. The default is `$CUVETTE_DRIVE_ROOT/data`, or `~/.cuvette/cache/bench-data` without `CUVETTE_DRIVE_ROOT`.

## Limits

- The answers file simulates the scientist. The answers file fixes the method decisions. The benchmark does not test whether a model picks a good method.
- The benchmark uses the same answers file for every model. A model that asks different questions gets the same values or the harness default.
- A small tolerance can reject a correct number that a model rounds. The rounding rule covers only the digits that the answer shows.
- The claim check finds numbers in sentences. It can miss a number in a table or a list, or give it the wrong label.
- Some prompts were rebuilt from the notes of the hand runs, because the original prompt files are gone. The files `bench.yaml` show the text that the benchmark sends.
- Items with `in_answer: false` do not test the model.
- One run is a sample. Small local models change from run to run. Use `--runs` of 3 or more before you compare models.
- Tool errors, such as a missing program, appear as failed computed items. Read the status and the failed tool calls before you blame the model.
- We expect some papers to fail for tool reasons, such as an adapter that cannot reach the data. The report does not mark them.

## Items left out of the score

- `trap: true`: a value that a wrong method gives (for example the unpaired Welch p for paired data). The review checks catch a trap in the answer. The value does not count as computed or reported.
- `optional: true`: a value that the prompt does not ask for and that the requested analysis does not need. Examples are an EEG (electroencephalography) peak when the prompt asks about gradiometers, and a count from a different program.
- A value from a comparison run counts as computed. The report gives it the label "via comparison".
