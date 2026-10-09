---
name: enzyme-kinetics
description: Steps to fit Michaelis-Menten and inhibition models to initial rates and report Km, Vmax and Ki.
---

# Enzyme kinetics

1. Read the file. Find the columns for the substrate concentration, the initial rate and the inhibitor concentration.
2. Check that the rates are initial rates. The tool does not fit progress curves.
3. Ask the scientist for the model: Michaelis-Menten, or the inhibition model to test.
4. Run fit_enzyme_kinetics. Read Vmax, Km and Ki with their intervals.
5. With an inhibitor, read the AICc of the four inhibition models. A difference below 2 does not separate two models.
6. Look at the plot. The Lineweaver-Burk view shows the pattern of the lines. Do not fit a line to it.
7. Report the model, Vmax and Km with units and intervals, Ki for an inhibition model, and the number of rates.
