---
name: responsive-cells
description: How to define and report the fraction of cells that respond to a stimulus.
---

1. Ask for the onset times, the response window and the pre-stimulus window. The pre-stimulus window must be free of the end of the last response.
2. Ask for the z criterion and the direction (increase, decrease or either).
3. Run find_responsive_cells. Read n_trials_used. A trial is left out if a window leaves the recording.
4. Look at the heatmap. Responsive cells must show a rise after the onset line.
5. Run the sensitivity check for the z criterion. Tell the scientist how the fraction changes.
6. Report the fraction with the criterion, both windows and the number of trials.
7. To compare the fraction between groups, count the responsive cells in each animal and compare the animal fractions.
