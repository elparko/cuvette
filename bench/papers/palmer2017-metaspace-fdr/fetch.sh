#!/usr/bin/env bash
set -euo pipefail
D="${CUVETTE_DATA:-${GA_DATA:-/Volumes/T7/guided-analysis/data}}/palmer2017-metaspace-fdr"
E=https://ftp.ebi.ac.uk/pub/databases/metabolights/studies/public
R="${CUVETTE_REFERENCE:-${GA_REFERENCE:-/Volumes/T7/guided-analysis/reference}}/palmer2017-metaspace-fdr"
mkdir -p "$D" "$R"
cd "$D"
for f in MBa2s1.zip MBa2s2.zip MBa2s3.zip; do curl -L -C - -O "$E/MTBLS313/FILES/$f"; done
curl -L -C - -O "$E/MTBLS317/FILES/sim001_twosquares.zip"
for f in i_Investigation.txt a_MTBLS313_imagingms_metabolite_profiling_mass_spectrometry.txt s_MTBLS313.txt; do
  curl -L -C - -o "MTBLS313_$f" "$E/MTBLS313/$f"
done
# The MAF tables are the published annotations. They go to the reference folder.
curl -L -C - -o "$R/MTBLS313_m_MTBLS313_imagingms_metabolite_profiling_mass_spectrometry_v2_maf.tsv" "$E/MTBLS313/m_MTBLS313_imagingms_metabolite_profiling_mass_spectrometry_v2_maf.tsv"
curl -L -C - -o "$R/MTBLS317_m_maf.tsv" "$E/MTBLS317/m_MTBLS317_imagingms_metabolite_profiling_mass_spectrometry_v2_maf.tsv"
cat > SHA256SUMS <<'S'
40c83dd469cd4393707be71ef25a8c098f26f707b6dcc7788b19fd8da4b9bf28  MBa2s1.zip
62320b432fb85ee96707850333c9414de89de7d0326e3e9e7d267f6a075c3353  MBa2s2.zip
3ae0f69837e9be2be81d6fd519b0a76a8cc842d7c1ddb93cbc5d7c82bab8283a  MBa2s3.zip
dba4bbae70e89e8507f9522e5e02ecab4ce67f36a3a440f4619df09be9813c6c  sim001_twosquares.zip
S
shasum -a 256 -c SHA256SUMS
