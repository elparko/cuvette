#!/usr/bin/env bash
set -euo pipefail
D="${GA_DATA:-/Volumes/T7/guided-analysis/data}/rouault-gdal-autotest"
mkdir -p "$D"
cd "$D"
curl -sL -o byte.tif https://raw.githubusercontent.com/OSGeo/gdal/master/autotest/gcore/data/byte.tif
curl -sL -o ne_110m_admin_0_countries.zip https://naciscdn.org/naturalearth/110m/cultural/ne_110m_admin_0_countries.zip
unzip -o -q ne_110m_admin_0_countries.zip -d ne110
cp "$(dirname "$0")/../../../catalog/gdal/data/zones.geojson" . 2>/dev/null || true
