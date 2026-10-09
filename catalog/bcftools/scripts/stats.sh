. "$(dirname "$0")/lib.sh"
bcf=$1; in=$2; region=$3
if [ -n "$region" ]; then
  prepare "$bcf" "$in" "$CUVETTE_CALL_DIR" || { echo "cannot index the input file" >&2; exit 1; }
  in=$prepared
fi
"$bcf" view -h "$in" >/dev/null 2>&1 || { echo "cannot read the input file" >&2; exit 1; }
stats_kv "$bcf" "$in" "$region"
