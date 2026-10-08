#!/usr/bin/env bash
set -euo pipefail
D="${GA_DATA:-/Volumes/T7/guided-analysis/data}/lazear2023-sage"
U=https://raw.githubusercontent.com/OpenMS/OpenMS/develop/share/OpenMS/examples
mkdir -p "$D"
cd "$D"
for i in 1 2 3; do curl -L -C - -o "BSA$i.mzML" "$U/BSA/BSA$i.mzML"; done
curl -L -C - -o 18Protein_SoCe_Tr_detergents_trace.fasta "$U/TOPPAS/data/BSA_Identification/18Protein_SoCe_Tr_detergents_trace.fasta"
awk '/^>/{keep=($0 !~ /SORC5/)} keep' 18Protein_SoCe_Tr_detergents_trace.fasta > standards.fasta
cat > SHA256SUMS <<'S'
dc9ed61d595328d4ef2f1de47d21f41b83e2eae7c9145e1d9b88e910c8cec2f7  BSA1.mzML
b1a24b44fa71c0918c0078786b9618e84696334079dd9976fd927fff57c3156f  BSA2.mzML
b70c24e0130cdf46620715a4fcebd5fc5f23ff68d2943127edecebdc22b6e58c  BSA3.mzML
714d53edaf768c5162715cae974cb3fa040477879bd999a45c28c66712a04ca8  18Protein_SoCe_Tr_detergents_trace.fasta
9e96a134f9cf8a509d9b00cbd9f49605d1bed93e14cfe2bd0d726da729a84f9e  standards.fasta
S
shasum -a 256 -c SHA256SUMS
