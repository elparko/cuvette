---
name: intersect-intervals
description: Steps to find the overlaps between two BED files and report the counts with the overlap rule.
---

# Intersect two interval files

1. Ask the scientist for file A, file B and the genome build of both. Ask which file is A.
2. Ask for the overlap rule: the fraction of A, the fraction of B, reciprocal or not, and the strand rule.
3. Ask what the question counts: pairs, A intervals with an overlap, A intervals with no overlap, or bases.
4. Run intersect_intervals with the matching report: pairs, count, unique_a or no_overlap.
5. Report n_result and, for pairs, overlap_bases and n_a_with_overlap.
6. State the rule that you used. Write "default" for a rule that you did not set.
7. To show how the count moves with a fraction, run the tool again with other values. Report each run.
