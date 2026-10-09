---
name: dual-luciferase-ratio
description: Steps to normalize firefly to Renilla signals and report the fold change of a reporter assay.
---

# Dual-luciferase reporter ratio

A dual-luciferase assay reads two enzymes in one well. Firefly luciferase is the reporter. Renilla luciferase is the control for transfection and cell number.
The tool divides the ratio firefly / Renilla by the mean ratio of the control group.

1. Read the file. Find the columns for the well, the group, the firefly signal, the Renilla signal, the plate and the biological replicate.
2. Ask the scientist which group is the control, such as the empty vector or the vehicle.
3. Ask whether to subtract a background, such as untransfected wells.
4. Ask if the control mean uses all plates or each plate.
5. Run ratio_normalize with assay dual_luciferase, target_col as the firefly column and reference_col as the Renilla column. Give replicate_col.
6. Read the group table. Look at the plot.
7. For a test, run compare_two_groups or anova_oneway of the biostats adapter on the column normalized of the units file.
8. Report the control group, the background step, the scope, the mean, SD and n of each group.

## Common mistakes

- Wells as n. Three wells of one transfection are technical replicates. The unit is one independent transfection or experiment.
- A Renilla signal that the treatment changes. Some treatments change the Renilla promoter. Then the ratio is not valid. Say how you checked it.
- A Renilla signal near the background. A low Renilla signal makes the ratio noisy. The tool leaves out a well with a Renilla signal at or below 0.
- A saturated luminometer reading. Give saturation_max if the luminometer has a limit.
- Different plates without a control on each plate. Use the plate scope and put the control on every plate.
- Only the ratio, not the raw values. Look at both signals. A drop of the firefly signal with a drop of the Renilla signal can mean cell death.

## Stop and ask

- The Renilla signal differs between groups by more than about two fold.
- The control group has n below 3 biological replicates.
- A well has a Renilla signal at the background.
- The scientist gives wells, not biological replicates, as n.
