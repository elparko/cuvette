# Prompt-only run: Mahbod 2024 (NuInsSeg) with scikit-image

## Final run

| Item | Value |
| --- | --- |
| Date | 2026-10-08 |
| Model | `ollama:qwen3:8b` (local) |
| Adapter | `scikit-image` 0.1.0 (draft), scikit-image 0.26.0 |
| Session | `20261008-014618-9813` (record in `GA_HOME/sessions/`, `GA_HOME=/private/tmp/claude-501/scratch/home-nu9`) |
| Run time | about 10 minutes (the harness ran 8 extra threshold and size comparisons on all 665 images) |

Command. The working folder is the data folder, so all paths are short.

```bash
cd /Volumes/T7/guided-analysis/data/mahbod2024-nuinsseg/x
GA_HOME=/private/tmp/claude-501/scratch/home-nu9 node bin/ga.js \
  -p "Outline the nuclei in these H&E patches and tell me how close the outlines are to the hand-drawn ones. Use all organ folders. The patches are in the current folder, path '.'. Each organ folder has a 'tissue images' folder with PNG files and a 'label masks' folder with the hand-drawn masks." \
  --adapter catalog/scikit-image --model ollama:qwen3:8b \
  --answers nu-answers.json --allow all --output json
```

The prompt is plain request 2 from `prompt.md`, plus three sentences that tell the model where the data is. The first form of the prompt, without these sentences, gave no path to the model (see "What went wrong").

`nu-answers.json` (decision values from `expected.yaml`):

```json
{"stain_channel":"hematoxylin","object_polarity":"bright","threshold_method":"otsu",
 "min_object_size":30,"exclude_border_objects":false,"split_touching":false,
 "pixel_size":0,"replication_unit":"images or fields"}
```

| `expected.yaml` decision | Value used | Adapter decision |
| --- | --- | --- |
| stain channel: hematoxylin | hematoxylin | `stain_channel` |
| method: U-Net (no U-Net in scikit-image) | global Otsu | `threshold_method` |
| object size range: none stated | 30 pixels (the size of the baseline in `expected.yaml`) | `min_object_size` |
| replication unit: image patch grouped by organ | images or fields | `replication_unit` |
| scale: not stated | 0 (uncalibrated) | `pixel_size` |
| vague areas: scoring rule not read | not an option; the tool scores all pixels | none |

## Agent answer (short)

The agent ran `count_objects` on all 665 images with the pattern `*/tissue images/*.png`. The harness first compared four threshold methods and four size filters, then used the answers. The agent reported 66,610 objects, 35,138 true nuclei, mean Dice 0.538, mean F1 at IoU 0.5 of 0.148 and mean average F1 of 0.058. It then tried `compare_masks` on a file that does not exist and wrote a confused ending (see below).

## Numbers against `expected.yaml`

| Quantity | Agent run | Expected | Tolerance | Result |
| --- | --- | --- | --- | --- |
| Image patches | 665 | 665 | 0 | pass |
| Nuclei in released label masks | 35,138 (`total_truth`, sum of the 31 organ rows) | 35,138 | 0 | pass |
| Mean pixel Dice, Otsu on hematoxylin, objects under 30 pixels removed | 0.538 (0.53805) | 0.538 | 0.02 | pass |
| Nuclei in paper Table 2 | not compared | 30,698 | 0 | the released masks do not match this value (as in `expected.yaml`) |
| Mean Dice of the U-Net models (0.788, 0.814) and PQ 0.513 | not reachable with a threshold | 0.788, 0.814, 0.513 | 0.03 | not tested. Otsu gives 0.538. This is the expected gap |

Object count for the baseline. The run found 66,610 objects. `paper.md` gives 64,406 for the same recipe. The difference comes from the size filter. The tool keeps pixel groups of 30 pixels or more. The old call `remove_small_objects(mask, 30)` also removes groups of exactly 30 pixels. The Dice values agree (0.5380 against 0.5385). `expected.yaml` does not list the object count as a target.

Result: **pass** for the numbers that `expected.yaml` lists.

## What went wrong

Eight earlier sessions ended before an answer. They are listed so that the number of runs is clear. Each one gave a fix. This is more than the three runs that the procedure allows.

| Session | Cause | Fix |
| --- | --- | --- |
| `20261008-004342-d66d` | I wrote `<organ>` in the prompt. The model used it as a path, then asked itself the same question in a loop. I stopped it. | Prompt without placeholders. |
| `20261008-005410-f4c0` | The model did not know the current folder. It listed `/Users/parker/Desktop` with `list_dir` and I stopped it. | Prompt names the path `.`. |
| `20261008-010254-1cff`, `20261008-010421-eb65` | The model gave a folder to `inspect_image`. The tool refused a folder. | `inspect_image` now lists the image patterns of a folder. |
| `20261008-010606-9434` | The model used the decision key `exclude_border_objects` as an argument name. The argument was `exclude_border`. | The tool arguments now have the same names as the decision keys. |
| `20261008-011614-93f7` | The note "Ask the scientist" listed six decisions. The model asked free-text questions in a loop. | Four decisions moved to the setup stage. The answers file fills them. |
| `20261008-012509-9be7` | The default file pattern was `*.tif`, but the images are PNG. The model also gave a wrong `truth_folder` (`./label masks`). | Default pattern `*`. A missing `truth_folder` is read as a name to search for. A wrong `truth_folder` is an error. |
| `20261008-013429-7cb6`, `20261008-014317-cc48` | The model gave `truth_folder` as `*/label masks`. The old code scored nothing and did not warn. | Same fix. |

Problems that remain in the final run. None of them changes the numbers.

- The model asked for `compare_masks` with a file name that it made up (`label_image.tif`). Folder mode scores each image and writes no label images. The final text says that the comparison "failed". It did not fail. The scores are in the first result.
- The final text says the smallest object size was "not specified". The setup record shows 30.
- The model left all method settings out of its call. The harness filled them from the decisions (hematoxylin, bright, Otsu, size 30, no border removal, no watershed). The log shows no deviation.
- The rule check `no_size_filter` fired on the comparison run with size 0, not on the final call.
- The review step raised the error `number_from_comparison` (the answer uses F1 values that also appear in a comparison run) and a referee error about the made-up file name. The values 0.148 and 0.058 are the values of the chosen setting (size 30). The number 0.5 is the IoU threshold in the name of the metric. The finding is probably a false alarm.
- The model did not report the count for each organ. `per_group.csv` in the work folder of the session has it.
