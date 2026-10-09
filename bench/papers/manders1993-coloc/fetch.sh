#!/usr/bin/env bash
set -euo pipefail
D="${GA_DATA:-/Volumes/T7/guided-analysis/data}/manders1993-coloc"
R="${GA_REFERENCE:-/Volumes/T7/guided-analysis/reference}/manders1993-coloc"
mkdir -p "$D" "$R"
# The Fiji Coloc 2 test images that copy the object pairs of Manders et al. 1993 (GPL-3), at a fixed commit.
# The two Coloc 2 test classes that hold the expected values go to the reference folder.
C=https://raw.githubusercontent.com/fiji/Colocalisation_Analysis/82af2de4ad477e723d77a815279ee1c23b285da9/src
for k in A B C D; do curl -fsSL -o "$D/manders$k.tiff" "$C/test/resources/manders$k.tiff"; done
curl -fsSL -o "$R/PearsonsCorrelationTest.java" "$C/test/java/sc/fiji/coloc/tests/PearsonsCorrelationTest.java"
curl -fsSL -o "$R/MandersColocalizationTest.java" "$C/test/java/sc/fiji/coloc/tests/MandersColocalizationTest.java"
shasum -a 256 -c - <<EOF
55f0e233d0322cf360a243f433092f4498b62864825af3c7040ba50b13bb45e2  $D/mandersA.tiff
f013fac909a0d211894695abfab4068a8479350932f2f924bd2e9ffb7b80c6f9  $D/mandersB.tiff
12cc8512baae5e277930507e048cba119bfdb54e0b0dd3a7c14bca5cc3c4cada  $D/mandersC.tiff
a3c3946baf6f152e42e8248f67d12ffe5abb4c8f83915cfb68075b466a4aa27a  $D/mandersD.tiff
EOF
