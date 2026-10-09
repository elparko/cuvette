---
name: cluster-and-compare-populations
description: Steps to cluster cells of many FCS files with FlowSOM and test for a difference in population frequency between two conditions.
---

# Cluster cells and compare populations

1. Run inspect_fcs on the folder. Check the cells in each file and the channel names.
2. Ask the scientist for the markers, the arcsinh cofactor, the grid size and the number of metaclusters. Ask for the seed if the scientist wants to fix it.
3. Run cluster_cells. Show the heatmap and name the metaclusters with the scientist from their marker medians.
4. Run population_frequencies with the population column that the scientist chose.
5. Ask the scientist for the sample table. It needs the condition for each sample and, for paired samples, the donor.
6. Ask for the unit of replication, the reference level, the pairing and the test.
7. Run differential_abundance. Report the counts per sample and the mean percent in each condition with each p value.
8. Say how many populations pass the adjusted p limit. Say which design you used.
9. Do not change the number of metaclusters after you see the test result.
