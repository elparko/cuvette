# Design: the batch runs outside the main context

Status: proposal, for discussion with Parker. No code yet.

## The problem

In one lab session (count-cells-red-them, 11 October 2026), one model conversation held
the full analysis:

| Measure | Value |
|---|---|
| Model calls | 40 (all claude-opus-5-5) |
| Tool calls | 325: segment_cells 144, count_cell_uptake 138, run_script 13, other 30 |
| Cost before the pilot approval | $1.23 (23 model calls) |
| Cost after the pilot approval | $4.47 (17 model calls) |
| Total cost | $5.70 |
| Cache writes | 848k tokens, $4.24 |
| Cache reads | 2.54M tokens, $0.51 |
| Output | 47k tokens, $0.95 |
| Wait for the first reply after a pause | 35 to 40 seconds |

The cost after the approval comes from two causes:

1. Each per-sample tool result goes into the main context. About 700k tokens of
   results were written to the cache after the approval.
2. When the scientist answers after more than 5 minutes, the cache is empty. The
   next call writes the full history again (about 190k tokens, $0.95, 35 to 40 s).

The model does no new thinking for most of these steps. The scientist confirmed
the method in the pilot. The steps after that repeat the method on each sample.

## Facts from the code

- After the pilot approval, the only instruction to the agent is one sentence in a
  tool result: "Run all samples now with the same method and settings"
  (`src/core/session.ts`, `pilotResult`). Nothing in the harness acts on the
  approval.
- `segment_cells` (cellpose adapter) and `count_cell_uptake` (image-assays adapter)
  already accept a folder and return one table for all images. The agent called
  them once for each field instead.
- `exportFlow` (`src/core/exports.ts`) turns the recorded steps into a flow with
  input placeholders. `replayFlow` (`src/core/replay.ts`) runs a flow with the
  tools directly, with no model.
- The sample sheet (`samples.csv`, `src/core/samples.ts`) lists each sample with
  its path, group and unit. Nothing iterates over it yet.
- The retitle step already calls a second, small model (`claude-haiku-5-5`). No
  tool-using worker loop exists.

## The proposal: three parts

### Part 1. The working brief

The harness keeps a short document about the analysis. The harness makes it from
the record, not from a model call, so it costs nothing and holds no invented facts.

It contains:

- the question, and each message of the scientist, word for word
- the confirmed plan, the definitions and each decision with its value
- the pilot sample, the pilot result and the approval
- a progress table: each sample, its status and its key numbers
- the output files
- the open questions and the deviations
- the last final answer of the agent

Each new turn starts with the system prompt, the tools, the brief and the new
message. The earlier turns are not sent again. They stay in the record, and the
scientist can read the brief in a side panel tab ("Brief"). The brief is the
"side working context": the model knows the project, but the full step history
does not go back through it.

Claude-specific rule: a new turn that starts from the brief is a new history. It
sends no earlier thinking blocks, so the history-editing check of Claude Opus 5.5
cannot refuse it. This is the "simple compaction" shape that the Claude API
documentation recommends.

Effect on the cache: each turn starts small (system, tools, brief: about 15k to 30k
tokens). A pause between messages then costs little, so the 1-hour cache is not
necessary.

### Part 2. The batch runner (no model)

When the scientist approves the pilot, the harness shows a card:
"Run the confirmed method on the other N samples?"

When the scientist confirms:

1. The harness takes the tool calls of the pilot from the record, with their
   exact settings.
2. It finds the per-sample input: the argument that holds the pilot file.
3. For each sample in the sample sheet (or each matching file), it calls the same
   tools with the input replaced. Each call is a normal step in the record, with
   its node and outputs.
4. The app shows one row with a progress bar ("Segment cells: 34 of 80").
5. At the end, the agent gets one table: sample, status, key numbers, and the
   samples that failed.

No model call happens in the loop. The method is the same as the pilot, call by
call, which matches the record-of-every-number rule of Cuvette. The existing
`exportFlow` placeholder logic and `replayFlow` are the base.

A shorter first step (Part 2a): if a tool has a folder mode, run it once on the
folder with the pilot settings. For this session, that is 2 calls instead of
about 280.

### Part 3. A small worker for a failed sample (optional)

If a sample fails (an error, or a QC check that does not pass), a small model
(claude-haiku-5-5, low effort) gets a small context: the confirmed method, the
decisions, this sample's error, and the tools of the adapter. It can try a
correction inside the confirmed decisions only. It cannot change a decision. Each
correction is a deviation in the record. It returns one line to the main agent.

## The choice for Parker

You asked for a small Haiku agent for each sample. The batch runner in Part 2
does the same work with no model at all.

| | Batch runner (Part 2) | Haiku worker for each sample |
|---|---|---|
| Model cost for 80 samples | $0 | about $0.10 to $0.40 |
| Same steps as the pilot | yes, call by call | the model can vary |
| Repeat the run later | exact | not exact |
| Handles an odd sample | no; it marks it as failed | yes |

Recommendation: the batch runner for all samples, and the Haiku worker only for a
sample that fails (Part 3).

## Estimate for the lab session

| Part of the session | Now | With Parts 1 and 2 |
|---|---|---|
| Before the pilot approval | $1.23 | about $1.23 (no change) |
| Batch of the other samples | $4.47 | $0 for the loop; about $0.20 to $0.40 for the agent to read the table and answer |
| Wait after a pause | 35 to 40 s | a few seconds (a small context) |

These are estimates. Part 2 must be measured on a copy of a real session.

## Order of the work

1. Part 2a: the folder call after the pilot approval. Small. Uses existing tools.
2. Part 1: the working brief, and new turns that start from it.
3. Part 2: the batch runner over the sample sheet.
4. Part 3: the worker for a failed sample.

Parts 1 to 3 change the agent loop, so they go on a branch with a pull request.

## Questions for Parker

1. Batch runner with no model, or a Haiku worker for each sample?
2. Must the batch start only after the scientist confirms the card, or at once
   after the pilot approval?
3. Must the agent see the full table at the end, or only a summary and the
   failed samples?
4. Is it correct that earlier turns are not sent again, if the scientist can read
   the brief in a side panel?
