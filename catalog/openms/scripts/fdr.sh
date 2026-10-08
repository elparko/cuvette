. "$(dirname "$0")/lib.sh"
setup "$1"; in=$2; out=$3; threshold=$4
[ -f "$in" ] || { echo "cannot read the input file" >&2; exit 1; }
nd=$(decoy_psm_count "$in")
[ "$nd" -gt 0 ] || { echo "the input file has no decoy hits. Run index_peptides first, with a FASTA file that has decoys" >&2; exit 1; }
"$bin/FalseDiscoveryRate" -in "$in" -out "$out" -protein false -PSM true -FDR:PSM "$threshold" >"$GA_CALL_DIR/fdr.log" 2>&1 || { tail -5 "$GA_CALL_DIR/fdr.log" >&2; exit 1; }
echo "idxml=$out"
echo "fdr_threshold=$threshold"
echo "n_psm_in=$("$bin/FileInfo" -in "$in" 2>/dev/null | awk '/^  peptide hits:/ {print $3}')"
echo "n_decoy_in=$nd"
file_kv "$out" | sed -e 's/^n_psm=/n_psm_pass=/' -e 's/^n_peptide_sequences=/n_peptides_pass=/' -e 's/^n_matched_spectra=/n_spectra_pass=/' -e 's/^n_protein_hits=/n_protein_hits_pass=/'
