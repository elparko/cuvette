---
name: explore-slide
description: Get a first look at a slide that the scientist has not analyzed yet. Use it at the start of a session or when the scientist says "look at this slide".
---

# Explore a slide

1. Call `list_slides` and `slide_state` to see the saved work. Then call `open_slide` with the reference. Use `demo` for the synthetic slide.
2. Call `state`. Report the pixel count, the regions with their groups, and the extraction settings.
3. Check that the decision record is set. If it is not, ask the scientist for the question and the unit of replication first.
4. Call `mean_spectrum`. Show the strongest peaks and the image.
5. Call `find_peaks`. Report `n_features` and `n_detected`. If `capped` is true, say that the count is the cap and not a property of the data.
6. Call `ion_image` for two or three of the strongest peaks. Read the `nonzero_fraction`. Its statistics cover all pixels, including the background.
7. Call `run_analysis` with `step_id` `auto_segment`. If no tissue mask is set, read `background_clusters` in the result. A two-cluster cut often only separates tissue from background.
8. Call `annotate` for the strongest peaks. State each identity as putative.
9. Finish with a short list: what the slide holds, what is still unknown, and two questions that the scientist can ask next.

Do not run a statistical test in this procedure. A test needs a question and regions that the scientist chose.
