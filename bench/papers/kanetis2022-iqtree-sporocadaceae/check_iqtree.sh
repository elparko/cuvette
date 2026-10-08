#!/usr/bin/env bash
# Independent check, outside the phylo adapter: IQ-TREE 2.0.8 (the release line of the paper, 2.0.3) and
# IQ-TREE 3 called directly. Usage: check_iqtree.sh <data folder> <work folder> <iqtree2 binary> <iqtree3 binary>
set -euo pipefail
data=$1 work=$2 iq2=$3 iq3=$4
mkdir -p "$work"
cd "$work"
show() { grep -E "Input data|constant sites|parsimony informative|Best-fit model according to BIC|Log-likelihood of the tree" "$1.iqtree" | sed "s|^|$1: |"; }
"$iq2" -s "$data/concat_dush_subalign.fas" -m MFP -B 1000 -o Beltrania_rhombica_CBS_123.58 -seed 1 -T 1 -pre concat_v2_mfp -redo -quiet > /dev/null
show concat_v2_mfp
"$iq3" -s "$data/concat_dush_subalign.fas" -m MFP -seed 1 -T 1 -pre concat_v3_mfp -redo -quiet > /dev/null
show concat_v3_mfp
"$iq3" -s "$data/concat_dush_subalign.fas" -m TIM2e+I+G4 -seed 1 -T 1 -pre concat_v3_fixed -redo -quiet > /dev/null
show concat_v3_fixed
for spec in BT_algn_realigned2:HKY+F+I+G4 TEF_algn_realigned:TPM3+F+I ITS_algn_realigned:K2P+I+G4 LSU_algn_clean_subalign:TNe+I+G4; do
  name=${spec%%:*}
  model=${spec#*:}
  "$iq2" -s "$data/$name.fa" -m MFP -seed 1 -T 1 -pre "${name}_v2_mfp" -redo -quiet > /dev/null
  show "${name}_v2_mfp"
  "$iq3" -s "$data/$name.fa" -m "$model" -seed 1 -T 1 -pre "${name}_v3_fixed" -redo -quiet > /dev/null
  show "${name}_v3_fixed"
done
"$iq2" --version | head -1
"$iq3" --version | head -1
