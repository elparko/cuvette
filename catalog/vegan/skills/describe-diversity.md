---
name: describe-diversity
description: Steps to compute and compare diversity indices of sites, with rarefaction when the effort differs.
---

# Describe diversity

1. Run inspect_community. Check if the values are whole-number counts or cover classes.
2. Ask the scientist for the index and the Shannon logarithm base.
3. Run diversity_indices. Use group_by when the scientist compares groups.
4. If the sites have different totals of individuals, ask the scientist for the rarefaction size. Run rarefy_richness.
5. Report the index, the base, the unit of replication and the mean and spread for each group.
6. Say if the values are cover classes. Do not call them counts.
7. Do not test a difference of groups with this skill. Ask the scientist for the test and the replication unit.
