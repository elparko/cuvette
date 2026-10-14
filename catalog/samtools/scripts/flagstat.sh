"$1" flagstat -O tsv "$2" | awk -F'\t' '
$3 ~ / %$/ { next }
{
  name = $3
  if (name ~ /mapQ>=5/) { name = "with mate mapped to a different chr mapq5" }
  else { sub(/ \(.*\)$/, "", name) }
  key = tolower(name)
  gsub(/[^a-z0-9]+/, "_", key)
  v[key] = $1 + $2
  order[++n] = key
  if (key == "total") qc_failed = $2
}
END {
  for (i = 1; i <= n; i++) print order[i] "=" v[order[i]]
  print "qc_failed=" qc_failed
  if (v["total"] > 0) print "mapped_pct=" sprintf("%.2f", 100 * v["mapped"] / v["total"])
  if (v["primary"] > 0) print "primary_mapped_pct=" sprintf("%.2f", 100 * v["primary_mapped"] / v["primary"])
  if (v["paired_in_sequencing"] > 0) {
    print "properly_paired_pct=" sprintf("%.2f", 100 * v["properly_paired"] / v["paired_in_sequencing"])
    print "singletons_pct=" sprintf("%.2f", 100 * v["singletons"] / v["paired_in_sequencing"])
  }
}'
