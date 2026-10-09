# Prompts

## Plain
1. I have the effects of 28 genetic variants on LDL cholesterol and on heart disease risk. Does LDL cholesterol cause heart disease?
2. Run a Mendelian randomization with the standard methods and tell me if the variants disagree.
3. Is there a sign of pleiotropy or of weak instruments?

## Guided
Does a higher LDL cholesterol level raise the risk of coronary heart disease? The file ldl_chd.csv has 28 genetic variants (one row each) with the effect on LDL cholesterol and on coronary heart disease as a log odds ratio, each with a standard error. The effects refer to the same effect allele of each variant, and the variants are independent. Estimate the causal effect with the inverse-variance weighted method, MR-Egger and the weighted median.
