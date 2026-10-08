stats_kv() {
  "$1" stats ${3:+-r "$3"} "$2" 2>/dev/null | awk -F'\t' '
  $1 == "SN" {
    k = $3; sub(/:$/, "", k); sub(/^number of /, "", k)
    k = tolower(k); gsub(/[^a-z0-9]+/, "_", k)
    print "n_" k "=" $4
  }
  $1 == "TSTV" { print "ts=" $3; print "tv=" $4; if ($4 > 0) print "ts_tv=" $5 }'
}
prepare() {
  bcf=$1; in=$2; dir=$3
  mkdir -p "$dir"
  "$bcf" view -Oz -o "$dir/input.vcf.gz" "$in" 2>/dev/null || return 1
  "$bcf" index -t -f "$dir/input.vcf.gz" || return 1
  prepared="$dir/input.vcf.gz"
}
count_records() {
  "$1" view -H ${3:+-r "$3"} "$2" 2>/dev/null | wc -l | tr -d ' '
}
