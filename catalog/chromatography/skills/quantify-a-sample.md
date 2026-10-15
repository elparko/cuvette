---
name: quantify-a-sample
description: How to integrate peaks and quantify a sample from a chromatogram that the scientist exported.
---

1. Ask the scientist to export each trace as a table. Chromeleon writes ASCII with File > Export. Empower uses an export method. OpenLab writes CSV or AIA.
2. Run `read_trace` on one standard. Check the time range, the step and the drift. Note the names of the time and signal columns.
3. Ask for the peak of interest and its approximate retention time and width.
4. Run `integrate_peaks` on that standard. Compare the peak count and the retention times with what the scientist expects.
5. If the tool finds too many peaks, call `propose_change` with the key `prominence` and a higher value. If it misses the peak, propose a lower value, or name the retention time in `known_peaks`.
6. Check one area with `area_in_window`. To compare the two numbers, compare the trapezoid area with the column `area_signal_time` of `integrate_peaks`.
7. Run `integrate_peaks` with the same settings on every standard and every sample. Do not change a setting between runs.
8. Run `calibration_curve` with the standard concentrations and their areas. Read the residual of each standard, not R squared alone.
9. Run `quantify_areas` with the slope and the intercept. Report each sample that falls outside the range of the standards.

The matching steps in the data systems:

- Chromeleon: Processing Method > Detection for the integration, then Calibration.
- Empower: the Processing Method with ApexTrack, then the calibration tab.
- OpenLab CDS: Data Analysis > Integration Events, then the calibration table.

The vendor integration drops a baseline and adds the raw signal between the peak limits. hplc-py fits a skew-normal peak. For a separated, symmetric peak the two agree. For an overlapping or a tailing peak they differ. Say which one made the number.
