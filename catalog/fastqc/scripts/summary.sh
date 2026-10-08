awk -F'\t' '
function key(s) { s = tolower(s); gsub(/[^a-z0-9]+/, "_", s); sub(/^_/, "", s); sub(/_$/, "", s); return s }
/^>>END_MODULE/ { inbasic = 0; next }
/^>>/ {
  name = substr($1, 3)
  status = toupper($2)
  inbasic = (name == "Basic Statistics")
  print "module_" key(name) "=" status
  if (status == "PASS") pass++
  else if (status == "WARN") { warn++; warnlist = warnlist (warnlist == "" ? "" : "; ") name }
  else if (status == "FAIL") { fail++; faillist = faillist (faillist == "" ? "" : "; ") name }
  next
}
inbasic && /^#/ { next }
inbasic {
  k = key($1)
  if (k == "gc") k = "gc_percent"
  if (k == "sequences_flagged_as_poor_quality") k = "poor_quality_sequences"
  print k "=" $2
}
END {
  print "n_pass=" pass + 0
  print "n_warn=" warn + 0
  print "n_fail=" fail + 0
  print "fail_modules=" (faillist == "" ? "none" : faillist)
  print "warn_modules=" (warnlist == "" ? "none" : warnlist)
}' "$1"
