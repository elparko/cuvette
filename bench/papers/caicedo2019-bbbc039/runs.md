# Prompt-only run: Caicedo 2019 (BBBC039) with Cellpose

## Final run

| Item | Value |
| --- | --- |
| Date | 2026-10-08 |
| Model | `ollama:qwen3:8b` (local) |
| Adapter | `cellpose` 0.1.0 (draft), Cellpose 4.2.1.1, model `cpsam_v2`, Apple GPU |
| Session | `20261008-022919-78f3` (record in `GA_HOME/sessions/`, `GA_HOME=/private/tmp/claude-501/scratch/home-bb3`) |
| Run time | about 26 minutes (the harness ran the diameter comparison on all 50 images, two extra passes) |

Command. The working folder is the data folder.

```bash
cd /Volumes/T7/guided-analysis/data/caicedo2019-bbbc039/x
GA_HOME=/private/tmp/claude-501/scratch/home-bb3 node bin/ga.js \
  -p "Take the 50 test images listed in the metadata folder. Segment the nuclei and report how many I miss compared with the hand annotation. The images are in the folder 'images/images', the hand-drawn masks are in the folder 'masks/masks', and the list of test images is the file 'metadata/metadata/test.txt'." \
  --adapter catalog/cellpose --model ollama:qwen3:8b \
  --answers bb-answers.json --allow all --output json
```

The prompt is plain request 3 from `prompt.md`, plus one sentence that tells the model where the three data items are.

`bb-answers.json` (decision values from `expected.yaml`):

```json
{"model_type":"cpsam_v2","cell_diameter":0,"cellprob_threshold":0,"flow_threshold":0.4,
 "min_cell_size":15,"exclude_border_cells":false,"pixel_size":0.656,
 "replication_unit":"images or fields"}
```

| `expected.yaml` decision | Value used | Adapter decision |
| --- | --- | --- |
| channel: Hoechst (only channel) | the single channel | none |
| threshold method, declump, background step (CellProfiler settings) | not used. Cellpose has no such settings | none |
| object diameter 20 to 80 pixels (CellProfiler range) | 0 (the model decides) | `cell_diameter` |
| discard border objects: false | false | `exclude_border_cells` |
| replication unit: field of view | images or fields | `replication_unit` |
| scale 0.656 micrometers per pixel | 0.656 | `pixel_size` |
| split for reporting: test (50 images) | the list `metadata/metadata/test.txt` | `only_listed_in` in the call |
| IoU match threshold 0.7 | fixed in the tool (also IoU 0.5 and the mean over 0.5 to 0.95) | none |

## Agent answer (short)

The agent read `test.txt`, then called `segment_cells` on `images/images` with `only_listed_in` and `truth_folder`. The harness compared the diameters 0 and 60. The agent then reported: 50 images, 5,476 cells found, 5,720 true cells, mean Dice 0.969, average F1 0.863 (IoU 0.5 to 0.95), and 0.086 of the true cells missed at IoU 0.7. It gave the settings: model `cpsam_v2`, diameter 0, flow threshold 0.4, cell probability threshold 0, smallest cell 15 pixels, 0.656 micrometers per pixel. The numbers are in an earlier message of the same turn. The last message holds only a list of four lab rules that the model proposed. It calls them "approved". They are not. They wait for the scientist.

## Numbers against `expected.yaml`

| Quantity | Agent run | Expected | Tolerance | Result |
| --- | --- | --- | --- | --- |
| Nuclei in the truth masks, test split | 5,720 | 5,720 | 0 | pass |
| Images in the split | 50 | 50 | 0 | pass |
| Average F1 over IoU thresholds | 0.863 (IoU 0.5 to 0.95 in steps of 0.05) | 0.811 (CellProfiler advanced), 0.790 (basic) | 0.05 | outside by 0.002 for advanced |
| Fraction of true nuclei missed at IoU 0.7 | 0.086 | 0.155 (advanced), 0.201 (basic) | 0.05 | outside. Cellpose misses fewer nuclei than the CellProfiler pipelines |

The F1 and missed-fraction values in `expected.yaml` belong to the CellProfiler pipelines. `expected.yaml` says that Cellpose has no published value on this set. The IoU threshold list of the paper was not read. This run used 0.5 to 0.95. So the two rows are a comparison and not a target. The direction is as expected: Cellpose is better than the classical baseline.

Other numbers from the same run: mean Dice 0.969, F1 at IoU 0.5 is 0.956. With diameter 60 the harness got 5,265 cells, average F1 0.850 and 0.105 missed.

Cellpose models were trained on many public image sets. The agent did not say that the model may have seen BBBC039. The adapter has a review check for this (`training_data_overlap`). It did not fire on this run.

Result: **pass** for the counts. The F1 and missed-fraction rows are a comparison with another tool, and the agent did not write a conclusion about them.

## What went wrong

- Earlier session `20261008-020512-9e08` (same prompt) stopped before the answer. Ollama stopped answering after the harness had finished all work (`Cannot reach Ollama at http://localhost:11434`). Its tool result had the same numbers.
- Earlier session `20261008-015604-1d31` (first prompt run) used all 200 images because the model left out `only_listed_in`. I stopped it after the first tool call. The tool description for `only_listed_in` now says to always give it for a named list.
- The model called `inspect_image` on `test.txt`. That failed (`UnidentifiedImageError`) and the model went on. The review step shows this as a warning.
- The final message is not an answer to the question. The harness showed the answer text only from the last message.
- The model proposed four lab rules without being asked. The text says "approved". Nobody approved them.
- The review check `border_cells_kept` fired because the decision for border cells is "keep".
