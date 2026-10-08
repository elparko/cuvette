---
name: zonal-statistics
description: Steps to take zonal statistics of a raster inside polygons with QGIS and to report how pixels were counted.
---

# Zonal statistics

1. Run raster_statistics on the raster. Report the count and the mean.
2. Check that the polygons and the raster use the same CRS. If they differ, run reproject_layer on the polygons.
3. Ask the scientist which statistics to report. Do not choose them.
4. Run zonal_statistics.
5. Report the count and the chosen statistics for each zone.
6. State that QGIS counts a pixel when its center is inside the polygon.
