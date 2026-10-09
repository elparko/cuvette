. "$(dirname "$0")/lib.sh"
setup "$1"; in=$2; out=$3; shift 3
[ -f "$in" ] || { echo "cannot read the input file" >&2; exit 1; }
"$bin/FeatureFinderCentroided" -in "$in" -out "$out" "$@" >"$CUVETTE_CALL_DIR/ffc.log" 2>&1 || { tail -5 "$CUVETTE_CALL_DIR/ffc.log" >&2; exit 1; }
echo "featurexml=$out"
file_kv "$out"
