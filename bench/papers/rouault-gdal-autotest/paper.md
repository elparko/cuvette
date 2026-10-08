# Rouault and the GDAL contributors: GDAL and OGR

## Citation
- Rouault E, Warmerdam F, Schwehr K, et al. GDAL. Zenodo (2022). DOI: 10.5281/zenodo.5884351. Docs: https://gdal.org
- GDAL has no single paper with result tables. The numbers below come from the GDAL autotest data and from a second method (numpy, shapely, pyproj). I did not read them in a paper.

## Data
- `byte.tif`: the GDAL autotest raster (autotest/gcore/data/byte.tif). 20 x 20 pixels, 8-bit, NAD27 / UTM zone 11N (EPSG:26711), pixel 60 m. 736 bytes. MIT license (GDAL).
- `ne_110m_admin_0_countries`: Natural Earth 1:110m countries. Public domain. 177 features, EPSG:4326. A copy with three fields is in `catalog/gdal/data/ne_110m_countries.geojson`.
- `zones.geojson`: two hand-made squares in EPSG:26711. Zone A is aligned to the pixel grid (top-left 10 x 10 pixels). Zone B is offset by 40 m (partial pixels).
- Local path: /Volumes/T7/guided-analysis/data/rouault-gdal-autotest/

## Tool
- GDAL 3.13.3 (Homebrew). rasterstats 0.21.0 in `~/.guided-analysis/envs/gdal/`.

## Method steps
1. `gdalinfo -stats byte.tif`.
2. `gdalwarp -t_srs EPSG:4326 -r near byte.tif out.tif`.
3. `rasterstats.zonal_stats(zones, raster, all_touched=False)`.

## Numbers to reproduce
| Quantity | Value | Source |
|---|---|---|
| Size | 20 x 20 | gdalinfo |
| CRS | EPSG:26711 | gdalinfo |
| Pixel size | 60 m | gdalinfo |
| min, max | 74, 255 | gdalinfo -stats, GDAL autotest |
| mean, stddev | 126.765, 22.928 | gdalinfo -stats, GDAL autotest |
| Size after warp to EPSG:4326 (nearest) | 22 x 18 | gdalwarp; pyproj extent / pixel size |
| Zone A pixels, mean | 100, 129.5 | numpy |
| Zone B pixels (centers), mean | 42, 135.0 | numpy and shapely |
| Zone B pixels (all touched), mean | 56, 134.857 | numpy and shapely |

## Decisions the scientist owns
- The target CRS (EPSG:4326 here).
- The resampling method (nearest here; the raster is 8-bit and the warp is only for a size check).
- The nodata value (the file has none).
- The pixel size (GDAL's own choice here).
- The rule for partial pixels (centers or all touched).
