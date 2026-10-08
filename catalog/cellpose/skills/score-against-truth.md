---
name: score-against-truth
description: How to score a Cellpose segmentation against hand-drawn masks with Dice, F1 and missed cells, for one image or a folder.
---

# Score a segmentation against hand-drawn masks

1. Find the truth masks. Check the file type. A 16-bit TIFF holds one number for each cell. An 8-bit PNG is split into connected cells.
2. For one image: run segment_cells, then score_masks with the label_image path from the result and the truth path.
3. For a folder: run segment_cells with truth_folder. The mask must have the same file name stem as the image.
4. For a split such as a test set: pass only_listed_in with the path of the list file.
5. Read mean_dice, mean_average_f1 and mean_missed_fraction_iou_70 and total_truth.
6. Dice is a pixel overlap. It can be high when the object count is wrong. F1 counts objects.
7. A true cell is missed at IoU 0.7 if no predicted cell overlaps it with an IoU of 0.7 or more.
8. Report the truth count, the found count, Dice, F1, the missed fraction, and which images were in the score.
9. Say that the Cellpose model may have seen public images during training.
