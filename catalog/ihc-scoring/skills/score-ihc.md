---
name: score-ihc
description: Steps to score an IHC stain with the H-score, the Allred score or the Ki-67 index from a cell table or an image.
---

# Score an IHC stain

1. Ask which score the lab needs: H-score, Allred score or Ki-67 index. Ask for the antigen and the compartment where it sits.
2. If you have a QuPath detection export, run inspect_cell_table. Find the DAB column of the compartment and the position columns.
3. If you have only an image, run measure_stain_intensity on one image. Open the overlay. Fix the nucleus settings from the overlay, not from the score.
4. Ask the scientist for the region, the three thresholds and the minimum number of cells. Show how the score moves at other thresholds before you report.
5. Run score_h_score, score_allred or score_ki67 on the cell table. Use group_column for slides or cores.
6. For Ki-67, ask if the lab reports a global index or a hot spot. For a hot spot, ask for the window side and the smallest number of cells.
7. If a pathologist already gave the percent of cells at 0, 1+, 2+ and 3+, give the four columns as bin_columns. The tool then makes the score without cells.
8. Report the thresholds, the compartment, the region, the cell count of each score and the stain vectors.
9. Use compare_scorers if the lab compares the tool with a pathologist. See the skill compare-with-pathologist.
