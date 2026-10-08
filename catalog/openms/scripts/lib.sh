setup() {
  bin=$(dirname "$1")
  export OPENMS_DATA_PATH="$bin/../share/OpenMS"
}
file_kv() {
  "$bin/FileInfo" -in "$1" 2>/dev/null | awk '
  /^Number of spectra:/ { print "n_spectra=" $4 }
  /^Total number of peaks:/ { print "n_peaks=" $5 }
  /^Number of features:/ { print "n_features=" $4 }
  /^  level [0-9]+: [0-9]+$/ { l = $2; sub(/:/, "", l); print "n_ms" l "_spectra=" $3 }
  /^  matched spectra:/ { print "n_matched_spectra=" $3 }
  /^  peptide sequences:/ { print "n_peptide_sequences=" $3 }
  /^  peptide hits:/ { print "n_psm=" $3 }
  /^  protein hits:/ { print "n_protein_hits=" $3 }
  /^  retention time:/ && !rt { print "rt_min_s=" $3; print "rt_max_s=" $5; rt = 1 }'
}
decoy_psm_count() {
  awk '/<PeptideHit /{h=1} /<\/PeptideHit>/{h=0} h&&/name="target_decoy" value="decoy"/{d++} END{print d+0}' "$1"
}
