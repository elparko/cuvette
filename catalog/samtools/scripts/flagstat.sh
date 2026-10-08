"$1" flagstat -O tsv "$2" | awk -F'\t' '
{
  name = $3
  pct = 0
  if (name ~ /mapQ>=5/) { name = "with mate mapped to a different chr mapq5" }
  else { sub(/ \(.*\)$/, "", name) }
  if (name ~ / %$/) { sub(/ %$/, "", name); pct = 1 }
  key = tolower(name)
  gsub(/[^a-z0-9]+/, "_", key)
  if (pct) { v = $1; sub(/%/, "", v); print key "_pct=" v }
  else { print key "=" $1; if (key == "total") print "qc_failed=" $2 }
}'
