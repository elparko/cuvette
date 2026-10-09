---
name: spontaneous-events-and-groups
description: How to detect mEPSC or mIPSC events in many cells and compare two groups with the animal as the unit.
---

1. Run `inspect_recording` on one cell. Check the unit. A file from Igor Pro has no unit, so set `signal_unit`.
2. Ask the scientist for the direction of the events, the template rise and decay, the detection method and the threshold.
3. Run `detect_events` on one cell. Look at the plot: the red marks must sit on real events and not on noise.
4. Skip a test pulse at the start of each sweep with `analysis_window`.
5. Run the sensitivity check for the threshold. If the count changes a lot, the data are noisy. Report the range.
6. Make a CSV file with the columns cell, animal and group. The column cell holds the file name without the extension.
7. Run `detect_events_for_cells` with the folder, the pattern and the metadata file. Use the same settings for every cell.
8. Run `compare_cell_groups` on the cell table. Name the features, the unit of replication and the test.
9. Report n as animals and cells. If you use each cell as n, say that cells in one animal are not independent.

The matching steps in the programs:

- Clampfit: Event Detection > Template Search.
- Easy Electrophysiology: the spontaneous event analysis.
- Mini Analysis: the detection with an amplitude threshold.

The template method counts events closer than 5 decay constants as one event.
