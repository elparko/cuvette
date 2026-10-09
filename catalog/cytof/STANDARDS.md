# cytof reporting standards

Follow these rules in each answer. The review checks look for the same errors.

## Tools

- Run inspect_fcs first. Check the number of cells in each file and the channel names.
- Do not choose the markers, the cofactor, the grid size, the number of metaclusters or the pairing alone. Ask the scientist.
- Cluster all samples together. Do not cluster each sample on its own: the cluster numbers would not match between samples.
- Run population_frequencies before differential_abundance. The test reads the counts table.

## What to report

- Report the number of files and the cells in each file. Report each exclusion with the reason.
- Report the clustering markers, the arcsinh cofactor, the grid size, the number of metaclusters and the seed.
- Report the unit of replication. The unit is the sample, not the cell.
- Report the test, the model terms and the pairing. Report the samples in each condition and the adjusted p limit.
- For each population that you report, give the mean percent in each condition, the p value and the adjusted p value.
- Name the FlowSOM and diffcyt versions.

## How to read the result

- A frequency is a share of the cells of one sample. If one population grows, the shares of the others fall. Look at the counts per sample before you say that a population shrinks.
- Cluster numbers have no meaning and no order. They change with the seed and the version.
- Binomial mixed models with a random effect for each sample treat the cell counts as noisy. A model without it gives p values that are too small.
- A paired design needs the donor in the model. Compare each donor with itself.
- Cytobank, OMIQ and this tool can give other cluster borders for the same data. Compare marker medians, not cluster numbers.

## Do not claim

- Do not treat cells as independent replicates.
- Do not choose the number of metaclusters or the markers after you look at the test result.
- Do not say that a stimulation causes a change in a population. The test shows a difference in frequency between two conditions.
- Do not test markers that you used for the clustering as if they were independent of the clusters.
