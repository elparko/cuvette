---
name: build-regions
description: Make the regions that a question needs, such as the tissue rim and core, or a lesion. Use it when the question names a rim, a core, an outer or inner zone, a lesion or a focal spot.
---

# Build regions

Use this procedure when the question needs a region that the slide does not have. The default Group A and Group B are the left and right halves. They are not a rim, a core or a lesion.

1. Call `open_slide` with `demo` if no slide is open.
2. Call `make_regions` with no arguments. It makes `tissue`, `rim`, `core` and, if it finds one, `lesion`.
3. Read `regions` in the result. Check that each region has pixels. If `lesion_found` is false, do not compare a lesion.
4. Call `find_peaks` if `n_features` in `state` is 0.
5. For the rim and the core, call `run_analysis` with `step_id` `roi_comparison`, `a` `rim` and `b` `core`.
6. For a lesion, call `run_analysis` with `step_id` `roi_comparison`, `a` `lesion` and `b` `core`.
7. Do not use the names Group A and Group B for these questions.
8. Read `summary` of the comparison. It lists the top features that are higher in each region, with a putative lipid name. Name those lipids in your answer and say which region is higher.
9. Call `annotate` for the top features. State each identity as putative.

To change the rim width, call `make_regions` again with `rim_fraction`. The value must be from 0.05 to 0.45. The default is 0.3.

To give the regions to the scientist in the program, call `send_regions`. A slide that has no saved session, such as the demo, cannot receive them. The names still work in `run_analysis`.
