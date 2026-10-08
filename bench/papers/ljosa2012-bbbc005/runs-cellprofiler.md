# Runs with the cellprofiler adapter (ljosa2012-bbbc005)

Date: 2026-10-08. Model: `ollama:qwen3:8b` (shared with other jobs, so slow). Program: CellProfiler 4.2.8 (x86_64 build under Rosetta, x86_64 Java 17).

Prompt (all runs): the guided question of `prompt.md`, the image folder `sub/BBBC005_v1_images`, only `*_w2.TIF`, every sixth file (100 images, true total 5007), and a request for the detected to true ratio, the mean absolute error and R squared.

Command (run 1; `<n>` is the run folder under `/Volumes/T7/guided-analysis/tools/cellprofiler/scratch/emu<n>`):

```
GA_HOME=<scratch>/emu<n>/home node bin/ga.js -p "$(cat <scratch>/emu<n>/prompt.txt)" \
  --adapter catalog/cellprofiler --model ollama:qwen3:8b --answers <scratch>/emu<n>/answers.json --allow all --output json
```

Answers file (all runs): replicate = images or fields, pixel size = uncalibrated, diameter 30 to 120, Global, Otsu, declump Shape, discard_border false. Run 3 adds discard_outside false. These values are mine. The sources give no value for them. A person must confirm them.

Expected (`expected.yaml`, published CellProfiler counts): ratio at blur 1 is 0.934 (tolerance 0.02), mean absolute error 3.36 (tolerance 0.1). The sample has 5007 true cells.

| Run | Adapter version | Session | Result | Pass |
| --- | --- | --- | --- | --- |
| 1 | 0.1.0 (first draft) | `20261008-011227-4329` | ratio 0.13 (30 to 120 range), error 43.5, R squared 0.13 | fail |
| 2 | 0.1.0 (defaults removed from linked arguments) | `20261008-014531-37aa` | ratio 0.397 and 0.271, error 30.2 and 36.5 | fail |
| 3 | 0.1.0 (discard_outside is a human decision) | `20261008-022930-da44` | ratio 0.4665 (2336 of 5007), no final answer | fail |

## Run 1

Short final answer: ratio 0.2127 (10 to 40 pixels) and 0.1306 (30 to 120 pixels). The numbers match the log, but they come from comparison runs, not from the chosen settings.

What went wrong:

- The model passed every optional argument with zero-like values (adaptive_window 0, threshold_smoothing 0, dividing_lines None). With declumping on and dividing lines None, CellProfiler found 0 objects. The adapter now maps these values to the defaults and no longer accepts dividing_lines None.
- The model did not use the decision values. It set discard_border true and declump None. The harness only logs a deviation. The count is not forced to the decision.
- The sensitivity runs started from the model arguments with the CellProfiler default diameter (10 to 40 pixels).
- The answer used numbers from comparison runs. The review flagged it (`number_from_comparison`).

## Run 2

Short final answer: ratio 0.3974 and 0.2706, mean absolute error 30.17 and 36.52, R squared 0.37 and 0.15. It says that blur changes the accuracy. No blur levels exist in this sample, because all files are F1.

What went wrong:

- `discard_outside` was an agent decision, and the agent kept true. Merged clumps are larger than 120 pixels and left the count. Run 3 makes it a human decision.
- The model again passed discard_border true, against the decision (deviation logged).
- Nine sensitivity runs and the repeats took about 40 minutes. Each run of 100 images needs about 110 seconds (about 70 seconds of start time).

## Run 3

All decisions were applied in the best call: diameter 30 to 120, Shape, discard_border false, discard_outside false. Result: 2336 nuclei, ratio 0.4665, mean area 5079 pixels. This is far from the published ratio of 0.934.

What went wrong:

- The model repeated plan, list_dir and count_nuclei for about 85 minutes (20 count calls). It gave no final answer. I stopped the process, so there is no final answer text.
- The tool is not the cause of the low ratio only. On three test images with 1, 5 and 10 cells the same settings give the exact counts (16 of 16). The images with up to 100 cells have many touching nuclei. The ratio falls with the density. A better pipeline (smoothing filter size, minimum distance between maxima, intensity declumping) must be chosen by the scientist and tested. I did not tune it.

## Harness notes (not fixed, per rules)

- A linked tool argument that the model gives with another value is not replaced by the decision value. `deviation` is logged only. Small models pass all arguments. Reproduction: run command above with `--adapter catalog/cellprofiler`, then read `deviation` entries in `log.jsonl`.
- The sensitivity check of a decision runs the pending call with the model arguments (not the decision record). In run 1 and 2 the first runs used 10 to 40 pixels.

## Not run

`caicedo2019-bbbc039` was not run. The adapter template has one IdentifyPrimaryObjects module and no illumination step. The paper pipeline has 14 modules. Another template is needed.
