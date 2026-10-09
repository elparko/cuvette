# growthcurver reporting standards

Follow these rules in each answer. The review checks look for the same errors.

## Tools

- fit_growth_curves fits one logistic curve to each well. The input is a time column and one column for each well.
- compare_growth divides each well by a reference group and compares the groups. It needs a design file with the column well.
- A plate reader export in a grid of rows and columns must have one column for each well first.

## What to report

- The background correction, the blank wells, t_trim and the excluded wells with the reason.
- For each well or group: the growth rate r with its time unit, the doubling time, k and n0.
- For a comparison: the reference group, the rule (reference mean or same block), n, the mean, the 95% interval and the p value.
- The method of the lag time (easylinear) and its window, if you give a lag time.
- The growthcurver version, and the growthrates version if you give a lag time.

## How to read the result

- r is the rate of the logistic fit. It is not the slope of a window, such as Gen5 Max V. The two values differ.
- A note from growthcurver means that the fit is not reliable. Look at the plot of that well.
- The area under the curve depends on the run time. Use the same t_trim for all plates that you compare.
- Wells from the same culture are technical replicates. Independent cultures are the biological replicates.

## Do not claim

- Do not call a difference real if the 95% interval of the relative rate holds 1.
- Do not compare r between files with different time units.
