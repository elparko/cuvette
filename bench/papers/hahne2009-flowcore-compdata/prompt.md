# Prompts

## Plain
1. I have an unstained control and four single-stain controls. What is the spillover matrix?
2. The instrument writes log-amplified channel numbers.

## Guided
Linearize the log-amplified values with four decades over 1024 channels. For each single-stain control, take the events above the 80th percentile of the unstained control in the primary channel. For each channel, divide the median shift from the unstained control by the shift of the primary channel. Give the 12 off-diagonal coefficients.
