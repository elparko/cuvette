---
name: count-colonies
description: How to count colonies on plate photos and compute the plating efficiency and the surviving fraction.
---

1. Run inspect_image. JPEG photos are fine for counts.
2. Run count_colonies on one photo with the scientist's settings. Open the QC overlay:
   - green outlines show the colonies in the count;
   - yellow, orange and magenta outlines are objects left out as too small, too large or not round;
   - the blue circle is the edge of the counted area.
3. Fix the settings from the overlay, not from the count. The settings are decisions: call propose_change with the key and the reason. Bubbles at the rim: a larger rim_margin. Specks: a larger colony_min_diameter. Merged colonies: split_touching_colonies. Uneven light: a colony_background_radius larger than a colony.
4. If colonies are few and small, call compare_options with the key colony_threshold. Report both counts if they differ.
5. Run the folder. With hand counts, give a CSV file with columns image and count as hand_counts.
6. For a clonogenic assay, make a CSV with condition, cells_seeded and colonies for each plate, then run clonogenic_survival with the control condition.
7. Report counts for each plate. Colony counts above a few hundred on one plate are unreliable by eye and by tool; say so.
