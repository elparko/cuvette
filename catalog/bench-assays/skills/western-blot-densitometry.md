---
name: western-blot-densitometry
description: Steps to normalize Western blot band volumes to a loading control and report fold change.
---

# Western blot densitometry

Densitometry measures the volume of each band (area times intensity). The tool divides the target band by the loading control band of the same lane.
Then the tool divides the ratio by the mean ratio of the control group. The result is a fold change.

1. Read the file. Find the columns for the lane, the group, the target volume and the loading control volume. Find the blot and the biological replicate.
2. Ask the scientist which group is the control.
3. Ask whether to subtract the background, and which columns hold it.
4. Ask whether the control mean uses all blots or each blot. Say that within-block normalization gives the control group no spread.
5. Ask for the saturation value of the imager. Give it as saturation_max.
6. Run ratio_normalize with assay western. Give replicate_col to average the lanes of one biological replicate.
7. Read the group table and the warnings. Look at the plot.
8. For a test, run compare_two_groups or anova_oneway of the biostats adapter on the column normalized of the units file.
9. Report the target, the loading control, the background step, the control group and the scope. Report the mean, SD and n of each group.

## Common mistakes

- Saturated bands. A saturated band reads too low, so the ratio is wrong. Image the blot again at a shorter exposure. Do not use the ratio.
- A loading control that is not linear. A highly expressed control (such as actin or GAPDH) can saturate at the load that you need for the target. Check that the control is linear with the protein load. A total protein stain is an option.
- A loading control that changes with the treatment. A treatment can change the control. Say how you checked it.
- Lanes as n. Three lanes of one lysate are one biological replicate. The unit is the independent experiment, animal or culture.
- A different exposure for target and control. Use images with no saturated band. Use the same image for all lanes that you compare.
- Background that differs between blots. Use the same method to subtract the background in each lane.
- Comparing bands between blots without a control on each blot. Put the control group on every blot. Use within-block normalization or a common sample.
- A band that reads below the background. The tool leaves out a ratio with a negative target.

## Stop and ask

- The control group has n below 3 biological replicates.
- The raw image has a saturated band.
- The scientist gives lanes, not biological replicates, as n. Say that the p-value will be too small.
- The loading control changes between groups.
- A blot has no control lane and the scope is within block.
