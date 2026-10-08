# Runs: prompt-only method emulation with the qupath adapter

Date: 2026-10-08. Model: `ollama:qwen3:8b`. QuPath 0.7.0. No paper number exists for these images.
The numbers below are pinned by this work. They are not reference values.

Prompt (the guided variant of `prompt.md`, with the file path added):

> In the Ki-67 stained lymphoma slide, what fraction of tumor cells have a positive nucleus, and
> how much does that fraction change if the staining cutoff moves? The slide file is
> /Volumes/T7/guided-analysis/data/bankhead2017-qupath-workshop/ki678_lymphoma.ndpi

Command (each run used a new `GA_HOME`):

```
GA_HOME=<temp dir> node bin/ga.js -p "<prompt>" --adapter catalog/qupath \
  --model ollama:qwen3:8b --answers answers.json --output json
```

`answers.json` gave: replication_unit slide, image_type Brightfield (H-DAB), stain_vectors default,
pixel_size_um 0.4537, region_to_analyze 15250,7250,2000,2000, detection_channel Hematoxylin OD,
requested_pixel_size 0.5, background_radius 8, sigma 1.5, minimum_area 10, maximum_area 400,
detection_threshold 0.1, cell_expansion 5, score_compartment Nucleus: DAB OD mean,
single_threshold true, positive_threshold 0.2.

## Summary

| Run | Session | Adapter state | Result |
| --- | --- | --- | --- |
| 1 | 20261008-004149-3c07 | 0.1.0, first draft | Stopped by hand. Adapter fault. |
| 2 | 20261008-005258-ffa1 | 0.1.0, after fix 1 | Stopped by hand. Adapter fault. |
| 3 | 20261008-010500-0d72 | 0.1.0, after fix 2 | Finished. Fail on the answer. |

The adapter changed between the runs. Version 0.1.1 has the changes made after run 3. A fourth
run was not made because the limit is three runs. The tests of version 0.1.1 pass
(`ga adapter check catalog/qupath --run-tests`).

## Run 1

- The model gave `detect_tissue` the pixel size of the image (0.4537) as `requested_pixel_size`.
- QuPath then searched for tissue at full resolution on a slide of 1003 million pixels. The call did not end in 10 minutes.
- Cause: the tool accepted any value. Fix 1: `requested_pixel_size` of `detect_tissue` must be between 5 and 100 micrometers.
- Not finished. No answer.

## Run 2

- The model passed the original slide path to every step, not the state file of the last step.
- Each `detect_cells` call failed with "The image type is not set", eight times in a row.
- Cause: the steps chain through state files. The 8B model did not follow the chain.
- Fix 2: `detect_cells`, `detect_positive_cells`, `detect_tissue` and `create_tiles` accept `image_type`, `stain_vectors` and `pixel_width_um`. The decisions fill them. One call with the slide path now works. The tool descriptions explain the state chain.
- Not finished. No answer.

## Run 3

- Steps: `open_image`, `set_image_type`, `set_pixel_size`, `detect_cells`, `detect_positive_cells` (four times).
- `open_image` result: 28800 by 34816 pixels, pixel size 0.45367933944288175 micrometers, 3 channels. These match `expected.yaml` (28800, 34816, 0.4537 with tolerance 0.001).
- The sensitivity runs of "Detection threshold" used `region` = whole image, because the region decision had a default and was not yet answered. Three QuPath runs on the whole slide did not end. They were stopped by hand (kill of the QuPath process). The session then continued.
- Fix 3: the decision has no default. A tool stops with a clear error on an image of more than 40 million pixels with no region and no annotation.
- Region 15250,7250,2000,2000: 12670 cells.
- The positive fraction by cutoff (Threshold 1+, single threshold, nucleus DAB mean), from the sensitivity runs:

| Threshold 1+ | Positive cells | Percent of 12670 |
| --- | --- | --- |
| 0.1 | 657 | 5.19 |
| 0.2 | 496 | 3.91 |
| 0.4 | 315 | 2.49 |

- A three-level run (Threshold 1+ 0.3, 2+ 0.4, 3+ 0.5) gave 400 positive cells, 3.16 percent.

Final answer of the model (short form): 3.16 percent positive (400 of 12670). It then said the
fraction is 3.91 percent at cutoff 0.3, 3.16 percent at 0.4, and 2.37 percent at 0.5.

Result: fail.

- The answer gave the numbers of other runs with wrong cutoffs: 3.91 percent belongs to cutoff 0.2, and 3.16 percent belongs to a three-level run at 0.3.
- The value 2.37 percent and 300 cells match no tool result.
- The review reported "unsourced_numbers" (error) and four "deviation_not_mentioned" warnings. The model changed `single_threshold` and `threshold_1` and did not say so.
- The answer did not state the region, the pixel size, the score compartment or the image type, which `STANDARDS.md` requires.

What went wrong, and what the adapter now does:

- The summary line of a detection tool did not show the cutoff. Version 0.1.1 shows the threshold values in the summary and in the metrics (`threshold_used`, `threshold_1_used`).
- The harness runs the sensitivity table before the other open questions have an answer, and it uses the defaults of those questions. Report to the harness owner: reproduction is the `region_to_analyze` decision with a default, then `detect_cells` on the slide.
- When a decision was still open, the harness replaced the model values with the answers (the first `detect_cells` call used sigma 1.5 and requested pixel size 0.5, not the model values). When the decision already had a value, a different model value was used and only logged as a deviation (the last two `detect_positive_cells` calls used `threshold_1` 0.3 and `single_threshold` false).
