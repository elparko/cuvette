---
name: follow-mode
description: How the scientist repeats each step in the ImageJ menus, and how to check that the numbers match.
---

# Repeat a step by hand in ImageJ

Each tool result has a manual route. The route lists the menu path, the dialog fields in order, and the Macro Recorder text.

## Check your own steps

1. Open ImageJ. Open the image with File > Open...
2. Follow the menu path of the step. Type the values from the route into the dialog.
3. Click OK.
4. Compare your result with the agent's number: count, mean area, threshold limits.

## Show the exact text that ImageJ runs

1. Choose Plugins > Macros > Record...
2. Do the step in the menus.
3. The recorder window shows a line such as run("Gaussian Blur...", "sigma=2").
4. Compare it with the Macro Recorder text in the route.

## Settings that change the numbers

- Process > Binary > Options...: clear Black background. The tools assume it is cleared.
- Image > Adjust > Threshold...: select the same method and set Dark background the same way. Click Auto. Close the window. Do not click Apply. Then choose Process > Binary > Convert to Mask.
- Analyze > Set Measurements...: select the measurements that the route lists.
- Analyze > Analyze Particles...: use the same size range, the same circularity and the same setting for Exclude on edges.

## If your numbers are different

Name the field that is different. The most common causes:

- Black background is selected.
- The threshold used Dark background the other way.
- The image has a scale, and the size range is in calibrated units.
- You started from the original image and the agent started from a saved copy of an earlier step.
