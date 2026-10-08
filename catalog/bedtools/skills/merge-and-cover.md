---
name: merge-and-cover
description: Steps to merge intervals and to measure how much of one BED file another BED file covers.
---

# Merge intervals and measure coverage

1. Ask the scientist for the files and the genome build.
2. To merge, ask for the largest gap to merge across. Run merge_intervals. Report n_input, n_merged and merged_bases.
3. To measure coverage, ask for the strand rule. Run coverage_intervals with file A and file B.
4. Report n_covered of n_features, and covered_bases of feature_bases.
5. Say that covered_fraction is the share of the bases of A that B covers.
6. State the distance or the strand rule that you used.
