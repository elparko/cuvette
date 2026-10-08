---
name: teach-mode
description: How the scientist records the steps in ImageJ so that the agent can compare them with the decision record.
---

# Teach mode in ImageJ

ImageJ has no state that the agent can read while the scientist works. The Macro Recorder writes each menu action as one line of macro text. The agent reads that text.

## Record the steps

1. Choose Plugins > Macros > Record...
2. Keep the recorder window open.
3. Do the steps in the ImageJ menus.
4. Click Create in the recorder window. A macro editor opens with the lines.
5. Choose File > Save As... in the editor. Save the file as .ijm or .txt.
6. Tell the agent that the step is finished. Give the full path of the file.

## What the agent does

1. Call review_my_steps with args {"path": "<full path of the saved macro>"}.
2. Read the steps and the differences in the result.
3. For each difference, name the value, say what the scientist used, and say what the decision record has. Say why it can change the count or the size.
4. For each decision that the record does not cover yet, tell the scientist that the choice is theirs. Do not fill it in.
5. A step with the tool run_command is a menu command that the adapter has no tool for. Show the recorded line. Do not judge it.

## How the lines map to steps

- run("Gaussian Blur...", "sigma=2") is gaussian_blur with sigma 2.
- setAutoThreshold("Otsu dark") followed by run("Convert to Mask") is threshold with the method Otsu and dark_background true.
- run("Subtract Background...", "rolling=50 light") is subtract_background with rolling_radius 50 and light_background true.
- run("Analyze Particles...", ...) is analyze_particles. The word exclude means exclude_edges true. No size upper limit gives max_size 0.
- run("Set Scale...", ...) is set_scale. run("Watershed") is watershed. open(...) is open_image.

## Limits

- The recorder does not write steps that the scientist does with the mouse in a tool bar, such as a drawn region, unless the recorder shows them.
- The recorder file shows what the scientist did. It does not show the result. Ask the scientist for the count if you need to compare numbers.
