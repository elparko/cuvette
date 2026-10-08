#!/bin/sh
# Run: sh check_features.sh <OpenMS bin folder> <mzML file> <output folder>
# Runs the TOPP command line tool FeatureFinderMetabo (OpenMS 3.5.0, conda build) with the settings of supplement section 5.
# The adapter uses pyOpenMS 3.6.0 classes in Python. This check uses a different OpenMS build and the TOPP tool code.
set -e
BIN="$1"
IN="$2"
OUT="$3"
mkdir -p "$OUT"
"$BIN/FeatureFinderMetabo" -in "$IN" -out "$OUT/features.featureXML" -threads 2 \
  -algorithm:common:chrom_fwhm 8.0 \
  -algorithm:mtd:trace_termination_criterion sample_rate \
  -algorithm:mtd:min_trace_length 3.0 \
  -algorithm:mtd:max_trace_length 600.0 \
  -algorithm:epd:width_filtering off > "$OUT/log.txt" 2>&1
grep -i -E "mass trace|elution|feature" "$OUT/log.txt" | head -20
echo "features in featureXML: $(grep -c '<feature id=' "$OUT/features.featureXML")"
