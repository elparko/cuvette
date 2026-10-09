# microbiome reporting standards

Follow these rules in each answer. The review checks look for the same errors.

## Tools

- Run inspect_feature_table first. Check the number of samples, the reads of each sample and the match of the sample names.
- Do not choose the rarefaction depth, the normalization, the distance, the prevalence limit or the model terms alone. Ask the scientist.
- Run the dispersion test with each PERMANOVA. The beta_diversity tool gives both.
- Name the test before you see the result. Do not try other methods until one gives the result that you want.

## What to report

- Report the number of samples, the number of features and the reads per sample (smallest, median, largest).
- Report each filter: the sample filter, the prevalence limit and the samples that dropped out for missing values.
- For alpha diversity, name the index, the rarefaction depth and the seed. Say that Shannon uses the natural logarithm.
- For PERMANOVA, report the normalization, the distance, the model terms, R2, F, the degrees of freedom, p, the permutations and the seed.
- For differential abundance, report the method, the normalization, the transform, the model columns, the random effects, the reference level and the adjusted p limit.
- Give the coefficient, p and q of each feature that you name. Give the number of features that you tested.
- Name the version of each R package.

## How to read the result

- Richness grows with the reads of a sample. Compare richness only after rarefaction, or show that the reads do not differ between the groups.
- Microbiome counts are relative. A feature that rises in one group can make the others fall.
- A coefficient of MaAsLin 2 with the LOG transform is a change in log base 2 of the relative abundance. With standardized columns it is the change for one standard deviation.
- The adjusted p value q corrects for the number of tests. A q above the limit is not a finding.
- A feature with few non-zero samples gives an unstable coefficient. Report in how many samples the feature occurs.
- MaAsLin 2 and ALDEx2 give different lists. Do not call a feature reliable from one method.

## Do not claim

- Do not treat repeated samples of one subject as independent. Use random effects or strata.
- Do not say that groups differ in centre when the dispersion test is significant.
- Do not say that a taxon causes a difference. The tests show associations.
- Do not give a rarefied result without the depth and the seed.
