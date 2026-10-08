# GDAL and OGR reporting standards

Follow these rules in each answer. The review checks look for the same errors.

## Tools

- Use the named tools. Each tool runs one GDAL, OGR or rasterstats command.
- Pass the path that the last step gave. Use result from reproject_raster, calc_raster or reproject_vector.
- Answer each question in the request. If a question needs a tool call, make the call before you write the answer. Do not write "I will use" and stop.
- Ask the scientist for the target CRS, the resampling method, the nodata value, the pixel size and the rule for partial pixels. Do not choose them.

## Report with each number

- Name the CRS as an EPSG code. Give the unit of each pixel size, area and distance.
- Name the resampling method of each reprojected raster.
- Give the nodata value and say that statistics skip those pixels.
- Give the number of pixels behind each zonal statistic.
- Say if zonal statistics counted pixel centers or all touched pixels.
- Say which tool made each number.

## Traps

- Degrees are not metres. Do not report an area or a distance from a geographic CRS such as EPSG:4326.
- A class raster (land cover, codes) must use near or mode. Blending methods make codes that do not exist.
- Statistics of a reprojected raster differ from those of the source. The change comes from the resampling.
- gdal_calc does the arithmetic in the data type of the band. A Byte band overflows. Cast first.
- Polygons and raster must share one CRS. Zonal statistics stop if they do not.
- Run zonal statistics on the original raster. Do not reproject the raster and the polygons to fit them. A reprojected raster has other pixels, so the counts and means change. Reproject only if the scientist asks for it.
- Pass id_field when the polygon file has a name field, so each row has a name.
- Raster pixels of a polygon are counted by pixel, not by area. A small polygon holds few pixels.

## Do not claim

- Do not call two zonal means equal if they used different pixel rules.
- Do not call a map accurate to a distance finer than the pixel size.
