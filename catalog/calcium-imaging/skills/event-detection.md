---
name: event-detection
description: How to choose and check an event detection method for calcium traces.
---

1. Choose with the scientist: threshold for amplitude, area and kinetics of transients, OASIS for inferred spike times and rates.
2. Ask for the threshold in noise SDs. A low value finds small events and false events.
3. For OASIS, ask for the indicator and the decay time constant. Check it on one clear transient.
4. Run detect_events on one cell. Open the raster and the dF/F plot. Check that the events sit on the rises.
5. If the scientist has reference spike times from electrophysiology for one cell, give them as truth_times. Report the sensitivity and the precision.
6. Run all cells. Report the event rate for each cell and the median over cells.
7. Compare groups with the animal means, not with the cells.
