---
name: score-against-truth
description: How to score a segmentation against hand-drawn masks with Dice and F1, for one image or a folder.
---

# Score a segmentation against hand-drawn masks

1. Find the truth masks. Check the file type. A 16-bit TIFF holds one number for each object. An 8-bit PNG is split into connected objects.
2. For one image: run count_objects, then compare_masks with the label_image path from the result and the truth path.
3. For a folder: run count_objects with truth_folder. Add truth_match when the truth folder has more than one mask type, for example "label masks".
4. For a split such as a test set: pass only_listed_in with the path of the list file.
5. Read mean_dice and total_truth. Dice is a pixel overlap. It is high when the outlines cover the same area, even if the object count is wrong.
6. Read the F1 values. F1 at IoU 0.5 counts an object as found if the overlap with one true object is at least half.
7. Report the truth count, the found count, Dice, F1, and which images were in the score.
8. Say that a plain threshold with no declumping gives merged objects and a low F1.
