# Prompts

## Plain
1. I have sgRNA read counts of a CRISPR knockout screen in melanoma cells with and without vemurafenib. Which genes does the drug select for?
2. Which genes drop out when cells grow with vemurafenib for 7 days? Is EGFR among them?
3. Give me the top positive and negative hits at day 14 with their false discovery rate.

## Guided
We screened A375 melanoma cells with a genome-scale CRISPR knockout library and grew them with vemurafenib or DMSO. The file melanoma_counts.txt is a table of sgRNA read counts with the samples plasmid, D7_R1, D7_R2, D14_R1, D14_R2 (DMSO) and PLX7_R1, PLX7_R2, PLX14_R1, PLX14_R2 (vemurafenib). Compare the vemurafenib replicates with the DMSO replicates of the same day, once for day 14 and once for day 7.
