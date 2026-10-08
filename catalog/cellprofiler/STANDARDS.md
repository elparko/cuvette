# CellProfiler reporting standards

Follow these rules in each answer. The review checks look for the same errors.

- Report the pipeline settings with each count: diameter range, threshold strategy, thresholding method, declumping method and the border and size discard settings.
- Report the number of images, the unit of replication and the CellProfiler version.
- Count per image first. Nuclei in one image are not independent samples. Do not compute a p-value from nuclei.
- Give sizes in pixels. Give micrometers only if the scientist gave the pixel size.
- Objects that touch the image border are discarded by default. The count is then lower than the number of nuclei in the field. Say if you discarded them.
- Objects outside the diameter range are discarded by default. A merged clump is larger than the range and leaves the count. Say if you discarded them.
- Check the count with at least two thresholding methods and two declumping methods. Report the range if the count changes by more than 20 percent.
- Do not use one count to say that a method is accurate. If known counts exist, report the error for each image group, for example each blur level.
- Do not use the CellProfiler default diameter (10 to 40 pixels) without a look at the mean object diameter that the first run gives.
- Use the same settings for all images that you compare.
- Use the named tools first. The tools write the pipeline file. The scientist can open the file in CellProfiler with File > Import > Pipeline from File.
