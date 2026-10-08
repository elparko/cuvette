# Prompt-only run: Schindelin 2012 (Fiji, blobs.gif) with scikit-image

## Final run

| Item | Value |
| --- | --- |
| Date | 2026-10-08 |
| Model | `ollama:qwen3:8b` (local) |
| Adapter | `scikit-image` 0.1.0 (draft), scikit-image 0.26.0 |
| Session | `20261008-025001-4409` (record in `GA_HOME/sessions/`, `GA_HOME=/private/tmp/claude-501/scratch/home-blobs3`) |
| Run time | about 2 minutes |

Command. The working folder is the data folder.

```bash
cd /Volumes/T7/guided-analysis/data/schindelin2012-fiji-blobs
GA_HOME=/private/tmp/claude-501/scratch/home-blobs3 node bin/ga.js \
  -p "Count the blobs in this image: blobs.gif" \
  --adapter catalog/scikit-image --model ollama:qwen3:8b \
  --answers blobs-answers.json --allow all --output json
```

The prompt is plain request 1 from `prompt.md`, plus the file name. The first run used the request without the file name (see "What went wrong").

`blobs-answers.json` (decision values from `expected.yaml`):

```json
{"stain_channel":"gray","object_polarity":"bright","threshold_method":"isodata",
 "min_object_size":0,"exclude_border_objects":false,"split_touching":false,
 "pixel_size":0,"replication_unit":"images or fields"}
```

| `expected.yaml` decision | Value used | Adapter decision |
| --- | --- | --- |
| threshold method: Default (ImageJ) | isodata. ImageJ Default is a variant of isodata. It selects the same pixels on this image | `threshold_method` |
| polarity: the image has an inverting LUT, the range 126-255 is selected | bright. The tool reads the raw palette values, as ImageJ does | `object_polarity` |
| size range 0 to Infinity | 0 | `min_object_size` |
| exclude edge particles: both counts are valid | false (edges included) | `exclude_border_objects` |
| watershed: none | false | `split_touching` |
| scale: pixels | 0 (uncalibrated) | `pixel_size` |

## Agent answer (short)

The agent read the image (256 by 254 pixels, 8 bit, values 8 to 248). It called `count_objects` once. The harness first compared four threshold methods and four size filters. The agent reported: threshold method isodata, threshold 124.7, bright objects, minimum size 0, 64 objects, mean area 347.5 pixels.

## Numbers against `expected.yaml`

| Quantity | Agent run | Expected | Tolerance | Result |
| --- | --- | --- | --- | --- |
| Particles, edges included | 64 | 64 | 0 | pass |
| Particles, edge particles excluded | not asked by this prompt. The adapter test `blobs_count_edges_excluded` gives 46. | 46 | 0 | pass in the adapter test |
| Threshold range selected by Default | isodata cutoff 124.7, so the values 125 to 255. No pixel has the value 125, so the pixels are the same as the range 126-255 | 126-255 | 0 | pass in effect (the agent did not report a range) |

Other numbers that match the ImageJ adapter tests: total area 22,243 pixels and mean area 347.547 pixels (agent: 347.5).

The comparison table from the harness shows that the count depends on the method: Otsu 64, Li 65, isodata 64, Triangle 119. The size filter changes the count as well: 64 (size 0), 61 (15), 60 (30), 57 (60). The agent did not write this in its answer.

Result: **pass**.

## What went wrong

- Run 1 (`20261008-003843-0e4f`): the prompt had no file name. The model called `inspect_image` with `/path/to/image.png` and stopped. This is a prompt problem. `prompt.md` gives no path.
- Run 2 (`20261008-004033-64f0`): 64 objects, correct. The adapter had other argument names then. The model's text reported settings that it never used (minimum size 10, exclude border true, split true). The harness had used the decision values, so the number 64 was right and the text was wrong.
- Run 3 (this run): 64 objects. The text says "The minimum object size was set to 0" and lists the true settings. It starts with a stray sentence because of the review step.
- The model proposed `min_object_size: 10` in its call. The harness replaced it with the decision value 0 for the final call. The log has no deviation entry for this call.
- The review checks `border_objects_kept` and `no_size_filter` fired. Both are correct. The scientist chose to keep edge particles and to use no size filter.
