---
name: describe-and-reproject
description: Steps to read a raster or vector file, then reproject it with a chosen CRS, resampling method, pixel size and nodata value.
---

# Describe and reproject

1. Run raster_info or vector_info first. Report the size, the CRS and the pixel size.
2. Ask the scientist for the target CRS. Do not choose it.
3. Ask for the resampling method. Say that near keeps class codes and that blending methods suit continuous data.
4. Ask for the pixel size and the nodata value. Say that empty keeps the GDAL choice and the file value.
5. Run reproject_raster. Keep result for later steps.
6. Report the new size, the pixel size, the CRS and the band statistics.
7. To show how the resampling method moves the statistics, run the tool again with other methods. Report each run.
8. Run reproject_vector for polygons that must match a raster.
