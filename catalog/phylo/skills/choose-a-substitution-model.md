---
name: choose-a-substitution-model
description: Steps to let ModelFinder pick the substitution model, or to compare a fixed model with it.
---

# Choose a substitution model

1. Ask the scientist if ModelFinder chooses the model or if the scientist names one.
2. To see the choice before the tree, run select_model on the alignment. It reports the best model by BIC and by AIC.
3. If the two criteria differ, show both to the scientist. Do not pick one.
4. Run infer_tree. The harness sets the model from the decision model: MFP uses the choice of ModelFinder. If the scientist names another model, call propose_change with the key model.
5. Report the model and say how it was chosen.
6. To compare, call compare_options with the key model and a fixed model name. Note the log-likelihood. A model with more parameters has a higher log-likelihood. Compare models with BIC or AIC, not with the log-likelihood.
