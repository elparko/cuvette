---
name: zonal-statistics
description: Steps to take zonal statistics of a raster inside polygons and to report how partial pixels were counted.
---

# Zonal statistics

1. Run raster_info and vector_info. Check that both use the same CRS. If they differ, run reproject_vector on the polygons.
2. Ask the scientist for the nodata value and the rule for partial pixels. Do not choose them.
3. Run zonal_stats with pixels set to centers or all_touched.
4. Report the count, the mean, the min, the max and the sum for each zone.
5. State the pixel rule and the nodata value.
6. For a small zone, run the tool with both rules. Report both counts and both means.
7. Run plot_map with the zones to check that the outlines sit on the raster.
