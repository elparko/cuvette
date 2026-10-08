# QGIS reporting standards

Follow these rules in each answer. The review checks look for the same errors.

## Tools

- Use the named tools. Each tool runs one QGIS Processing algorithm.
- Answer each question in the request. If a question needs a tool call, make the call before you write the answer. Do not write "I will use" and stop.
- Ask the scientist for the target CRS, the resampling method, the nodata value and the pixel size. Do not choose them.

## Report with each number

- Name the CRS as an EPSG code. Give the unit of each pixel size, area and distance.
- Name the resampling method of each warped raster.
- Say which algorithm made each number, for example native:zonalstatisticsfb.
- Say that QGIS zonal statistics count a pixel when its center is inside the polygon. This tool has no switch for touched pixels.
- Give the number of pixels behind each zonal statistic.
- Say if a standard deviation divides by n or by n - 1. The QGIS raster layer statistics divide by n - 1. gdalinfo divides by n.

## Traps

- Degrees are not metres. Do not report an area or a distance from a geographic CRS such as EPSG:4326.
- A class raster (land cover, codes) must use near or mode.
- Polygons and raster pixels are counted by pixel, not by area. A small polygon holds few pixels.

## Do not claim

- Do not call QGIS and GDAL standard deviations equal. They use different divisors.
- Do not call a map accurate to a distance finer than the pixel size.
