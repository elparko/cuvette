---
name: check-accuracy-against-known-counts
description: How to compare the nucleus count with known counts in the file names, for example the BBBC005 blur set.
---

# Compare counts with known counts

Use this when the file name holds the true count, as in the BBBC005 names SIMCEPImages_A01_C1_F1_s01_w1.TIF. C is the true cell count. F is the blur size.

1. Ask which value in the name is the truth and which value is the group, for example blur.
2. Set truth_regex to a pattern with one group: _C(\d+)_F. Set group_regex for the group: _F(\d+)_.
3. Use only the images of one stain. In BBBC005 the w1 files show the nuclei (pattern *_w1.TIF). The w2 files show cell bodies that touch and overlap. Counts on w2 are about half of the true counts.
4. Ask the scientist for the diameter range and the declumping method. The BBBC005 nuclei in w1 have a diameter of about 31 pixels. Look at metrics.mean_diameter first.
5. Run count_nuclei. Read metrics.true_total, metrics.detected_to_true_ratio, metrics.mean_abs_error and metrics.r_squared.
6. Read the numbers for each group in the by_group result. Report the trend, for example the ratio at blur 1 and at blur 48.
7. Say what discard_border and discard_outside did. Objects that leave the count give a ratio below 1.
8. The unit of the comparison is the image. Report n.
9. Do not call the pipeline accurate from one number. Give the error for each group.
