#!/usr/bin/env bash
set -euo pipefail
D="${CUVETTE_DATA:-${GA_DATA:-/Volumes/T7/guided-analysis/data}}/rost2016-openms"
U=https://abibuilder.cs.uni-tuebingen.de/archive/openms/Tutorials/Example_Data/Metabolomics
mkdir -p "$D/datasets" "$D/databases"
cd "$D"
for f in 2012_02_03_PStd_050_1 2012_02_03_PStd_050_2 2012_02_03_PStd_050_3 2012_02_03_PStd_10_1 2012_02_03_PStd_10_2 2012_02_03_PStd_10_3; do
  curl -L -C - -o "datasets/$f.mzML" "$U/datasets/$f.mzML"
done
for f in PositiveAdducts.tsv NegativeAdducts.tsv HMDBMappingFile.tsv HMDB2StructMapping.tsv; do
  curl -L -C - -o "databases/$f" "$U/databases/$f"
done
cat > SHA256SUMS <<'S'
00962f2a50ec976bcf2993dd72ef2ec190a53b9c6a117958f61e4149371a9512  datasets/2012_02_03_PStd_050_1.mzML
b420599eda76fbd2ab25bb20787bd8699035aeb36c984664c86e6f4ccc0669e0  datasets/2012_02_03_PStd_050_2.mzML
6fd80e47eb862c2d157f88c4a86ad0830e77974651809607659bb3a706bac0b0  datasets/2012_02_03_PStd_050_3.mzML
d09f3d82ac1528be3044ee30c016acb3d16f1bee5a3e875cc6d13ba81ff855f7  datasets/2012_02_03_PStd_10_1.mzML
1485c5c12874702abc841b47d96dfe42f99ad9651af33c20ad0c35cef421b937  datasets/2012_02_03_PStd_10_2.mzML
aa3122354f422e0a5b8e6d4f8e2ed046e11f53148f5ef460075d7c8f2ac3b438  datasets/2012_02_03_PStd_10_3.mzML
184582d581574c74ee262579e6e80e0f5b4ba496f7472729ad9a8342a0d31491  databases/HMDB2StructMapping.tsv
215144a2221b46b6e6ecaf14301d95af4a960ff95c200110abd0fb6939adff8b  databases/HMDBMappingFile.tsv
95d0d2663840bdd28882e087ae37a684a3867aeb0a9c1c223de6011ad0283cb7  databases/NegativeAdducts.tsv
67f812eb5ba95b545bbc1e502843658e9c2f9f3a7e7a3c6f3231bdc4503475c6  databases/PositiveAdducts.tsv
S
shasum -a 256 -c SHA256SUMS
