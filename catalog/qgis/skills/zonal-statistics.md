---
name: zonal-statistics
description: Steps to take zonal statistics of a raster inside polygons with QGIS and to report how pixels were counted.
---

# Zonal statistics

1. Run raster_statistics on the raster. Report the count and the mean.
2. Ask the scientist if the polygons and the raster use the same CRS. No tool of this adapter reports it. If they differ, the target CRS decision must be the CRS of the raster: call propose_change with the key target_crs if it holds another value. Then run reproject_layer on the polygons.
3. Ask the scientist which statistics to report. Do not choose them.
4. Run zonal_statistics.
5. Report the count and the chosen statistics for each zone.
6. State that QGIS counts a pixel when its center is inside the polygon.
