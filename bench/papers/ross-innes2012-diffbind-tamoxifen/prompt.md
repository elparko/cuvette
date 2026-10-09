# Prompts

## Plain
1. I have ER ChIP-seq BAM files and peak files of breast cancer cell lines, some tamoxifen-resistant. Which peaks differ in signal?
2. Count the reads in the consensus peaks and test resistant against responsive samples. Does the cell line matter for the result?
3. How many peaks gain and how many lose ER signal in the resistant samples?

## Guided
We mapped ER ChIP-seq reads of breast cancer cell lines to chromosome 18. The sample sheet tamoxifen.csv lists 11 samples (4 tamoxifen-resistant, 7 responsive) with BAM files and peak files. Count the reads in the consensus peaks. Find the peaks with a different ER signal between resistant and responsive samples with the tissue as blocking factor. Then check the result without the blocking factor.
