---
name: warp-raster
description: Steps to reproject a raster with QGIS and to report the new size.
---

# Warp a raster

1. Ask the scientist for the target CRS, the resampling method, the nodata value and the pixel size. Do not choose them.
2. Run warp_raster with the settings.
3. Report the new size in pixels and the gdalwarp command from data.gdal_command.
4. To show how the resampling method moves the result, run the tool again with other methods.
