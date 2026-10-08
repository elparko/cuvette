---
name: filter-variants
description: Steps to filter variants by quality, depth, type, FILTER column and region, and to report the counts after the filter.
---

# Filter variants

1. Ask the scientist for the QUAL cutoff, the depth cutoff, the variant type, the FILTER setting and the region. Do not choose them.
2. Run vcf_stats first, so the counts before the filter are known.
3. Run filter_variants with the settings. Keep the vcf path from the result.
4. Report n_before, n_after and the counts by type after the filter.
5. State each setting that you used. Write "none" for a setting that you did not use.
6. Say if the file has no INFO/DP field. A depth cutoff then removes every site or stops with an error.
7. To show how the count moves with a cutoff, run the tool again with other values. Report each run.
