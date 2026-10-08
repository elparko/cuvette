mafft=${MAFFT:-$(command -v mafft || echo /opt/homebrew/bin/mafft)}
here=$(cd "$(dirname "$0")" && pwd)
algorithm=$1
src=$2
out=$3
[ -s "$src" ] || { echo "error: sequence file not found: $src" >&2; exit 1; }
exec python3 "$here/align.py" "$mafft" "$algorithm" 1 "$src" "$out"
