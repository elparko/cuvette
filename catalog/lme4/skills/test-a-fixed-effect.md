---
name: test-a-fixed-effect
description: Steps to test one fixed effect, or a random-effects term, with a likelihood ratio test of two nested models.
---

# Test an effect by model comparison

1. Ask the scientist for the full model and for the reduced model. The reduced model drops only the term under test.
2. Ask the scientist for the fit method. Use ML to test a fixed effect. Use REML only when the fixed effects are the same.
3. Run compare_models. Read chi-square, the degrees of freedom, p and the AIC of each model.
4. Read the warning field. If it is set, tell the scientist that the test is not valid.
5. Run fit_mixed_model for the full model with a Wald or t test of the same effect. Give both p values.
6. Report the two formulas, the method, chi-square, the degrees of freedom and p.
7. For a test of a variance component, say that the p value is conservative.
