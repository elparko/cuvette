# Harness comparison: Cuvette and Claude Code

This document compares the harness overhead of Cuvette with the overhead of Claude Code
(the `claude` command-line interface (CLI), version 2.1.296). It does not compare the
quality of the model output. Both harnesses use the same model, `claude-haiku-5-5`.

Measured on 12 October 2026 on one macOS computer (Darwin 24.6.0), Node 22 or later.

## Results

"Before" is the Cuvette code at commit 506c260. "After" includes the fixes in this change.
Each time is the median of three runs, except where the table gives a different count.

| Metric | Cuvette before | Cuvette after | Claude Code |
| --- | --- | --- | --- |
| Cold start: process start to first API request (mock) | 1,086 ms | 558 ms | 230 ms |
| Process start to first streamed text token (mock) | 1,091 ms | 564 ms | 235 ms |
| Process start to first text token (real Haiku, one run) | 4,210 ms | not run | 2,649 ms |
| Harness gap after a `read_file` / `Read` result (median of 75 steps) | 1.6 ms | 1.5 ms | 9.2 ms |
| Harness gap after a small shell command (median of 75 steps) | 3.5 ms | 3.5 ms | 19.4 ms |
| First shell command of a session | 7 ms | 7 ms | 224 to 269 ms |
| Peak resident memory (RSS) in a 50-step run | 360 MB | 157 MB | 330 MB |
| Input tokens in the first request (system prompt, tools, request) | 11,022 | 11,022 | 23,548 |
| System prompt tokens | 2,612 | 2,612 | 2,799 |
| Tool definition tokens (tool count) | 8,259 (25) | 8,259 (25) | 17,482 (20) |
| Cache read share of input tokens, step 2 and later (real Haiku) | 96.3% (3 steps) | not run | 98.9% (1 step) |
| Model calls for the same small task (real Haiku) | 4 | not run | 2 |

Cuvette without the default `tables` adapter starts in 193 ms (after the fixes, peak RSS
103 MB). Thus most of the remaining start time is the `tables` adapter.

## Start time after the start fixes

A second change removes the wait for the `tables` adapter and the largest Node costs.
"Before" is the Cuvette code at commit d171ef9. "After" includes the start fixes.
Each time is the median of nine runs. The runs of the two versions alternate.

| Metric | Cuvette before | Cuvette after | Claude Code |
| --- | --- | --- | --- |
| Cold start: process start to first API request (mock) | 578 ms | 148 ms | 230 ms |
| Process start to first streamed text token (mock) | 583 ms | 152 ms | 235 ms |

Both Cuvette versions use the default `tables` adapter. The Claude Code values are the
values of the first table. The computer had a load average of about 11 during the runs.
Without the Node compile cache, the "after" value is 161 ms.

## Method

1. A mock Messages API server on localhost answers each request at once. Thus the model
   time is zero, and all time is harness time. The mock sends a short text block and one
   tool call in each reply. The calls alternate between a file read and `echo step N`.
   After the last step, the mock sends a final text reply.
2. Each harness gets the mock address in `ANTHROPIC_BASE_URL`. Claude Code runs with
   `-p`, `--output-format stream-json`, `--include-partial-messages`,
   `--dangerously-skip-permissions` and an empty `CLAUDE_CONFIG_DIR`. Thus it has no user
   settings, plugins, Model Context Protocol (MCP) servers or `CLAUDE.md` text. Cuvette runs
   with `-p`, `--generic`, `--allow all`, `--referee none`, `--output stream-json`, an empty
   `CUVETTE_HOME` and the bundle in `dist/`.
3. The runner records the process start time. It records the time of the first
   `text_delta` line (Claude Code) or `delta` event of kind `text` (Cuvette) on standard
   output.
4. The mock records the arrival time of each request and the end time of each reply.
   The harness gap is the arrival of request N+1 minus the end of reply N. The gap
   includes the tool run. A read of a 30-byte file takes less than 0.1 ms, so the read gap
   is almost all harness time.
5. `/usr/bin/time -l` gives the peak resident set size of the harness process.
6. The free `count_tokens` endpoint counts the tokens of the first captured request.
   It counts the system prompt and the tools separately against a one-word request.
   Claude Code sends a `system` role message in `messages`. The count script changes it to
   a user message, so the Claude Code count is an approximate value.
7. For the real model, a logging proxy on localhost forwards each request to the Claude
   API and records the usage of each reply. The task is: read one file, run `echo hello`,
   and give one line. Cuvette has `maxSteps` 4 and Claude Code has `--max-turns 4`.
   The two real runs made six model calls.

For the start fixes, each Cuvette version is a copy with no `.git` folder and a new bundle.
Thus `bin/cuvette.js` does not compare the file times, as in an installed package. The
mock sends one text reply to each request. Each run has a new empty `CUVETTE_HOME`, so the
saved program versions are not available. `node --cpu-prof` gave the Node profile.

The cache read share is `cache_read_input_tokens` divided by the sum of `input_tokens`,
`cache_creation_input_tokens` and `cache_read_input_tokens`.

## Causes and fixes

### Adapter module through tsx (fixed)

Each session loads the `tables` adapter by default. Its module is `adapter.ts`. The bundle
in `dist/` has no TypeScript loader, so it started tsx and compiled `adapter.ts` and the
source files that it imports, at each start. This added a loader thread and a second copy
of the shared modules. It cost about 460 ms and about 100 MB.

Fix: `scripts/build-cli.mjs` now puts each catalog `adapter.ts` into the same bundle, at
`dist/catalog/<name>/adapter.js`. The adapter shares the chunks of the CLI. The loader in
`src/adapters/manifest.ts` uses this file when the CLI runs from the bundle. A plugin keeps
`import.meta.url` of each adapter pointed at its catalog folder. `bin/cuvette.js` already
checks that the bundle is newer than each input file, and the adapter files are now inputs.

### Adapter index at the first request (fixed)

At the first request, Cuvette parsed all 62 catalog `adapter.yaml` files (2.1 MB) to find
adapters for the named files. This took about 400 ms, also when the request named no file.

Fix: `fileTypeHint` now makes the index only if the request names a file. A request that
names a file still pays this time once in each session.

### Python version check of the tables adapter (fixed)

Before the first request, Cuvette ran the version command of the `tables` adapter. This
command starts Python and imports openpyxl. After it, Cuvette ran Python again to record the
package versions of the environment. The first request waited for the two commands, about
400 ms on this computer. On a loaded computer, the version command took 11 s to 31 s in four
runs. The limit was 30 s.

Fix: a Python adapter that the session loads at the start now starts at once
(`startAdapter` with `quick` in `src/adapters/runtime.ts`). The Python worker already starts
at the first call. The tools and the instructions of the adapter are in the first request.

- The version command runs after the start, with a limit of 5 s
  (`START_VERSION_TIMEOUT_MS` in `src/adapters/locate.ts`).
- The first call to the adapter waits for the version command.
- If the command runs longer than 5 s, the record gets a notice. The notice names the
  adapter and the program path, and gives the version from the adapter manifest.
- The record of the package versions also runs after the start. A step of the adapter
  waits for it, and so does the end of the session.
- Each identified version goes to `cache/program-versions.json` in `CUVETTE_HOME`, with the
  time and size of the program file. The next session uses this version at the start.
- If the version command gives a different version than the saved version, the record
  gets a notice. This can occur after a package update in the same Python environment.

Before the version command ends, the session uses the saved version. If there is no saved
version, it uses the version in the adapter manifest, as it did before after a time-out. The
system prompt and the `session` entry of the record keep this value. The adapter steps and
`/adapters` show the version from the version command.

Commands that check a program on request, such as `cuvette doctor`, still wait for the
version command, with the limit of 30 s.

### Node start costs (fixed)

A CPU profile of the start showed these costs before the first request:

| Cost | Time | Fix |
| --- | --- | --- |
| YAML parse of `catalog/tables/adapter.yaml` (26 kB) | about 17 ms | The build writes the parsed file to `dist/catalog/<name>/adapter.json` |
| Load of the `yaml` package | about 10 ms | The package loads at the first YAML parse (`src/core/yaml.ts`) |
| Load of the MCP SDK and `ajv` | about 15 ms | `src/adapters/runtime.ts` loads `mcp.ts` only for an MCP adapter |
| Compile of the bundle | about 13 ms | `bin/cuvette.js` turns on the Node compile cache |

The loader uses `adapter.json` only when the CLI runs from the bundle, and only if the file
is not older than `adapter.yaml`. The compile cache is in the temporary folder of the
system. The first start after a new bundle compiles the code again.

Most of the remaining start time is the load and compile of the bundle (about 40 ms).
The Claude SDK takes about 18 ms and `zod` takes about 15 ms. The record, the settings and
the key read took less than 5 ms each.

### Extra model calls (not fixed, behavior)

If the session has an adapter and no program step ran in the turn, Cuvette tells the model to
run a step. In the real run, this added one model call after the answer. In the mock runs,
it added three calls. This is a rule of the method, not overhead, so it did not change.

### Effort for Haiku (not fixed, behavior)

`ClaudeProvider` selects effort `medium` for Haiku, but the settings default `effort: high`
replaces it. Thus Cuvette sends `high` and Claude Code sends `medium`. This makes the first
Cuvette reply longer (534 output tokens against 175). A change has an effect on the model
output and the benchmark scores, so it is not in this change.

## Limits

- One computer, three runs for each mock metric, and one real run for each harness.
- The real runs are not equal tasks: Claude Code made the two tool calls in one reply.
- The time to the first real token includes model time, thinking and effort. Use the mock
  rows for the harness part.
- The gap includes the work of each tool. Claude Code runs commands through a shell with
  a saved shell state. Cuvette runs an argument list with no shell.
- Peak RSS is the largest value in the run, not the value at the end.
- Claude Code ran with no user configuration. A configuration with plugins, MCP servers
  and skills adds tokens and start time.
- The scripts are not in the repository. They are a mock server, a proxy and a runner of
  about 250 lines in total.
