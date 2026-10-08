---
name: remove-artifacts-with-ica
description: How to fit ICA, look at the components and remove the ones that the scientist chooses.
---

# Remove artifacts with ICA

Use ICA only if the decision use_ica is yes.

1. Run run_ica. The tool fits on a copy that is high-passed at 1 Hz. It removes nothing.
2. Open ica_components.png and ica_sources.png. Eye blinks show a frontal map and sharp deflections in the source trace.
3. Read the list of components that correlate with the EOG channel. It is a hint. Show it to the scientist with the maps.
4. Run apply_ica with the ica handle. The harness asks the scientist for the components to remove. Do not choose them.
5. Report the number of components, the seed, the removed numbers and the reason for each.
6. Cut epochs from the cleaned recording. Compare the epoch count with the count before ICA.

ICA has random numbers. A different seed can give components in a different order.
