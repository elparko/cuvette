#!/usr/bin/env bash
set -euo pipefail
D="${GA_DATA:-/Volumes/T7/guided-analysis/data}/schramm2012-imzml-pyimzml"
U=https://raw.githubusercontent.com/alexandrovteam/pyimzML/master
mkdir -p "$D"
cd "$D"
for f in Example_Continuous.ibd Example_Continuous.imzML Example_Processed.ibd Example_Processed.imzML; do
  curl -L -C - -o "$f" "$U/tests/data/$f"
done
curl -L -C - -o pyimzML_LICENSE "$U/LICENSE"
curl -L -C - -o test_basic.py "$U/tests/test_basic.py"
cat > SHA256SUMS <<'S'
e8f2fefb1a0b6947b9ad78c773d20c1381f7728e060010c8d2f174ac414ff099  Example_Continuous.ibd
04237b10d61db093d2c5529f380d676d400383e8cbe55b3fe0e09bb97ae2ea8e  Example_Continuous.imzML
1a5410dd26e844f714b53db7506d8474a40af37323bf19396df68ea7733ded9a  Example_Processed.ibd
066671590f01d4820b7ac5bd1f669d23dca04a91e40c08a35f7d0c6d6c729480  Example_Processed.imzML
S
shasum -a 256 -c SHA256SUMS
