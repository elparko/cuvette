# MZmine reporting standards

Follow these rules in each answer. The review checks look for the same errors.

- Report the settings with each feature count: noise level, minimum feature height, m/z tolerance with its unit (ppm), retention time tolerance with its unit (minutes) and the mzmine version.
- Give the intensity unit of the noise level and the minimum height. The values depend on the instrument.
- Say which steps ran: mass detection, chromatogram builder, resolver, 13C isotope filter, alignment, export. A feature count is valid only from a run that reached the export step.
- Features in one run are not independent samples. The unit of replication is the injection or the biological replicate. Do not compute a p-value from features of one run.
- The m/z tolerance in ppm and in Da are different settings. Do not mix them.
- Check the count with at least two values of the noise level and of the minimum height. Report the range if the count changes by more than 20 percent.
- Use the same settings for all runs that you compare.
- A feature that is found in one run only is not a result of a comparison. Report how many features were found in all runs.
- Do not name a compound from m/z alone. Say that an annotation step is needed.
- If mzmine stops with "Requires user login", say so. Do not report a count.
